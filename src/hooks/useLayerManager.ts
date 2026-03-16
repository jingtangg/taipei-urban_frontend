/**
 * hooks/useLayerManager.ts
 * 對應 mapMixin.js: addLayerToGroup() + layerExists()
 *
 * Vue 版直接操作 this.layers_list 陣列找 group id，
 * React 版相同邏輯：從 map.getLayers() 找 groupId，再 push 進去
 */

import { useCallback } from 'react'
import type { RefObject } from 'react'
import type Map from 'ol/Map'
import type Layer from 'ol/layer/Layer'
import LayerGroup from 'ol/layer/Group'

export function useLayerManager(mapRef: RefObject<Map | null>) {
  // 對應 mapMixin.js: addLayerToGroup — 加到頂層 map
  const addLayer = useCallback((layer: Layer) => {
    const map = mapRef.current
    if (!map) return
    const alreadyAdded = map.getLayers().getArray().includes(layer)
    if (!alreadyAdded) map.addLayer(layer)
  }, [mapRef])

  // 對應 mapMixin.js:addLayerToGroup (L42-46) — 直接移植，找 groupId 再 push
  const addLayerToGroup = useCallback((groupId: string, layer: Layer) => {
    const map = mapRef.current
    if (!map) return
    const group = map.getLayers().getArray()
      .find(l => l.get('id') === groupId) as LayerGroup | undefined
    if (!group) return
    const already = group.getLayers().getArray().includes(layer)
    if (!already) group.getLayers().push(layer)
  }, [mapRef])

  // 對應 mapMixin.js: removeLayer
  const removeLayer = useCallback((layer: Layer) => {
    mapRef.current?.removeLayer(layer)
  }, [mapRef])

  return { addLayer, addLayerToGroup, removeLayer }
}
