import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Papa from 'papaparse'; // npm install papaparse

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Replace this with your "Publish to Web" CSV link
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkDyRbDLaymHL2Ggyk6QD3qAYVLaeTu6_mbSxgY7cqOXV1wAyXCQfEgNyq_JKDbN0L88VZNXTSK1Cz/pub?gid=0&single=true&output=csv";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const overlayRef = useRef(null); 
  const isFlying = useRef(false);
  const [locations, setLocations] = useState([]);

  // 1. FETCH LIVE DATA FROM GOOGLE SHEETS
  useEffect(() => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        // Filter out empty rows
        setLocations(results.data.filter(loc => loc.lat && loc.lng));
      }
    });
  }, []);

  // 2. INITIALIZE MAP
  useEffect(() => {
    if (map.current) return; 

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', 
      projection: 'globe', 
      zoom: 1.5,
      center: [106.6297, 10.8231],
      attributionControl: false 
    });

    map.current.on('style.load', () => {
      map.current.setFog({
        'color': '#5c6a88', 'high-color': '#000000', 'space-color': '#000000',
        'star-intensity': 0.7, 'horizon-blend': 0.03        
      });
    });
  }, []);

  // 3. RENDER DYNAMIC MARKERS
  useEffect(() => {
    if (!map.current || locations.length === 0) return;

    locations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'destination-marker';
      el.innerHTML = `
        <div class="marker-label">${loc.name.toUpperCase()}</div>
        <div class="marker-line"></div>
        <div class="marker-dot"></div>
      `;

      const popup = new mapboxgl.Popup({ offset: [0, -50], maxWidth: '300px' })
        .setHTML(`
          <div style="font-family: 'Inter', sans-serif; padding: 10px; color: #333;">
            <img src="${loc.image}" style="width: 100%; border-radius: 8px; margin-bottom: 8px;" />
            <h3 style="margin: 0; font-size: 16px;">${loc.name}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${loc.description}</p>
          </div>
        `);

      new mapboxgl.Marker({ element: el, anchor: 'bottom' }) 
        .setLngLat([parseFloat(loc.lng), parseFloat(loc.lat)]) 
        .setPopup(popup)
        .addTo(map.current); 

      el.addEventListener('click', () => {
        isFlying.current = true;
        map.current.flyTo({ 
          center: [parseFloat(loc.lng), parseFloat(loc.lat)], 
          zoom: 14, pitch: 70, duration: 6000, essential: true 
        });
      });
    });

    // Start auto-spin once markers are ready
    spinGlobe();
  }, [locations]);

  // --- HELPER LOGIC ---
  const spinGlobe = () => {
    if (map.current.getZoom() > 5 || isFlying.current) return;
    const center = map.current.getCenter();
    center.lng -= 1; 
    map.current.easeTo({ center, duration: 1000, easing: (n) => n });
  };

  const handleGoHome = () => {
    isFlying.current = false;
    map.current.flyTo({ center: [106.6297, 10.8231], zoom: 1.5, pitch: 0, duration: 6000, essential: true });
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: 'black', overflow: 'hidden' }}>
      <style>{`
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        .mapboxgl-popup-content { border-radius: 12px; padding: 0; overflow: hidden; }
        .destination-marker { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .marker-label { background: rgba(0,0,0,0.8); color: #00d4ff; padding: 4px 10px; border-radius: 4px; font-family: 'Inter'; font-size: 10px; letter-spacing: 2px; border: 1px solid rgba(0, 212, 255, 0.3); white-space: nowrap; margin-bottom: 5px; backdrop-filter: blur(4px); }
        .marker-line { width: 1px; height: 40px; background: linear-gradient(to bottom, #00d4ff, rgba(0, 212, 255, 0)); }
        .marker-dot { width: 8px; height: 8px; background-color: #00d4ff; border: 1.5px solid white; border-radius: 50%; box-shadow: 0 0 10px #00d4ff; }
      `}</style>

      {/* HEADER */}
      <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 10000, color: 'white', fontFamily: 'Inter', pointerEvents: 'none' }}>
        <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '2px' }}>TONG VAN THANH</h1>
        <p style={{ margin: '5px 0', fontSize: '12px', opacity: 0.6 }}>SAAS SOLUTIONS • VIDEO EDITOR</p>
      </div>

      <button onClick={handleGoHome} style={{ position: 'absolute', top: '30px', right: '30px', zIndex: 10000, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer' }}>
        BACK TO SPACE
      </button>

      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

      <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, transition: 'opacity 0.3s ease' }}>
        <svg width="100%" height="100%"><defs><radialGradient id="sunlight" cx="20%" cy="10%" r="95%"><stop offset="35%" stopColor="black" stopOpacity="0" /><stop offset="85%" stopColor="black" stopOpacity="0.65" /></radialGradient></defs><rect width="100%" height="100%" fill="url(#sunlight)" /></svg>
      </div>
    </div>
  );
}

export default App;