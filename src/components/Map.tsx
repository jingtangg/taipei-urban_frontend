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
import type { FeatureLike } from 'ol/Feature'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import { unByKey } from 'ol/Observable'

// Hooks
import { useMapInit } from '../hooks/useMapInit'
import { useDistrictLayer } from '../hooks/useDistrictLayer'
import { DISTRICT_OVERVIEW_CENTER, DISTRICT_OVERVIEW_ZOOM } from '../constants/mapConfig'
import type { District, PopupFeatureProps } from '../types/geo'
import { useRoadLayer } from '../hooks/useRoadLayer'
import { useNarrowAlleyLayer } from '../hooks/useNarrowAlleyLayer'
import { useFireLayers } from '../hooks/useFireLayers'
import { useZoomLevel } from '../hooks/useZoomLevel'
import { resolveFeaturePopup } from '../utils/popupUtils'

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

      const key = mapRef.current.on('click', (evt: MapBrowserEvent) => {
        const map = mapRef.current!

        // 收集點擊位置的所有 features（增加線段偵測範圍）
        const features: FeatureLike[] = []
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
          const props = feature.getProperties() as PopupFeatureProps
          const geom = feature.getGeometry()

          // 行政區標記：觸發 drill-down，不顯示 popup
          if (props.type === 'district_marker') {
            onDistrictClick?.(props.name)
            return
          }

          const popupContent = resolveFeaturePopup(props)

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
      })

      return () => { unByKey(key) }
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

      </div>
    )
  }
)

MapView.displayName = 'MapView'

export default MapView
