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
    <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-4 lg:pb-6 space-y-4 lg:space-y-6 flex flex-col scroll-smooth">
      {stationsAlongRoute.map((station) => (
        <StationCard 
          key={station.ID} 
          station={station} 
          t={t} 
          setSelectedStation={setSelectedStation} 
          setCarModeOpen={setCarModeOpen} 
        />
      ))}
    </div>
  );

}

function StationCard({ station, t, setSelectedStation, setCarModeOpen }) {
  const [expandedIndex, setExpandedIndex] = React.useState(null);

  const getFlexClass = (index) => {
    if (expandedIndex === null) return 'flex-1';
    if (expandedIndex === index) return 'flex-[8]';
    // On mobile, if we're on the top row and the bottom one is expanded, shrink us to icon-only
    if ((index === 0 || index === 2) && expandedIndex === 1) return 'flex-none md:flex-1';
    return 'flex-[1]';
  };

  return (
    <div 
      role="article"
      aria-label={`${station.AddressInfo.Title}, ${station.isReachable ? 'Reachable' : 'Unreachable'}`}
      onClick={() => setExpandedIndex(null)}
      className={`p-4 lg:p-6 rounded-[2rem] lg:rounded-[2.5rem] border-2 transition-all duration-300 w-full ${
        station.isReachable 
          ? 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-emerald-300' 
          : 'bg-red-50/50 border-red-100 opacity-70 grayscale-[0.5]'
      }`}
    >

      <div className="flex justify-between items-start gap-4 mb-4 lg:mb-6">
        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 leading-tight">
          {station.AddressInfo.Title}
        </h3>
        <span className={`shrink-0 px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-black uppercase tracking-widest shadow-sm ${
          station.isReachable 
            ? 'bg-emerald-500 text-white shadow-emerald-200' 
            : 'bg-red-500 text-white shadow-red-200'
        }`}>
          {station.isReachable ? t.reachable : t.unreachable}
        </span>
      </div>

      
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 text-lg font-bold h-auto lg:h-32 overflow-hidden">
        <div className="flex flex-row gap-2 w-full lg:contents">
          {/* Distance Info */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setExpandedIndex(expandedIndex === 0 ? null : 0);
            }}
            className={`flex flex-row items-center gap-3 lg:gap-4 text-blue-600 bg-blue-50/50 p-3 lg:p-4 rounded-2xl lg:rounded-3xl cursor-pointer transition-all duration-500 ease-in-out min-w-0 lg:order-1 ${getFlexClass(0)}`}
            aria-label={`Distance: ${station.distAlongRoute.toFixed(1)} kilometers`}
          >
            <div className="w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded-xl lg:rounded-2xl bg-blue-100 flex items-center justify-center shadow-inner">
              <Navigation2 size={24} fill="currentColor" className="opacity-80" />
            </div>
            <div className={`flex flex-col items-start min-w-0 flex-1 transition-all duration-300 ${expandedIndex !== null && expandedIndex !== 0 ? 'opacity-0 invisible hidden lg:flex' : 'opacity-100 visible'}`}>
              <span className="text-xl lg:text-3xl font-black block truncate w-full">{station.distAlongRoute.toFixed(1)} km</span>
              <span className="text-[10px] lg:text-xs uppercase tracking-wider text-blue-400 font-black block truncate w-full">{t.distAlongRoute}</span>
            </div>
          </div>

          {/* Arrival Time Info */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setExpandedIndex(expandedIndex === 2 ? null : 2);
            }}
            className={`flex flex-row items-center gap-3 lg:gap-4 text-slate-600 bg-slate-100/50 p-3 lg:p-4 rounded-2xl lg:rounded-3xl cursor-pointer transition-all duration-500 ease-in-out min-w-0 lg:order-3 ${getFlexClass(2)}`}
            aria-label={`Estimated arrival in ${Math.round(station.distAlongRoute / 0.8)} minutes`}
          >
            <div className="w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded-xl lg:rounded-2xl bg-white flex items-center justify-center shadow-inner">
              <Clock size={24} className="opacity-80" />
            </div>
            <div className={`flex flex-col items-start min-w-0 flex-1 transition-all duration-300 ${expandedIndex !== null && expandedIndex !== 2 ? 'opacity-0 invisible hidden lg:flex' : 'opacity-100 visible'}`}>
            <span className="text-xl lg:text-3xl font-black block truncate w-full">{Math.round(station.distAlongRoute / 0.8)} m</span>
            <span className="text-[10px] lg:text-xs uppercase tracking-wider text-slate-400 font-black block truncate w-full">{t.estTime}</span>
          </div>
          </div>
        </div>
        
        {/* Connector Info */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setExpandedIndex(expandedIndex === 1 ? null : 1);
          }}
          className={`flex flex-row items-center gap-3 lg:gap-4 text-amber-600 bg-amber-50/50 p-3 lg:p-4 rounded-2xl lg:rounded-3xl cursor-pointer transition-all duration-500 ease-in-out min-w-0 lg:order-2 ${getFlexClass(1)}`}
          aria-label={`Connector type: ${station.Connections?.map(c => c.ConnectionType?.Title).join(', ')}`}
        >
          <div className="w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded-xl lg:rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner">
            <Zap size={24} fill="currentColor" className="opacity-80" />
          </div>
          <div className={`flex flex-col min-w-0 flex-1 items-start text-left transition-all duration-300 ${expandedIndex !== null && expandedIndex !== 1 ? 'opacity-0 invisible hidden lg:flex' : 'opacity-100 visible'}`}>
            <span className="text-lg lg:text-2xl font-black block leading-tight">
              {station.Connections?.[0]?.ConnectionType?.Title || t.labels.na}
            </span>
            <span className="text-[10px] lg:text-xs uppercase tracking-wider text-amber-400 font-black block">
              {station.Connections?.length > 1 ? `+${station.Connections.length - 1}` : 'Type'}
            </span>
          </div>
        </div>
      </div>


      <div className="mt-4 lg:mt-6 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStation(station);
            setCarModeOpen(false);
          }}
          className="w-full lg:w-auto px-8 py-4 lg:px-10 lg:py-5 bg-slate-800 hover:bg-black text-white rounded-2xl font-black text-lg lg:text-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-95"
        >
          <Navigation2 size={24} className="rotate-45" />
          {t.viewOnMap}
        </button>
      </div>

    </div>
  );
}
