/**
 * OpenLayers 地圖初始化 Hook
 *
 * 職責:
 * - 建立 OpenLayers 地圖實例並綁定到 DOM 容器
 * - 配置底圖圖層 (電子地圖/衛星影像)
 * - 建立圖層群組結構供業務邏輯使用
 * - 處理地圖生命週期與事件監聽
 *
 * 設計模式:
 * - 使用 React Hooks 管理地圖實例生命週期
 * - 圖層採用 id-based 設計,透過 properties.id 識別與切換
 * - 底圖切換由外部 props 控制,內部負責 visibility 同步
 */

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import LayerGroup from 'ol/layer/Group'
import { XYZ } from 'ol/source'
import { defaults as defaultControls } from 'ol/control'
import { DISTRICT_OVERVIEW_CENTER, DISTRICT_OVERVIEW_ZOOM } from '../constants/mapConfig'

/**
 * 底圖來源 URL
 * light_a: 內政部國土測繪中心 WMTS 電子地圖 (繁體中文) https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}
 * light_b: OpenStreetMap (繁體中文) https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}
 */
const TILE_URLS: Record<'light' | 'satellite', string> = {
  // light:     'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
  light:     'https://tile.openstreetmap.org/{z}/{x}/{y}.png' ,
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}


/**
 * 初始化 OpenLayers 地圖
 *
 * @param containerRef - React ref 指向地圖容器 DOM 元素
 * @param baseLayerType - 底圖類型 ('light' 電子地圖 | 'satellite' 衛星影像)
 * @param onMouseMove - 滑鼠移動事件回調 (選填),回傳座標 {x, y}
 * @returns mapRef - 地圖實例的 React ref,供外部操作圖層
 *
 * @example
 * const mapRef = useMapInit(containerRef, 'light', (coords) => {
 *   console.log('滑鼠座標:', coords.x, coords.y)
 * })
 */
export function useMapInit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  baseLayerType: 'light' | 'satellite',
  onMouseMove?: (coords: { x: number; y: number }) => void,
) {
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    // 防止重複初始化
    if (!containerRef.current || mapRef.current) return

    // 建立兩個底圖圖層,透過 visible 控制顯示
    // className 供 CSS 單獨對底圖套用灰階濾鏡,不影響業務圖層顏色
    const emap = new TileLayer({
      source: new XYZ({ url: TILE_URLS.light }),
      visible: baseLayerType !== 'satellite',
      className: 'base-tile-layer',
      properties: { id: 'emap' },
    })
    const photo = new TileLayer({
      source: new XYZ({ url: TILE_URLS.satellite }),
      visible: baseLayerType === 'satellite',
      className: 'base-tile-layer',
      properties: { id: 'photo' },
    })

    // 建立業務圖層群組 (空群組,由外部 hooks 填充資料)
    const roadsGroup    = new LayerGroup({ properties: { id: 'roads_map'    } })
    const fireGroup     = new LayerGroup({ properties: { id: 'fire_map'     } })
    const districtGroup = new LayerGroup({ properties: { id: 'district_map' } })

    // 建立地圖實例
    const map = new Map({
      target: containerRef.current,
      layers: [emap, photo, districtGroup, roadsGroup, fireGroup],
      view: new View({
        center: DISTRICT_OVERVIEW_CENTER,
        zoom: DISTRICT_OVERVIEW_ZOOM,
        minZoom: 10,
        maxZoom: 18,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    })
    mapRef.current = map

    // 選填: 註冊滑鼠移動事件監聽
    if (onMouseMove) {
      map.on('pointermove', (evt) => {
        onMouseMove({ x: evt.coordinate[0], y: evt.coordinate[1] })
      })
    }

    // 清理函數: 元件卸載時移除地圖
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [containerRef])

  // 底圖切換: 依 baseLayerType 控制 emap / photo 的可見性
  useEffect(() => {
    if (!mapRef.current) return

    const layers = mapRef.current.getLayers().getArray()
    const emap  = layers.find(l => l.get('id') === 'emap')
    const photo = layers.find(l => l.get('id') === 'photo')

    emap?.setVisible(baseLayerType === 'light')
    photo?.setVisible(baseLayerType === 'satellite')
  }, [baseLayerType])

  return mapRef
}
