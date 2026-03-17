/**
 * 道路圖層管理 Hook
 *
 * 職責:
 * - 管理道路寬度圖層的建立與顯示
 * - 依據道路寬度分類套用不同顏色 (窄巷風險視覺化)
 * - 支援按行政區篩選道路資料
 */

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { LineString } from 'ol/geom'
import { Style, Stroke } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { ROADS } from '../mockData'
import { getRoadWidthClass, ROAD_WIDTH_COLORS } from '../types/geo'

/**
 * 道路圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param visible - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示顯示全部
 */
export function useRoadLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)

  // 建立並加入圖層
  useEffect(() => {
    if (!map) return

    // 找到 roadsGroup 容器
    const roadsGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'roads_map'
    ) as LayerGroup

    if (!roadsGroup) {
      console.error('找不到 roads_map LayerGroup')
      return
    }

    // 建立 Features
    const features = ROADS.map(r => {
      const coords = r.geometry.coordinates.map(c =>fromLonLat([c[0], c[1]]))
      const line = new LineString(coords)
      return new Feature({
        geometry: line,
        name: r.name,
        planned_width: r.planned_width,
        district: r.district,
        type: 'road',
      })
    })

    // 建立圖層 (使用動態樣式函數)
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => {
        const width = feature.get('planned_width')
        const widthClass = getRoadWidthClass(width)
        const color = ROAD_WIDTH_COLORS[widthClass]

        return new Style({
          stroke: new Stroke({
            color,
            width: 3,
          }),
        })
      },
      properties: { name: '道路寬度' },
    })

    layerRef.current = layer
    roadsGroup.getLayers().push(layer)

    return () => {
      roadsGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map])

  // 控制顯示/隱藏
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible)
    }
  }, [visible])

  // TODO: 支援按行政區篩選 (目前顯示全部道路)
  // 之後串接 API 時,改為透過 selectedDistrict 參數呼叫 getRoads(district)
  useEffect(() => {
    if (!layerRef.current) return

    // 目前 Mock 資料階段,不做篩選
    // 串接 API 後,這裡會重新載入資料
    if (selectedDistrict !== 'all') {
      // TODO: 呼叫 getRoads(selectedDistrict) 並更新圖層
    }
  }, [selectedDistrict])

  return layerRef
}
