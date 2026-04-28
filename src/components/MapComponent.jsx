import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore, useReportStore } from '../store/useStore';
import { translations } from '../utils/translations';
import * as turf from '@turf/turf';
import StationDetail from './StationDetail';

export default function MapComponent() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);
  const startMarker = useRef(null);
  const endMarker = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const stations = useStore((state) => state.stations);
  const routeData = useStore((state) => state.routeData);
  const startPoint = useStore((state) => state.startPoint);
  const endPoint = useStore((state) => state.endPoint);
  const setSelectedStation = useStore((state) => state.setSelectedStation);
  const selectedStation = useStore((state) => state.selectedStation);
  const stationReports = useReportStore((state) => state.stationReports);
  const userLocation = useStore((state) => state.userLocation);
  const setUserLocation = useStore((state) => state.setUserLocation);
  const language = useStore((state) => state.language);
  const isPickingStart = useStore((state) => state.isPickingStart);
  const isPickingEnd = useStore((state) => state.isPickingEnd);
  const setStartPoint = useStore((state) => state.setStartPoint);
  const setEndPoint = useStore((state) => state.setEndPoint);

  // Refs to avoid stale closures in map event handlers
  const stateRef = useRef({});
  stateRef.current = { isPickingStart, isPickingEnd, setStartPoint, setEndPoint, setSelectedStation, language };
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const getEffectiveStatus = (station, reports) => {
    const isReportsEnabled = import.meta.env.VITE_ENABLE_REPORTS !== 'false';
    const r = reports[station.ID];
    const statusId = station.StatusTypeID || 0;
    
    if (isReportsEnabled && r) {
      const bCount = r.broken?.count ?? 0;
      const wCount = r.works?.count ?? 0;
      if (bCount > wCount) return 'broken';
      if (wCount >= bCount && wCount > 0) return 'operational';
    }
    
    if (statusId === 50 || statusId === 10) return 'operational';
    if ([20, 30, 100, 150, 200].includes(statusId)) return 'broken';
    return 'operational';
  };

  const buildGeoJSON = (stationList, reports, routeGeoJSON) => {
    let filtered = stationList;
    if (routeGeoJSON && routeGeoJSON.coordinates && routeGeoJSON.coordinates.length >= 2) {
      try {
        const routeLine = turf.lineString(routeGeoJSON.coordinates);
        const buffer = turf.buffer(routeLine, 5, { units: 'kilometers' });
        filtered = stationList.filter(s => {
          if (!s.AddressInfo?.Longitude || !s.AddressInfo?.Latitude) return false;
          const pt = turf.point([s.AddressInfo.Longitude, s.AddressInfo.Latitude]);
          return turf.booleanPointInPolygon(pt, buffer);
        });
      } catch (err) {
        console.error("Error filtering stations along route:", err);
      }
    }
    return {
      type: 'FeatureCollection',
      features: filtered
        .filter(s => s.AddressInfo && typeof s.AddressInfo.Longitude === 'number' && typeof s.AddressInfo.Latitude === 'number')
        .map(s => ({
          type: 'Feature',
          id: s.ID, // Set top-level ID for MapLibre
          geometry: { type: 'Point', coordinates: [s.AddressInfo.Longitude, s.AddressInfo.Latitude] },
          properties: {
            id: s.ID,
            title: s.AddressInfo.Title,
            color: getEffectiveStatus(s, reports) === 'broken' ? '#ef4444' : '#10b981',
          },
        })),
    };
  };

  // Initialize map once
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-7.0926, 31.7917],
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.current.on('load', () => {
      // Create SVG for pin
      const pinSVG = `
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 42C16 42 32 26.5685 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 26.5685 16 42 16 42Z" fill="white"/>
          <path d="M16 39C16 39 29 24.5685 29 16C29 8.16344 23.1797 2 16 2C8.8203 2 3 8.16344 3 16C3 24.5685 16 39 16 39Z" fill="currentColor"/>
          <path d="M17 10L10 19H16L15 28L22 19H16L17 10Z" fill="white"/>
        </svg>
      `;

      // Helper to add colored icons
      const addIcon = (name, color) => {
        const svg = pinSVG.replace('currentColor', color);
        const img = new Image();
        img.onload = () => map.current.addImage(name, img);
        img.src = 'data:image/svg+xml;base64,' + btoa(svg);
      };

      addIcon('pin-operational', '#10b981');
      addIcon('pin-broken', '#ef4444');

      // --- Route layers (Added first so they are at bottom) ---
      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
        paint: { 'line-color': '#1d4ed8', 'line-width': 10, 'line-opacity': 0.3 },
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'visible' },
        paint: { 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.9 },
      });

      // --- Stations GeoJSON source with built-in clustering ---
      map.current.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster glow ring (smaller)
      map.current.addLayer({
        id: 'cluster-glow',
        type: 'circle',
        source: 'stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#10b981', 20, '#3b82f6'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 24, 30, 28],
          'circle-opacity': 0.15,
        },
      });

      // Cluster filled circle (smaller)
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#10b981', 20, '#3b82f6'],
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 22],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count label (smaller text)
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 11,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual station markers (SVG Pins)
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'color'],
            '#ef4444', 'pin-broken',
            'pin-operational'
          ],
          'icon-size': 0.8,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
      });

      // Events...
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('stations')
          .getClusterExpansionZoom(clusterId)
          .then(zoom => map.current.easeTo({ center: features[0].geometry.coordinates, zoom }));
      });

      map.current.on('click', 'unclustered-point', (e) => {
        const { isPickingStart, isPickingEnd, setStartPoint, setEndPoint, setSelectedStation } = stateRef.current;
        const props = e.features[0].properties;
        const [lng, lat] = e.features[0].geometry.coordinates;

        if (isPickingStart) {
          setStartPoint({ lat, lng }, props.title);
        } else if (isPickingEnd) {
          setEndPoint({ lat, lng }, props.title);
        } else {
          const targetId = Number(props.id);
          const station = stationsRef.current.find(s => Number(s.ID) === targetId);
          if (station) setSelectedStation(station);
        }
      });

      // --- Click: map background for picking ---
      map.current.on('click', (e) => {
        const { isPickingStart, isPickingEnd, setStartPoint, setEndPoint, language } = stateRef.current;
        if (!isPickingStart && !isPickingEnd) return;
        const hits = map.current.queryRenderedFeatures(e.point, { layers: ['clusters', 'unclustered-point'] });
        if (hits.length > 0) return;
        const { lat, lng } = e.lngLat;
        if (isPickingStart) setStartPoint({ lat, lng }, translations[language].pinnedLocation);
        else setEndPoint({ lat, lng }, translations[language].pinnedLocation);
      });

      // Cursors
      ['clusters', 'unclustered-point'].forEach(layer => {
        map.current.on('mouseenter', layer, () => { map.current.getCanvas().style.cursor = 'pointer'; });
        map.current.on('mouseleave', layer, () => { map.current.getCanvas().style.cursor = ''; });
      });

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update stations GeoJSON whenever data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('stations');
    if (source) source.setData(buildGeoJSON(stations, stationReports, routeData?.geojson ?? null));
  }, [stations, stationReports, routeData, mapLoaded]);

  // Update route line
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('route');
    if (!source) return;

    if (routeData?.geojson) {
      source.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: routeData.geojson, properties: {} }]
      });
      const coords = routeData.geojson.coordinates;
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 60 });
      }
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [routeData, mapLoaded]);

  // Fly to selected station
  useEffect(() => {
    if (!map.current || !selectedStation) return;
    map.current.flyTo({
      center: [selectedStation.AddressInfo.Longitude, selectedStation.AddressInfo.Latitude],
      zoom: 16,
      speed: 1.2,
    });
  }, [selectedStation]);

  // Update map language labels
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const updateLabels = () => {
      const style = map.current.getStyle();
      if (!style || !style.layers) return;

      // Define the expression based on current app language
      // 'name:latin' usually contains the Romanized name (English/French style)
      // 'name' often contains local + Romanized
      let labelExpression;
      if (language === 'ar') {
        labelExpression = ['coalesce', ['get', 'name:ar'], ['get', 'name']];
      } else if (language === 'fr') {
        labelExpression = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name']];
      } else {
        // Default to English/Latin and hide Arabic
        labelExpression = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
      }

      style.layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          const id = layer.id;

          // 1. Skip our custom station/cluster layers
          if (['cluster-count', 'unclustered-point'].includes(id)) return;

          // 2. Skip road shields (the empty rectangles you saw)
          // These layers display road numbers (like A1, N1) and should not be changed to city names
          if (id.includes('shield') || id.includes('road_shield') || id.includes('road_') && layer.layout['icon-image']) return;

          // 3. Target only layers that are likely to be text labels (cities, streets, POIs)
          const isLabelLayer = 
            id.includes('label') || 
            id.includes('name') || 
            id.includes('poi') || 
            id.includes('place') ||
            id.includes('waterway');

          if (isLabelLayer) {
            try {
              map.current.setLayoutProperty(id, 'text-field', labelExpression);
            } catch (e) {
              console.warn(`Could not update language for layer ${id}`, e);
            }
          }
        }
      });
    };

    updateLabels();
  }, [language, mapLoaded]);

  // User location HTML marker
  useEffect(() => {
    if (!map.current || !userLocation) return;
    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center';
    el.innerHTML = `
      <div class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
      <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
    `;
    if (userMarker.current) {
      userMarker.current.setLngLat([userLocation[1], userLocation[0]]);
    } else {
      userMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation[1], userLocation[0]])
        .addTo(map.current);
    }
  }, [userLocation]);

  // Start point marker
  useEffect(() => {
    if (!map.current) return;
    if (startPoint) {
      const el = Object.assign(document.createElement('div'), { textContent: '📍', style: 'font-size:24px;line-height:1;' });
      startMarker.current?.remove();
      startMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([startPoint.lng, startPoint.lat]).addTo(map.current);
    } else {
      startMarker.current?.remove();
      startMarker.current = null;
    }
  }, [startPoint]);

  // End point marker
  useEffect(() => {
    if (!map.current) return;
    if (endPoint) {
      const el = Object.assign(document.createElement('div'), { textContent: '🏁', style: 'font-size:24px;line-height:1;' });
      endMarker.current?.remove();
      endMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([endPoint.lng, endPoint.lat]).addTo(map.current);
    } else {
      endMarker.current?.remove();
      endMarker.current = null;
    }
  }, [endPoint]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleReset = () => {
    map.current?.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 1000
    });
  };
  const handleLocate = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        map.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13 });
      },
      () => alert('Could not find your location. Please enable location services.')
    );
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* Custom zoom + locate + reset controls */}
      <div 
        className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <button onClick={(e) => { e.stopPropagation(); handleZoomIn(); }} className="p-3 hover:bg-slate-50 transition-colors text-slate-700 border-b border-slate-100" title="Zoom In">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleZoomOut(); }} className="p-3 hover:bg-slate-50 transition-colors text-slate-700" title="Zoom Out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors" title="Reset Direction & 3D">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L19 21L12 17L5 21L12 2Z" />
          </svg>
        </button>

        <button onClick={(e) => { e.stopPropagation(); handleLocate(); }} className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-[#3b82f6] hover:bg-slate-50 transition-colors" title="Locate Me">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>

      <StationDetail />
    </div>
  );
}
