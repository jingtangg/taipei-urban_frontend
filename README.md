# 防救災空間資料治理元件

## 數位發展部「防災積木元件創新賽」參賽作品

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.x-green.svg)](https://postgis.net/)

本元件為開源後端 API 服務型元件（Service Component），遵循積木式設計原則。

定位為**決策前的防救災空間風險驗證工具（Analytical Planning System）**，協助都發局、消防局、工務局規劃人員在辦公室場景下，將靜態政府圖資轉化為可被驗證的空間假說。

以台北市真實圖資完成效能驗證；採去耦合架構，替換底層 PostGIS 資料源即可部署至任何縣市。

---

## 目錄

- [一、問題描述](#一問題描述problem-statement)
- [二、核心解法](#二核心解法solution)
- [三、元件設計](#三元件設計component-design)
- [四、使用情境](#四使用情境use-cases)
- [試點驗證結果：反向比對](#試點驗證結果反向比對)
- [五、預期效益](#五預期效益expected-impact)
- [六、延伸可能](#六延伸可能extensibility)
- [快速開始](#快速開始quick-start)

---

## 一、問題描述（Problem Statement）

台灣防救災空間資料存在一個系統性的**資料治理盲點**：

> 都市計畫道路寬度（計畫值）與消防局實測窄巷（實測值），是兩套由不同局處維護、從未被系統性空間比對的孤立資料集。

這代表政府規劃人員無法回答最基本的問題：計畫圖上合格的道路，消防局量出來進不進得去？哪些區域存在結構性風險？哪些是消防局現場識別、但計畫圖資從未登錄的隱藏盲點？

**現況：過去十年，城市缺乏任何工具能系統性回答這些問題。**

現有唯一的視覺化紀錄是 2014 年一份民間製作的 Google My Maps，資料自 2016 年起停止更新。消防局清冊以 PDF/CSV 散落，都市計畫圖資是靜態文件——兩套資料從未被整合成可驗證的空間工具。

### 台北市試點數據

整合兩套圖資後，全市 **1,672 條**路段中，有 **202 條**從未被任何系統登記為高風險——這些是消防局在現場識別的風險，但計畫圖資完全空白。合計 **9.18 公里**隱藏盲點，分布於 12 個行政區。

| 資料類別 | 數量 | 長度 | 決策價值 |
|---------|------|------|---------|
| 都市計畫窄巷（僅計畫） | 1,398 條 | 6.21 km | 待實地驗證之法定風險區 |
| 消防局實測新增（僅實測） | **202 條** | 2.97 km | **揭露計畫圖資從未登錄的隱藏盲點** |
| 雙重確認（重疊） | 72 條 | 0.31 km | 需優先編列改善預算之熱點 |
| **總計** | **1,672 條** | **9.18 km** | 全台北市窄巷完整空間畫像 |

### 花蓮縣：問題更為根本

花蓮縣消防局已列管 **427 筆**實測狹小巷道清冊，但花蓮縣都市計畫道路寬度資料至今從未以開放格式公開。在計畫值完全缺失的情況下，任何事前的雙源比對都無從進行。

> 這不是窄巷問題，是**資料治理危機**。

---

## 二、核心解法（Solution）

本元件讓規劃圖資從靜態文件，變成可被驗證的空間假說：

1. **跨局處圖資空間融合**：將都市計畫道路（線型 GIS）、消防局實測清冊（地址文字）、消防栓與消防分隊（點位）匯入 PostGIS，透過空間索引（GIST）進行高速幾何交集運算。

2. **自動識別隱藏盲點**：透過 `matched_road_id` 空間比對去重，識別「消防局已列管、但計畫圖資從未登錄」的路段，提供規劃人員可追溯的數據依據。

3. **漸進式數位賦能**：即使在計畫道路圖資缺失的縣市（如花蓮），本元件仍可先將消防局文字清冊空間化，在地圖上呈現風險分布，再倡議地方政府補齊資料開放缺口。

4. **積木式標準輸出**：統一輸出 GeoJSON RFC 7946 標準格式，供地圖渲染、統計分析、AI Agent 多步驟調用直接串接。

---

## 三、元件設計（Component Design）

### Input（條件設定）

- `district`：行政區名稱，省略則回傳全市
- `category`：窄巷風險類別篩選（`紅區` / `黃區`），省略則回傳全部

### Process（處理邏輯）

- **資料預處理管線**（僅在匯入時執行一次，運行期不依賴外部服務）：

  ```
  消防局清冊（地址文字）
      → Google Geocoding（取得概略座標）
      → ST_Transform（WGS84 → TWD97 / EPSG:3826）
      → ST_DWithin + ST_Distance（鄰近搜尋）
      → ST_ClosestPoint（Snapping 至最近計畫道路線段）
      → matched_road_id（建立空間對應關係）
  ```

- **可信度警示機制**（顯式化不確定性，而非掩蓋誤差）：

  | 警示類型 | 正常 | 中度 ⚠️ | 高度 ❗ |
  |---------|------|--------|--------|
  | 距離偏移（Snapping 距離）| ≤ 30m | 30–50m | > 50m |
  | 路寬偏移（計畫值與實測值差距）| ≤ 8m | 8–30m | > 30m |

- **運行期空間分析：**

  ```
  roads_planned + narrow_alleys_temp
      → ST_Intersects（空間交集比對）
      → SQL CTE 去重（識別三類：僅計畫 / 僅實測 / 雙重確認）
      → 風險分類
      → Laravel Cache TTL 3600s（Dashboard 快取優化）
  ```

- **風險分級依據**（全國通用法規）：

  | 等級 | 寬度 | 法規依據 |
  |------|------|---------|
  | 🔴 極高風險 | < 3.5m | 內政部「劃設消防車輛救災活動空間指導原則」（五層以下消防車通行最低淨寬） |
  | 🟡 高風險 | 3.5–6m | 建築技術規則第 110 條（6m 以上免設防火間隔為次級邊界） |
  | 🟢 一般 | > 6m | 符合防火間隔免設標準 |

消防局清冊的紅區、黃區分類如實呈現，不做二次詮釋——方法論透明度本身就是這個驗證系統的公信力來源。

### Output（分析結果）

- 符合 GeoJSON RFC 7946 標準的 `FeatureCollection`
- 含風險等級、空間座標、路寬差異、偏移警示
- 可供任何標準地圖套件渲染，或供 AI Agent 多步驟調用

### API 端點

> 以下端點以台北市試點部署為例，實際部署可依縣市調整路徑前綴。

```
# 窄巷資料
GET /taipei/api/narrow-alleys?district={district}&category={category}
# category 傳「紅區」或「黃區」，省略則回傳全部

# Dashboard 統計（快取 TTL 3600s）
GET /taipei/api/dashboard/narrow-alley-statistics?district={district}
GET /taipei/api/dashboard/district-rankings
GET /taipei/api/dashboard/hydrant-statistics?district={district}

# 空間圖層
GET /taipei/api/roads/planned?district={district}&category={category}
# category 可傳 narrow（<3.5m）/ mid（3.5–6m）/ wide（>6m）

GET /taipei/api/districts
GET /taipei/api/districts/metadata
GET /taipei/api/fire-hydrants?district={district}
GET /taipei/api/fire-stations?district={district}

限流：throttle:60,1（每分鐘最高 60 次）
```

---

## 四、使用情境（Use Cases）

> 本元件非第一線救災操作工具，使用者為都發局、消防局、工務局規劃人員。
> 使用時機是規劃會議前的資料準備、跨局處協調與預算編列，不是災害發生當下。

### 情境一：都市計畫道路檢討（都發局）

調用 `/taipei/api/narrow-alleys` 分析計畫值與實測值落差最大的路段，行政區密度排名一目瞭然——大同區 43.4 條/km²、中正區 40.6 條/km² 遠超統計四分位數 Q3（18.8 條/km²），可作為判斷防災型都市更新優先啟動區域的科學依據。

### 情境二：消防設備布建規劃（消防局）

結合 `/taipei/api/fire-hydrants` 與窄巷圖層，分析哪些消防栓因周邊窄巷阻隔而無法有效運用，精準規劃替代水源布建位置與消防分隊部署優先順序。

### 情境三：道路工程預算編列（工務局）

調用 `/taipei/api/dashboard/district-rankings` 取得各區窄巷密度排行，結合 202 條隱藏盲點清單，作為狹小巷道拓寬工程的改善優先順序與預算分配依據。

### 情境四：回應花蓮馬太鞍溪堰塞湖情境

花蓮縣消防局 426 筆清冊欄位結構與台北市相容，可透過 Geocoding 與 OSM 道路網 Snapping 完成清冊空間化（成功匯入 380 筆，89%；其餘 42 筆因台灣農村「村→流水編號」門牌制度無正式街路名，Google Geocoding 無法定位）。但由於花蓮縣都市計畫道路寬度資料尚未開放，本案僅借 OSM 幾何定位、不借其寬度數值，風險分級全部依消防局實測值套用全國門檻計算——這是**單源視覺化，並非雙源比對**，與台北市以兩套官方資料互相驗證的架構不同。即使如此，380 筆已完成空間化與風險分級的成果，仍能讓規劃人員看到風險分布地圖；本元件同時以此揭露的資料缺口，倡議花蓮縣政府加速推動都市計畫道路寬度資料開放——補齊計畫值，才能完成雙源比對的數位閉環。

花蓮縣《狹小巷道管理作業程序》定義狹小巷道為 2–7.5m，本元件以全國通用的內政部指導原則（3.5m）重新標準化分級，將各縣市格式不一的清冊統一轉換為可比較的空間風險格式。

### 情境五：AI Agent 多步驟調用

本元件支援標準 REST API，可供防災 AI 助理（如 Claude）自主調用，在多步驟分析中整合空間風險數據，自動生成結構化的分區防災風險評估報告。

---

## 試點驗證結果：反向比對

一、問題描述所述之雙源比對，方向為「消防局實測 → 反查計畫圖資」，識別出 202 條隱藏盲點。本元件同樣支援反向查詢：以都市計畫道路寬度（< 3.5m，對應風險分級表之極高風險標準）篩出候選路段，反查消防局狹小巷道清冊是否已列管，驗證盲點是否為雙向。

| 分類 | 數量 |
|------|----:|
| 計畫值極高風險候選道路 | 35 |
| 消防局已列管驗證 | 1 |
| 尚未現勘 | 34 |

35 條都市計畫圖資已標示為極高風險（<3.5m）的候選道路中，消防局清冊僅包含 1 條，其餘 34 條尚未列入清冊，可作為優先現勘候選。以北投區知行路一帶為例，連續 6 條寬度約 2–3 公尺的巷弄皆未出現在消防局清冊，顯示交叉比對可有效找出值得進一步確認的高風險路段。完整候選清單見下方摺疊區塊。

<details>
<summary>展開查看：台北市極高風險候選道路完整清單（35 條）</summary>

| roads_planned ID | 計畫寬度 | 地址（反查） | 行政區 | 消防局狀態 | 消防局登錄名 |
|---|---|---|---|---|---|
| 19 | 3m | 大度路三段301巷128弄 | 北投區 | ❌ 未發現 | |
| 20 | 3m | 大度路三段301巷 | 北投區 | ❌ 未發現 | |
| 23 | 3m | 大度路三段301巷 | 北投區 | ❌ 未發現 | |
| 72 | 3m | 知行路60巷 | 北投區 | ❌ 未發現 | |
| 74 | 3m | 知行路34巷 | 北投區 | ❌ 未發現 | |
| 75 | 3m | 知行路4巷 | 北投區 | ❌ 未發現 | |
| 76 | 3m | 知行路2巷 | 北投區 | ❌ 未發現 | |
| 80 | 3m | 知行路1巷 | 北投區 | ❌ 未發現 | |
| 81 | 3m | 知行路3巷 | 北投區 | ❌ 未發現 | |
| 82 | 3m | 知行路5巷 | 北投區 | ❌ 未發現 | |
| 83 | 3m | 知行路7巷 | 北投區 | ❌ 未發現 | |
| 111 | 3m | 中央北路四段583巷 | 北投區 | ❌ 未發現 | |
| 112 | 3m | 中央北路四段583巷11弄 | 北投區 | ✅ 已發現 | 中央北路4段583巷11弄（紅區） |
| 113 | 3m | 中央北路四段577巷27弄 | 北投區 | ❌ 未發現 | |
| 114 | 3m | 中央北路四段583巷 | 北投區 | ❌ 未發現 | |
| 2058 | 2m | 峨眉街 | 萬華區 | ❌ 未發現 | |
| 2106 | 2.7m | 博愛路160巷 | 中正區 | ❌ 未發現 | |
| 2107 | 2.7m | 博愛路160巷 | 中正區 | ❌ 未發現 | |
| 3652 | 3m | 北平西路（側車道） | 中正區 | ❌ 未發現 | |
| 3665 | 2.2m | 太原路22巷 | 大同區 | ❌ 未發現 | |
| 5597 | 3m | 齊東街82巷 | 中正區 | ❌ 未發現 | |
| 5992 | 2m | 中山北路二段65巷24弄 | 中山區 | ❌ 未發現 | |
| 6306 | 3m | 中正路349巷 | 士林區 | ❌ 未發現 | |
| 10113 | 3.25m | 新生南路一段103巷 | 大安區 | ❌ 未發現 | |
| 10321 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 10322 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 10323 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 10537 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 10538 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 10539 | 3m | 建國北路二段96巷2弄 | 中山區 | ❌ 未發現 | |
| 13507 | 3m | 紫雲街 | 信義區 | ❌ 未發現 | |
| 14056 | 3m | 松隆路329巷 | 信義區 | ❌ 未發現 | |
| 14132 | 3m | 八德路四段763巷 | 松山區 | ❌ 未發現 | |
| 20037 | 3m | 饒河街 | 松山區 | ❌ 未發現 | |
| 21355 | 2m | 漢口街一段80巷 | 中正區 | ❌ 未發現 | |

</details>

---

## 五、預期效益（Expected Impact）

- **數據貢獻**：台北試點識別 202 條、9.18 公里從未登記的高風險路段，填補十年資料斷層；反向比對亦發現 35 條計畫值極高風險候選道路中，僅 1 條已列入消防局清冊，其餘 34 條可作為優先現勘候選，顯示兩套資料具有互補價值；花蓮縣 426 筆清冊欄位結構相容，89%（380/426）成功完成單源空間化視覺化，惟受限於計畫值資料缺失，尚無法進行雙源比對。

- **漸進式部署**：即使計畫值缺失（如花蓮），仍可完成消防清冊空間化，提供基礎風險視覺化與改善優先順序依據。

- **政策倡議**：揭露花蓮縣計畫道路資料開放缺口，推動數位閉環所需的前置政策條件。

- **技術可遷移**：去耦合架構，任何縣市替換 PostGIS 資料源即可部署，無需重新開發。

---

## 六、延伸可能（Extensibility）

1. **跨縣市部署**：替換底層 PostGIS 空間資料源，複製至全台任何縣市。花蓮縣消防局 426 筆清冊（地址文字格式）可透過 Geocoding + OSM 道路網 Snapping 處理為標準幾何資料，匯入後即可透過同一套 API 架構提供單源視覺化查詢——驗證了「去耦合架構」可服務計畫值缺失的縣市，不需重新開發。

2. **推動計畫道路資料開放**：花蓮縣計畫道路尚未以 SHP/GeoJSON 公開，是完整落地的前置政策條件。

3. **事件驅動防災**：未來可結合民生公共物聯網 IoT 感測器（雨量計、水位計），感測值超標時自動調降道路通行評等，實現動態風險更新。

4. **路網導航整合**：整合 pgRouting，提供規劃人員辦公室端的救災路徑模擬分析。

---

## 快速開始（Quick Start）

### 環境需求

- PHP 8.2+ / Composer 2
- PostgreSQL 14+（含 PostGIS 3.4 擴充）
- GeoServer 2.x（地圖服務，可選）
- Docker（建議）

### 安裝

```bash
git clone https://github.com/jingtangg/taipei-urban.git
cd taipei-urban
cp .env.example .env
# 設定 DB_HOST / DB_DATABASE / DB_USERNAME / DB_PASSWORD
docker-compose up -d
php artisan migrate
php artisan serve
```

### Client Sample Code

```javascript
// 取得全市行政區窄巷密度排名
const response = await fetch('/taipei/api/dashboard/district-rankings');
const { data } = await response.json();
// data.rankings → [{ district: '大同區', count: 208, density: 43.4 }, ...]

// 取得指定行政區極高風險窄巷 GeoJSON
const geoResponse = await fetch(
  '/taipei/api/narrow-alleys?district=大同區&category=紅區'
);
const geojson = await geoResponse.json();
// → GeoJSON FeatureCollection，符合 RFC 7946 標準，可供任何標準地圖套件渲染

// 取得消防栓統計
const hydrantResponse = await fetch(
  '/taipei/api/dashboard/hydrant-statistics?district=大同區'
);
const { data: hydrantData } = await hydrantResponse.json();
```

### OpenAPI 規格

```yaml
openapi: 3.0.0
info:
  title: 防救災空間資料治理元件 API
  version: 1.0.0

components:
  schemas:
    # ── GeoJSON 幾何型別（RFC 7946，座標順序：[longitude, latitude]）──
    PointGeometry:
      type: object
      required: [type, coordinates]
      properties:
        type: { type: string, enum: [Point] }
        coordinates:
          type: array
          description: "[longitude, latitude]，WGS84 (EPSG:4326)"
          items: { type: number }
          minItems: 2
          maxItems: 2

    LineStringGeometry:
      type: object
      required: [type, coordinates]
      properties:
        type: { type: string, enum: [LineString] }
        coordinates:
          type: array
          items:
            type: array
            items: { type: number }
            minItems: 2
            maxItems: 2

    # ── GeoJSON Feature 基底 ──
    GeoJSONFeature:
      type: object
      required: [type, geometry, properties]
      properties:
        type: { type: string, enum: [Feature] }
        geometry: { type: object }
        properties: { type: object }

    # ── 各端點的 properties schema ──
    FireHydrantProperties:
      type: object
      required: [id, wpid, type, district]
      properties:
        id: { type: string }
        wpid: { type: string, description: 自來水事業處消防栓編號 }
        type: { type: string, description: "地上式消防栓 / 地下式消防栓" }
        district: { type: string }

    FireStationProperties:
      type: object
      required: [id, name, address]
      properties:
        id: { type: string }
        name: { type: string }
        address: { type: string }

    NarrowAlleyProperties:
      type: object
      required: [id, alley_name, district, category, width_m, risk_level]
      properties:
        id: { type: string }
        alley_name: { type: string }
        district: { type: string }
        category:
          type: string
          enum: [紅區, 黃區]
          description: "消防局風險分類（如實呈現）"
        width_m: { type: number, description: 消防局實測寬度（公尺） }
        risk_level:
          type: string
          enum: [極高風險, 高風險, 一般]
          description: "後端依 width_m 計算：< 3.5m 極高風險 / 3.5–6m 高風險 / ≥ 6m 一般"
        road_width: { type: number, nullable: true, description: 對應計畫道路寬度（公尺） }
        snap_distance_m: { type: number, nullable: true, description: "Snapping 距離（公尺），> 50m 表示高度不確定性" }

    RoadPlannedProperties:
      type: object
      required: [id, road_width, width_m, width_category, risk_level]
      properties:
        id: { type: string }
        road_width: { type: string, description: 原始計畫道路寬度標記 }
        width_m: { type: number, description: 計畫道路寬度（公尺） }
        width_category:
          type: string
          enum: [narrow, mid, wide]
          description: "narrow < 3.5m / mid 3.5–6m / wide ≥ 6m"
        risk_level:
          type: string
          enum: [極高風險, 高風險, 一般]
          description: "後端依 width_m 計算：< 3.5m 極高風險 / 3.5–6m 高風險 / ≥ 6m 一般"

paths:
  /taipei/api/fire-hydrants:
    get:
      summary: 消防栓點位
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      type: { type: string, enum: [FeatureCollection] }
                      features:
                        type: array
                        items:
                          allOf:
                            - $ref: '#/components/schemas/GeoJSONFeature'
                            - type: object
                              properties:
                                geometry:
                                  $ref: '#/components/schemas/PointGeometry'
                                properties:
                                  $ref: '#/components/schemas/FireHydrantProperties'

  /taipei/api/fire-stations:
    get:
      summary: 消防隊點位
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      type: { type: string, enum: [FeatureCollection] }
                      features:
                        type: array
                        items:
                          allOf:
                            - $ref: '#/components/schemas/GeoJSONFeature'
                            - type: object
                              properties:
                                geometry:
                                  $ref: '#/components/schemas/PointGeometry'
                                properties:
                                  $ref: '#/components/schemas/FireStationProperties'

  /taipei/api/narrow-alleys:
    get:
      summary: 消防局實測窄巷
      description: |
        每筆資料對應一條已透過 ST_ClosestPoint 空間比對至計畫道路的窄巷路段。
        snap_distance_m 欄位提供可信度警示。
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
        - name: category
          in: query
          schema:
            type: string
            enum: [紅區, 黃區]
          description: 消防局風險分類（省略則回傳全部）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      type: { type: string, enum: [FeatureCollection] }
                      features:
                        type: array
                        items:
                          allOf:
                            - $ref: '#/components/schemas/GeoJSONFeature'
                            - type: object
                              properties:
                                geometry:
                                  $ref: '#/components/schemas/LineStringGeometry'
                                properties:
                                  $ref: '#/components/schemas/NarrowAlleyProperties'

  /taipei/api/roads/planned:
    get:
      summary: 都市計畫道路
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
        - name: category
          in: query
          schema:
            type: string
            enum: [narrow, mid, wide]
          description: 寬度分級（省略則回傳全部）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      type: { type: string, enum: [FeatureCollection] }
                      features:
                        type: array
                        items:
                          allOf:
                            - $ref: '#/components/schemas/GeoJSONFeature'
                            - type: object
                              properties:
                                geometry:
                                  $ref: '#/components/schemas/LineStringGeometry'
                                properties:
                                  $ref: '#/components/schemas/RoadPlannedProperties'

  /taipei/api/districts:
    get:
      summary: 行政區列表（不含空間資料）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      tableList:
                        type: array
                        items:
                          type: object
                          properties:
                            id: { type: string }
                            name: { type: string }
                            area_km2: { type: number }
                      total: { type: integer }

  /taipei/api/districts/metadata:
    get:
      summary: 行政區元資料（中心點 + 窄巷密度）
      description: 幾何邊界由 GeoServer WMS 負責，此端點僅提供元資料
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      tableList:
                        type: array
                        items:
                          type: object
                          properties:
                            id: { type: string }
                            name: { type: string }
                            area_km2: { type: number }
                            label_center:
                              type: string
                              description: "WKT 格式中心點，例：POINT(121.517 25.033)"
                            narrowDensity:
                              type: number
                              description: 窄巷密度（條/km²）
                      total: { type: integer }

  /taipei/api/dashboard/narrow-alley-statistics:
    get:
      summary: 窄巷統計
      description: |
        三類路段：
        - planned：計畫道路 risk_level ≠ 一般（width_m < 6m）
        - overlap：計畫與實測雙重確認熱點
        - new_discovered：消防局實測但計畫圖資從未登錄的隱藏盲點
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    required: [total, planned, overlap, new_discovered]
                    properties:
                      total: { type: integer, example: 1672 }
                      planned: { type: integer, example: 1470 }
                      overlap: { type: integer, example: 72 }
                      new_discovered: { type: integer, example: 202 }

  /taipei/api/dashboard/district-rankings:
    get:
      summary: 行政區密度排名
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      rankings:
                        type: array
                        items:
                          type: object
                          required: [rank, district, total_count, density]
                          properties:
                            rank: { type: integer }
                            district: { type: string }
                            total_count: { type: integer, description: 窄巷總條數 }
                            density: { type: number, description: 窄巷密度（條/km²） }

  /taipei/api/dashboard/hydrant-statistics:
    get:
      summary: 消防栓統計
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱（省略則回傳全市）
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    required: [total_count, density, service_radius]
                    properties:
                      total_count: { type: integer, example: 21870 }
                      density: { type: number, description: 消防栓密度（個/km²）, example: 81.4 }
                      service_radius: { type: integer, description: 理論服務半徑（公尺）, example: 63 }
```

### 資料來源

| 資料集 | 提供機關 | 格式 |
|--------|---------|------|
| 臺北市道路寬度 | 台北市都市發展局 | Shapefile |
| 臺北市狹小巷道清冊 | 台北市消防局 | CSV / PDF |
| 大臺北地區消防栓分布點位圖 | 台北自來水事業處 | CSV |
| 臺北市政府消防局各單位通訊錄 | 台北市消防局 | CSV |
| 台北市行政區界圖 | 台北市政府 | Shapefile |
| 花蓮縣列管狹小巷道清冊 | 花蓮縣消防局 | XLS |

### AI 使用說明

開發過程使用生成式 AI（Claude）輔助程式碼撰寫與架構設計。元件運行時完全不依賴 AI，但輸出的標準 GeoJSON 格式設計上支援 AI Agent 直接調用。