# Taipei City Urban Disaster Prevention Map | Frontend

An interactive GIS map of road widths, narrow alley distribution, and fire safety infrastructure across Taipei City — designed to assess urban disaster resilience. Data is filterable by administrative district, overlaying two sources — "urban-planned roads" and "fire department field-surveyed narrow alleys" — to identify fire truck access risk segments and display fire hydrant coverage density statistics.

> **Backend API**: [taipei-urban](https://github.com/jingtangg/taipei-urban) (Laravel 12 + PostgreSQL/PostGIS + GeoServer)

---

## Features

**Map Interaction**
- Multi-layer overlay: urban-planned roads (color-coded by width), fire department field-surveyed narrow alleys, fire hydrants (above-ground/underground color-coded), fire stations, and district density heatmap (GeoServer WMS)
- Click Popup: click any feature to view detailed attributes (road name, width, offset distance, risk level, data quality warnings)
- Basemap toggle: OSM street map ↔ ArcGIS satellite imagery
- Zoom-level layering: `< 15` shows district labels and WMS density heatmap only; `≥ 15` expands to roads, narrow alleys, and fire infrastructure layers
- Coordinate bar: real-time display of cursor position in TWD97 TM2 (EPSG:3826) coordinates

**Sidebar & Statistics**
- Left panel: district dropdown, narrow alley statistics (planned / field-surveyed new discoveries / overlapping), fire hydrant density and service radius
- City-wide mode additionally shows density rankings across all 12 administrative districts
- Right panel: layer toggles, basemap selection, color legend

**Visual Theme**
- Terminal / Matrix aesthetic: `#00ff41` (matrix green) on `#0a0a0a` (black), with risk levels indicated in red/yellow gradients

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Map Engine | **OpenLayers** (OL Overlay, LayerGroup, VectorLayer) |
| Coordinate System | proj4 (TWD97 TM2 EPSG:3826 ↔ WGS84 EPSG:4326) |
| HTTP Client | axios (with AbortController request cancellation) |
| UI | Tailwind CSS |
| Animation | Motion (Framer Motion) |
| Icons | lucide-react |
| State Management | Native React Hooks (no external state library) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Page Layer                                                       │
│ src/pages/MapPage.tsx                                            │
│   Orchestrates sidebars (statistics, layer controls),           │
│   district dropdown, and coordinate bar                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI / Interaction Layer                                           │
│                                                                  │
│  Map.tsx                          ApiStateView.tsx               │
│    Integrates all map hooks         Handles useApi three states  │
│    click popup / OL Overlay         error / loading / data       │
│                                     Used by MapPage stats        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ React Hook Layer                                                 │
│                                                                  │
│  Data Fetching                  Map Layer Management             │
│  useApi.ts ──────────────────→ useDistrictLayer.ts (WMS+Label)  │
│    Generic fetch + cancellation useRoadLayer.ts                  │
│    { data, loading, error }     useNarrowAlleyLayer.ts           │
│                                 useFireLayers.ts                 │
│                                 useMapInit.ts                    │
│                                 useZoomLevel.ts                  │
└─────────────────────────────────────────────────────────────────┘
          ↓                                ↓
┌─────────────────────┐    ┌──────────────────────────────────────┐
│ Utils & Transforms  │    │ Visual Styles                        │
│ utils/              │    │ styles/                              │
│   geoTransform.ts   │    │   fireStyles.ts  (hydrant/station)   │
│   riskUtils.ts      │    │   layerStyles.ts (road/alley)        │
│   popupUtils.ts     │    └──────────────────────────────────────┘
└─────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Configuration & Constants  (single source of truth, no magic #) │
│ constants/                                                       │
│   mapConfig.ts             GeoServer URL, map center, zoom thresholds│
│   riskThresholds.ts        Road width risk levels (3.5m / 6m)   │
│   dataQualityThresholds.ts Offset warning thresholds (30/8/50/30m)│
│   colors.ts                Shared color palette across files     │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Type Definition Layer                                            │
│ types/geo.ts                                                     │
│   GeoJSONPoint · GeoJSONLineString          Geometry types       │
│   RoadFeatureProps · NarrowAlleyFeatureProps Layer feature props │
│   FireHydrantFeatureProps · FireStationFeatureProps              │
│   PopupFeatureProps  (discriminated union)  OL boundary wrapper  │
│   District · DistrictBasic · Statistics types                   │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Domain API Layer                                                 │
│ services/urbanApi.ts                                             │
│   getDistrictList()  getDistrictMetadata()  getRoads()          │
│   getNarrowAlleys()  getFireHydrants()  getFireStations()       │
│   getNarrowAlleyStatistics()  getHydrantStatistics()  ...       │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ HTTP Layer                                                       │
│ services/api.ts                                                  │
│   apiQuery()  resolveApiUrl()  axios client                     │
└─────────────────────────────────────────────────────────────────┘
          ↓                                ↓
┌─────────────────┐             ┌──────────────────────────────┐
│  Laravel API    │             │  GeoServer WMS               │
│  JSON responses │             │  District boundaries +        │
│  (roads/alleys/ │             │  SLD color rendering         │
│   hydrants/...) │             │  districts_density SQL View  │
│                 │             │  → Static tile output        │
└─────────────────┘             └──────────────────────────────┘
```

---

## Design Notes

**Zoom-Level Layering Strategy**

| Zoom Level | Displayed Content |
|-----------|-----------------|
| `< 15` | District name labels + GeoServer WMS density heatmap |
| `≥ 15` | Urban-planned roads, narrow alleys, fire hydrants, fire stations |

The map automatically flies to the selected district on change; zooming to level 15 triggers detailed layer loading.

**Dual Data Source Comparison**

Urban-planned roads (from city planning records) are rendered as dashed lines; fire department field-surveyed narrow alleys are rendered as solid lines. Overlaying both sources provides a direct visual comparison of alignment and geometric offset between the two datasets. `useRoadLayer` only requests data from the API when a single district is selected, preventing excessive data loads in city-wide view.

**Risk Color Scale**

| Road Width | Level | Color |
|-----------|-------|-------|
| `< 3.5m` | Critical risk (fire truck cannot pass) | Red |
| `3.5–6m` | High risk (access restricted) | Yellow |
| `≥ 6m` | Normal | — |

**Fire Hydrant Style Distinction**

Above-ground hydrants (solid cyan diamond) and underground hydrants (hollow light-blue diamond) are rendered with distinct OpenLayers styles, reflecting real-world accessibility differences.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Backend API running (default `http://localhost:8000`)
- GeoServer running (default `http://localhost:8090`)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Fill in your actual API and GeoServer addresses

# 3. Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|----------|------------|---------|
| `VITE_API_URL` | Laravel API base URL | `http://localhost:8000/taipei/api` |
| `VITE_GEOSERVER_URL` | GeoServer WMS endpoint | `http://localhost:8090/geoserver/taipei_urban/wms` |

---

## Project Structure

```
src/
├── pages/
│   └── MapPage.tsx              # Root page component, manages global state
├── components/
│   ├── Map.tsx                  # OL map container, integrates all layer hooks
│   └── ApiStateView.tsx         # Generic three-state (loading / error / data) wrapper
├── hooks/
│   ├── useApi.ts                # Generic fetch + AbortController
│   ├── useMapInit.ts            # OL Map initialization, OSM / ArcGIS basemaps
│   ├── useDistrictLayer.ts      # WMS layer + district name labels
│   ├── useRoadLayer.ts          # Urban-planned roads (dashed, width < 6m)
│   ├── useNarrowAlleyLayer.ts   # Field-surveyed narrow alleys (solid line)
│   ├── useFireLayers.ts         # Fire hydrants + fire stations
│   └── useZoomLevel.ts          # Listens to OL zoom changes
├── services/
│   ├── api.ts                   # axios client, dev/prod error handling
│   └── urbanApi.ts              # Domain API (9 endpoints)
├── types/
│   └── geo.ts                   # GeoJSON types + Popup discriminated union
├── constants/
│   ├── mapConfig.ts             # URL, map center, zoom thresholds
│   ├── riskThresholds.ts        # 3.5m / 6m
│   ├── dataQualityThresholds.ts # Offset warning thresholds
│   └── colors.ts                # #00ff41 / #ff4444 / #ffaa00
├── utils/
│   ├── geoTransform.ts          # API GeoJSON → OL Feature
│   ├── riskUtils.ts             # Road width → risk level label
│   └── popupUtils.ts            # Popup HTML assembly (terminal style)
└── styles/
    ├── fireStyles.ts            # Fire hydrant (above/underground), station styles
    └── layerStyles.ts           # Road (dashed), narrow alley (solid) styles
```
