import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Papa from 'papaparse';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkDyRbDLaymHL2Ggyk6QD3qAYVLaeTu6_mbSxgY7cqOXV1wAyXCQfEgNyq_JKDbN0L88VZNXTSK1Cz/pub?gid=0&single=true&output=csv";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const overlayRef = useRef(null); 
  const isFlying = useRef(false);
  const userInteracting = useRef(false);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. FETCH LIVE DATA FROM GOOGLE SHEETS
  useEffect(() => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        setLocations(results.data.filter(loc => loc.lat && loc.lng));
      }
    });
  }, []);

  // 2. INITIALIZE MAP & CINEMATIC ENVIRONMENT
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
        'color': '#1a1a2e', 'high-color': '#000000', 'space-color': '#000000',
        'star-intensity': 0.8, 'horizon-blend': 0.05        
      });
      
      setTimeout(() => setIsLoading(false), 1000);
    });

    // Desktop interaction listeners
    map.current.on('mousedown', () => { userInteracting.current = true; });
    map.current.on('dragstart', () => { userInteracting.current = true; });
    map.current.on('mouseup', () => { userInteracting.current = false; spinGlobe(); });
    map.current.on('dragend', () => { userInteracting.current = false; spinGlobe(); });
    
    // Mobile touch listeners
    map.current.on('touchstart', () => { userInteracting.current = true; });
    map.current.on('touchend', () => { userInteracting.current = false; spinGlobe(); });
    
    // Infinite loop trigger
    map.current.on('moveend', () => { spinGlobe(); });
  }, []);

  // 3. RENDER MARKERS, POPUPS & FLIGHT PATHS
  useEffect(() => {
    if (!map.current || locations.length === 0) return;

    // --- DRAW FLIGHT ROUTES ---
    const addRoute = () => {
      const coordinates = locations.map(loc => [parseFloat(loc.lng), parseFloat(loc.lat)]);

      if (map.current.getSource('flight-route')) {
        map.current.getSource('flight-route').setData({
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates }
        });
      } else {
        map.current.addSource('flight-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
        });

        // The glowing cyan background aura
        map.current.addLayer({
          id: 'flight-route-glow',
          type: 'line',
          source: 'flight-route',
          paint: {
            'line-color': '#00d4ff',
            'line-width': 6,
            'line-opacity': 0.15,
            'line-blur': 4
          }
        });

        // The solid/dashed flight path
        map.current.addLayer({
          id: 'flight-route-line',
          type: 'line',
          source: 'flight-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00d4ff',
            'line-width': 1.5,
            'line-dasharray': [2, 4], 
            'line-opacity': 0.8
          }
        });
      }
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.once('style.load', addRoute);
    }

    // --- DRAW MARKERS ---
    locations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'destination-marker';
      
      // FIX: Added 'marker-animator' wrapper to prevent Mapbox coordinate lag
      el.innerHTML = `
        <div class="marker-animator">
          <div class="marker-label">${loc.name.toUpperCase()}</div>
          <div class="marker-line"></div>
          <div class="marker-dot"></div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: [0, -50], maxWidth: '320px', closeButton: false })
        .setHTML(`
          <div class="popup-content-wrapper">
            <img src="${loc.image}" class="popup-image" />
            <h3 class="popup-title">${loc.name}</h3>
            <p class="popup-desc">${loc.description}</p>
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
          zoom: 14, pitch: 65, duration: 5000, essential: true 
        });
      });
    });

    spinGlobe();
  }, [locations]);

  // --- LOGIC FUNCTIONS ---
  const spinGlobe = () => {
    if (!map.current || map.current.getZoom() > 5 || userInteracting.current || isFlying.current) return;
    const center = map.current.getCenter();
    center.lng -= 0.5; 
    map.current.easeTo({ center, duration: 1000, easing: (n) => n });
  };

  const handleGoHome = () => {
    isFlying.current = true; 
    map.current.flyTo({ center: [106.6297, 10.8231], zoom: 1.5, pitch: 0, duration: 5000, essential: true });
    map.current.once('moveend', () => {
      isFlying.current = false;
      spinGlobe();
    });
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

        /* Mapbox UI overrides */
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        
        /* Glassmorphism Popups */
        .mapboxgl-popup { z-index: 100; }
        .mapboxgl-popup-content {
          background: rgba(15, 15, 20, 0.7) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 16px !important;
          box-shadow: 0 30px 60px rgba(0,0,0,0.8) !important;
          padding: 0 !important;
        }
        .mapboxgl-popup-tip { border-top-color: rgba(15, 15, 20, 0.7) !important; }
        
        /* Popup Internal Typography */
        .popup-content-wrapper { padding: 16px; font-family: 'Inter', sans-serif; color: white; }
        .popup-image { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .popup-title { margin: 0 0 4px 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
        .popup-desc { margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; }

        /* Animated Markers (FIXED LAG) */
        .destination-marker { cursor: pointer; }
        .marker-animator { display: flex; flex-direction: column; align-items: center; transition: transform 0.2s ease; }
        .destination-marker:hover .marker-animator { transform: scale(1.1); }
        
        .marker-label { background: rgba(0,0,0,0.8); color: #00d4ff; padding: 4px 10px; border-radius: 4px; font-family: 'Inter'; font-size: 10px; letter-spacing: 2px; border: 1px solid rgba(0, 212, 255, 0.3); white-space: nowrap; margin-bottom: 5px; backdrop-filter: blur(4px); text-shadow: 0 0 5px rgba(0, 212, 255, 0.5); }
        .marker-line { width: 1px; height: 30px; background: linear-gradient(to bottom, #00d4ff, rgba(0, 212, 255, 0)); }
        
        /* Pulsing Dot Animation */
        .marker-dot { 
          width: 8px; height: 8px; background-color: #00d4ff; border: 1.5px solid white; border-radius: 50%; 
          box-shadow: 0 0 10px #00d4ff;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(0, 212, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0); }
        }

        /* Responsive Mobile Layout */
        @media (max-width: 768px) {
          .header-container { top: 20px !important; left: 20px !important; }
          .header-title { font-size: 20px !important; }
          .header-subtitle { font-size: 10px !important; }
          
          /* Move buttons to bottom center on mobile */
          .controls-container { 
            top: auto !important; 
            bottom: 40px !important; 
            left: 50% !important; 
            right: auto !important;
            transform: translateX(-50%); 
            width: max-content; 
            display: flex; 
            flex-direction: row; 
            gap: 12px; 
          }
          .control-btn { padding: 12px 20px !important; font-size: 11px !important; }
          .mapboxgl-popup-content { width: 260px !important; }
          .popup-image { height: 130px; }
        }
      `}</style>

      {/* Cinematic Loading Screen */}
      <div style={{
        position: 'absolute', inset: 0, backgroundColor: '#050505', zIndex: 99999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        opacity: isLoading ? 1 : 0, pointerEvents: isLoading ? 'auto' : 'none',
        transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ color: '#00d4ff', fontFamily: 'Inter', letterSpacing: '4px', fontSize: '12px', animation: 'pulse 2s infinite' }}>
          INITIALIZING SPACE...
        </div>
      </div>

      {/* HEADER */}
      <div className="header-container" style={{ position: 'absolute', top: '30px', left: '40px', zIndex: 10000, color: 'white', fontFamily: 'Inter', pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
        <h1 className="header-title" style={{ margin: 0, fontSize: '24px', letterSpacing: '3px', fontWeight: 600 }}>TONG VAN THANH</h1>
        <p className="header-subtitle" style={{ margin: '6px 0 0 0', fontSize: '11px', opacity: 0.8, letterSpacing: '1.5px' }}>SAAS SOLUTIONS • VIDEO EDITOR</p>
      </div>

      {/* CONTROLS */}
      <div className="controls-container" style={{ position: 'absolute', top: '30px', right: '40px', zIndex: 10000, display: 'flex', gap: '15px' }}>
        <button className="control-btn" onClick={() => window.location.href = 'https://thanhtong.xyz'} style={{ background: 'transparent', border: '1px solid rgba(0, 212, 255, 0.4)', color: '#00d4ff', padding: '10px 24px', borderRadius: '30px', cursor: 'pointer', fontFamily: 'Inter', fontSize: '12px', letterSpacing: '1px', fontWeight: 600, transition: 'all 0.3s ease', backdropFilter: 'blur(4px)' }} onMouseOver={(e) => e.target.style.background = 'rgba(0, 212, 255, 0.1)'} onMouseOut={(e) => e.target.style.background = 'transparent'}>
          VIEW PORTFOLIO
        </button>
        <button className="control-btn" onClick={handleGoHome} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 24px', borderRadius: '30px', cursor: 'pointer', fontFamily: 'Inter', fontSize: '12px', letterSpacing: '1px', fontWeight: 600, transition: 'all 0.3s ease' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}>
          BACK TO SPACE
        </button>
      </div>

      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

      <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
        <svg width="100%" height="100%"><defs><radialGradient id="sunlight" cx="20%" cy="10%" r="95%"><stop offset="35%" stopColor="black" stopOpacity="0" /><stop offset="85%" stopColor="black" stopOpacity="0.75" /></radialGradient></defs><rect width="100%" height="100%" fill="url(#sunlight)" /></svg>
      </div>
    </div>
  );
}

export default App;