# 防救災空間資料治理元件
## 數位發展部「防災積木元件創新賽」參賽作品

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.x-green.svg)](https://postgis.net/)

本元件為開源後端 API 服務型元件（Service Component），遵循積木式設計原則。
定位為決策前的防救災空間風險驗證工具（Analytical Planning System）——協助都發局、消防局、工務局規劃人員在辦公室場景下，將靜態政府圖資轉化為可被驗證的空間假說。

以台北市真實圖資完成效能驗證；採去耦合架構，替換底層 PostGIS 資料源即可部署至任何縣市。

---

## 一、問題描述（Problem Statement）

台灣防救災空間資料存在一個系統性的**資料治理盲點**：

> 都市計畫道路寬度（計畫值）與消防局實測窄巷（實測值），是兩套由不同局處維護、從未被系統性空間比對的孤立資料集。

這代表政府規劃人員無法回答最基本的問題：計畫圖上合格的道路，消防局量出來進不進得去？哪些區域存在結構性風險？哪些是消防局現場識別、但計畫圖資從未登錄的隱藏盲點？

**現況：過去十年，城市缺乏任何工具能系統性回答這些問題。**

現有唯一的視覺化紀錄是 2014 年一份民間製作的 Google My Maps，資料自 2016 年起停止更新。消防局清冊以 PDF/CSV 散落，都市計畫圖資是靜態文件——兩套資料從未被整合成可驗證的空間工具。

**台北市試點數據證明了這個盲點的嚴峻性：**

整合兩套圖資後，全市 1,672 條路段中，有 202 條從未被任何系統登記為高風險——這些是消防局在現場識別的風險，但計畫圖資完全空白。合計 9.18 公里隱藏盲點，分布於 12 個行政區。

| 資料類別 | 數量 | 長度 | 決策價值 |
|---------|------|------|---------|
| 都市計畫窄巷（僅計畫） | 1,398 條 | 6.21 km | 待實地驗證之法定風險區 |
| 消防局實測新增（僅實測） | 202 條 | 2.97 km | 揭露計畫圖資從未登錄的隱藏盲點 |
| 雙重確認（重疊） | 72 條 | 0.31 km | 需優先編列改善預算之熱點 |
| 總計 | 1,672 條 | 9.18 km | 全台北市窄巷完整空間畫像 |

**以花蓮縣為例，問題更為根本：**

花蓮縣消防局已列管 427 筆實測狹小巷道清冊（.xls），但花蓮縣都市計畫道路寬度資料至今從未以開放格式公開。在計畫值完全缺失的情況下，任何事前的雙源比對都無從進行。

> 這不是窄巷問題，是資料治理危機。

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

**資料預處理管線（僅在匯入時執行一次，運行期不依賴外部服務）：**

```
消防局清冊（地址文字）
    → Google Geocoding（取得概略座標）
    → ST_Transform（WGS84 → TWD97 / EPSG:3826）
    → ST_DWithin + ST_Distance（鄰近搜尋）
    → ST_ClosestPoint（Snapping 至最近計畫道路線段）
    → matched_road_id（建立空間對應關係）
```

**可信度警示機制（顯式化不確定性，而非掩蓋誤差）：**

| 警示類型 | 正常 | 中度 ⚠️ | 高度 ❗ |
|---------|------|--------|--------|
| 距離偏移（Snapping 距離）| ≤ 30m | 30–50m | > 50m |
| 路寬偏移（計畫值與實測值差距）| ≤ 8m | 8–30m | > 30m |

**運行期空間分析：**

```
roads_planned + narrow_alleys_temp
    → ST_Intersects（空間交集比對）
    → SQL CTE 去重（識別三類：僅計畫 / 僅實測 / 雙重確認）
    → 風險分類
    → Laravel Cache TTL 3600s（Dashboard 快取優化）
```

**風險分級依據（全國通用法規）：**

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

### 目標用戶：政府規劃決策層（辦公室非現場場景）

本元件非第一線救災操作工具，使用者為都發局、消防局、工務局規劃人員，使用時機是規劃會議前的資料準備、跨局處協調與預算編列，不是災害發生當下。

---

**情境一：都市計畫道路檢討（都發局）**

調用 `/taipei/api/narrow-alleys` 分析計畫值與實測值落差最大的路段，行政區密度排名一目瞭然——大同區 43.4 條/km²、中正區 40.6 條/km² 遠超統計四分位數 Q3（18.8 條/km²），可作為判斷防災型都市更新優先啟動區域的科學依據。

**情境二：消防設備布建規劃（消防局）**

結合 `/taipei/api/fire-hydrants` 與窄巷圖層，分析哪些消防栓因周邊窄巷阻隔而無法有效運用，精準規劃替代水源布建位置與消防分隊部署優先順序。

**情境三：道路工程預算編列（工務局）**

調用 `/taipei/api/dashboard/district-rankings` 取得各區窄巷密度排行，結合 202 條隱藏盲點清單，作為狹小巷道拓寬工程的改善優先順序與預算分配依據。

**情境四：回應花蓮馬太鞍溪堰塞湖情境**

花蓮縣消防局 427 筆清冊格式與台北市高度相容，可直接匯入進行同等分析。即使計畫值缺失，本元件仍可先完成清冊空間化，讓規劃人員看到風險分布地圖；並以元件揭露的資料缺口，倡議花蓮縣政府加速推動都市計畫道路寬度資料開放——補齊計畫值，才能完成雙源比對的數位閉環。

花蓮縣《狹小巷道管理作業程序》定義狹小巷道為 2–7.5m，本元件以全國通用的內政部指導原則（3.5m）重新標準化分級，將各縣市格式不一的清冊統一轉換為可比較的空間風險格式。

**情境五：AI Agent 多步驟調用（加分亮點）**

本元件支援標準 REST API，可供防災 AI 助理（如 Claude）自主調用，在多步驟分析中整合空間風險數據，自動生成結構化的分區防災風險評估報告。

---

## 五、預期效益（Expected Impact）

- **數據貢獻**：台北試點識別 202 條、9.18 公里從未登記的高風險路段，填補十年資料斷層；花蓮縣 427 筆清冊格式相容，可直接匯入進行同等分析。
- **漸進式部署**：即使計畫值缺失（如花蓮），仍可完成消防清冊空間化，提供基礎風險視覺化與改善優先順序依據。
- **政策倡議**：揭露花蓮縣計畫道路資料開放缺口，推動數位閉環所需的前置政策條件。
- **技術可遷移**：去耦合架構，任何縣市替換 PostGIS 資料源即可部署，無需重新開發。

---

## 六、延伸可能（Extensibility）

1. **跨縣市部署**：替換底層 PostGIS 空間資料源，複製至全台任何縣市；花蓮 427 筆清冊可直接匯入。
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
paths:
  /taipei/api/narrow-alleys:
    get:
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: 行政區名稱，省略則回傳全市
        - name: category
          in: query
          schema:
            type: string
            enum: [紅區, 黃區]
          description: 風險類別，省略則回傳全部
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
                    description: GeoJSON FeatureCollection (RFC 7946)
  /taipei/api/dashboard/district-rankings:
    get:
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
                          properties:
                            district: { type: string }
                            count: { type: integer }
                            density: { type: number }
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
