/**
 * 花蓮窄巷圖層管理 Hook
 *
 * 相較台北版（useNarrowAlleyLayer）的差異：
 * - 無 zoom 門檻（花蓮版為單頁展示，不需分層）
 * - 無 LayerGroup 結構，直接加入 map
 * - 使用 hualienApi.ts 的獨立 client
 * - 使用相同的 narrowAlleyStyle（依 risk_level 分色）
 */

import { useEffect, useRef, useCallback } from 'react'
import Map from 'ol/Map'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getHualienNarrowAlleys } from '../services/hualienApi'
import { useApi } from './useApi'
import { toHualienAlleyFeatures } from '../utils/geoTransform'
import { narrowAlleyStyle } from '../styles/layerStyles'
import type { HualienNarrowAlleyFeatureProps } from '../types/geo'

export function useHualienAlleyLayer(
  map: Map | null,
  township: string,   // '' 表示全縣
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)

  const fetchFn = useCallback(
    () => getHualienNarrowAlleys(township || undefined),
    [township],
  )
  const { data: alleys, loading, error } = useApi(fetchFn, [] as HualienNarrowAlleyFeatureProps[])

  useEffect(() => {
    if (!map || alleys.length === 0) return

    const layer = new VectorLayer({
      source: new VectorSource({ features: toHualienAlleyFeatures(alleys) }),
      style: narrowAlleyStyle,
      properties: { name: '花蓮窄巷' },
      zIndex: 10,
    })

    layerRef.current = layer
    map.addLayer(layer)

    return () => {
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [map, alleys])

  return { layerRef, loading, error }
}
