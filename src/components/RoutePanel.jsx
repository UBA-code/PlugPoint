import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import { X, MapPin, Flag, Navigation } from 'lucide-react';

export default function RoutePanel() {
  const language = useStore((state) => state.language);
  const routePanelOpen = useStore((state) => state.routePanelOpen);
  const setRoutePanelOpen = useStore((state) => state.setRoutePanelOpen);
  
  const startName = useStore((state) => state.startName);
  const endName = useStore((state) => state.endName);
  const startPoint = useStore((state) => state.startPoint);
  const endPoint = useStore((state) => state.endPoint);
  const routeData = useStore((state) => state.routeData);
  const setRouteData = useStore((state) => state.setRouteData);
  const clearRoute = useStore((state) => state.clearRoute);
  
  const isPickingStart = useStore((state) => state.isPickingStart);
  const isPickingEnd = useStore((state) => state.isPickingEnd);
  const setIsPickingStart = useStore((state) => state.setIsPickingStart);
  const setIsPickingEnd = useStore((state) => state.setIsPickingEnd);
  const setStartPoint = useStore((state) => state.setStartPoint);
  const setEndPoint = useStore((state) => state.setEndPoint);
  const setStartName = useStore((state) => state.setStartName);
  const setEndName = useStore((state) => state.setEndName);

  const [loading, setLoading] = useState(false);
  const [startResults, setStartResults] = useState([]);
  const [endResults, setEndResults] = useState([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

  const t = translations[language];

  const searchLocation = async (query, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ma&limit=5`);
      const data = await res.json();
      if (type === 'start') setStartResults(data);
      else setEndResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (startName.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartResults([]);
      setIsSearchingStart(false);
      return;
    }
    const timer = setTimeout(() => {
      if (isSearchingStart) searchLocation(startName, 'start');
    }, 500);
    return () => clearTimeout(timer);
  }, [startName, isSearchingStart]);

  useEffect(() => {
    if (endName.length < 3) {
      setEndResults([]);
      setIsSearchingEnd(false);
      return;
    }
    const timer = setTimeout(() => {
      if (isSearchingEnd) searchLocation(endName, 'end');
    }, 500);
    return () => clearTimeout(timer);
  }, [endName, isSearchingEnd]);

  const handleStartChange = (e) => {
    const val = e.target.value;
    setStartName(val);
    setIsSearchingStart(val.length >= 3);
  };

  const handleEndChange = (e) => {
    const val = e.target.value;
    setEndName(val);
    setIsSearchingEnd(val.length >= 3);
  };

  if (!routePanelOpen) return null;

  const handleCalculate = async () => {
    if (!startPoint || !endPoint) return;
    setLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok') throw new Error('No route found');
      
      setRouteData({
        geojson: data.routes[0].geometry,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
      });
      setRoutePanelOpen(false);
    } catch (err) {
      console.error(err);
      alert(t.errorRoute);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`absolute top-24 left-1/2 -translate-x-1/2 lg:translate-x-0 w-[calc(100%-2rem)] lg:w-80 z-[1300]
      ${language === 'ar' ? 'lg:right-4 lg:left-auto' : 'lg:left-4 lg:right-auto'}
      bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[70vh] lg:max-h-none overflow-y-auto`}>
      <div className="flex justify-between items-center p-4 border-b border-slate-100">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Navigation size={20} className="text-blue-500" /> {t.routePlanner}</h2>
        <button onClick={() => setRoutePanelOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{t.startPoint}</label>
          <div className="relative">
            <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1.5 lg:p-1">
              <input 
                type="text" 
                value={startName} 
                onChange={handleStartChange}
                placeholder={t.inputPlaceholder}
                className="bg-transparent flex-1 px-3 text-sm text-slate-700 outline-none font-medium"
              />
              <button 
                onClick={() => setIsPickingStart(!isPickingStart)}
                className={`p-2 rounded-lg transition-all ${isPickingStart ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
                title={t.pickMap}
              >
                <MapPin size={18} />
              </button>
            </div>
            
            {startResults.length > 0 && isSearchingStart && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-[1100] max-h-48 overflow-y-auto">
                {startResults.map((res) => (
                  <button
                    key={res.place_id}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 border-b border-slate-50 last:border-0"
                    onClick={() => {
                      setStartPoint({ lat: parseFloat(res.lat), lng: parseFloat(res.lon) }, res.display_name.split(',')[0]);
                      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartResults([]);
                      setIsSearchingStart(false);
                    }}
                  >
                    {res.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{t.destination}</label>
          <div className="relative">
            <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1.5 lg:p-1">
              <input 
                type="text" 
                value={endName} 
                onChange={handleEndChange}
                placeholder={t.inputPlaceholder}
                className="bg-transparent flex-1 px-3 text-sm text-slate-700 outline-none font-medium"
              />
              <button 
                onClick={() => setIsPickingEnd(!isPickingEnd)}
                className={`p-2 rounded-lg transition-all ${isPickingEnd ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
                title={t.pickMap}
              >
                <Flag size={18} />
              </button>
            </div>

            {endResults.length > 0 && isSearchingEnd && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-[1100] max-h-48 overflow-y-auto">
                {endResults.map((res) => (
                  <button
                    key={res.place_id}
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 border-b border-slate-50 last:border-0"
                    onClick={() => {
                      setEndPoint({ lat: parseFloat(res.lat), lng: parseFloat(res.lon) }, res.display_name.split(',')[0]);
                      setEndResults([]);
                      setIsSearchingEnd(false);
                    }}
                  >
                    {res.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleCalculate}
          disabled={!startPoint || !endPoint || loading}
          className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
        >
          {loading ? t.calculating : t.findRoute}
        </button>

        {routeData && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.distance}</span>
              <span className="font-black text-slate-800">{(routeData.distance / 1000).toFixed(1)} km</span>
            </div>
            <button 
              onClick={clearRoute}
              className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
            >
              {t.clear}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
