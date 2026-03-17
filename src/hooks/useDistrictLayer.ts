/**
 * 行政區圖層管理 Hook
 *
 * 職責:
 * - 管理行政區邊界圖層的建立與顯示
 * - 處理行政區選擇時的地圖縮放
 * - 提供行政區資料的視覺化樣式
 */

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { Polygon } from 'ol/geom'
import { Style, Stroke, Fill } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { DISTRICTS } from '../mockData'

const TAIPEI_CENTER = fromLonLat([121.5654, 25.0330])

/**
 * 行政區圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param visible - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示顯示全部
 */
export function useDistrictLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = 'all'
) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)

  // 建立並加入圖層
  useEffect(() => {
    if (!map) return

    // 找到 districtGroup 容器
    const districtGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'district_map'
    ) as LayerGroup

    if (!districtGroup) {
      console.error('找不到 district_map LayerGroup')
      return
    }

    // 建立 Features
    const features = DISTRICTS.map(d => {
      const coords = d.geometry.coordinates[0].map(c =>fromLonLat([c[0], c[1]]))
      const polygon = new Polygon([coords])
      return new Feature({
        geometry: polygon,
        name: d.name,
        area_km2: d.area_km2,
        type: 'district',
      })
    })

    // 建立圖層
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: new Style({
        stroke: new Stroke({
          color: '#00ff41',
          width: 2,
          lineDash: [5, 5],
        }),
        fill: new Fill({
          color: 'rgba(0, 255, 65, 0.15)',
        }),
      }),
      properties: { name: '行政區' },
    })

    layerRef.current = layer
    districtGroup.getLayers().push(layer)

    return () => {
      districtGroup.getLayers().remove(layer)
      layerRef.current = null
    }
  }, [map])

  // 控制顯示/隱藏
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible)
    }
  }, [visible])

  // 處理行政區選擇 (縮放地圖)
  useEffect(() => {
    if (!map || !layerRef.current) return

    if (selectedDistrict === 'all') {
      // 縮放到台北市中心
      map.getView().animate({
        center: TAIPEI_CENTER,
        zoom: 13,
        duration: 1500,
      })
    } else {
      // 縮放到特定行政區
      const district = DISTRICTS.find(d => d.name === selectedDistrict)
      if (district) {
        const coords = district.geometry.coordinates[0].map(c =>
          fromLonLat([c[0], c[1]])
        )
        const polygon = new Polygon([coords])
        const extent = polygon.getExtent()

        map.getView().fit(extent, {
          padding: [80, 80, 80, 80],
          duration: 1500,
        })
      }
    }
  }, [map, selectedDistrict])

  return layerRef
}