/*
 * 職責:
 * - 整合地圖初始化與各功能圖層
 * - 處理使用者互動 (點擊、縮放、popup)
 * - 協調各 Hook 之間的資料流
 *
 * 架構設計:
 * - useMapInit: 地圖基礎初始化
 * - useDistrictLayer: 行政區邊界圖層
 * - useRoadLayer: 道路寬度圖層
 * - useFireLayers: 消防設施圖層
 */

import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import Overlay from 'ol/Overlay'
import { Point, LineString, Polygon } from 'ol/geom'

// Hooks
import { useMapInit } from '../hooks/useMapInit'
import { useDistrictLayer, DETAIL_ZOOM_THRESHOLD, DISTRICT_OVERVIEW_CENTER, DISTRICT_OVERVIEW_ZOOM } from '../hooks/useDistrictLayer'
import type { District } from '../types/geo'
import { useRoadLayer } from '../hooks/useRoadLayer'
import { useNarrowAlleyLayer } from '../hooks/useNarrowAlleyLayer'
import { useFireLayers } from '../hooks/useFireLayers'
import { useZoomLevel } from '../hooks/useZoomLevel'
import { getRiskInfo } from '../utils/riskUtils'

export interface MapViewHandle {
  zoomToTaipei: () => void
}

interface MapViewProps {
  selectedDistrict: string
  baseLayer: 'light' | 'satellite'
  layers: {
    roads: boolean
    narrowAlleys: boolean
    hydrants: boolean
    stations: boolean
    districts: boolean
  }
  districts: District[]
  onMouseMove?: (coords: { x: number; y: number }) => void
  onDistrictClick?: (districtName: string) => void
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  ({ selectedDistrict, baseLayer, layers, districts, onMouseMove, onDistrictClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<Overlay | null>(null)

    // ========== 地圖初始化 ==========
    const mapRef = useMapInit(containerRef, baseLayer, onMouseMove)

    // ========== 監聽 zoom level 變化 ==========
    const currentZoom = useZoomLevel(mapRef.current)

    // ========== 各功能圖層 ==========
    useDistrictLayer(mapRef.current, layers.districts, selectedDistrict, districts)
    useRoadLayer(mapRef.current, layers.roads, selectedDistrict)
    useNarrowAlleyLayer(mapRef.current, layers.narrowAlleys, selectedDistrict)
    useFireLayers(mapRef.current, layers.hydrants, layers.stations, selectedDistrict)

    // ========== Popup Overlay 初始化 ==========
    useEffect(() => {
      if (!mapRef.current || overlayRef.current) return

      const overlay = new Overlay({
        element: popupRef.current!,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
      })

      mapRef.current.addOverlay(overlay)
      overlayRef.current = overlay

      return () => {
        mapRef.current?.removeOverlay(overlay)
        overlayRef.current = null
      }
    }, [mapRef.current])

    // ========== 點擊事件處理 (Popup) ==========
    useEffect(() => {
      if (!mapRef.current) return

      // Popup HTML 模板生成器
      const createPopupHTML = (headerColor: string, title: string, bodyContent: string, closeBracket: boolean = true) => `
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[${headerColor}]">
            [ ${title}${closeBracket ? ' ]' : ''}
          </div>
          <div class="terminal-popup-body">
            ${bodyContent}
          </div>
        </div>
      `

      const handleClick = (evt: any) => {
        const map = mapRef.current!

        // 收集點擊位置的所有 features（增加線段偵測範圍）
        const features: any[] = []
        map.forEachFeatureAtPixel(evt.pixel, (f) => {
          features.push(f)
        }, {
          hitTolerance: 10  // 增加點擊容差範圍（像素）
        })

        // 過濾掉行政區標記，優先處理其他圖層（道路、消防栓、消防局）
        const nonDistrictFeature = features.find(f => {
          const type = f.getProperties().type
          return type !== 'district_marker'
        })
        // 如果有抓到 道路、消防栓、消防局 先取他，如果都沒有幫我取features[0](行政區)
        const feature = nonDistrictFeature || features[0]

        if (feature) {
          const props = feature.getProperties()
          const geom = feature.getGeometry()

          let popupContent = ''

          // A.行政區中心點標記
          if (props.type === 'district_marker') {
            // 直接觸發 drill down，不顯示 popup
            if (onDistrictClick) {
              onDistrictClick(props.name)
            }
          }

          // B.都市計畫窄巷 Popup
          else if (props.type === 'road') {
            const width = props.width_m
            const { level: riskLevel, desc: riskDesc } = getRiskInfo(width)

            popupContent = createPopupHTML(
              '#00ff41',
              `計畫路寬: ${width.toFixed(1)}M`,
              `
                <p>> 風險等級: ${riskLevel}</p>
                <p>> 風險描述: ${riskDesc}</p>
                <p>> 資料來源: 都市計畫道路</p>
              `
            )
          }

          // 消防局實測窄巷 Popup
          else if (props.type === 'narrow_alley') {
            const width = props.width_m
            const roadWidth = props.road_width
            const snapDistance = props.snap_distance_m
            const alleyName = props.alley_name || '未知巷道'

            // 計算風險等級
            const { level: riskLevel, desc: riskDesc } = getRiskInfo(width)

            const warnings = []
            const highWarn = '<span style="display:inline-block;width:14px;height:14px;line-height:13px;text-align:center;border:1px solid #ff4444;border-radius:9999px;color:#ff4444;font-size:9px;font-weight:bold;box-shadow:0 0 5px #ff444466;vertical-align:middle">!!</span>'
            const midWarn  = '<span style="display:inline-block;width:14px;height:14px;line-height:13px;text-align:center;border:1px solid #f5a623;border-radius:9999px;color:#f5a623;font-size:9px;font-weight:bold;box-shadow:0 0 5px #f5a62366;vertical-align:middle">!</span>'

            if (roadWidth) {
              const widthDiff = roadWidth - width
              const absWidthDiff = Math.abs(widthDiff)
              if (absWidthDiff > 30) { warnings.push(`路寬偏移 ${highWarn}`) }
              else if (absWidthDiff > 8) { warnings.push(`路寬偏移 ${midWarn}`) }
            }

            if (snapDistance) {
              if (snapDistance > 50) { warnings.push(`距離偏移 ${highWarn}`) }
              else if (snapDistance > 30) { warnings.push(`距離偏移 ${midWarn}`) }
            }

            const warningText = warnings.length > 0 ? warnings.join(' ') : '無'
            const widthDiffText = roadWidth ? (roadWidth - width).toFixed(1) + 'm' : '未有計畫值，待確認'

            popupContent = createPopupHTML(
              width < 3.5 ? '#ff4444' : '#ffaa00',
              `實際路寬: ${width.toFixed(1)}M ] ${alleyName}`,
              `
                <p>> 風險等級: ${riskLevel}</p>
                <p>> 風險描述: ${riskDesc}</p>
                <p>> 計畫路寬: ${roadWidth ? roadWidth.toFixed(1) + 'M' : '未知'}</p>
                <p>> 路寬差異: ${widthDiffText}</p>
                <p>> 消防局分類: ${props.category}</p>
                ${warningText !== '無' ? `<p>> 警示提醒: ${warningText}</p>` : ''}
                <p>> 資料來源: 消防局 113 年窄巷清冊</p>
              `,
              false
            )
          }

          // 消防栓 Popup
          else if (props.type === 'hydrant') {
            const typeText = props.hydrant_type === 'aboveground' ? '地上式消防栓' : '地下式消防栓'
            popupContent = createPopupHTML(
              '#00ff41',
              typeText,
              `
                <p>> 所屬轄區: ${props.district}</p>
                <p>> 設備狀態: 正常運作</p>
              `
            )
          }

          // 消防局 Popup
          else if (props.type === 'station') {
            popupContent = createPopupHTML(
              '#ff4444',
              props.name,
              `
                <p>> 地址: ${props.address}</p>
                <p>> 聯繫狀態: 在線</p>
              `
            )
          }

          // 顯示 Popup
          if (popupContent && popupRef.current && overlayRef.current) {
            popupRef.current.innerHTML = popupContent

            // 計算 Popup 位置
            let coord = evt.coordinate
            if (geom) {
              if (geom.getType() === 'Point') {
                coord = (geom as Point).getCoordinates()
              } else if (geom.getType() === 'LineString') {
                const coords = (geom as LineString).getCoordinates()
                coord = coords[Math.floor(coords.length / 2)]
              } else if (geom.getType() === 'Polygon') {
                coord = (geom as Polygon).getInteriorPoint().getCoordinates()
              }
            }

            overlayRef.current.setPosition(coord)
          } else if (!popupContent) {
            overlayRef.current?.setPosition(undefined)
          }
        } else {
          // 點擊空白處關閉 Popup
          overlayRef.current?.setPosition(undefined)
        }
      }

      mapRef.current.on('click', handleClick)

      return () => {
        mapRef.current?.un('click', handleClick)
      }
    }, [mapRef.current, currentZoom])

    // ========== 暴露方法給父元件 ==========
    useImperativeHandle(ref, () => ({
      zoomToTaipei: () => {
        if (mapRef.current) {
          mapRef.current.getView().animate({
            center: DISTRICT_OVERVIEW_CENTER,
            zoom: DISTRICT_OVERVIEW_ZOOM,
            duration: 1000,
          })
        }
      },
    }))

    return (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full bg-black" />

        {/* Popup container */}
        <div ref={popupRef} className="ol-popup"></div>

        {/* 自訂縮放按鈕 */}
        <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => {
              const view = mapRef.current?.getView()
              if (view) {
                const zoom = view.getZoom()
                if (zoom !== undefined) {
                  view.animate({ zoom: zoom + 1, duration: 250 })
                }
              }
            }}
            className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
          >
            +
          </button>
          <button
            onClick={() => {
              const view = mapRef.current?.getView()
              if (view) {
                const zoom = view.getZoom()
                if (zoom !== undefined) {
                  view.animate({ zoom: zoom - 1, duration: 250 })
                }
              }
            }}
            className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
          >
            -
          </button>
        </div>

        {/* Popup 樣式 */}
        <style>{`
        .ol-popup {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.95);
          border: 1px solid #00ff41;
          padding: 0;
          border-radius: 0;
          bottom: 12px;
          left: -50px;
          min-width: 240px;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }
        .ol-popup:after, .ol-popup:before {
          top: 100%;
          border: solid transparent;
          content: " ";
          height: 0;
          width: 0;
          position: absolute;
          pointer-events: none;
        }
        .ol-popup:after {
          border-top-color: rgba(0, 0, 0, 0.95);
          border-width: 10px;
          left: 48px;
          margin-left: -10px;
        }
        .ol-popup:before {
          border-top-color: #00ff41;
          border-width: 11px;
          left: 48px;
          margin-left: -11px;
        }
        .terminal-popup {
          color: #00ff41;
          font-family: 'JetBrains Mono', monospace;
        }
        .terminal-popup-header {
          background: rgba(0, 255, 65, 0.1);
          padding: 8px 12px;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          font-weight: bold;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .terminal-popup-body {
          padding: 12px;
          font-size: 10px;
          line-height: 1.6;
        }
        .terminal-popup-body p {
          margin: 4px 0;
        }
      `}</style>
      </div>
    )
  }
)

MapView.displayName = 'MapView'

export default MapView
