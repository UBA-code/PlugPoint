import React, { useEffect } from 'react';
import Header from './components/Header';
import RoutePanel from './components/RoutePanel';
import CarModePanel from './components/CarModePanel';
import MapComponent from './components/MapComponent';
import { useStore } from './store/useStore';

function App() {
  const language = useStore((state) => state.language);
  const setStations = useStore((state) => state.setStations);
  const setLoadingStations = useStore((state) => state.setLoadingStations);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    async function loadStations() {
      setLoadingStations(true);
      try {
        const queryParams = new URLSearchParams({
          key: import.meta.env.VITE_OPENCHARGEMAP_KEY, // Use environment variable
          countrycode: 'MA',
          maxresults: 250,
          compact: 'false',
          verbose: 'true',
          includecomments: 'true'
        });
        const response = await fetch(`https://api.openchargemap.io/v3/poi/?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch stations');
        const data = await response.json();
        setStations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStations(false);
      }
    }
    loadStations();
  }, [setStations, setLoadingStations]);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-slate-800 bg-slate-50 font-sans">
      <Header />
      <RoutePanel />
      <CarModePanel />
      <MapComponent />
    </div>
  );
}

export default App;
