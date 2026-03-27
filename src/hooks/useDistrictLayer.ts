/**
 * 行政區圖層管理 Hook
 *
 * 職責:
 * - 管理行政區邊界圖層的建立與顯示
 * - 顯示行政區中心點文字標籤,以邊框顏色代表風險密度（粉紅／橘／黃／綠）
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
import { Style, Stroke, Fill, Text } from "ol/style";
import { fromLonLat } from "ol/proj";
import { getCenter } from "ol/extent";
import { useZoomLevel } from "./useZoomLevel";
import { getDistricts } from "../services/urbanApi";
import type { District } from "../types/geo";

export const DISTRICT_OVERVIEW_CENTER = fromLonLat([121.5654, 25.065]);
export const DISTRICT_OVERVIEW_ZOOM = 12.2;

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
  if (narrowDensity >= 20) return 'rgba(255, 120, 168, 0.96)' // 螢光粉紅：極高風險 (≥Q3)
  if (narrowDensity >= 7)  return 'rgba(255, 136, 24, 0.9)'  // 螢光橘：高風險 (Q2-Q3)
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
        narrowDensity: d.narrowDensity || 0,
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
        narrowDensity: d.narrowDensity || 0,
        type: "district_marker",
      });
    });

    // 建立邊界圖層 (半透明,不填滿)
    const boundaryLayer = new VectorLayer({
      source: new VectorSource({ features: boundaryFeatures }),
      style: (feature) => {
        const narrowDensity = feature.get("narrowDensity") as number;
        const riskColor = getRiskColor(narrowDensity);
        const isCriticalRisk = narrowDensity >= 20;
        const riskDash = isCriticalRisk ? [3, 2] : [10, 6];
        const riskWidth = isCriticalRisk ? 1.4 : 1;
        const accentGlowColor = isCriticalRisk
          ? "rgba(255, 120, 168, 0.20)"
          : "rgba(118, 255, 201, 0.22)";

        return [
          new Style({
            stroke: new Stroke({
              color: "rgba(64, 255, 191, 0.08)",
              width: 7,
            }),
            fill: new Fill({
              color: "rgba(4, 12, 10, 0.14)",
            }),
          }),
          new Style({
            stroke: new Stroke({
              color: accentGlowColor,
              width: 2.2,
            }),
          }),
          new Style({
            stroke: new Stroke({
              color: riskColor,
              width: riskWidth,
              lineDash: riskDash,
            }),
          }),
        ];
      },
      properties: { name: "行政區邊界" },
      zIndex: 1,
    });

    // 建立中心點標記圖層
    const markerLayer = new VectorLayer({
      source: new VectorSource({ features: markerFeatures }),
      style: (feature) => {
        const narrowDensity = feature.get("narrowDensity") as number;
        const name = feature.get("name") as string;
        const riskColor = getRiskColor(narrowDensity);

        return new Style({
          text: new Text({
            text: name,
            font: 'bold 13px "Courier New", monospace',
            fill: new Fill({ color: "rgba(232, 255, 240, 0.95)" }),
            backgroundFill: new Fill({ color: "rgba(5, 11, 9, 0.94)" }),
            backgroundStroke: new Stroke({ color: riskColor, width: 1.2 }),
            padding: [7, 16, 7, 16],
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
        center: DISTRICT_OVERVIEW_CENTER,
        zoom: DISTRICT_OVERVIEW_ZOOM,
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
