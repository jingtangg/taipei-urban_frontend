import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DISTRICTS, ROADS, HYDRANTS, STATIONS } from '../mockData';

export interface MapViewHandle {
  zoomToTaipei: () => void;
}

interface MapViewProps {
  selectedDistrict: string;
  baseLayer: 'light' | 'satellite';
  layers: {
    roads: boolean;
    hydrants: boolean;
    stations: boolean;
    districts: boolean;
  };
  onMouseMove?: (coords: { x: number, y: number }) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ selectedDistrict, baseLayer, layers, onMouseMove }, ref) => {
  const [zoomLevel, setZoomLevel] = useState(13);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const roadLayerRef = useRef<L.LayerGroup | null>(null);
  const hydrantLayerRef = useRef<L.LayerGroup | null>(null);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const statsLayerRef = useRef<L.LayerGroup | null>(null);

  // Simplified WGS84 to TWD97 (TM2) conversion for Taipei area
  const toTWD97 = (lat: number, lon: number) => {
    const a = 6378137.0;
    const b = 6356752.314245;
    const lon0 = 121 * Math.PI / 180;
    const k0 = 0.9999;
    const dx = 250000;

    const e = Math.sqrt(1 - Math.pow(b / a, 2));
    const e2 = Math.pow(e, 2) / (1 - Math.pow(e, 2));

    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    const n = (a - b) / (a + b);
    const nu = a / Math.sqrt(1 - Math.pow(e * Math.sin(latRad), 2));
    const p = lonRad - lon0;

    const A = a * (1 - n + (5 / 4) * (Math.pow(n, 2) - Math.pow(n, 3)) + (81 / 64) * (Math.pow(n, 4) - Math.pow(n, 5)));
    const B = (3 / 2) * a * (n - Math.pow(n, 2) + (7 / 8) * (Math.pow(n, 3) - Math.pow(n, 4)) + (55 / 64) * Math.pow(n, 5));
    const C = (15 / 16) * a * (Math.pow(n, 2) - Math.pow(n, 3) + (3 / 4) * (Math.pow(n, 4) - Math.pow(n, 5)));
    const D = (35 / 48) * a * (Math.pow(n, 3) - Math.pow(n, 4) + (11 / 16) * Math.pow(n, 5));
    const E = (315 / 512) * a * (Math.pow(n, 4) - Math.pow(n, 5));

    const S = A * latRad - B * Math.sin(2 * latRad) + C * Math.sin(4 * latRad) - D * Math.sin(6 * latRad) + E * Math.sin(8 * latRad);

    const T = Math.pow(Math.tan(latRad), 2);
    const C_prime = e2 * Math.pow(Math.cos(latRad), 2);

    const x = dx + k0 * nu * (p * Math.cos(latRad) + (Math.pow(p, 3) * Math.pow(Math.cos(latRad), 3) / 6) * (1 - T + C_prime) + (Math.pow(p, 5) * Math.pow(Math.cos(latRad), 5) / 120) * (5 - 18 * T + Math.pow(T, 2) + 72 * C_prime - 58 * e2));
    const y = k0 * (S + nu * Math.tan(latRad) * (Math.pow(p, 2) * Math.pow(Math.cos(latRad), 2) / 2 + (Math.pow(p, 4) * Math.pow(Math.cos(latRad), 4) / 24) * (5 - T + 9 * C_prime + 4 * Math.pow(C_prime, 2)) + (Math.pow(p, 6) * Math.pow(Math.cos(latRad), 6) / 720) * (61 - 58 * T + Math.pow(T, 2) + 600 * C_prime - 330 * e2)));

    return { x, y };
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    zoomToTaipei: () => {
      if (mapRef.current) {
        mapRef.current.setView([25.03, 121.54], 13, { animate: true, duration: 1 });
      }
    }
  }));

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create Map
    const map = L.map(containerRef.current, {
      center: [25.03, 121.54],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });
    mapRef.current = map;

    // Zoom Listener
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Mouse Move Listener
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (onMouseMove) {
        const twd97 = toTWD97(e.latlng.lat, e.latlng.lng);
        onMouseMove(twd97);
      }
    });

    // Base Layer
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // District Layer
    const districtGeoJSON = {
      type: 'FeatureCollection',
      features: DISTRICTS.map(d => ({
        type: 'Feature',
        id: d.id,
        geometry: d.geometry,
        properties: { name: d.name, area_km2: d.area_km2 }
      }))
    };

    const districtLayer = L.geoJSON(districtGeoJSON as any, {
      style: (feature: any) => {
        // Example colors based on district ID to simulate different "Risk Levels"
        const colors = ['#ff4444', '#ffaa00', '#00ff41'];
        const color = colors[parseInt(feature.id) % 3];
        return {
          color: color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.15,
          dashArray: '5, 5'
        };
      }
    }).addTo(map);
    districtLayerRef.current = districtLayer;

    districtLayer.eachLayer((layer: any) => {
      const feature = layer.feature.properties;
      const id = layer.feature.id;
      layer.bindPopup(`
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[#00ff41]">
            [ 區域編號: ${feature.name} ]
          </div>
          <div class="terminal-popup-body">
            <p>> 區域面積: ${feature.area_km2} KM2</p>
            <p>> 安全狀態: ${parseInt(id) % 3 === 0 ? '良好' : parseInt(id) % 3 === 1 ? '警戒' : '危險'}</p>
          </div>
        </div>
      `);
    });

    // Road Layer
    const roadLayer = L.layerGroup().addTo(map);
    roadLayerRef.current = roadLayer;
    ROADS.forEach(r => {
      const color = r.planned_width <= 3.5 ? '#ff4444' : r.planned_width <= 6 ? '#ffaa00' : '#00ff41';
      const polyline = L.polyline(r.geometry.coordinates.map((c: any) => [c[1], c[0]]), {
        color: color,
        weight: 3,
        opacity: 0.6
      }).addTo(roadLayer);
      
      polyline.bindPopup(`
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[#00ff41]">
            [ 道路名稱: ${r.name || '未命名'} ]
          </div>
          <div class="terminal-popup-body">
            <p>> 規劃寬度: ${r.planned_width}M</p>
            <p>> 運行狀態: ${r.planned_width <= 3.5 ? '限縮通行' : '正常通行'}</p>
          </div>
        </div>
      `);
    });

    // Hydrant Layer
    const hydrantLayer = L.layerGroup().addTo(map);
    hydrantLayerRef.current = hydrantLayer;
    
    const hydrantIcon = (type: string) => L.divIcon({
      className: 'custom-terminal-marker',
      html: `
        <div class="hydrant-marker-wrapper ${type}">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#00ff41" stroke-width="2" fill="#00ff41" fill-opacity="0.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 11h-1V7a5 5 0 0 0-10 0v4H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v4h10v-4h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="5" r="1"></circle>
            <path d="M10 11h4v2h-4z"></path>
          </svg>
          <div class="marker-glow"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    HYDRANTS.forEach(h => {
      const marker = L.marker([h.geometry.coordinates[1], h.geometry.coordinates[0]], {
        icon: hydrantIcon(h.type)
      }).addTo(hydrantLayer);
      
      const typeText = h.type === 'aboveground' ? '地上式消防栓' : '地下式消防栓';
      marker.bindPopup(`
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[#00ff41]">
            [ ${typeText} ]
          </div>
          <div class="terminal-popup-body">
            <p>> 所屬轄區: ${h.district}</p>
            <p>> 設備狀態: 正常運作</p>
          </div>
        </div>
      `);
    });

    // Station Layer
    const stationLayer = L.layerGroup().addTo(map);
    stationLayerRef.current = stationLayer;

    const stationIcon = L.divIcon({
      className: 'custom-terminal-marker',
      html: `
        <div class="station-marker-wrapper">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="#ff4444" stroke-width="2" fill="#ff4444" fill-opacity="0.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"></path>
            <path d="M21 15V11H3v4"></path>
            <path d="M3 15h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <circle cx="17" cy="17" r="2"></circle>
            <path d="M12 5v2"></path>
          </svg>
          <div class="marker-glow station"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    STATIONS.forEach(s => {
      const marker = L.marker([s.geometry.coordinates[1], s.geometry.coordinates[0]], {
        icon: stationIcon
      }).addTo(stationLayer);
      
      marker.bindPopup(`
        <div class="terminal-popup">
          <div class="terminal-popup-header text-[#ff4444]">
            [ ${s.name} ]
          </div>
          <div class="terminal-popup-body">
            <p>> 地址: ${s.address}</p>
            <p>> 聯繫狀態: 在線</p>
          </div>
        </div>
      `);
    });

    // Statistics Layer (Visible at low zoom)
    const statsLayer = L.layerGroup().addTo(map);
    statsLayerRef.current = statsLayer;

    DISTRICTS.forEach(d => {
      // Calculate center of polygon (simplified)
      const coords = d.geometry.coordinates[0];
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const hydrantCount = HYDRANTS.filter(h => h.district === d.name).length;
      const roadCount = ROADS.filter(r => r.district === d.name).length;

      const statsIcon = L.divIcon({
        className: 'stats-marker',
        html: `
          <div class="stats-card">
            <div class="stats-title">${d.name}</div>
            <div class="stats-grid">
              <div class="stats-item">
                <span class="label">窄巷:</span>
                <span class="value">${roadCount}</span>
              </div>
              <div class="stats-item">
                <span class="label">消防栓:</span>
                <span class="value">${hydrantCount}</span>
              </div>
            </div>
          </div>
        `,
        iconSize: [100, 50],
        iconAnchor: [50, 25]
      });

      L.marker([centerLat, centerLng], { icon: statsIcon }).addTo(statsLayer);
    });

    // Force resize after short delay
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Layer Visibility & Zoom Logic
  useEffect(() => {
    if (mapRef.current) {
      const isHighZoom = zoomLevel >= 14;

      // Detailed Layers (Only visible at high zoom)
      if (layers.roads && isHighZoom) mapRef.current.addLayer(roadLayerRef.current!);
      else mapRef.current.removeLayer(roadLayerRef.current!);

      if (layers.hydrants && isHighZoom) mapRef.current.addLayer(hydrantLayerRef.current!);
      else mapRef.current.removeLayer(hydrantLayerRef.current!);

      if (layers.stations && isHighZoom) mapRef.current.addLayer(stationLayerRef.current!);
      else mapRef.current.removeLayer(stationLayerRef.current!);

      // District Layer (Always visible if toggled)
      if (layers.districts) mapRef.current.addLayer(districtLayerRef.current!);
      else mapRef.current.removeLayer(districtLayerRef.current!);

      // Statistics Layer (Only visible at low zoom)
      if (!isHighZoom) mapRef.current.addLayer(statsLayerRef.current!);
      else mapRef.current.removeLayer(statsLayerRef.current!);
    }
  }, [layers, zoomLevel]);

  // Handle Fly to District
  useEffect(() => {
    if (mapRef.current) {
      if (selectedDistrict === 'all') {
        mapRef.current.flyTo([25.03, 121.54], 13, { duration: 1.5 });
      } else {
        const district = DISTRICTS.find(d => d.name === selectedDistrict);
        if (district) {
          const geojson = L.geoJSON(district.geometry as any);
          mapRef.current.flyToBounds(geojson.getBounds(), { 
            padding: [80, 80], 
            duration: 1.5,
            easeLinearity: 0.25
          });
        }
      }
    }
  }, [selectedDistrict]);

  // Handle Base Layer Update
  useEffect(() => {
    if (mapRef.current) {
      const url = baseLayer === 'satellite' 
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
      
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          layer.setUrl(url);
        }
      });
    }
  }, [baseLayer]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-black" />
      
      {/* Custom Terminal Zoom Control */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => mapRef.current?.zoomIn()}
          className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
        >
          +
        </button>
        <button 
          onClick={() => mapRef.current?.zoomOut()}
          className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
        >
          -
        </button>
      </div>

      <style>{`
        .leaflet-popup-content-wrapper {
          border: 1px solid #00ff41 !important;
          border-radius: 0 !important;
          background: rgba(0, 0, 0, 0.95) !important;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3) !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: 240px !important; /* Fixed width for consistent card size */
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .terminal-popup {
          color: #00ff41;
          font-family: 'JetBrains Mono', monospace;
        }
        .terminal-popup-header {
          background: rgba(0, 255, 65, 0.1);
          padding: 8px 12px;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          font-weight: bold;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .terminal-popup-body {
          padding: 12px;
          font-size: 10px;
          line-height: 1.6;
        }
        .custom-terminal-marker {
          background: transparent !important;
          border: none !important;
        }
        .hydrant-marker-wrapper, .station-marker-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .hydrant-marker-wrapper:hover, .station-marker-wrapper:hover {
          transform: scale(1.2);
        }
        .marker-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(0, 255, 65, 0.2);
          filter: blur(8px);
          border-radius: 50%;
          z-index: -1;
        }
        .marker-glow.station {
          background: rgba(255, 68, 68, 0.2);
        }
        .hydrant-marker-wrapper.aboveground svg {
          filter: drop-shadow(0 0 5px #00ff41);
        }
        .hydrant-marker-wrapper.underground svg {
          stroke-dasharray: 4;
          opacity: 0.8;
        }
        .stats-marker {
          background: transparent !important;
          border: none !important;
        }
        .stats-card {
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid #00ff41;
          padding: 6px 10px;
          color: #00ff41;
          font-family: 'JetBrains Mono', monospace;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
          pointer-events: none;
          min-width: 100px;
        }
        .stats-title {
          font-size: 11px;
          font-weight: bold;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          margin-bottom: 4px;
          padding-bottom: 2px;
          text-align: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2px;
        }
        .stats-item {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
        }
        .stats-item .label {
          opacity: 0.6;
        }
        .stats-item .value {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
