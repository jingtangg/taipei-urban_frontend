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
- [5. Expected Impact](#5-expected-impact)
- [6. Extensibility](#6-extensibility)
- [Quick Start](#quick-start)

---

## 1. Problem Statement

Taiwan's disaster prevention geospatial data has a systemic **data governance blind spot**:

> Urban-planned road widths (planned values) and fire department field-surveyed narrow alleys (measured values) are two isolated datasets — maintained by separate government agencies, never systematically cross-referenced in space.

This means planners cannot answer the most fundamental questions: Can fire trucks actually access roads that pass on the planning map? Which areas have structural risk? Which segments have been identified by fire departments in the field but are completely absent from the planning records?

**The reality: for the past decade, cities have had no tool to systematically answer these questions.**

The only existing visualization was a community-made Google My Maps from 2014, last updated in 2016. Fire department registries are scattered across PDF and CSV files; urban planning data remains static documents — the two datasets have never been integrated into a verifiable spatial tool.

### Taipei City Pilot Data

After integrating both datasets, **202 out of 1,672 total road segments** citywide had never been registered as high-risk by any system — risks identified by fire departments on the ground, but completely absent from planning records. A combined **9.18 km of hidden blind spots** distributed across 12 administrative districts.

| Data Category | Count | Length | Decision Value |
|--------------|-------|--------|---------------|
| Urban-planned narrow alleys (plan only) | 1,398 | 6.21 km | Legally designated risk zones awaiting field verification |
| Fire dept. field-surveyed additions (survey only) | **202** | 2.97 km | **Reveals hidden blind spots never recorded in planning data** |
| Dual-confirmed (overlapping) | 72 | 0.31 km | Priority hotspots for immediate budget allocation |
| **Total** | **1,672** | **9.18 km** | Complete spatial picture of narrow alleys across Taipei City |

### Hualien County: A More Fundamental Problem

Hualien County Fire Department has registered **427** field-surveyed narrow alleys, yet Hualien County's urban-planned road width data has never been published in any open format. Without planned values, any dual-source spatial comparison is simply impossible.

> This is not a narrow alley problem. It is a **data governance crisis**.

---

## 2. Solution

This component transforms static planning data into verifiable spatial hypotheses:

1. **Cross-agency geospatial fusion**: Imports urban-planned roads (line GIS), fire department field registries (address text), fire hydrants, and fire stations (point data) into PostGIS, enabling high-speed geometric intersection queries via spatial indexing (GiST).

2. **Automatic hidden blind spot detection**: Uses `matched_road_id` spatial deduplication to identify segments that "fire departments have registered but planning data has never recorded", providing planners with a traceable data basis.

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

Call `/taipei/api/narrow-alleys` to analyze segments with the largest gap between planned and field-measured values. District density rankings are immediately clear: Datong District at 43.4 segments/km² and Zhongzheng District at 40.6 segments/km² both far exceed the statistical Q3 threshold (18.8 segments/km²), providing a scientific basis for determining priority zones for disaster-resilient urban renewal.

### Scenario 2: Fire Infrastructure Deployment Planning (Fire Department)

Combine `/taipei/api/fire-hydrants` with the narrow alley layer to identify which hydrants are effectively blocked by surrounding narrow alleys — enabling precise planning of alternative water source locations and fire station deployment priorities.

### Scenario 3: Road Improvement Budget Allocation (Department of Public Works)

Call `/taipei/api/dashboard/district-rankings` to obtain per-district narrow alley density rankings. Combined with the list of 202 hidden blind spots, this provides a prioritized improvement order and budget allocation basis for narrow alley widening projects.

### Scenario 4: Response to the Hualien Mataian Creek Landslide Dam Scenario

The 427-entry Hualien County Fire Department registry is highly format-compatible with the Taipei City dataset and can be imported directly for equivalent analysis. Even without planned road values, this component can spatialize the registry first — giving planners a risk distribution map — and then use the data gap it reveals to advocate for Hualien County Government to accelerate open publication of urban-planned road width data. Completing the dual-source comparison requires filling that planned-value gap first.

Hualien County's *Narrow Alley Management Procedures* defines narrow alleys as 2–7.5m wide. This component re-standardizes the classification using the nationally applicable Ministry of Interior guideline (3.5m threshold), converting registries with inconsistent formats across counties into a unified, comparable spatial risk format.

### Scenario 5: Multi-Step AI Agent Integration

This component exposes a standard REST API that can be called autonomously by disaster prevention AI assistants (such as Claude) to integrate spatial risk data in multi-step analysis workflows, automatically generating structured district-level disaster risk assessment reports.

---

## 5. Expected Impact

- **Data contribution**: The Taipei pilot identified 202 segments spanning 9.18 km of previously unregistered high-risk roads, closing a ten-year data gap. Hualien County's 427-entry registry is format-compatible and can be directly imported for equivalent analysis.

- **Incremental deployment**: Even where planned road values are missing (e.g., Hualien), fire department registries can be spatialized to provide foundational risk visualization and improvement prioritization.

- **Policy advocacy**: Exposes Hualien County's open data gap in planned road data, establishing the prerequisite policy conditions needed to complete the digital feedback loop.

- **Technical portability**: Decoupled architecture — any city or county can deploy by swapping the PostGIS data source, with no redevelopment required.

---

## 6. Extensibility

1. **Multi-county deployment**: Swap the underlying PostGIS spatial data source to replicate across any county in Taiwan. Hualien's 427-entry registry is ready to import.

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
paths:
  /taipei/api/narrow-alleys:
    get:
      parameters:
        - name: district
          in: query
          schema: { type: string }
          description: Administrative district name; omit to return all districts
        - name: category
          in: query
          schema:
            type: string
            enum: [紅區, 黃區]
          description: Risk category (紅區 = red zone, 黃區 = yellow zone); omit to return all
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
