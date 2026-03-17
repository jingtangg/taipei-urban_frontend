/**
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

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import Overlay from 'ol/Overlay'
import { Point, LineString, Polygon } from 'ol/geom'

// Hooks
import { useMapInit } from '../hooks/useMapInit'
import { useDistrictLayer } from '../hooks/useDistrictLayer'
import { useRoadLayer } from '../hooks/useRoadLayer'
import { useFireLayers } from '../hooks/useFireLayers'

export interface MapViewHandle {
  zoomToTaipei: () => void
}

interface MapViewProps {
  selectedDistrict: string
  baseLayer: 'light' | 'satellite'
  layers: {
    roads: boolean
    hydrants: boolean
    stations: boolean
    districts: boolean
  }
  onMouseMove?: (coords: { x: number; y: number }) => void
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  ({ selectedDistrict, baseLayer, layers, onMouseMove }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<Overlay | null>(null)

    // ========== 地圖初始化 ==========
    const mapRef = useMapInit(containerRef, baseLayer, onMouseMove)

    // ========== 各功能圖層 ==========
    useDistrictLayer(mapRef.current, layers.districts, selectedDistrict)
    useRoadLayer(mapRef.current, layers.roads, selectedDistrict)
    useFireLayers(mapRef.current, {showHydrants: layers.hydrants, showStations: layers.stations, district: selectedDistrict})

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
      const createPopupHTML = (headerColor: string, title: string, bodyContent: string) => `
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[${headerColor}]">
            [ ${title} ]
          </div>
          <div class="terminal-popup-body">
            ${bodyContent}
          </div>
        </div>
      `

      const handleClick = (evt: any) => {
        const map = mapRef.current!
        const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)

        if (feature) {
          const props = feature.getProperties()
          const geom = feature.getGeometry()

          let popupContent = ''

          // 行政區 Popup
          if (props.type === 'district') {
            popupContent = createPopupHTML(
              '#00ff41',
              `區域編號: ${props.name}`,
              `
                <p>> 區域面積: ${props.area_km2} KM²</p>
                <p>> 安全狀態: ${props.status || '正常'}</p>
              `
            )
          }

          // 道路 Popup
          else if (props.type === 'road') {
            popupContent = createPopupHTML(
              '#00ff41',
              `道路名稱: ${props.name || '未命名'}`,
              `
                <p>> 規劃寬度: ${props.planned_width}M</p>
                <p>> 運行狀態: ${props.planned_width <= 3.5 ? '限縮通行' : '正常通行'}</p>
              `
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
    }, [mapRef.current])

    // ========== 暴露方法給父元件 ==========
    useImperativeHandle(ref, () => ({
      zoomToTaipei: () => {
        if (mapRef.current) {
          mapRef.current.getView().animate({
            center: mapRef.current.getView().getCenter(),
            zoom: 13,
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
