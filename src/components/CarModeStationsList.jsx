import React from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import { Zap, Clock, Navigation2 } from 'lucide-react';
import * as turf from '@turf/turf';

export default function CarModeStationsList() {
  const language = useStore((state) => state.language);
  const stations = useStore((state) => state.stations);
  const routeData = useStore((state) => state.routeData);
  const carModel = useStore((state) => state.carModel);
  const batteryLevel = useStore((state) => state.batteryLevel);
  const setSelectedStation = useStore((state) => state.setSelectedStation);
  const setCarModeOpen = useStore((state) => state.setCarModeOpen);

  const t = translations[language];

  // 1. First, find all stations along the route (5km buffer)
  // This only needs to run when stations or routeData changes
  const baseStationsAlongRoute = React.useMemo(() => {
    if (!routeData?.geojson) return [];

    const routeLine = turf.lineString(routeData.geojson.coordinates);
    const buffer = turf.buffer(routeLine, 5, { units: 'kilometers' });

    return stations
      .filter(station => {
        const pt = turf.point([station.AddressInfo.Longitude, station.AddressInfo.Latitude]);
        return turf.booleanPointInPolygon(pt, buffer);
      })
      .map(station => {
        const pt = turf.point([station.AddressInfo.Longitude, station.AddressInfo.Latitude]);
        const snapped = turf.nearestPointOnLine(routeLine, pt);
        const distAlongRoute = snapped.properties.location; // km from start
        return { ...station, distAlongRoute };
      })
      .sort((a, b) => a.distAlongRoute - b.distAlongRoute);
  }, [stations, routeData]);

  // 2. Then, calculate reachability based on batteryLevel and carModel
  // This runs when batteryLevel or carModel changes, but is much faster
  const stationsWithReachability = React.useMemo(() => {
    const maxRange = carModel?.range || 400;
    const currentRange = (maxRange * batteryLevel) / 100;

    return baseStationsAlongRoute.map(station => ({
      ...station,
      isReachable: !carModel || station.distAlongRoute <= currentRange
    }));
  }, [baseStationsAlongRoute, carModel, batteryLevel]);

  const stationsAlongRoute = stationsWithReachability;

  if (!routeData) return null;

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
      {stationsAlongRoute.map((station) => (
        <div 
          key={station.ID} 
          role="article"
          aria-label={`${station.AddressInfo.Title}, ${station.isReachable ? 'Reachable' : 'Unreachable'}`}
          className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${
            station.isReachable 
              ? 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-emerald-300' 
              : 'bg-red-50/50 border-red-100 opacity-70 grayscale-[0.5]'
          }`}
        >
          <div className="flex justify-between items-start gap-4 mb-6">
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
              {station.AddressInfo.Title}
            </h3>
            <span className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm ${
              station.isReachable 
                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                : 'bg-red-500 text-white shadow-red-200'
            }`}>
              {station.isReachable ? t.reachable : t.unreachable}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-lg font-bold">
            <div className="flex items-center gap-4 text-blue-600 bg-blue-50/50 p-4 rounded-3xl" aria-label={`Distance: ${station.distAlongRoute.toFixed(1)} kilometers`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shadow-inner">
                <Navigation2 size={24} fill="currentColor" className="opacity-80" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black">{station.distAlongRoute.toFixed(1)} km</span>
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-black">{t.distAlongRoute}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-amber-600 bg-amber-50/50 p-4 rounded-3xl" aria-label={`Connector type: ${station.Connections?.map(c => c.ConnectionType?.Title).join(', ')}`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner">
                <Zap size={24} fill="currentColor" className="opacity-80" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-black truncate">
                  {station.Connections?.[0]?.ConnectionType?.Title || t.labels.na}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black">
                  {station.Connections?.length > 1 ? `+${station.Connections.length - 1} more types` : 'Connector Type'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-slate-600 bg-slate-100/50 p-4 rounded-3xl" aria-label={`Estimated arrival in ${Math.round(station.distAlongRoute / 0.8)} minutes`}>
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-inner">
                <Clock size={24} className="opacity-80" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black">{Math.round(station.distAlongRoute / 0.8)} {t.timeMins}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black">{t.estTime}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setSelectedStation(station);
                setCarModeOpen(false);
              }}
              className="px-8 py-4 bg-slate-800 hover:bg-black text-white rounded-2xl font-black text-lg transition-all flex items-center gap-3 shadow-xl hover:shadow-2xl active:scale-95"
            >
              <Navigation2 size={20} className="rotate-45" />
              {t.viewOnMap}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
