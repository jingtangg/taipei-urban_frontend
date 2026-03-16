/**
 * hooks/useMapInit.ts
 * 對應 mapInitMixin.js: initMap() + addMouseControl()
 *
 * Vue mixin 直接 mutate this.map，React hook 改成回傳 mapRef
 * addMouseControl → pointermove 事件 + onMouseMove callback（不用 OL control）
 */

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import LayerGroup from 'ol/layer/Group'
import { XYZ } from 'ol/source'
import { defaults as defaultControls } from 'ol/control'
import { fromLonLat } from 'ol/proj'
import 'ol/ol.css'

// 台北市中心（對應 mapInitMixin.js center transform 的概念）
const TAIPEI_CENTER = fromLonLat([121.5654, 25.0330])

// 底圖 URL（Week 3 換成 NLSC WMTS）
// TODO: 正式換成 https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}
const TILE_URLS: Record<'light' | 'satellite', string> = {
  light:     'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

export function useMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  baseLayerType: 'light' | 'satellite',
  onMouseMove?: (coords: { x: number; y: number }) => void,
) {
  const mapRef = useRef<Map | null>(null)

  // 對應 mapInitMixin.js: initMap() — 建立 Map + View
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // 建兩個底圖（emap/photo），交由 MapContainer 的 baseLayer effect 切換可見性
    const emap = new TileLayer({
      source: new XYZ({ url: TILE_URLS.light }),
      visible: baseLayerType !== 'satellite',
      properties: { id: 'emap' },
    })
    const photo = new TileLayer({
      source: new XYZ({ url: TILE_URLS.satellite }),
      visible: baseLayerType === 'satellite',
      properties: { id: 'photo' },
    })

    // 對應 mapMixin.js layers_list 的 LayerGroup 結構
    const roadsGroup    = new LayerGroup({ properties: { id: 'roads_map'    } })
    const fireGroup     = new LayerGroup({ properties: { id: 'fire_map'     } })
    const districtGroup = new LayerGroup({ properties: { id: 'district_map' } })

    const map = new Map({
      target: containerRef.current,
      layers: [emap, photo, districtGroup, roadsGroup, fireGroup],
      view: new View({
        center: TAIPEI_CENTER,
        zoom: 13,
        minZoom: 10,
        maxZoom: 18,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    })
    mapRef.current = map

    // 對應 mapInitMixin.js: addMouseControl()
    // 原用 OL MousePosition control，這裡改成 pointermove → callback
    if (onMouseMove) {
      map.on('pointermove', (evt) => {
        onMouseMove({ x: evt.coordinate[0], y: evt.coordinate[1] })
      })
    }

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])

  return mapRef
}
