/**
 * 花蓮地圖初始化 Hook
 *
 * 相較 useMapInit 的差異：
 * - 中心點 / zoom 設為花蓮市（不套用台北總覽常數）
 * - 不建立 LayerGroup（花蓮版圖層由 hooks 直接 addLayer）
 * - 僅 OSM 底圖（不需衛星影像切換）
 */

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'

const HUALIEN_CENTER = fromLonLat([121.604, 23.987])
const HUALIEN_ZOOM   = 12

export function useHualienMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onMouseMove?: (coords: { x: number; y: number }) => void,
) {
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const emap = new TileLayer({
      source: new XYZ({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }),
      className: 'base-tile-layer',
    })

    const map = new Map({
      target: containerRef.current,
      layers: [emap],
      view: new View({
        center: HUALIEN_CENTER,
        zoom: HUALIEN_ZOOM,
        minZoom: 9,
        maxZoom: 18,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    })
    mapRef.current = map

    if (onMouseMove) {
      map.on('pointermove', evt => {
        onMouseMove({ x: evt.coordinate[0], y: evt.coordinate[1] })
      })
    }

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [containerRef])

  return mapRef
}
