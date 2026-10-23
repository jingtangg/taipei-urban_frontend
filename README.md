# Disaster Prevention Spatial Data Governance Component

## Submission for the Ministry of Digital Affairs (MODA) "Disaster Prevention Building Block Component Innovation Competition"

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.x-green.svg)](https://postgis.net/)

An open-source backend API service component following building-block design principles.

Positioned as a **pre-decision disaster prevention spatial risk validation tool (Analytical Planning System)**, it helps urban planners at the Urban Development Bureau, Fire Department, and Department of Public Works transform static government geospatial data into verifiable spatial hypotheses — from their desks, before planning meetings.

Performance-validated with real Taipei City geospatial data. Decoupled architecture: swap the underlying PostGIS data source to deploy in any city or county.

---

## Table of Contents

- [1. Problem Statement](#1-problem-statement)
- [2. Solution](#2-solution)
- [3. Component Design](#3-component-design)
- [4. Use Cases](#4-use-cases)
- [Pilot Validation: Reverse Comparison](#pilot-validation-reverse-comparison)
- [5. Expected Impact](#5-expected-impact)
- [6. Extensibility](#6-extensibility)
- [Quick Start](#quick-start)

---

## 1. Problem Statement

Taiwan's disaster prevention geospatial data has a systemic **data governance blind spot**:

> Urban-planned road widths (planned values) and fire department field-surveyed narrow alleys (measured values) are two isolated datasets — maintained by separate government agencies, never systematically cross-referenced in space.

This means planners cannot answer the most fundamental questions: Can fire trucks actually access roads that pass on the planning map? Which areas have structural risk? Which segments have been identified by fire departments in the field but are not flagged as narrow in the planning data (planned width ≥ 6 m)?

**The reality: for the past decade, cities have had no tool to systematically answer these questions.**

The only existing visualization was a community-made Google My Maps from 2014, last updated in 2016. Fire department registries are scattered across PDF and CSV files; urban planning data remains static documents — the two datasets have never been integrated into a verifiable spatial tool.

### Taipei City Pilot Data

After integrating both datasets, **202 out of 1,672 total road segments** citywide are Fire Department field records located on roads the planning data lists as 6 m or wider — risks identified on the ground, but invisible in the planning data because those roads are not classified as narrow. Together they span **2.91 km**, distributed across 12 administrative districts.

| Data Category | Count | Length | Decision Value |
|--------------|-------|--------|---------------|
| Urban-planned narrow alleys (plan only) | 1,398 | 6.21 km | Legally designated risk zones awaiting field verification |
| Fire dept. field-surveyed additions (survey only) | **202** | 2.91 km | **Reveals hidden blind spots invisible in planning data (planned width ≥ 6 m)** |
| Dual-confirmed (overlapping) | 72 | 0.31 km | Priority hotspots for immediate budget allocation |
| **Total** | **1,672** | **9.43 km** | Complete spatial picture of narrow alleys across Taipei City |

> Counts are by record; the 274 field-survey records map to 253 distinct roads.

### Hualien County: A More Fundamental Problem

Hualien County Fire Department has registered **426** field-surveyed narrow alleys, yet Hualien County's urban-planned road width data has never been published in any open format. Without planned values, any dual-source spatial comparison is simply impossible.

> This is not a narrow alley problem. It is a **data governance crisis**.

---

## 2. Solution

This component transforms static planning data into verifiable spatial hypotheses:

1. **Cross-agency geospatial fusion**: Imports urban-planned roads (line GIS), fire department field registries (address text), fire hydrants, and fire stations (point data) into PostGIS, enabling high-speed geometric intersection queries via spatial indexing (GiST).

2. **Automatic hidden blind spot detection**: Uses `matched_road_id` spatial deduplication to identify segments that "fire departments have registered but that are not flagged as narrow in the planning data (planned width ≥ 6 m)", providing planners with a traceable data basis.

3. **Incremental digital enablement**: Even in counties where planned road data is missing (e.g., Hualien), this component can first spatialize fire department text registries — visualizing risk distribution on a map — then advocate for local government to fill the open data gap.

4. **Building-block standardized output**: Outputs GeoJSON RFC 7946 format uniformly, ready for direct integration with map rendering, statistical analysis, or multi-step AI Agent calls.

---

## 3. Component Design

### Input

- `district`: Administrative district name; omit to return all districts citywide
- `category`: Narrow alley risk category filter (`紅區` / `黃區` — red zone / yellow zone); omit to return all

### Process

- **Data preprocessing pipeline** (runs once at import; no runtime dependency on external services):

  ```
  Fire dept. registry (address text)
      → Google Geocoding (obtain approximate coordinates)
      → ST_Transform (WGS84 → TWD97 / EPSG:3826)
      → ST_DWithin + ST_Distance (proximity search)
      → ST_ClosestPoint (snap to nearest planned road segment)
      → matched_road_id (establish spatial correspondence)
  ```

- **Confidence warning system** (makes uncertainty explicit rather than hiding error):

  | Warning Type | Normal | Moderate ⚠️ | High ❗ |
  |-------------|--------|------------|--------|
  | Offset distance (snapping distance) | ≤ 30m | 30–50m | > 50m |
  | Road width offset (planned vs. field-measured gap) | ≤ 8m | 8–30m | > 30m |

- **Runtime spatial analysis:**

  ```
  roads_planned + narrow_alleys_temp
      → ST_Intersects (spatial intersection comparison)
      → SQL CTE deduplication (identifies 3 categories: plan-only / survey-only / dual-confirmed)
      → Risk classification
      → Laravel Cache TTL 3600s (dashboard cache optimization)
  ```

- **Risk classification basis** (nationally applicable regulations):

  | Level | Width | Legal Basis |
  |-------|-------|-------------|
  | 🔴 Critical risk | < 3.5m | Ministry of Interior "Guidelines for Delimiting Emergency Vehicle Access Space" (minimum clear width for fire trucks in buildings 5 floors or below) |
  | 🟡 High risk | 3.5–6m | Building Technical Regulations Article 110 (≥6m road frontage exempt from fire separation requirements — used as secondary threshold) |
  | 🟢 Normal | > 6m | Meets fire separation exemption standard |

The red-zone / yellow-zone classifications from fire department registries are presented as-is without reinterpretation — methodological transparency is itself the source of credibility for this validation system.

### Output

- `FeatureCollection` conforming to GeoJSON RFC 7946
- Includes risk level, spatial coordinates, road width delta, and offset warnings
- Renderable by any standard map library, or directly callable in multi-step AI Agent workflows

### API Endpoints

> Endpoints below use the Taipei City pilot deployment as the example. Path prefixes can be adjusted per city/county in actual deployments.

```
# Narrow alley data
GET /taipei/api/narrow-alleys?district={district}&category={category}
# category: pass 紅區 (red zone) or 黃區 (yellow zone); omit to return all

# Dashboard statistics (cached TTL 3600s)
GET /taipei/api/dashboard/narrow-alley-statistics?district={district}
GET /taipei/api/dashboard/district-rankings
GET /taipei/api/dashboard/hydrant-statistics?district={district}

# Spatial layers
GET /taipei/api/roads/planned?district={district}&category={category}
# category: narrow (<3.5m) / mid (3.5–6m) / wide (>6m)

GET /taipei/api/districts
GET /taipei/api/districts/metadata
GET /taipei/api/fire-hydrants?district={district}
GET /taipei/api/fire-stations?district={district}

Rate limit: throttle:60,1 (max 60 requests per minute)
```

---

## 4. Use Cases

> This component is not a frontline emergency response tool. Users are urban planners at the Urban Development Bureau, Fire Department, and Department of Public Works.
> It is designed for pre-meeting data preparation, cross-agency coordination, and budget planning — not for use during an active disaster event.

### Scenario 1: Urban Road Planning Review (Urban Development Bureau)

Call `/taipei/api/narrow-alleys` to analyze segments with the largest gap between planned and field-measured values. District density rankings are immediately clear: Datong District at 45.1 segments/km² and Zhongzheng District at 41.5 segments/km² both far exceed the statistical Q3 threshold (about 20 segments/km², linear interpolation), providing a scientific basis for determining priority zones for disaster-resilient urban renewal.

### Scenario 2: Fire Infrastructure Deployment Planning (Fire Department)

Combine `/taipei/api/fire-hydrants` with the narrow alley layer to identify which hydrants are effectively blocked by surrounding narrow alleys — enabling precise planning of alternative water source locations and fire station deployment priorities.

### Scenario 3: Road Improvement Budget Allocation (Department of Public Works)

Call `/taipei/api/dashboard/district-rankings` to obtain per-district narrow alley density rankings. Combined with the list of 202 hidden blind spots, this provides a prioritized improvement order and budget allocation basis for narrow alley widening projects.

### Scenario 4: Response to the Hualien Mataian Creek Landslide Dam Scenario

The 426-entry Hualien County Fire Department registry has a field structure compatible with the Taipei City dataset and can be spatialized through geocoding and OSM road-network snapping (379 entries imported successfully, 89%; the other 47 were not imported: 4 had width fields given as multiple values or ranges that could not be parsed, 1 failed geocoding, and 42 were located successfully but had no OSM road within 200 m, concentrated in rural townships such as Fuli, Ruisui and Xiulin, which reveals a coverage gap in open map data in rural areas). Because Hualien County has not yet opened its urban-planned road width data, this project uses OSM only for geometric positioning, not for its width values, and applies the national thresholds to the Fire Department's field-surveyed widths for all risk classification — this is **single-source visualization, not a dual-source comparison**, and differs from Taipei City, where two official datasets validate each other. Even so, the 379 entries that have been spatialized and risk-classified already give planners a risk distribution map, and the data gap it exposes is used to advocate for Hualien County Government to accelerate open publication of urban-planned road width data — filling in the planned values is what completes the dual-source digital loop.

Hualien County's *Narrow Alley Management Procedures* defines narrow alleys as 2–7.5m wide. This component re-standardizes the classification using the nationally applicable Ministry of Interior guideline (3.5m threshold), converting registries with inconsistent formats across counties into a unified, comparable spatial risk format.

### Scenario 5: Multi-Step AI Agent Integration

This component exposes a standard REST API that can be called autonomously by disaster prevention AI assistants (such as Claude) to integrate spatial risk data in multi-step analysis workflows, automatically generating structured district-level disaster risk assessment reports.

---

## Pilot Validation: Reverse Comparison

The dual-source comparison described in the Problem Statement runs in the direction "Fire Department field records → look up planning data", and identified 202 hidden blind spots. This component also supports the reverse query: it selects candidate segments from the urban-planned road width (< 3.5 m, the extreme-risk threshold in the risk classification table), then checks whether the Fire Department narrow-alley registry already lists them, to verify whether blind spots run in both directions.

| Category | Count |
|------|----:|
| Candidate roads rated extreme risk by planned width | 35 |
| Confirmed as listed by the Fire Department | 1 |
| Not yet inspected | 34 |

Of the 35 candidate roads that the urban planning data already marks as extreme risk (< 3.5 m), the Fire Department registry contains only 1; the other 34 are not yet listed and are candidates for priority site inspection. Take the Zhixing Road area in Beitou District as an example: 8 alleys, all 3 m wide, are absent from the Fire Department registry, showing that cross-checking can effectively surface high-risk segments worth confirming. The full candidate list is in the collapsible block below.

<details>
<summary>Expand: full list of Taipei extreme-risk candidate roads (35)</summary>

| roads_planned ID | Planned width | Address (reverse-geocoded) | District | Fire Department status | Fire Department registered name |
|---|---|---|---|---|---|
| 19 | 3m | 大度路三段301巷128弄 (Dadu Rd. Sec. 3, Ln. 301, Aly. 128) | Beitou (北投區) | ❌ Not found | |
| 20 | 3m | 大度路三段301巷 (Dadu Rd. Sec. 3, Ln. 301) | Beitou (北投區) | ❌ Not found | |
| 23 | 3m | 大度路三段301巷 (Dadu Rd. Sec. 3, Ln. 301) | Beitou (北投區) | ❌ Not found | |
| 72 | 3m | 知行路60巷 (Zhixing Rd., Ln. 60) | Beitou (北投區) | ❌ Not found | |
| 74 | 3m | 知行路34巷 (Zhixing Rd., Ln. 34) | Beitou (北投區) | ❌ Not found | |
| 75 | 3m | 知行路4巷 (Zhixing Rd., Ln. 4) | Beitou (北投區) | ❌ Not found | |
| 76 | 3m | 知行路2巷 (Zhixing Rd., Ln. 2) | Beitou (北投區) | ❌ Not found | |
| 80 | 3m | 知行路1巷 (Zhixing Rd., Ln. 1) | Beitou (北投區) | ❌ Not found | |
| 81 | 3m | 知行路3巷 (Zhixing Rd., Ln. 3) | Beitou (北投區) | ❌ Not found | |
| 82 | 3m | 知行路5巷 (Zhixing Rd., Ln. 5) | Beitou (北投區) | ❌ Not found | |
| 83 | 3m | 知行路7巷 (Zhixing Rd., Ln. 7) | Beitou (北投區) | ❌ Not found | |
| 111 | 3m | 中央北路四段583巷 (Zhongyang N. Rd. Sec. 4, Ln. 583) | Beitou (北投區) | ❌ Not found | |
| 112 | 3m | 中央北路四段583巷11弄 (Zhongyang N. Rd. Sec. 4, Ln. 583, Aly. 11) | Beitou (北投區) | ✅ Found | 中央北路4段583巷11弄（紅區） (Zhongyang N. Rd. Sec. 4, Ln. 583, Aly. 11; red zone) |
| 113 | 3m | 中央北路四段577巷27弄 (Zhongyang N. Rd. Sec. 4, Ln. 577, Aly. 27) | Beitou (北投區) | ❌ Not found | |
| 114 | 3m | 中央北路四段583巷 (Zhongyang N. Rd. Sec. 4, Ln. 583) | Beitou (北投區) | ❌ Not found | |
| 2058 | 2m | 峨眉街 (Emei St.) | Wanhua (萬華區) | ❌ Not found | |
| 2106 | 2.7m | 博愛路160巷 (Bo'ai Rd., Ln. 160) | Zhongzheng (中正區) | ❌ Not found | |
| 2107 | 2.7m | 博愛路160巷 (Bo'ai Rd., Ln. 160) | Zhongzheng (中正區) | ❌ Not found | |
| 3652 | 3m | 北平西路（側車道） (Beiping W. Rd. (frontage road)) | Zhongzheng (中正區) | ❌ Not found | |
| 3665 | 2.2m | 太原路22巷 (Taiyuan Rd., Ln. 22) | Datong (大同區) | ❌ Not found | |
| 5597 | 3m | 齊東街82巷 (Qidong St., Ln. 82) | Zhongzheng (中正區) | ❌ Not found | |
| 5992 | 2m | 中山北路二段65巷24弄 (Zhongshan N. Rd. Sec. 2, Ln. 65, Aly. 24) | Zhongshan (中山區) | ❌ Not found | |
| 6306 | 3m | 中正路349巷 (Zhongzheng Rd., Ln. 349) | Shilin (士林區) | ❌ Not found | |
| 10113 | 3.25m | 新生南路一段103巷 (Xinsheng S. Rd. Sec. 1, Ln. 103) | Da'an (大安區) | ❌ Not found | |
| 10321 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 10322 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 10323 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 10537 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 10538 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 10539 | 3m | 建國北路二段96巷2弄 (Jianguo N. Rd. Sec. 2, Ln. 96, Aly. 2) | Zhongshan (中山區) | ❌ Not found | |
| 13507 | 3m | 紫雲街 (Ziyun St.) | Xinyi (信義區) | ❌ Not found | |
| 14056 | 3m | 松隆路329巷 (Songlong Rd., Ln. 329) | Xinyi (信義區) | ❌ Not found | |
| 14132 | 3m | 八德路四段763巷 (Bade Rd. Sec. 4, Ln. 763) | Songshan (松山區) | ❌ Not found | |
| 20037 | 3m | 饒河街 (Raohe St.) | Songshan (松山區) | ❌ Not found | |
| 21355 | 2m | 漢口街一段80巷 (Hankou St. Sec. 1, Ln. 80) | Zhongzheng (中正區) | ❌ Not found | |

</details>

---

## 5. Expected Impact

- **Data contribution**: The Taipei pilot identified 202 Fire Department field records (2.91 km) on roads the planning data lists as 6 m or wider, closing a ten-year data gap. The reverse comparison also found that of 35 candidate roads the planning data rates as extreme risk, only 1 is listed in the Fire Department registry; the other 34 are candidates for priority site inspection, showing that the two datasets complement each other. Hualien County's 426-entry registry has a compatible field structure, and 89% (379/426) were successfully spatialized for single-source visualization, though the missing planned values still prevent a dual-source comparison.

- **Incremental deployment**: Even where planned road values are missing (e.g., Hualien), fire department registries can be spatialized to provide foundational risk visualization and improvement prioritization.

- **Policy advocacy**: Exposes Hualien County's open data gap in planned road data, establishing the prerequisite policy conditions needed to complete the digital feedback loop.

- **Technical portability**: Decoupled architecture — any city or county can deploy by swapping the PostGIS data source, with no redevelopment required.

---

## 6. Extensibility

1. **Multi-county deployment**: Swap the underlying PostGIS spatial data source to replicate across any county in Taiwan. Hualien County's 426-entry Fire Department registry (address text format) can be processed into standard geometry through geocoding and OSM road-network snapping, and once imported can serve single-source visualization queries through the same API architecture — demonstrating that the decoupled architecture can serve counties with missing planned values without redevelopment.

2. **Advocating for planned road data openness**: Hualien County's planned road data has not been published as SHP/GeoJSON — fulfilling this is a prerequisite policy condition for full deployment.

3. **Event-driven disaster prevention**: Future integration with Taiwan's Civic IoT sensors (rain gauges, water level meters) could automatically downgrade road traversability ratings when sensor thresholds are exceeded, enabling dynamic risk updates.

4. **Road network navigation integration**: Integrate pgRouting to provide planners with office-side emergency route simulation analysis.

---

## Quick Start

### Prerequisites

- PHP 8.2+ / Composer 2
- PostgreSQL 14+ (with PostGIS 3.4 extension)
- GeoServer 2.x (map service, optional)
- Docker (recommended)

### Installation

```bash
git clone https://github.com/jingtangg/taipei-urban.git
cd taipei-urban
cp .env.example .env
# Set DB_HOST / DB_DATABASE / DB_USERNAME / DB_PASSWORD
docker-compose up -d
php artisan migrate
php artisan serve
```

### Client Sample Code

```javascript
// Get city-wide district narrow alley density rankings
const response = await fetch('/taipei/api/dashboard/district-rankings');
const { data } = await response.json();
// data.rankings → [{ district: 'Datong District', count: 208, density: 43.4 }, ...]

// Get critical-risk (red zone) narrow alley GeoJSON for a specific district
const geoResponse = await fetch(
  '/taipei/api/narrow-alleys?district=大同區&category=紅區'
);
const geojson = await geoResponse.json();
// → GeoJSON FeatureCollection conforming to RFC 7946; renderable by any standard map library

// Get fire hydrant statistics
const hydrantResponse = await fetch(
  '/taipei/api/dashboard/hydrant-statistics?district=大同區'
);
const { data: hydrantData } = await hydrantResponse.json();
```

### OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: Disaster Prevention Spatial Data Governance Component API
  version: 1.0.0

components:
  schemas:
    # ── GeoJSON geometry types (RFC 7946, coordinate order: [longitude, latitude]) ──
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

    # ── GeoJSON Feature base ──
    GeoJSONFeature:
      type: object
      required: [type, geometry, properties]
      properties:
        type: { type: string, enum: [Feature] }
        geometry: { type: object }
        properties: { type: object }

    # ── Per-endpoint properties schemas ──
    FireHydrantProperties:
      type: object
      required: [id, wpid, type, district]
      properties:
        id: { type: string }
        wpid: { type: string, description: "Fire hydrant ID (Taipei Water Department)" }
        type: { type: string, description: "Above-ground hydrant / underground hydrant (地上式消防栓 / 地下式消防栓)" }
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
          description: "Fire Department risk category as recorded (紅區 = red zone, 黃區 = yellow zone)"
        width_m: { type: number, description: "Width measured by the Fire Department (meters)" }
        risk_level:
          type: string
          enum: [極高風險, 高風險, 一般]
          description: "Computed by the backend from width_m: < 3.5 m = 極高風險 (extreme risk) / 3.5–6 m = 高風險 (high risk) / ≥ 6 m = 一般 (normal)"
        road_width: { type: number, nullable: true, description: "Width of the matched planned road (meters)" }
        snap_distance_m: { type: number, nullable: true, description: "Snapping distance (meters); > 50 m indicates high uncertainty" }

    RoadPlannedProperties:
      type: object
      required: [id, road_width, width_m, width_category, risk_level]
      properties:
        id: { type: string }
        road_width: { type: string, description: "Raw planned-road width label" }
        width_m: { type: number, description: "Planned road width (meters)" }
        width_category:
          type: string
          enum: [narrow, mid, wide]
          description: "narrow < 3.5m / mid 3.5–6m / wide ≥ 6m"
        risk_level:
          type: string
          enum: [極高風險, 高風險, 一般]
          description: "Computed by the backend from width_m: < 3.5 m = 極高風險 (extreme risk) / 3.5–6 m = 高風險 (high risk) / ≥ 6 m = 一般 (normal)"

paths:
  /taipei/api/fire-hydrants:
    get:
      summary: Fire hydrant locations
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
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
      summary: Fire station locations
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
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
      summary: Fire Department field-surveyed narrow alleys
      description: |
        Each record corresponds to a narrow-alley segment matched to a planned road via ST_ClosestPoint.
        The snap_distance_m field provides a reliability warning.
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
        - name: category
          in: query
          schema:
            type: string
            enum: [紅區, 黃區]
          description: Fire Department risk category; omit to return all
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
      summary: Urban-planned roads
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
        - name: category
          in: query
          schema:
            type: string
            enum: [narrow, mid, wide]
          description: Width class; omit to return all
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
      summary: District list (no spatial data)
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
      summary: District metadata (label center + narrow-alley density)
      description: Geometry boundaries are served by GeoServer WMS; this endpoint provides metadata only
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
                              description: "Label center in WKT, e.g. POINT(121.517 25.033)"
                            narrowDensity:
                              type: number
                              description: Narrow-alley density (segments/km²)
                      total: { type: integer }

  /taipei/api/dashboard/narrow-alley-statistics:
    get:
      summary: Narrow-alley statistics
      description: |
        Three segment classes:
        - planned: planned roads with risk_level ≠ 一般 (width_m < 6 m)
        - overlap: hotspots confirmed by both planning data and field survey
        - new_discovered: Fire Department field records not flagged as narrow in the planning data (planned width ≥ 6 m), i.e. hidden blind spots
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
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
      summary: District density ranking
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
                            total_count: { type: integer, description: "Total number of narrow-alley segments" }
                            density: { type: number, description: "Narrow-alley density (segments/km²)" }

  /taipei/api/dashboard/hydrant-statistics:
    get:
      summary: Fire hydrant statistics
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return the whole city
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
                      density: { type: number, description: "Hydrant density (hydrants/km²)", example: 81.4 }
                      service_radius: { type: integer, description: "Theoretical service radius (meters)", example: 63 }
```

### Data Sources

| Dataset | Provider | Format |
|---------|---------|--------|
| Taipei City Road Width | Taipei City Urban Development Bureau | Shapefile |
| Taipei City Narrow Alley Registry | Taipei City Fire Department | CSV / PDF |
| Greater Taipei Fire Hydrant Distribution Map | Taipei Water Department | CSV |
| Taipei City Fire Department Unit Directory | Taipei City Fire Department | CSV |
| Taipei City Administrative District Boundaries | Taipei City Government | Shapefile |
| Hualien County Registered Narrow Alley Registry | Hualien County Fire Department | XLS |

### AI Usage Note

Generative AI (Claude) was used to assist with code writing and architecture design during development. The component does not depend on AI at runtime; however, its standardized GeoJSON output is designed to support direct calls by AI agents in multi-step workflows.
