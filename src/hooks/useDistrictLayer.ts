/**
 * 行政區圖層管理 Hook
 *
 * 職責:
 * - 管理行政區邊界圖層的建立與顯示
 * - 顯示行政區中心點圓形標記,以顏色/大小代表風險密度
 * - 處理行政區選擇時的地圖縮放
 * - 提供行政區資料的視覺化樣式
 */

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import LayerGroup from "ol/layer/Group";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Polygon, Point } from "ol/geom";
import { Style, Stroke, Fill, Circle, Text } from "ol/style";
import { fromLonLat } from "ol/proj";
import { getCenter } from "ol/extent";
import { useZoomLevel } from "./useZoomLevel";
import { getDistricts } from "../services/urbanApi";
import type { District } from "../types/geo";

const TAIPEI_CENTER = fromLonLat([121.5654, 25.033]);

/**
 * 詳細圖層顯示門檻
 * Zoom < 15: 只顯示行政區邊界 + 圓形標記（總覽層）
 * Zoom ≥ 15: 顯示窄巷 + 消防栓 + 消防局（詳細層）
 */
export const DETAIL_ZOOM_THRESHOLD = 15;

/**
 * 計算風險等級顏色
 * 基於窄巷密度四分位數分級
 *
 * 數據分析:
 * - Q1 (25%): 2.0 條/km²
 * - Q2 (50%): 6.4 條/km²
 * - Q3 (75%): 18.8 條/km²
 * - Q4 (100%): 45.1 條/km²
 *
 * @param narrowDensity - 窄巷密度 (條/km²)
 * @returns 風險顏色
 */
function getRiskColor(narrowDensity: number): string {
  if (narrowDensity >= 20) return 'rgba(255, 0, 0, 0.85)'    // 紅色：極高風險 (≥Q3)
  if (narrowDensity >= 7)  return 'rgba(255, 102, 0, 0.85)'  // 橘色：高風險 (Q2-Q3)
  if (narrowDensity >= 2)  return 'rgba(255, 170, 0, 0.85)'  // 黃色：中風險 (Q1-Q2)
  return 'rgba(0, 255, 65, 0.85)'                            // 綠色：低風險 (<Q1)
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
  selectedDistrict: string = "all",
) {
  const boundaryLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const currentZoom = useZoomLevel(map);
  const [districts, setDistricts] = useState<District[]>([]);

  // 載入行政區資料
  useEffect(() => {
    getDistricts().then(setDistricts).catch(console.error);
  }, []);

  // 建立並加入圖層
  useEffect(() => {
    if (!map || districts.length === 0) return;

    // 找到 districtGroup 容器
    const districtGroup = map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("id") === "district_map") as LayerGroup;

    if (!districtGroup) {
      console.error("找不到 district_map LayerGroup");
      return;
    }

    // 建立行政區邊界 Features
    const boundaryFeatures = districts.map((d) => {
      const coords = d.geometry.coordinates[0].map((c) =>
        fromLonLat([c[0], c[1]]),
      );
      const polygon = new Polygon([coords]);
      return new Feature({
        geometry: polygon,
        name: d.name,
        area_km2: d.area_km2,
        type: "district_boundary",
      });
    });

    // 建立中心點標記 Features
    const markerFeatures = districts.map((d) => {
      const coords = d.geometry.coordinates[0].map((c) =>
        fromLonLat([c[0], c[1]]),
      );
      const polygon = new Polygon([coords]);
      const extent = polygon.getExtent();
      const center = getCenter(extent);

      return new Feature({
        geometry: new Point(center),
        name: d.name,
        area_km2: d.area_km2,
        narrowDensity: d.narrowDensity || 0,
        type: "district_marker",
      });
    });

    // 建立邊界圖層 (半透明,不填滿)
    const boundaryLayer = new VectorLayer({
      source: new VectorSource({ features: boundaryFeatures }),
      style: new Style({
        stroke: new Stroke({
          color: "rgba(0, 255, 65, 0.4)",
          width: 1.5,
          lineDash: [1, 2],
        }),
        fill: new Fill({
          color: "rgba(251, 255, 0, 0.05)",
        }),
      }),
      properties: { name: "行政區邊界" },
      zIndex: 1,
    });

    // 建立中心點標記圖層
    const markerLayer = new VectorLayer({
      source: new VectorSource({ features: markerFeatures }),
      style: (feature) => {
        const narrowDensity = feature.get("narrowDensity") as number;

        return new Style({
          image: new Circle({
            radius: 15,
            fill: new Fill({
              color: getRiskColor(narrowDensity),
            }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 2,
            }),
          }),
        });
      },
      properties: { name: "行政區標記" },
      zIndex: 2,
    });

    boundaryLayerRef.current = boundaryLayer;
    markerLayerRef.current = markerLayer;

    districtGroup.getLayers().push(boundaryLayer);
    districtGroup.getLayers().push(markerLayer);

    return () => {
      districtGroup.getLayers().remove(boundaryLayer);
      districtGroup.getLayers().remove(markerLayer);
      boundaryLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [map, districts]);

  // 控制邊界顯示/隱藏
  useEffect(() => {
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setVisible(visible);
    }
  }, [visible]);

  // 控制圓形標記顯示/隱藏：zoom < 15 才顯示（總覽層）
  useEffect(() => {
    if (markerLayerRef.current) {
      const shouldShow = currentZoom < DETAIL_ZOOM_THRESHOLD;
      markerLayerRef.current.setVisible(shouldShow);
    }
  }, [currentZoom]);

  // 處理行政區選擇 (縮放地圖)
  useEffect(() => {
    if (!map || !markerLayerRef.current) return;

    if (selectedDistrict === "all") {
      // 縮放到台北市中心（總覽層，zoom < 15）
      map.getView().animate({
        center: TAIPEI_CENTER,
        zoom: 13,
        duration: 1500,
      });
    } else {
      // 縮放到特定行政區（詳細層，固定 zoom 15）
      const district = districts.find((d) => d.name === selectedDistrict);
      if (district) {
        const coords = district.geometry.coordinates[0].map((c) =>
          fromLonLat([c[0], c[1]]),
        );
        const polygon = new Polygon([coords]);
        const extent = polygon.getExtent();
        const center = getCenter(extent);

        // 固定 zoom 到 15，觸發詳細圖層顯示
        map.getView().animate({
          center: center,
          zoom: DETAIL_ZOOM_THRESHOLD,
          duration: 1500,
        });
      }
    }
  }, [map, selectedDistrict, districts]);

  return { boundaryLayerRef, markerLayerRef };
}
