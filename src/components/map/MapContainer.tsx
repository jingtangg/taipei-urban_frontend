/**
 * components/map/MapContainer.tsx
 * 對應 MapBody.vue（全端）→ 只負責 OL 地圖渲染，無 sidebar UI
 *
 * 用三個 hook 替換原本 mapMixin.js 的巨型 component：
 *   useMapInit      ← mapInitMixin.js
 *   useLayerManager ← layerManagerMixin.js
 *   useRoadsLayer   ← mapMixin.js setExactEarthAddMap 手法
 */

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { fromLonLat } from 'ol/proj'
import { useMapInit } from '../../hooks/useMapInit'
import { useRoadsLayer } from '../../hooks/useRoadsLayer'
import { MOCK_ROADS } from '../../data/mockRoads'

export interface MapContainerHandle {
  zoomToTaipei: () => void
}

interface MapContainerProps {
  baseLayer: 'light' | 'satellite'
  district: string                 // 選取的行政區，'all' 或區名
  layers: {
    roads: boolean
    hydrants: boolean
    stations: boolean
    districts: boolean
  }
  onMouseMove?: (coords: { x: number; y: number }) => void
}

const MapContainer = forwardRef<MapContainerHandle, MapContainerProps>(
  ({ baseLayer, district, layers, onMouseMove }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)

    // useMapInit ← mapInitMixin.js: initMap() + addMouseControl()
    const mapRef = useMapInit(containerRef, baseLayer, onMouseMove)

    // useRoadsLayer ← mapMixin.js: setExactEarthAddMap() 手法
    // Week 3 串 urbanApi.ts 時改成：useRoadsLayer(mapRef, filteredRoads, layers.roads, district)
    void district
    useRoadsLayer(mapRef, MOCK_ROADS, layers.roads)

    // 底圖切換（對應 mapMixin.js 的 map state 改變重新渲染底圖）
    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      map.getLayers().getArray().forEach(layer => {
        const id = layer.get('id')
        if (id === 'emap' || id === 'photo') {
          layer.setVisible(id === (baseLayer === 'satellite' ? 'photo' : 'emap'))
        }
      })
    }, [baseLayer])

    // 對應 mapMixin.js: flyToSite() — 縮放至台北中心
    useImperativeHandle(ref, () => ({
      zoomToTaipei: () => {
        mapRef.current?.getView().animate({
          center: fromLonLat([121.5654, 25.0330]),
          zoom: 13,
          duration: 1000,
        })
      },
    }))

    return (
      <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full" />

        {/* 縮放控制（對應 mapMixin.js map_zoomin / map_zoomout） */}
        <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => {
              const view = mapRef.current?.getView()
              if (view) view.animate({ zoom: (view.getZoom() ?? 13) + 1, duration: 250 })
            }}
            className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
          >+</button>
          <button
            onClick={() => {
              const view = mapRef.current?.getView()
              if (view) view.animate({ zoom: (view.getZoom() ?? 13) - 1, duration: 250 })
            }}
            className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
          >-</button>
        </div>
      </div>
    )
  }
)

MapContainer.displayName = 'MapContainer'
export default MapContainer
