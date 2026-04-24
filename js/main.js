// main.js - Charge.ma (OpenChargeMap Edition)

// Morocco coordinates [latitude, longitude]
const moroccoCenter = [31.7917, -7.0926];
const initialZoom = 6;

// OpenChargeMap API Configuration
const OCM_ENDPOINT = 'https://api.openchargemap.io/v3/poi/';

// Cache stations for re-rendering on language change
let cachedStations = [];

// ── localStorage Report Store ─────────────────────────────────────────────────
const LS_REPORTS  = 'chargeReports';   // { stationId: { broken, works } }
const LS_REPORTED = 'chargeReported';  // { stationId: 'broken'|'works' }  (this browser)

// In-memory cache — initialised synchronously from localStorage
let stationReports = _lsLoad(LS_REPORTS);

function _lsLoad(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function _lsSave(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Has this browser already reported this station?
function _hasReported(stationId) {
  return stationId in _lsLoad(LS_REPORTED);
}

// Format an ISO datetime string to a short local string
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Build the report widget HTML for a given stationId
function buildReportWidget(stationId, reports, alreadyReported) {
  const b = reports?.broken;
  const w = reports?.works;
  const bCount = b?.count ?? 0;
  const wCount = w?.count ?? 0;
  const bLatest = b?.latest ? fmtDate(b.latest) : null;
  const wLatest = w?.latest ? fmtDate(w.latest) : null;

  // Which button did this browser already vote for?
  const myVote = alreadyReported ? (_lsLoad(LS_REPORTED)[stationId] ?? null) : null;

  // Only disable the button matching the current vote; leave the other active
  const brokenDisabled = myVote === 'broken' ? 'disabled' : '';
  const worksDisabled  = myVote === 'works'  ? 'disabled' : '';
  const brokenClass = `report-btn report-broken${myVote === 'broken' ? ' locked' : ''}`;
  const worksClass  = `report-btn report-works${myVote === 'works'  ? ' locked' : ''}`;

  return `
    <div class="report-widget" id="rw-${stationId}">
      <div class="report-title">🗳️ ${i18n.t('reports.title')}</div>
      <div class="report-counters">
        <div class="report-stat broken-stat">
          <span class="report-count" id="bc-${stationId}">${bCount}</span>
          <span class="report-label">${i18n.t('reports.broken')}</span>
          <span class="report-ts" id="bt-${stationId}">${bLatest ?? ''}</span>
        </div>
        <div class="report-stat works-stat">
          <span class="report-count" id="wc-${stationId}">${wCount}</span>
          <span class="report-label">${i18n.t('reports.works')}</span>
          <span class="report-ts" id="wt-${stationId}">${wLatest ?? ''}</span>
        </div>
      </div>
      <div class="report-actions">
        <button type="button" class="${brokenClass}" ${brokenDisabled} onclick="event.stopPropagation(); window.submitReport('${stationId}','broken')">🔴 ${i18n.t('reports.reportBroken')}</button>
        <button type="button" class="${worksClass}"  ${worksDisabled}  onclick="event.stopPropagation(); window.submitReport('${stationId}','works')">🟢 ${i18n.t('reports.itWorks')}</button>
      </div>
    </div>
  `;
}

// Routing State
let startPoint = null;
let endPoint = null;
let routeLayer = null;
let routeBuffer = null;
let currentRouteLine = null;
let currentRouteDistance = 0;
let currentRouteDuration = 0;
let carModeStations = [];
let isPickingStart = false;
let isPickingEnd = false;

// Wait for DOM and Leaflet to be ready
window.addEventListener('DOMContentLoaded', () => {
  if (typeof L === 'undefined') {
    console.error('Leaflet failed to load from CDN');
    return;
  }

  // Initialize the map with better performance options
  const map = L.map('map', {
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true // Use canvas for better performance with many markers
  }).setView(moroccoCenter, initialZoom);

  // Use a cleaner, more professional tile layer (CartoDB Positron)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Custom Icon for Charging Stations (OCM-like Green Pin)
  const createChargingIcon = (statusId, isDimmed = false) => {
    let statusClass = 'unknown';
    if (statusId === 50 || statusId === 10) statusClass = 'operational';
    else if ([20, 30, 100, 150, 200].includes(statusId)) statusClass = 'broken';

    const dimmedClass = isDimmed ? 'dimmed' : '';

    return L.divIcon({
      className: 'ocm-marker-container',
      html: `
        <div class="ocm-marker-pin ${statusClass} ${dimmedClass}">
          <div class="ocm-bolt-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
      popupAnchor: [0, -40]
    });
  };

  // Create Marker Cluster Group
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      const childCount = cluster.getChildCount();
      let c = ' marker-cluster-';
      if (childCount < 10) c += 'small';
      else if (childCount < 100) c += 'medium';
      else c += 'large';

      return new L.DivIcon({ 
        html: '<div><span>' + childCount + '</span></div>', 
        className: 'marker-cluster' + c, 
        iconSize: new L.Point(40, 40) 
      });
    }
  });

  // ── Report submission (global so popup HTML onclick can reach it) ──────────
  window.submitReport = (stationId, type) => {
    const reported = _lsLoad(LS_REPORTED);
    const prevVote = reported[stationId] ?? null;

    // Already voted the same thing — do nothing (button is disabled anyway)
    if (prevVote === type) return;

    const now = new Date().toISOString();
    if (!stationReports[stationId]) stationReports[stationId] = { broken: null, works: null };

    // If changing vote: decrement the previous type's count
    if (prevVote) {
      const prev = stationReports[stationId][prevVote];
      if (prev && prev.count > 0) {
        stationReports[stationId][prevVote] = {
          count: prev.count - 1,
          latest: prev.count - 1 === 0 ? null : prev.latest
        };
      }
    }

    // Increment the new type's count
    const current = stationReports[stationId][type];
    stationReports[stationId][type] = {
      count: (current?.count ?? 0) + 1,
      latest: now
    };
    _lsSave(LS_REPORTS, stationReports);

    // Save this browser's current vote
    reported[stationId] = type;
    _lsSave(LS_REPORTED, reported);

    // Rebuild the widget in-place with updated counts and button states
    const widget = document.getElementById(`rw-${stationId}`);
    if (widget) {
      widget.outerHTML = buildReportWidget(stationId, stationReports[stationId], true);
    }
  };

  // ── Determine effective visual status (API + community reports) ───────────
  function effectiveStatusClass(statusId, stationId) {
    const r = stationReports[stationId];
    if (r) {
      const bCount = r.broken?.count ?? 0;
      const wCount = r.works?.count ?? 0;
      // Community override: if broken reports outweigh works by ≥2, show red
      if (bCount - wCount >= 2) return 'broken';
      // If works dominates, show green regardless of OCM status
      if (wCount > bCount) return 'operational';
    }
    // Fall back to OCM status
    if (statusId === 50 || statusId === 10) return 'operational';
    if ([20, 30, 100, 150, 200].includes(statusId)) return 'broken';
    return 'unknown';
  }

  // ── Render charging stations ──────────────────────────────────────────────
  function renderChargingStations(stations, buffer = null) {
    markers.clearLayers();
    let nearbyCount = 0;
    
    stations.forEach(station => {
      const { AddressInfo, Connections } = station;
      if (AddressInfo && AddressInfo.Latitude && AddressInfo.Longitude) {
        const statusId = station.StatusTypeID || 0;
        const stationId = String(station.ID);
        
        let isOutsideBuffer = false;
        let effStatus = 'unknown'; // Define here to use in car mode
        let statusBadgeClass = 'offline';
        let statusLabel = i18n.t('status.unknown');
        let connectorTypes = i18n.t('labels.na');
        let powerLevels = i18n.t('labels.na');

        if (buffer && currentRouteLine) {
          const pt = turf.point([AddressInfo.Longitude, AddressInfo.Latitude]);
          const isInside = turf.booleanPointInPolygon(pt, buffer);
          if (isInside) {
            nearbyCount++;
          } else {
            isOutsideBuffer = true;
          }
        } else if (buffer) {
          // Fallback if no line
          const pt = turf.point([AddressInfo.Longitude, AddressInfo.Latitude]);
          const isInside = turf.booleanPointInPolygon(pt, buffer);
          if (isInside) nearbyCount++;
          else isOutsideBuffer = true;
        }

        if (isOutsideBuffer) return;

        // Effective visual status (OCM + community)
        effStatus = effectiveStatusClass(statusId, stationId);

        // Status badge label
        if (effStatus === 'operational') { statusLabel = i18n.t('status.operational'); statusBadgeClass = 'online'; }
        else if (effStatus === 'broken')  { statusLabel = i18n.t('status.broken');      statusBadgeClass = 'broken'; }

        // Connectors & power
        connectorTypes = Connections?.length
          ? [...new Set(Connections.map(c => c.ConnectionType?.Title || i18n.t('labels.na')))].join(', ')
          : i18n.t('labels.na');
        powerLevels = Connections?.length
          ? [...new Set(Connections.map(c => c.PowerKW ? c.PowerKW + 'kW' : null).filter(Boolean))].join(', ')
          : i18n.t('labels.na');

        if (buffer && currentRouteLine) {
          const pt = turf.point([AddressInfo.Longitude, AddressInfo.Latitude]);
          const snapped = turf.nearestPointOnLine(currentRouteLine, pt);
          const distAlongRoute = snapped.properties.location; // km
          const etaSeconds = (distAlongRoute / (currentRouteDistance / 1000)) * currentRouteDuration;
          
          carModeStations.push({
            station,
            distAlongRoute,
            etaSeconds,
            effStatus,
            statusBadgeClass,
            statusLabel,
            connectorTypes,
            powerLevels
          });
        }

        // Create icon with effective status
        const markerIcon = (() => {
          const sc = effStatus;
          return L.divIcon({
            className: 'ocm-marker-container',
            html: `<div class="ocm-marker-pin ${sc}"><div class="ocm-bolt-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg></div></div>`,
            iconSize: [32, 44],
            iconAnchor: [16, 44],
            popupAnchor: [0, -40]
          });
        })();

        const marker = L.marker([AddressInfo.Latitude, AddressInfo.Longitude], { icon: markerIcon });

        const reportWidget = buildReportWidget(stationId, stationReports[stationId] ?? null, _hasReported(stationId));

        const popupContent = `
          <div class="ocm-premium-popup">
            <div class="popup-header">
              <h3>${AddressInfo.Title || i18n.t('labels.chargingStation')}</h3>
              <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
            </div>
            <div class="popup-body">
              <p class="address"><i class="loc-icon">📍</i> ${AddressInfo.AddressLine1 || i18n.t('labels.na')}</p>
              <p class="town">${AddressInfo.Town || ''}, ${AddressInfo.Postcode || ''}</p>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">${i18n.t('labels.operator')}</span>
                  <span class="value">${station.OperatorInfo ? station.OperatorInfo.Title : i18n.t('labels.independent')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${i18n.t('labels.usage')}</span>
                  <span class="value">${station.UsageType ? station.UsageType.Title : i18n.t('labels.public')}</span>
                </div>
                <div class="info-item connector-box" style="grid-column:span 1;margin-top:4px;">
                  <span class="label">${i18n.t('labels.connectors')}</span>
                  <span class="value">${connectorTypes}</span>
                </div>
                <div class="info-item connector-box" style="grid-column:span 1;margin-top:4px;border-left-color:var(--secondary);">
                  <span class="label">${i18n.t('labels.power')}</span>
                  <span class="value">${powerLevels}</span>
                </div>
              </div>
              ${AddressInfo.ContactTelephone1 ? `<p class="phone" style="margin-top:16px;font-size:0.85rem;color:#64748b;">📞 ${AddressInfo.ContactTelephone1}</p>` : ''}
            </div>
            ${reportWidget}
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 320, className: 'ocm-custom-popup' });

        // Refresh the report widget every time the popup opens so it always
        // reflects the latest counts and the "already reported" lock state.
        marker.on('popupopen', () => {
          const popupEl = marker.getPopup().getElement();
          if (!popupEl) return;
          const existing = popupEl.querySelector(`#rw-${stationId}`);
          if (existing) {
            // Reload reports from localStorage in case another tab updated them
            stationReports = _lsLoad(LS_REPORTS);
            const freshWidget = buildReportWidget(
              stationId,
              stationReports[stationId] ?? null,
              _hasReported(stationId)
            );
            existing.outerHTML = freshWidget;
          }
        });

        markers.addLayer(marker);
      }
    });
    
    map.addLayer(markers);
    if (buffer) document.getElementById('nearby-count').textContent = nearbyCount;
  }

  // Function to fetch and display charging stations
  async function loadChargingStations() {
    try {
      const queryParams = new URLSearchParams({
        key: OCM_API_KEY,
        countrycode: 'MA',
        maxresults: 250,
        compact: 'false',
        verbose: 'true',
        includecomments: 'true'
      });

      const response = await fetch(`${OCM_ENDPOINT}?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch charging stations');
      
      cachedStations = await response.json();
      renderChargingStations(cachedStations);
      console.log(`Clustered ${cachedStations.length} charging stations.`);
    } catch (error) {
      console.error('Error loading OpenChargeMap data:', error);
    }
  }

  // Handle City Markers
  let cityMarkers = [];
  function renderCityMarkers() {
    cityMarkers.forEach(m => map.removeLayer(m));
    cityMarkers = [];

    const keyCities = [
      { name: i18n.t('cities.rabat'), coords: [34.0209, -6.8416], desc: i18n.t('cities.rabatDesc') },
      { name: i18n.t('cities.casablanca'), coords: [33.5731, -7.5898], desc: i18n.t('cities.casablancaDesc') },
      { name: i18n.t('cities.marrakesh'), coords: [31.6295, -7.9811], desc: i18n.t('cities.marrakeshDesc') }
    ];

    keyCities.forEach(city => {
      const cityMarker = L.circleMarker(city.coords, {
        radius: 8,
        fillColor: "#c1272d",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      
      cityMarker.bindPopup(`<b>${city.name}</b><br>${city.desc}`);
      cityMarkers.push(cityMarker);
    });
  }

  // Function to handle user location
  function locateUser() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const userCoords = [latitude, longitude];

        // Create or update user location marker
        if (window.userMarker) {
          window.userMarker.setLatLng(userCoords);
          window.userAccuracyCircle.setLatLng(userCoords).setRadius(accuracy);
        } else {
          // Pulse marker for user location
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="pulse"></div><div class="dot"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          window.userMarker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
          window.userAccuracyCircle = L.circle(userCoords, {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(map);
        }
        
        window.userMarker.bindPopup(`<b>${i18n.t('youAreHere')}</b>`).openPopup();

        // Center map on user if it's the first time
        map.setView(userCoords, 14);
      },
      (error) => {
        console.error('Error getting location:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  // Add a "Locate Me" button control
  const LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-control');
      const button = L.DomUtil.create('a', 'locate-btn', container);
      button.innerHTML = '🎯';
      button.title = i18n.t('locateMe');
      
      // Update title on lang change
      i18n.subscribe(() => {
        button.title = i18n.t('locateMe');
      });

      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        locateUser();
      });
      
      return container;
    }
  });

  map.addControl(new LocateControl());

  // Language Switcher Logic
  const langButtons = document.querySelectorAll('.lang-btn');
  
  function updateActiveLangButton(lang) {
    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      i18n.setLanguage(lang);
    });
  });

  // Subscribe to i18n changes
  i18n.subscribe((lang) => {
    updateActiveLangButton(lang);
    renderCityMarkers();
    if (cachedStations.length > 0) {
      renderChargingStations(cachedStations, routeBuffer);
      if (document.body.classList.contains('car-mode-active')) {
        renderCarModeList();
      }
    }
    // Update user marker popup if exists
    if (window.userMarker) {
      window.userMarker.setPopupContent(`<b>${i18n.t('youAreHere')}</b>`);
    }
  });

  // Initialize with current language
  i18n.setLanguage(i18n.currentLanguage);
  renderCityMarkers();

  // Automatically try to locate user on start
  locateUser();

  // Load charging stations (reports already loaded from localStorage synchronously)
  loadChargingStations();

  // --- ROUTING LOGIC ---

  const routePanel = document.getElementById('route-panel');
  const toggleRouteBtn = document.getElementById('toggle-route');
  const carModeBtn = document.getElementById('car-mode-btn');
  const carModePanel = document.getElementById('car-mode-panel');
  const exitCarModeBtn = document.getElementById('exit-car-mode');
  const carStationsList = document.getElementById('car-stations-list');
  const closePanelBtn = document.getElementById('close-panel');
  const calculateBtn = document.getElementById('calculate-route');
  const clearBtn = document.getElementById('clear-route');
  const startInput = document.getElementById('start-input');
  const endInput = document.getElementById('end-input');
  const startResults = document.getElementById('start-results');
  const endResults = document.getElementById('end-results');
  const pickStartBtn = document.getElementById('pick-start');
  const pickEndBtn = document.getElementById('pick-end');
  const routeInfo = document.getElementById('route-info');

  // Toggle Panel
  toggleRouteBtn.addEventListener('click', () => routePanel.classList.toggle('hide'));
  closePanelBtn.addEventListener('click', () => routePanel.classList.add('hide'));

  // Map Click Handling
  map.on('click', (e) => {
    if (isPickingStart) {
      setStartPoint(e.latlng, i18n.t('pinnedLocation'));
      stopPicking();
    } else if (isPickingEnd) {
      setEndPoint(e.latlng, i18n.t('pinnedLocation'));
      stopPicking();
    }
  });

  function stopPicking() {
    isPickingStart = false;
    isPickingEnd = false;
    pickStartBtn.classList.remove('active');
    pickEndBtn.classList.remove('active');
    map.getContainer().style.cursor = '';
  }

  pickStartBtn.addEventListener('click', () => {
    isPickingStart = true;
    isPickingEnd = false;
    pickStartBtn.classList.add('active');
    pickEndBtn.classList.remove('active');
    map.getContainer().style.cursor = 'crosshair';
  });

  pickEndBtn.addEventListener('click', () => {
    isPickingEnd = true;
    isPickingStart = false;
    pickEndBtn.classList.add('active');
    pickStartBtn.classList.remove('active');
    map.getContainer().style.cursor = 'crosshair';
  });

  function setStartPoint(latlng, name) {
    startPoint = latlng;
    startInput.value = name;
    if (window.startMarker) map.removeLayer(window.startMarker);
    window.startMarker = L.marker(latlng, { 
      icon: L.divIcon({ className: 'route-marker start', html: '📍', iconSize: [24, 24], iconAnchor: [12, 24] }) 
    }).addTo(map);
  }

  function setEndPoint(latlng, name) {
    endPoint = latlng;
    endInput.value = name;
    if (window.endMarker) map.removeLayer(window.endMarker);
    window.endMarker = L.marker(latlng, { 
      icon: L.divIcon({ className: 'route-marker end', html: '🏁', iconSize: [24, 24], iconAnchor: [12, 24] }) 
    }).addTo(map);
  }

  // Autocomplete Logic
  async function handleSearch(input, resultsDiv, setter) {
    const query = input.value;
    if (query.length < 3) {
      resultsDiv.style.display = 'none';
      return;
    }

    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ma&limit=5`);
      const data = await resp.json();
      
      resultsDiv.innerHTML = '';
      if (data.length > 0) {
        resultsDiv.style.display = 'block';
        data.forEach(item => {
          const div = L.DomUtil.create('div', 'search-result-item', resultsDiv);
          div.textContent = item.display_name;
          div.addEventListener('click', () => {
            setter(L.latLng(item.lat, item.lon), item.display_name);
            resultsDiv.style.display = 'none';
          });
        });
      } else {
        resultsDiv.style.display = 'none';
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  let startTimeout, endTimeout;
  startInput.addEventListener('input', () => {
    clearTimeout(startTimeout);
    startTimeout = setTimeout(() => handleSearch(startInput, startResults, setStartPoint), 300);
  });
  endInput.addEventListener('input', () => {
    clearTimeout(endTimeout);
    endTimeout = setTimeout(() => handleSearch(endInput, endResults, setEndPoint), 300);
  });

  // Calculate Route
  calculateBtn.addEventListener('click', async () => {
    if (!startPoint || !endPoint) return;
    
    calculateBtn.disabled = true;
    calculateBtn.textContent = i18n.t('calculating');

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.code !== 'Ok') throw new Error('No route found');

      const route = data.routes[0];
      const geojson = route.geometry;
      currentRouteDistance = route.distance;
      currentRouteDuration = route.duration;

      // Clear old route
      if (routeLayer) map.removeLayer(routeLayer);

      // Display Route
      routeLayer = L.geoJSON(geojson, {
        style: { color: '#c1272d', weight: 6, opacity: 0.8, className: 'route-line' }
      }).addTo(map);

      // Fit map
      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });

      // Geographic Filtering
      currentRouteLine = turf.lineString(geojson.coordinates);
      routeBuffer = turf.buffer(currentRouteLine, 5, { units: 'kilometers' });

      // Re-render stations with filter
      renderChargingStations(cachedStations, routeBuffer);

      // Update UI
      routeInfo.classList.remove('hide');
      document.getElementById('route-dist').textContent = (route.distance / 1000).toFixed(1) + ' km';
      
    } catch (err) {
      alert(i18n.t('errorRoute'));
      console.error(err);
    } finally {
      calculateBtn.disabled = false;
      calculateBtn.textContent = i18n.t('findRoute');
    }
  });

  // Clear Route
  clearBtn.addEventListener('click', () => {
    if (routeLayer) map.removeLayer(routeLayer);
    if (window.startMarker) map.removeLayer(window.startMarker);
    if (window.endMarker) map.removeLayer(window.endMarker);
    
    startPoint = null;
    endPoint = null;
    routeLayer = null;
    routeBuffer = null;
    currentRouteLine = null;
    currentRouteDistance = 0;
    currentRouteDuration = 0;
    carModeStations = [];
    
    startInput.value = '';
    endInput.value = '';
    routeInfo.classList.add('hide');
    
    document.body.classList.remove('car-mode-active');
    carModePanel.classList.add('hide');
    
    renderChargingStations(cachedStations);
  });

  // Handle map resizing
  setTimeout(() => {
    map.invalidateSize();
  }, 500);

  // --- CAR MODE UI ---
  function renderCarModeList() {
    carStationsList.innerHTML = '';
    
    if (!currentRouteLine) {
      carStationsList.innerHTML = `
        <div class="car-empty-state" style="text-align:center; margin-top: 50px;">
          <h3 style="font-size: 2rem; color: #aaaaaa; font-weight: 600; margin-bottom: 20px;">${i18n.t('noRouteNotice')}</h3>
          <button class="car-action-btn" id="car-plan-route-btn" style="padding: 16px 32px; font-size: 1.5rem; background: var(--primary); color: white;">${i18n.t('planRouteBtn')}</button>
        </div>
      `;
      document.getElementById('car-plan-route-btn').addEventListener('click', () => {
        document.body.classList.remove('car-mode-active');
        carModePanel.classList.add('hide');
        routePanel.classList.remove('hide');
      });
      return;
    }
    
    // Sort by order of appearance
    carModeStations.sort((a, b) => a.distAlongRoute - b.distAlongRoute);

    carModeStations.forEach((item, index) => {
      const { AddressInfo } = item.station;
      const distStr = item.distAlongRoute.toFixed(1) + ' km';
      const etaMins = Math.round(item.etaSeconds / 60);
      let etaStr = '';
      if (etaMins > 60) {
        etaStr = Math.floor(etaMins / 60) + ' ' + i18n.t('timeHrs') + ' ' + (etaMins % 60) + ' ' + i18n.t('timeMins');
      } else {
        etaStr = etaMins + ' ' + i18n.t('timeMins');
      }

      const div = document.createElement('div');
      div.className = 'car-card';
      
      div.innerHTML = `
        <div class="car-card-header">
          <h3>${(index + 1).toString().padStart(2, '0')} - ${AddressInfo.Title || i18n.t('labels.chargingStation')}</h3>
          <span class="status-badge ${item.statusBadgeClass}">${item.statusLabel}</span>
        </div>
        <div class="car-card-metrics">
          <div class="car-metric">
            <span class="metric-label">${i18n.t('distAlongRoute')}</span>
            <span class="metric-value">${distStr}</span>
          </div>
          <div class="car-metric">
            <span class="metric-label">${i18n.t('estTime')}</span>
            <span class="metric-value">${etaStr}</span>
          </div>
        </div>
        <div class="car-card-details">
          <div class="car-metric">
            <span class="metric-label">${i18n.t('labels.power')}</span>
            <span class="metric-value">${item.powerLevels}</span>
          </div>
        </div>
        <button class="car-action-btn">${i18n.t('viewOnMap')}</button>
      `;
      
      const btn = div.querySelector('.car-action-btn');
      btn.addEventListener('click', () => {
        map.setView([AddressInfo.Latitude, AddressInfo.Longitude], 16);
        document.body.classList.remove('car-mode-active');
        carModePanel.classList.add('hide');
      });

      carStationsList.appendChild(div);
    });
  }

  carModeBtn.addEventListener('click', () => {
    document.body.classList.add('car-mode-active');
    carModePanel.classList.remove('hide');
    renderCarModeList();
  });

  exitCarModeBtn.addEventListener('click', () => {
    document.body.classList.remove('car-mode-active');
    carModePanel.classList.add('hide');
  });

  console.log('Charge.ma optimized with Marker Clustering and I18n!');
});



