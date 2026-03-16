import { District, Road, FireHydrant, FireStation } from './types/geo';

// Taipei Center: [121.5654, 25.0330]

export const DISTRICTS: District[] = [
  { id: '1', name: '大同區', area_km2: 5.68, geometry: { type: 'Polygon', coordinates: [[[121.50, 25.05], [121.52, 25.05], [121.52, 25.07], [121.50, 25.07], [121.50, 25.05]]] } },
  { id: '2', name: '萬華區', area_km2: 8.85, geometry: { type: 'Polygon', coordinates: [[[121.49, 25.02], [121.51, 25.02], [121.51, 25.05], [121.49, 25.05], [121.49, 25.02]]] } },
  { id: '3', name: '中正區', area_km2: 7.61, geometry: { type: 'Polygon', coordinates: [[[121.50, 25.02], [121.53, 25.02], [121.53, 25.04], [121.50, 25.04], [121.50, 25.02]]] } },
  { id: '4', name: '松山區', area_km2: 9.29, geometry: { type: 'Polygon', coordinates: [[[121.54, 25.04], [121.57, 25.04], [121.57, 25.06], [121.54, 25.06], [121.54, 25.04]]] } },
  { id: '5', name: '大安區', area_km2: 11.36, geometry: { type: 'Polygon', coordinates: [[[121.52, 25.01], [121.55, 25.01], [121.55, 25.04], [121.52, 25.04], [121.52, 25.01]]] } },
  { id: '6', name: '中山區', area_km2: 13.68, geometry: { type: 'Polygon', coordinates: [[[121.52, 25.04], [121.55, 25.04], [121.55, 25.08], [121.52, 25.08], [121.52, 25.04]]] } },
  { id: '7', name: '信義區', area_km2: 11.21, geometry: { type: 'Polygon', coordinates: [[[121.55, 25.02], [121.58, 25.02], [121.58, 25.04], [121.55, 25.04], [121.55, 25.02]]] } },
  { id: '8', name: '文山區', area_km2: 31.51, geometry: { type: 'Polygon', coordinates: [[[121.54, 24.97], [121.60, 24.97], [121.60, 25.01], [121.54, 25.01], [121.54, 24.97]]] } },
  { id: '9', name: '南港區', area_km2: 21.84, geometry: { type: 'Polygon', coordinates: [[[121.59, 25.02], [121.63, 25.02], [121.63, 25.06], [121.59, 25.06], [121.59, 25.02]]] } },
  { id: '10', name: '士林區', area_km2: 62.37, geometry: { type: 'Polygon', coordinates: [[[121.51, 25.08], [121.58, 25.08], [121.58, 25.16], [121.51, 25.16], [121.51, 25.08]]] } },
  { id: '11', name: '內湖區', area_km2: 31.58, geometry: { type: 'Polygon', coordinates: [[[121.56, 25.06], [121.62, 25.06], [121.62, 25.10], [121.56, 25.10], [121.56, 25.06]]] } },
  { id: '12', name: '北投區', area_km2: 56.82, geometry: { type: 'Polygon', coordinates: [[[121.48, 25.11], [121.55, 25.11], [121.55, 25.19], [121.48, 25.19], [121.48, 25.11]]] } },
];

export const ROADS: Road[] = [
  { id: 'r1', name: '西園路一段', district: '萬華區', planned_width: 8, measured_width: 7.5, length_m: 500, category: 'mid', geometry: { type: 'LineString', coordinates: [[121.498, 25.035], [121.502, 25.038]] } },
  { id: 'r2', name: '廣州街窄巷', district: '萬華區', planned_width: 3, measured_width: 2.8, length_m: 200, category: 'narrow', geometry: { type: 'LineString', coordinates: [[121.500, 25.036], [121.501, 25.034]] } },
  { id: 'r3', name: '信義路五段', district: '信義區', planned_width: 40, measured_width: 39.5, length_m: 1200, category: 'wide', geometry: { type: 'LineString', coordinates: [[121.560, 25.033], [121.570, 25.033]] } },
  { id: 'r4', name: '松勤街', district: '信義區', planned_width: 12, measured_width: 11.8, length_m: 400, category: 'wide', geometry: { type: 'LineString', coordinates: [[121.562, 25.031], [121.568, 25.031]] } },
  { id: 'r5', name: '和平東路', district: '大安區', planned_width: 30, measured_width: 29.8, length_m: 1500, category: 'wide', geometry: { type: 'LineString', coordinates: [[121.530, 25.025], [121.545, 25.025]] } },
  { id: 'r6', name: '溫州街窄巷', district: '大安區', planned_width: 4, measured_width: 3.8, length_m: 300, category: 'mid', geometry: { type: 'LineString', coordinates: [[121.532, 25.020], [121.534, 25.022]] } },
  { id: 'r7', name: '迪化街窄巷', district: '大同區', planned_width: 3.2, measured_width: 3.0, length_m: 450, category: 'narrow', geometry: { type: 'LineString', coordinates: [[121.510, 25.055], [121.512, 25.062]] } },
  { id: 'r8', name: '長安東路', district: '中山區', planned_width: 20, measured_width: 19.5, length_m: 800, category: 'wide', geometry: { type: 'LineString', coordinates: [[121.530, 25.048], [121.545, 25.048]] } },
];

export const HYDRANTS: FireHydrant[] = [
  { id: 'h1', type: 'underground', district: '萬華區', geometry: { type: 'Point', coordinates: [121.500, 25.037] } },
  { id: 'h2', type: 'aboveground', district: '萬華區', geometry: { type: 'Point', coordinates: [121.498, 25.034] } },
  { id: 'h3', type: 'underground', district: '信義區', geometry: { type: 'Point', coordinates: [121.565, 25.033] } },
  { id: 'h4', type: 'underground', district: '信義區', geometry: { type: 'Point', coordinates: [121.567, 25.032] } },
  { id: 'h5', type: 'aboveground', district: '大安區', geometry: { type: 'Point', coordinates: [121.535, 25.028] } },
  { id: 'h6', type: 'underground', district: '中山區', geometry: { type: 'Point', coordinates: [121.538, 25.055] } },
  { id: 'h7', type: 'aboveground', district: '大同區', geometry: { type: 'Point', coordinates: [121.512, 25.058] } },
];

export const STATIONS: FireStation[] = [
  { id: 's1', name: '萬華分隊', address: '台北市萬華區桂林路135號', district: '萬華區', geometry: { type: 'Point', coordinates: [121.502, 25.036] } },
  { id: 's2', name: '信義分隊', address: '台北市信義區松仁路1號', district: '信義區', geometry: { type: 'Point', coordinates: [121.568, 25.034] } },
  { id: 's3', name: '大安分隊', address: '台北市大安區復興南路二段92號', district: '大安區', geometry: { type: 'Point', coordinates: [121.543, 25.031] } },
  { id: 's4', name: '中山分隊', address: '台北市中山區長安東路二段', district: '中山區', geometry: { type: 'Point', coordinates: [121.535, 25.048] } },
];
