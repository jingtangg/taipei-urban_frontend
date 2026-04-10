/**
 * 行政區圖層管理 Hook
 *
 * 職責:
 * - 管理行政區邊界 WMS 圖層的建立與顯示
 * - 管理行政區名稱文字標籤（Vector，zoom < 15 才顯示）
 * - 處理行政區選擇時的地圖縮放
 *
 * 架構:
 * - 邊界圖層：GeoServer WMS
 *   風險分色樣式由 GeoServer SLD 負責（districts_density SQL View）
 * - 文字標籤：前端 VectorLayer，使用 narrowDensity 決定邊框顏色
 */

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import { TileWMS } from "ol/source";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Style, Text, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import type { District } from "../types/geo";
import { GEOSERVER_WMS_URL, DISTRICT_OVERVIEW_CENTER, DISTRICT_OVERVIEW_ZOOM, DETAIL_ZOOM_THRESHOLD } from "../constants/mapConfig";
import { useZoomLevel } from "./useZoomLevel";


/**
 * 行政區圖層管理 Hook
 * @param map - OpenLayers Map 實例
 * @param visible - 是否顯示圖層
 * @param selectedDistrict - 選中的行政區名稱,'all' 表示顯示全部
 */
/**
 * 計算風險等級顏色（供文字標籤邊框使用）
 */
function getRiskColor(narrowDensity: number): string {
  if (narrowDensity >= 20) return 'rgba(255, 120, 168, 0.96)'
  if (narrowDensity >= 7)  return 'rgba(255, 136, 24, 0.9)'
  if (narrowDensity >= 2)  return 'rgba(255, 170, 0, 0.85)'
  return 'rgba(0, 255, 65, 0.85)'
}

export function useDistrictLayer(
  map: Map | null,
  visible: boolean,
  selectedDistrict: string = "all",
  districts: District[] = [],
) {
  const wmsLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const currentZoom = useZoomLevel(map);

  // 建立並加入 WMS 圖層 + 文字標籤圖層
  useEffect(() => {
    if (!map || districts.length === 0) return;

    const districtGroup = map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("id") === "district_map") as LayerGroup;

    if (!districtGroup) {
      console.error("找不到 district_map LayerGroup");
      return;
    }

    const wmsLayer = new TileLayer({
      source: new TileWMS({
        url: GEOSERVER_WMS_URL,
        params: { LAYERS: "taipei_urban:districts_density", TILED: true },
        serverType: "geoserver",
      }),
      visible,
      properties: { id: "districts_wms" },
    });

    const markerFeatures = districts
      .map((d) => {
        const match = d.label_center.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (!match) {
          console.warn(`[useDistrictLayer] 無法解析 WKT: "${d.label_center}"，略過 ${d.name}`);
          return null;
        }
        const center = fromLonLat([parseFloat(match[1]), parseFloat(match[2])]);
        return new Feature({
          geometry: new Point(center),
          name: d.name,
          narrowDensity: d.narrowDensity || 0,
          type: "district_marker",
        });
      })
      .filter((f): f is Feature => f !== null);

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

    wmsLayerRef.current = wmsLayer;
    markerLayerRef.current = markerLayer;
    districtGroup.getLayers().push(wmsLayer);
    districtGroup.getLayers().push(markerLayer);

    return () => {
      districtGroup.getLayers().remove(wmsLayer);
      districtGroup.getLayers().remove(markerLayer);
      wmsLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [map, districts]);

  // 控制顯示/隱藏
  useEffect(() => {
    wmsLayerRef.current?.setVisible(visible);
  }, [visible]);

  // 文字標籤：zoom < 15 才顯示
  useEffect(() => {
    markerLayerRef.current?.setVisible(currentZoom < DETAIL_ZOOM_THRESHOLD);
  }, [currentZoom]);

  // 縮放動畫
  useEffect(() => {
    if (!map) return;

    if (selectedDistrict === "all") {
      map.getView().animate({
        center: DISTRICT_OVERVIEW_CENTER,
        zoom: DISTRICT_OVERVIEW_ZOOM,
        duration: 1500,
      });
    } else {
      const district = districts.find((d) => d.name === selectedDistrict);
      if (district) {
        const match = district.label_center.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const center = fromLonLat([parseFloat(match![1]), parseFloat(match![2])]);
        map.getView().animate({
          center,
          zoom: DETAIL_ZOOM_THRESHOLD,
          duration: 1500,
        });
      }
    }
  }, [map, selectedDistrict, districts]);

  return { wmsLayerRef, markerLayerRef };
}
