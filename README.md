# 台北市都市防災地圖｜前端

台北市道路寬度、窄巷分布、消防設施的互動式 GIS 地圖，協助評估都市防災韌性。以行政區為單位篩選資料，疊合「計畫道路」與「消防局實測窄巷」兩個資料來源，標示消防車通道風險路段，並顯示消防栓覆蓋密度統計。

> **後端 API**：[taipei-urban](https://github.com/jingtangg/taipei-urban)（Laravel 12 + PostgreSQL/PostGIS + GeoServer）

---

## 功能特色

**地圖互動**
- 多圖層疊合：計畫道路（依路寬分色）、消防局實測窄巷、消防栓（地上/地下分色）、消防局、行政區密度熱圖（GeoServer WMS）
- Click Popup：點擊任一地物顯示詳細屬性（路名、路寬、偏移距離、風險等級、資料品質警示）
- 底圖切換：OSM 街道圖 ↔ ArcGIS 衛星影像
- Zoom 分層顯示：`< 15` 只顯示行政區名稱與 WMS 密度底圖；`≥ 15` 展開道路、窄巷、消防設施等詳細圖層
- 座標列：即時顯示滑鼠位置的 TWD97 TM2 座標

**側欄與統計**
- 左側：行政區下拉選單、窄巷統計（計畫 / 實測新發現 / 重疊）、消防栓密度與服務半徑
- 全台北市模式下額外顯示 12 行政區密度排名
- 右側：圖層開關、底圖選擇、色票說明

**視覺主題**
- Terminal / Matrix 風格：`#00ff41`（翠綠）on `#0a0a0a`（黑），風險以紅／黃色階標示

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript |
| 建置工具 | Vite |
| 地圖引擎 | **OpenLayers**（OL Overlay、LayerGroup、VectorLayer） |
| 座標系統 | proj4（TWD97 TM2 EPSG:3826 ↔ WGS84 EPSG:4326） |
| HTTP 客戶端 | axios（含 AbortController 請求取消） |
| UI | Tailwind CSS |
| 動畫 | Motion（Framer Motion） |
| 圖示 | lucide-react |
| 狀態管理 | 原生 React Hooks（無外部狀態庫） |

---

## 程式架構

```
┌─────────────────────────────────────────────────────────────────┐
│ Page 層                                                          │
│ src/pages/MapPage.tsx                                            │
│   統籌左右側欄（統計、圖層控制）、下拉選單、座標列               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI / 互動層                                                      │
│                                                                  │
│  Map.tsx                          ApiStateView.tsx               │
│    整合所有地圖 Hooks               統一處理 useApi 三態          │
│    click popup / OL Overlay        error / loading / data        │
│                                    供 MapPage 統計區塊使用        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ React Hook 層                                                    │
│                                                                  │
│  資料擷取                       地圖圖層管理                      │
│  useApi.ts ──────────────────→ useDistrictLayer.ts (WMS+Label)  │
│    泛型 fetch + cancellation    useRoadLayer.ts                  │
│    { data, loading, error }     useNarrowAlleyLayer.ts           │
│                                 useFireLayers.ts                 │
│                                 useMapInit.ts                    │
│                                 useZoomLevel.ts                  │
└─────────────────────────────────────────────────────────────────┘
          ↓                                ↓
┌─────────────────────┐    ┌──────────────────────────────────────┐
│ 工具與轉換層         │    │ 視覺樣式層                           │
│ utils/              │    │ styles/                              │
│   geoTransform.ts   │    │   fireStyles.ts  (消防栓/消防局)     │
│   riskUtils.ts      │    │   layerStyles.ts (道路/窄巷)         │
│   popupUtils.ts     │    └──────────────────────────────────────┘
└─────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 設定常數層（單一來源，無 magic number）                           │
│ constants/                                                       │
│   mapConfig.ts             GeoServer URL、視角中心、Zoom 門檻    │
│   riskThresholds.ts        路寬風險分級 (3.5m / 6m)             │
│   dataQualityThresholds.ts 偏移警示門檻 (30/8/50/30m)           │
│   colors.ts                跨檔案共用色票                        │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 型別定義層                                                       │
│ types/geo.ts                                                     │
│   GeoJSONPoint · GeoJSONLineString          幾何型別             │
│   RoadFeatureProps · NarrowAlleyFeatureProps 圖層屬性            │
│   FireHydrantFeatureProps · FireStationFeatureProps              │
│   PopupFeatureProps  (discriminated union)  OL 邊界型別包層      │
│   District · DistrictBasic · 統計型別                           │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 領域 API 層                                                      │
│ services/urbanApi.ts                                             │
│   getDistrictList()  getDistrictMetadata()  getRoads()          │
│   getNarrowAlleys()  getFireHydrants()  getFireStations()       │
│   getNarrowAlleyStatistics()  getHydrantStatistics()  ...       │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ HTTP 層                                                          │
│ services/api.ts                                                  │
│   apiQuery()  resolveApiUrl()  axios client                     │
└─────────────────────────────────────────────────────────────────┘
          ↓                                ↓
┌─────────────────┐             ┌──────────────────────────────┐
│  Laravel API    │             │  GeoServer WMS               │
│  JSON 資料       │             │  行政區邊界 + SLD 分色渲染    │
│  (roads/alleys/ │             │  districts_density SQL View  │
│   hydrants/...) │             │  → 靜態 Tile 輸出            │
└─────────────────┘             └──────────────────────────────┘
```

---

## 設計說明

**Zoom 分層策略**

| Zoom 層級 | 顯示內容 |
|-----------|---------|
| `< 15` | 行政區名稱標籤 + GeoServer WMS 密度熱圖 |
| `≥ 15` | 計畫道路、窄巷、消防栓、消防局 |

切換行政區時地圖自動飛行定位，放大至 zoom 15 觸發詳細圖層載入。

**雙資料源比對**

計畫道路（都市計畫資料）以虛線呈現，消防局實測窄巷以實線呈現，疊合後可直接目視兩份資料的吻合程度與偏移量。`useRoadLayer` 僅在選定單一行政區時才向 API 請求，避免全市資料量過大。

**風險色階**

| 路寬 | 等級 | 顏色 |
|------|------|------|
| `< 3.5m` | 極高風險（消防車無法通行） | 紅 |
| `3.5–6m` | 高風險（通行受限） | 黃 |
| `≥ 6m` | 一般 | — |

**消防栓樣式區分**

地上栓（實心青色菱形）與地下栓（空心淺藍菱形）以不同 OL 樣式分開標示，反映實地可及性差異。

---

## 快速開始

### 環境需求

- Node.js 18+
- 後端 API 已啟動（預設 `http://localhost:8000`）
- GeoServer 已啟動（預設 `http://localhost:8090`）

### 安裝與執行

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 填入實際 API 與 GeoServer 位址

# 3. 啟動開發伺服器
npm run dev
```

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `VITE_API_URL` | Laravel API 基底 URL | `http://localhost:8000/taipei/api` |
| `VITE_GEOSERVER_URL` | GeoServer WMS Endpoint | `http://localhost:8090/geoserver/taipei_urban/wms` |

---

## 專案結構

```
src/
├── pages/
│   └── MapPage.tsx              # 頁面根元件，管理全域狀態
├── components/
│   ├── Map.tsx                  # OL 地圖容器，整合所有圖層 Hooks
│   └── ApiStateView.tsx         # 泛型三態（loading / error / data）包裝
├── hooks/
│   ├── useApi.ts                # 泛型 fetch + AbortController
│   ├── useMapInit.ts            # OL Map 初始化，OSM / ArcGIS 底圖
│   ├── useDistrictLayer.ts      # WMS 圖層 + 行政區名稱標籤
│   ├── useRoadLayer.ts          # 計畫道路（虛線，路寬 < 6m）
│   ├── useNarrowAlleyLayer.ts   # 實測窄巷（實線）
│   ├── useFireLayers.ts         # 消防栓 + 消防局
│   └── useZoomLevel.ts          # 監聽 OL zoom 變化
├── services/
│   ├── api.ts                   # axios 客戶端，dev/prod 錯誤處理
│   └── urbanApi.ts              # 領域 API（9 個端點）
├── types/
│   └── geo.ts                   # GeoJSON 型別 + Popup discriminated union
├── constants/
│   ├── mapConfig.ts             # URL、中心點、zoom 門檻
│   ├── riskThresholds.ts        # 3.5m / 6m
│   ├── dataQualityThresholds.ts # 偏移警示門檻
│   └── colors.ts                # #00ff41 / #ff4444 / #ffaa00
├── utils/
│   ├── geoTransform.ts          # API GeoJSON → OL Feature
│   ├── riskUtils.ts             # 路寬 → 風險等級文字
│   └── popupUtils.ts            # Popup HTML 組裝（terminal 樣式）
└── styles/
    ├── fireStyles.ts            # 消防栓（地上/地下）、消防局樣式
    └── layerStyles.ts           # 道路（虛線）、窄巷（實線）樣式
```
