import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create((set, get) => ({
  // UI State
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  
  routePanelOpen: false,
  setRoutePanelOpen: (isOpen) => set({ routePanelOpen: isOpen }),

  carModeOpen: false,
  setCarModeOpen: (isOpen) => set({ carModeOpen: isOpen }),

  // User Location
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Data State
  stations: [],
  setStations: (stations) => set({ stations }),
  loadingStations: false,
  setLoadingStations: (loading) => set({ loadingStations: loading }),

  // Route State
  startPoint: null,
  endPoint: null,
  startName: '',
  endName: '',
  isPickingStart: false,
  isPickingEnd: false,
  routeData: null, // { geojson, distance, duration, buffer }
  
  // Clear Mode
  isClearMode: false,
  setIsClearMode: (val) => set({ isClearMode: val }),

  setStartPoint: (point, name) => set({ startPoint: point, startName: name, isPickingStart: false }),
  setEndPoint: (point, name) => set({ endPoint: point, endName: name, isPickingEnd: false }),
  setStartName: (name) => set({ startName: name }),
  setEndName: (name) => set({ endName: name }),
  setIsPickingStart: (val) => set({ isPickingStart: val, isPickingEnd: false }),
  setIsPickingEnd: (val) => set({ isPickingEnd: val, isPickingStart: false }),
  setRouteData: (data) => set({ routeData: data }),
  clearRoute: () => set({ startPoint: null, endPoint: null, startName: '', endName: '', routeData: null }),

  // Car Mode State
  carModel: null, // from Chargetrip API
  batteryLevel: 100,
  setCarModel: (model) => set({ carModel: model }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),

  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
}));

export const useReportStore = create(
  persist(
    (set, get) => ({
      stationReports: {}, // { stationId: { broken: {count, latest}, works: {count, latest} } }
      reportedByMe: {}, // { stationId: 'broken' | 'works' }
      submitReport: (stationId, type) => {
        const { stationReports, reportedByMe } = get();
        const prevVote = reportedByMe[stationId] ?? null;
        if (prevVote === type) return;

        const now = new Date().toISOString();
        const reports = stationReports[stationId] || { broken: null, works: null };
        
        let newReports = { ...reports };
        
        // Decrement old
        if (prevVote && newReports[prevVote] && newReports[prevVote].count > 0) {
          newReports[prevVote] = {
            count: newReports[prevVote].count - 1,
            latest: newReports[prevVote].count - 1 === 0 ? null : newReports[prevVote].latest
          };
        }
        
        // Increment new
        newReports[type] = {
          count: (newReports[type]?.count || 0) + 1,
          latest: now
        };

        set({
          stationReports: { ...stationReports, [stationId]: newReports },
          reportedByMe: { ...reportedByMe, [stationId]: type }
        });
      }
    }),
    {
      name: 'ev-maps-reports',
    }
  )
);
