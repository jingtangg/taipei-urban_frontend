/**
 * 窄巷圖層管理 Hook
 *
 * 職責:
 * - 管理消防局實測窄巷圖層的建立與顯示（實線）
 * - 依據實際寬度套用不同顏色 (紅色 < 3.5m, 黃色 3.5-6m)
 *
 * 架構分層:
 * - 資料擷取：useApi（含 race condition 保護）
 * - 座標轉換：geoTransform.ts（JSON → OL Feature）
 */

import { useEffect, useRef, useCallback } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getNarrowAlleys } from '../services/urbanApi'
import { DETAIL_ZOOM_THRESHOLD } from '../constants/mapConfig'
import { useZoomLevel } from './useZoomLevel'
import { useApi } from './useApi'
import { toNarrowAlleyFeatures } from '../utils/geoTransform'
import { narrowAlleyStyle } from '../styles/layerStyles'
import type { NarrowAlleyFeatureProps } from '../types/geo'

/**
 * 窄巷圖層管理 Hook
 * @param map              - OpenLayers Map 實例
 * @param visible          - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示不載入
 */
export function useNarrowAlleyLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)

  // ========== 資料擷取 ==========
  const alleyFn = useCallback(
    () => selectedDistrict === 'all'
      ? Promise.resolve([] as NarrowAlleyFeatureProps[])
      : getNarrowAlleys(selectedDistrict),
    [selectedDistrict],
  )
  const { data: alleys } = useApi(alleyFn, [] as NarrowAlleyFeatureProps[])

  // ========== 第一階段：圖層創建 ==========
  useEffect(() => {
    if (!map || alleys.length === 0) return

    const roadsGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'roads_map'
    ) as LayerGroup

    if (!roadsGroup) {
      console.error('找不到 roads_map LayerGroup')
      return
    }

    const layer = new VectorLayer({
      source: new VectorSource({ features: toNarrowAlleyFeatures(alleys) }),
      style: narrowAlleyStyle,
      properties: { name: '消防局實測窄巷' },
      visible: false,
      zIndex: 10,
    })

    layerRef.current = layer
    roadsGroup.getLayers().push(layer)
    // 立即同步可見度，避免資料載入比 zoom 動畫慢時圖層不顯示
    layer.setVisible(visible && currentZoom >= DETAIL_ZOOM_THRESHOLD)

    return () => {
      roadsGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map, alleys])

  // ========== 第二階段：動態控制 ==========
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible && currentZoom >= DETAIL_ZOOM_THRESHOLD)
    }
  }, [visible, currentZoom])

  return layerRef
}
