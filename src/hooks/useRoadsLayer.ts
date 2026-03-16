/**
 * hooks/useRoadsLayer.ts
 * 對應 mapMixin.js: setExactEarthAddMap() — 把資料轉 OL Feature 加到圖層
 *
 * 船隻換成道路：iconFeature → LineString feature，船型圖示 → Stroke 顏色
 * splice(0, length) 清舊資料 → useEffect cleanup removeLayer
 */

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import { LineString, MultiLineString } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import { Style, Stroke } from 'ol/style'
import type Map from 'ol/Map'
import { getRoadWidthClass, ROAD_WIDTH_COLORS } from '../types/geo'
import type { RoadGeoFeature } from '../data/mockRoads'

export function useRoadsLayer(
  mapRef: RefObject<Map | null>,
  roads: RoadGeoFeature[],
  visible: boolean,
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // 移除舊圖層（對應 mapMixin.js setExactEarthAddMap: splice(0, spire_vector_layers.length)）
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!roads.length) return

    // 轉換 GeoFeature → OL Feature（對應 mapMixin.js L651-665 iconFeature 建立手法）
    // flatMap 處理 MultiLineString（台北市道路資料可能有多段）
    const features = roads.flatMap(road => {
      const props = {
        id:         road.properties.id,
        road_width: road.properties.road_width,
        road_name:  road.properties.road_name,
        district:   road.properties.district,
        type:       'road',
      }
      const coords = road.geometry.coordinates

      if (road.geometry.type === 'MultiLineString') {
        return (coords as number[][][]).map(line =>
          new Feature({
            geometry: new MultiLineString([line.map(c => fromLonLat(c as [number, number]))]),
            ...props,
          })
        )
      }
      return [new Feature({
        geometry: new LineString(
          (coords as number[][]).map(c => fromLonLat(c as [number, number]))
        ),
        ...props,
      })]
    })

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => {
        const cls = getRoadWidthClass(feature.get('road_width') as number)
        return new Style({
          stroke: new Stroke({ color: ROAD_WIDTH_COLORS[cls], width: 3 }),
        })
      },
      visible,
      properties: { id: 'roads_width_layer' },
    })

    layerRef.current = layer
    map.addLayer(layer)

    return () => {
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [roads])  // mapRef 是 ref object，永遠是同一個參考，不放 deps

  // 對應 layer.setVisible()
  useEffect(() => {
    layerRef.current?.setVisible(visible)
  }, [visible])

  return layerRef
}
