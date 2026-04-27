import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, CloudRain, Sun, Wind, 
  CloudLightning, X, Newspaper, 
  CloudFog, Zap
} from 'lucide-react';

interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  code: number;
  wind: number;
  severity: 'normal' | 'warning' | 'critical';
}

interface WeatherNews {
  title: string;
  link: string;
}

const CITIES = [
  { name: 'Delhi', lat: 28.61, lng: 77.21 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Chennai', lat: 13.08, lng: 80.27 },
  { name: 'Kolkata', lat: 22.57, lng: 88.36 },
  { name: 'Bengaluru', lat: 12.97, lng: 77.59 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49 }
];

const BASE = import.meta.env.VITE_API_URL;

const getWeatherIcon = (code: number, size = 4) => {
  const className = `w-${size} h-${size}`;
  if (code === 0) return <Sun className={`${className} text-amber-400`} />;
  if (code <= 3) return <Cloud className={`${className} text-slate-400`} />;
  if (code <= 48) return <CloudFog className={`${className} text-slate-500`} />;
  if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
  if (code <= 82) return <CloudRain className={`${className} text-blue-500`} />;
  if (code <= 99) return <CloudLightning className={`${className} text-purple-400`} />;
  return <Cloud className={`${className} text-slate-400`} />;
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Dense Fog';
  if (code <= 67) return 'Rain / Drizzle';
  if (code <= 82) return 'Heavy Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Cloudy';
};

const getSeverity = (code: number, temp: number): 'normal' | 'warning' | 'critical' => {
  if (code >= 95 || temp > 42) return 'critical';
  if (code >= 51 || code === 48 || temp > 38) return 'warning';
  return 'normal';
};

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [news, setNews] = useState<WeatherNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const results = await Promise.all(
          CITIES.map(async (city) => {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current_weather=true`
            );
            const data = await res.json();
            const code = data.current_weather.weathercode;
            const temp = data.current_weather.temperature;
            return {
              city: city.name,
              temp,
              condition: getWeatherLabel(code),
              code,
              wind: data.current_weather.windspeed,
              severity: getSeverity(code, temp)
            };
          })
        );
        setWeather(results);
      } catch (error) {
        console.error('Weather fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchNews = async () => {
      try {
        const res = await fetch(`${BASE}/api/weather-news`);
        const data = await res.json();
        setNews(data);
      } catch (error) {
        console.error('Weather news fetch failed:', error);
      }
    };

    fetchWeather();
    fetchNews();
    const interval = setInterval(() => {
      fetchWeather();
      fetchNews();
    }, 300000); 
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading && weather.length === 0) return null;

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end font-sans">
      {/* Floating Expandable Panel */}
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-3rem)] sm:w-80 max-h-[600px] overflow-hidden rounded-[40px] border border-white/10 bg-[#050505]/90 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-8 fade-in duration-500 flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.1em]">Environmental Intelligence</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse shadow-[0_0_8px_#00E5A0]" />
                <p className="text-[10px] text-[#00E5A0] font-black uppercase tracking-widest">Grid Status: Active</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* City Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="grid grid-cols-1 gap-2 mb-6">
              <div className="flex items-center gap-2 mb-2 px-2">
                 <Zap className="w-3.5 h-3.5 text-blue-400" />
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Hub Conditions</span>
              </div>
              {weather.map((data) => (
                <div key={data.city} className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-2xl border ${
                      data.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' : 
                      data.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 
                      'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      {getWeatherIcon(data.code, 5)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tight">{data.city}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                        data.severity === 'critical' ? 'text-red-400' : 
                        data.severity === 'warning' ? 'text-amber-400' : 
                        'text-white/30'
                      }`}>
                        {data.condition}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{Math.round(data.temp)}°C</p>
                    <div className="flex items-center gap-1 text-[8px] text-white/20 font-black justify-end uppercase mt-1">
                      <Wind className="w-2.5 h-2.5" />
                      {Math.round(data.wind)} km/h
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Weather News Feed - Scrolling Live Bulletins */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-3xl">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3.5 h-3.5 text-[#00E5A0]" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Live Climate Bulletins</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {news.length > 0 ? news.map((item, idx) => (
                  <a 
                    key={idx} 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-1 h-1 rounded-full bg-[#00E5A0]/40 group-hover:bg-[#00E5A0] transition-colors shrink-0" />
                      <p className="text-[10px] text-white/50 leading-relaxed font-bold group-hover:text-white transition-colors">
                        {item.title}
                      </p>
                    </div>
                  </a>
                )) : (
                  <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center py-4">
                    Fetching latest bulletins...
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-[#00E5A0]/5 border-t border-white/5">
             <div className="flex items-center gap-2 text-[10px] text-[#00E5A0] font-black uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" />
                <span>Enterprise Shield Active</span>
             </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 shadow-2xl ${
          isOpen 
            ? 'bg-white text-black rotate-90 scale-90' 
            : 'bg-black text-[#00E5A0] border border-white/10 hover:border-[#00E5A0]/50 hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(0,229,160,0.25)]'
        }`}
      >
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-[#00E5A0]/20 blur-xl group-hover:bg-[#00E5A0]/40 transition-colors animate-pulse" />
        )}
        
        {isOpen ? (
          <X className="h-7 w-7 relative z-10" />
        ) : (
          <div className="relative z-10 flex flex-col items-center">
            <Cloud className="h-7 w-7" />
            <div className="absolute -top-1.5 -right-1.5">
               <div className="relative">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                  <div className="absolute inset-0 bg-amber-400/50 blur-md rounded-full -z-10" />
               </div>
            </div>
          </div>
        )}
      </button>
    </div>
  );
};

// Simple Shield icon for the footer
const Shield = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

export default WeatherWidget;
