import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { XYZ, WMTS } from 'ol/source';
import { Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill, Circle as CircleStyle, Icon, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';
import 'ol/ol.css';
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
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [roadLayer, setRoadLayer] = useState<VectorLayer<VectorSource> | null>(null);
  const [hydrantLayer, setHydrantLayer] = useState<VectorLayer<VectorSource> | null>(null);
  const [stationLayer, setStationLayer] = useState<VectorLayer<VectorSource> | null>(null);
  const [districtLayer, setDistrictLayer] = useState<VectorLayer<VectorSource> | null>(null);

  // TWD97 TM2 zone projection parameters (EPSG:3826)
  const TWD97_CENTER = [121.54, 25.03]; // Longitude, Latitude for Taipei
  const TWD97_CENTER_PROJECTED = fromLonLat(TWD97_CENTER);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    zoomToTaipei: () => {
      if (mapRef.current) {
        mapRef.current.getView().animate({
          center: TWD97_CENTER_PROJECTED,
          zoom: 13,
          duration: 1000
        });
      }
    }
  }));

  // Initialize OpenLayers Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create base tile layer
    const baseTileLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attributions: '© OpenStreetMap contributors'
      })
    });

    // Create popup overlay
    const overlay = new Overlay({
      element: popupRef.current!,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });
    overlayRef.current = overlay;

    // Initialize Map
    const map = new Map({
      target: containerRef.current,
      layers: [baseTileLayer],
      overlays: [overlay],
      view: new View({
        center: TWD97_CENTER_PROJECTED,
        zoom: 13,
        minZoom: 10,
        maxZoom: 18
      }),
      controls: defaultControls({ attribution: false, zoom: false })
    });

    mapRef.current = map;

    // Mouse move listener
    map.on('pointermove', (evt) => {
      const coords = evt.coordinate;
      if (onMouseMove) {
        onMouseMove({ x: coords[0], y: coords[1] });
      }
    });

    // Click handler for popups
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const props = feature.getProperties();
        const geom = feature.getGeometry();

        let popupContent = '';
        if (props.type === 'district') {
          popupContent = `
            <div class="terminal-popup">
              <div class="terminal-popup-header text-[#00ff41]">
                [ 區域編號: ${props.name} ]
              </div>
              <div class="terminal-popup-body">
                <p>> 區域面積: ${props.area_km2} KM²</p>
                <p>> 安全狀態: ${props.status || '正常'}</p>
              </div>
            </div>
          `;
        } else if (props.type === 'road') {
          popupContent = `
            <div class="terminal-popup">
              <div class="terminal-popup-header text-[#00ff41]">
                [ 道路名稱: ${props.name || '未命名'} ]
              </div>
              <div class="terminal-popup-body">
                <p>> 規劃寬度: ${props.planned_width}M</p>
                <p>> 運行狀態: ${props.planned_width <= 3.5 ? '限縮通行' : '正常通行'}</p>
              </div>
            </div>
          `;
        } else if (props.type === 'hydrant') {
          const typeText = props.hydrant_type === 'aboveground' ? '地上式消防栓' : '地下式消防栓';
          popupContent = `
            <div class="terminal-popup">
              <div class="terminal-popup-header text-[#00ff41]">
                [ ${typeText} ]
              </div>
              <div class="terminal-popup-body">
                <p>> 所屬轄區: ${props.district}</p>
                <p>> 設備狀態: 正常運作</p>
              </div>
            </div>
          `;
        } else if (props.type === 'station') {
          popupContent = `
            <div class="terminal-popup">
              <div class="terminal-popup-header text-[#ff4444]">
                [ ${props.name} ]
              </div>
              <div class="terminal-popup-body">
                <p>> 地址: ${props.address}</p>
                <p>> 聯繫狀態: 在線</p>
              </div>
            </div>
          `;
        }

        if (popupContent && popupRef.current && overlayRef.current) {
          popupRef.current.innerHTML = popupContent;

          // Get coordinate from geometry
          let coord = evt.coordinate;
          if (geom) {
            if (geom.getType() === 'Point') {
              coord = (geom as Point).getCoordinates();
            } else if (geom.getType() === 'LineString') {
              const coords = (geom as LineString).getCoordinates();
              coord = coords[Math.floor(coords.length / 2)];
            } else if (geom.getType() === 'Polygon') {
              coord = (geom as Polygon).getInteriorPoint().getCoordinates();
            }
          }

          overlayRef.current.setPosition(coord);
        }
      } else {
        overlayRef.current?.setPosition(undefined);
      }
    });

    // Create district layer
    const districtFeatures = DISTRICTS.map(d => {
      const coords = d.geometry.coordinates[0].map(c => fromLonLat([c[0], c[1]]));
      const polygon = new Polygon([coords]);
      const feature = new Feature({
        geometry: polygon,
        name: d.name,
        area_km2: d.area_km2,
        type: 'district'
      });
      return feature;
    });

    const districtVectorLayer = new VectorLayer({
      source: new VectorSource({ features: districtFeatures }),
      style: new Style({
        stroke: new Stroke({
          color: '#00ff41',
          width: 2,
          lineDash: [5, 5]
        }),
        fill: new Fill({
          color: 'rgba(0, 255, 65, 0.15)'
        })
      })
    });
    setDistrictLayer(districtVectorLayer);

    // Create road layer
    const roadFeatures = ROADS.map(r => {
      const coords = r.geometry.coordinates.map(c => fromLonLat([c[0], c[1]]));
      const line = new LineString(coords);
      const feature = new Feature({
        geometry: line,
        name: r.name,
        planned_width: r.planned_width,
        district: r.district,
        type: 'road'
      });
      return feature;
    });

    const roadVectorLayer = new VectorLayer({
      source: new VectorSource({ features: roadFeatures }),
      style: (feature) => {
        const width = feature.get('planned_width');
        const color = width <= 3.5 ? '#ff4444' : width <= 6 ? '#ffaa00' : '#00ff41';
        return new Style({
          stroke: new Stroke({
            color: color,
            width: 3
          })
        });
      }
    });
    setRoadLayer(roadVectorLayer);

    // Create hydrant layer
    const hydrantFeatures = HYDRANTS.map(h => {
      const point = new Point(fromLonLat([h.geometry.coordinates[0], h.geometry.coordinates[1]]));
      const feature = new Feature({
        geometry: point,
        district: h.district,
        hydrant_type: h.type,
        type: 'hydrant'
      });
      return feature;
    });

    const hydrantVectorLayer = new VectorLayer({
      source: new VectorSource({ features: hydrantFeatures }),
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#00ff41' }),
          stroke: new Stroke({ color: '#00ff41', width: 2 })
        })
      })
    });
    setHydrantLayer(hydrantVectorLayer);

    // Create station layer
    const stationFeatures = STATIONS.map(s => {
      const point = new Point(fromLonLat([s.geometry.coordinates[0], s.geometry.coordinates[1]]));
      const feature = new Feature({
        geometry: point,
        name: s.name,
        address: s.address,
        type: 'station'
      });
      return feature;
    });

    const stationVectorLayer = new VectorLayer({
      source: new VectorSource({ features: stationFeatures }),
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#ff4444' }),
          stroke: new Stroke({ color: '#ff4444', width: 2 })
        })
      })
    });
    setStationLayer(stationVectorLayer);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Handle layer visibility
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // District layer
    if (districtLayer) {
      if (layers.districts && !map.getLayers().getArray().includes(districtLayer)) {
        map.addLayer(districtLayer);
      } else if (!layers.districts && map.getLayers().getArray().includes(districtLayer)) {
        map.removeLayer(districtLayer);
      }
    }

    // Road layer
    if (roadLayer) {
      if (layers.roads && !map.getLayers().getArray().includes(roadLayer)) {
        map.addLayer(roadLayer);
      } else if (!layers.roads && map.getLayers().getArray().includes(roadLayer)) {
        map.removeLayer(roadLayer);
      }
    }

    // Hydrant layer
    if (hydrantLayer) {
      if (layers.hydrants && !map.getLayers().getArray().includes(hydrantLayer)) {
        map.addLayer(hydrantLayer);
      } else if (!layers.hydrants && map.getLayers().getArray().includes(hydrantLayer)) {
        map.removeLayer(hydrantLayer);
      }
    }

    // Station layer
    if (stationLayer) {
      if (layers.stations && !map.getLayers().getArray().includes(stationLayer)) {
        map.addLayer(stationLayer);
      } else if (!layers.stations && map.getLayers().getArray().includes(stationLayer)) {
        map.removeLayer(stationLayer);
      }
    }
  }, [layers, districtLayer, roadLayer, hydrantLayer, stationLayer]);

  // Handle district selection
  useEffect(() => {
    if (!mapRef.current || !districtLayer) return;

    if (selectedDistrict === 'all') {
      mapRef.current.getView().animate({
        center: TWD97_CENTER_PROJECTED,
        zoom: 13,
        duration: 1500
      });
    } else {
      const district = DISTRICTS.find(d => d.name === selectedDistrict);
      if (district) {
        const coords = district.geometry.coordinates[0].map(c => fromLonLat([c[0], c[1]]));
        const polygon = new Polygon([coords]);
        const extent = polygon.getExtent();

        mapRef.current.getView().fit(extent, {
          padding: [80, 80, 80, 80],
          duration: 1500
        });
      }
    }
  }, [selectedDistrict, districtLayer]);

  // Handle base layer change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const layers = map.getLayers().getArray();
    const baseLayer = layers[0];

    if (baseLayer instanceof TileLayer) {
      const url = baseLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

      const newSource = new XYZ({ url });
      baseLayer.setSource(newSource);
    }
  }, [baseLayer]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-black" />

      {/* Popup container */}
      <div ref={popupRef} className="ol-popup"></div>

      {/* Custom zoom controls */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => {
            const view = mapRef.current?.getView();
            if (view) {
              const zoom = view.getZoom();
              if (zoom !== undefined) {
                view.animate({ zoom: zoom + 1, duration: 250 });
              }
            }
          }}
          className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
        >
          +
        </button>
        <button
          onClick={() => {
            const view = mapRef.current?.getView();
            if (view) {
              const zoom = view.getZoom();
              if (zoom !== undefined) {
                view.animate({ zoom: zoom - 1, duration: 250 });
              }
            }
          }}
          className="terminal-btn w-10 h-10 flex items-center justify-center text-xl bg-black/80"
        >
          -
        </button>
      </div>

      <style>{`
        .ol-popup {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.95);
          border: 1px solid #00ff41;
          padding: 0;
          border-radius: 0;
          bottom: 12px;
          left: -50px;
          min-width: 240px;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }
        .ol-popup:after, .ol-popup:before {
          top: 100%;
          border: solid transparent;
          content: " ";
          height: 0;
          width: 0;
          position: absolute;
          pointer-events: none;
        }
        .ol-popup:after {
          border-top-color: rgba(0, 0, 0, 0.95);
          border-width: 10px;
          left: 48px;
          margin-left: -10px;
        }
        .ol-popup:before {
          border-top-color: #00ff41;
          border-width: 11px;
          left: 48px;
          margin-left: -11px;
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
        .terminal-popup-body p {
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
