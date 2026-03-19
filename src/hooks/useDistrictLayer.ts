/**
 * 行政區圖層管理 Hook
 *
 * 職責:
 * - 管理行政區邊界圖層的建立與顯示
 * - 顯示行政區中心點圓形標記,以顏色/大小代表風險密度
 * - 處理行政區選擇時的地圖縮放
 * - 提供行政區資料的視覺化樣式
 */

import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { Polygon, Point } from 'ol/geom'
import { Style, Stroke, Fill, Circle, Text } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { getCenter } from 'ol/extent'
import { useZoomLevel } from './useZoomLevel'
import { getDistricts } from '../services/urbanApi'
import type { District } from '../types/geo'

const TAIPEI_CENTER = fromLonLat([121.5654, 25.0330])

/**
 * 詳細圖層顯示門檻
 * Zoom < 15: 只顯示行政區邊界 + 圓形標記（總覽層）
 * Zoom ≥ 15: 顯示窄巷 + 消防栓 + 消防局（詳細層）
 */
export const DETAIL_ZOOM_THRESHOLD = 15

/**
 * 計算複合風險等級
 *
 * 法規依據：
 * - 窄巷門檻：內政部「劃設消防車輛救災活動空間指導原則」3.5m/4m 標準
 * - 消防栓門檻：經濟部「救火栓設置標準」第5條，市中心區每60-120m設一處
 * - 搶救困難：台北市「消防通道劃設及管理作業程序」第9點
 *
 * @param narrowDensity - 窄巷密度 (km/km²)，寬度 < 4m 巷道的總長度/行政區面積
 * @param hydrantDensity - 消防栓密度 (/km²)，消防栓數量/行政區面積
 * @returns 風險顏色
 */
function getRiskColor(narrowDensity: number, hydrantDensity: number): string {
  // 極高風險：窄巷密集 + 消防栓嚴重不足
  // 對應「搶救困難地區」第1類(連棟≥50戶) + 第2類(水源缺乏)
  if (narrowDensity >= 0.3 && hydrantDensity < 10) {
    return 'rgba(255, 0, 0, 0.9)'  // 深紅 - 極高風險
  }

  // 高風險：窄巷密集但消防栓一般
  // 對應「搶救困難地區」第1類
  if (narrowDensity >= 0.3) {
    return 'rgba(255, 68, 68, 0.8)'  // 紅 - 高風險
  }

  // 中高風險：中等窄巷但消防栓不足
  if (narrowDensity >= 0.1 && hydrantDensity < 10) {
    return 'rgba(255, 102, 0, 0.8)'  // 橘紅 - 中高風險
  }

  // 中風險：中等窄巷，消防栓一般
  if (narrowDensity >= 0.1) {
    return 'rgba(255, 170, 0, 0.8)'  // 橘 - 中風險
  }

  // 低風險：窄巷少，符合3.5m通行標準
  return 'rgba(0, 255, 65, 0.8)'  // 綠 - 低風險
}

/**
 * 計算圓形標記大小
 * 基於窄巷密度 (越高圓圈越大)
 *
 * @param narrowDensity - 窄巷密度 (km/km²)
 * @returns 圓形半徑 (px)
 */
function getRiskRadius(narrowDensity: number): number {
  const baseRadius = 18
  const maxRadius = 35
  // 以 0.5 km/km² 為最大值進行縮放
  const scale = Math.min(narrowDensity / 0.5, 1)
  return baseRadius + (maxRadius - baseRadius) * scale
}

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
  const boundaryLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const currentZoom = useZoomLevel(map)
  const [districts, setDistricts] = useState<District[]>([])

  // 載入行政區資料
  useEffect(() => {
    getDistricts().then(setDistricts).catch(console.error)
  }, [])

  // 建立並加入圖層
  useEffect(() => {
    if (!map || districts.length === 0) return

    // 找到 districtGroup 容器
    const districtGroup = map.getLayers().getArray().find(
      layer => layer.get('id') === 'district_map'
    ) as LayerGroup

    if (!districtGroup) {
      console.error('找不到 district_map LayerGroup')
      return
    }

    // 建立行政區邊界 Features
    const boundaryFeatures = districts.map(d => {
      const coords = d.geometry.coordinates[0].map(c => fromLonLat([c[0], c[1]]))
      const polygon = new Polygon([coords])
      return new Feature({
        geometry: polygon,
        name: d.name,
        area_km2: d.area_km2,
        type: 'district_boundary',
      })
    })

    // 建立中心點標記 Features
    const markerFeatures = districts.map(d => {
      const coords = d.geometry.coordinates[0].map(c => fromLonLat([c[0], c[1]]))
      const polygon = new Polygon([coords])
      const extent = polygon.getExtent()
      const center = getCenter(extent)

      return new Feature({
        geometry: new Point(center),
        name: d.name,
        area_km2: d.area_km2,
        narrowDensity: d.narrowDensity || 0,
        hydrantDensity: d.hydrantDensity || 0,
        type: 'district_marker',
      })
    })

    // 建立邊界圖層 (半透明,不填滿)
    const boundaryLayer = new VectorLayer({
      source: new VectorSource({ features: boundaryFeatures }),
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(0, 255, 65, 0.4)',
          width: 1.5,
          lineDash: [1, 2],
        }),
        fill: new Fill({
          color: 'rgba(251, 255, 0, 0.05)',
        }),
      }),
      properties: { name: '行政區邊界' },
      zIndex: 1,
    })

    // 建立中心點標記圖層
    const markerLayer = new VectorLayer({
      source: new VectorSource({ features: markerFeatures }),
      style: (feature) => {
        const name = feature.get('name')
        const narrowDensity = feature.get('narrowDensity') as number
        const hydrantDensity = feature.get('hydrantDensity') as number

        return new Style({
          image: new Circle({
            radius: getRiskRadius(narrowDensity),
            fill: new Fill({
              color: getRiskColor(narrowDensity, hydrantDensity),
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 2,
            }),
          }),
          text: new Text({
            text: `${name}\n窄巷密度: ${narrowDensity} km/km²\n消防栓密度: ${hydrantDensity} /km²`,
            offsetY: -40,
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#000000', width: 3 }),
            font: '12px sans-serif',
            textAlign: 'center',
          }),
        })
      },
      properties: { name: '行政區標記' },
      zIndex: 2,
    })

    boundaryLayerRef.current = boundaryLayer
    markerLayerRef.current = markerLayer

    districtGroup.getLayers().push(boundaryLayer)
    districtGroup.getLayers().push(markerLayer)

    return () => {
      districtGroup.getLayers().remove(boundaryLayer)
      districtGroup.getLayers().remove(markerLayer)
      boundaryLayerRef.current = null
      markerLayerRef.current = null
    }
  }, [map, districts])

  // 控制邊界顯示/隱藏
  useEffect(() => {
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setVisible(visible)
    }
  }, [visible])

  // 控制圓形標記顯示/隱藏：zoom < 15 才顯示（總覽層）
  useEffect(() => {
    if (markerLayerRef.current) {
      const shouldShow = visible && currentZoom < DETAIL_ZOOM_THRESHOLD
      markerLayerRef.current.setVisible(shouldShow)
    }
  }, [visible, currentZoom])

  // 處理行政區選擇 (縮放地圖)
  useEffect(() => {
    if (!map || !markerLayerRef.current) return

    if (selectedDistrict === 'all') {
      // 縮放到台北市中心（總覽層，zoom < 15）
      map.getView().animate({
        center: TAIPEI_CENTER,
        zoom: 13,
        duration: 1500,
      })
    } else {
      // 縮放到特定行政區（詳細層，固定 zoom 15）
      const district = districts.find(d => d.name === selectedDistrict)
      if (district) {
        const coords = district.geometry.coordinates[0].map(c =>
          fromLonLat([c[0], c[1]])
        )
        const polygon = new Polygon([coords])
        const extent = polygon.getExtent()
        const center = getCenter(extent)

        // 固定 zoom 到 15，觸發詳細圖層顯示
        map.getView().animate({
          center: center,
          zoom: DETAIL_ZOOM_THRESHOLD,
          duration: 1500,
        })
      }
    }
  }, [map, selectedDistrict, districts])

  return { boundaryLayerRef, markerLayerRef }
}