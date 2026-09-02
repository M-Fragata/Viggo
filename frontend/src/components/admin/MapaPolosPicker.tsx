import { useEffect, useRef, useState } from "react";
import { Search, Navigation, MapPin, Loader2 } from "lucide-react";

interface LeafletLatLng {
  lat: number;
  lng: number;
}

interface LeafletMouseEvent {
  latlng: LeafletLatLng;
}

interface LeafletMarker {
  setLatLng: (latlng: [number, number] | LeafletLatLng) => void;
  getLatLng: () => LeafletLatLng;
  on: (event: string, fn: () => void) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
}

interface LeafletCircle {
  setLatLng: (latlng: [number, number] | LeafletLatLng) => void;
  setRadius: (radius: number) => void;
  addTo: (map: LeafletMap) => LeafletCircle;
}

interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  panTo: (latlng: [number, number]) => void;
  on: (event: string, fn: (e: LeafletMouseEvent) => void) => void;
  remove: () => void;
}

interface LeafletTileLayer {
  addTo: (map: LeafletMap) => LeafletTileLayer;
}

interface LeafletNamespace {
  map: (container: HTMLElement) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer;
  marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  circle: (latlng: [number, number], options?: Record<string, unknown>) => LeafletCircle;
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

interface MapaPolosPickerProps {
  latitude: number;
  longitude: number;
  raioMetros: number;
  onChangeCoordinates: (lat: number, lng: number, enderecoFormatado?: string) => void;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export function MapaPolosPicker({
  latitude,
  longitude,
  raioMetros,
  onChangeCoordinates,
}: MapaPolosPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);

  const onChangeCoordinatesRef = useRef(onChangeCoordinates);
  useEffect(() => {
    onChangeCoordinatesRef.current = onChangeCoordinates;
  }, [onChangeCoordinates]);

  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(
    () => typeof window !== "undefined" && typeof window.L !== "undefined"
  );
  const [buscaTexto, setBuscaTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [obtendoGps, setObtendoGps] = useState(false);

  // 1. Carregar Leaflet CSS e JS sob demanda sem setState síncrono
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) return;

    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    function handleScriptLoad() {
      setLeafletLoaded(true);
    }

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.addEventListener("load", handleScriptLoad);
      document.body.appendChild(script);

      return () => {
        script.removeEventListener("load", handleScriptLoad);
      };
    } else {
      existing.addEventListener("load", handleScriptLoad);
      return () => {
        existing.removeEventListener("load", handleScriptLoad);
      };
    }
  }, []);

  // 2. Inicializar o Mapa quando Leaflet estiver pronto
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const initialLat = latitude || -23.55052;
      const initialLng = longitude || -46.633308;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      const circle = L.circle([initialLat, initialLng], {
        radius: raioMetros || 100,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);

      map.on("click", (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        onChangeCoordinatesRef.current(lat, lng);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        circle.setLatLng(pos);
        onChangeCoordinatesRef.current(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, latitude, longitude, raioMetros]);

  // 3. Atualizar posição quando props mudarem externamente
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current && latitude && longitude) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // 4. Atualizar raio do círculo em tempo real
  useEffect(() => {
    if (circleRef.current && raioMetros) {
      circleRef.current.setRadius(raioMetros);
    }
  }, [raioMetros]);

  // Busca rápida de endereço pelo OpenStreetMap (Nominatim gratuito)
  async function handleBuscarEndereco(e: React.FormEvent) {
    e.preventDefault();
    if (!buscaTexto.trim()) return;

    try {
      setBuscando(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buscaTexto.trim())}&limit=1`
      );
      const data = (await res.json()) as NominatimSearchResult[];

      if (data && data.length > 0 && data[0]) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          circleRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng], 16);
          onChangeCoordinatesRef.current(newLat, newLng, first.display_name);
        }
      }
    } catch (err: unknown) {
      console.error("Erro na busca de endereço:", err);
    } finally {
      setBuscando(false);
    }
  }

  // Pegar posição GPS do navegador
  function handleUsarMinhaLocalizacao() {
    if (!navigator.geolocation) return;
    setObtendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 17);
          onChangeCoordinatesRef.current(lat, lng);
        }
        setObtendoGps(false);
      },
      () => setObtendoGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <form onSubmit={handleBuscarEndereco} className="relative flex-1 w-full">
          <input
            type="text"
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            placeholder="Buscar por endereço, CEP ou ponto de referência..."
            className="w-full pl-9 pr-24 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <button
            type="submit"
            disabled={buscando}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {buscando ? <Loader2 size={12} className="animate-spin" /> : "Buscar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleUsarMinhaLocalizacao}
          disabled={obtendoGps}
          className="w-full sm:w-auto px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          {obtendoGps ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Navigation size={13} />
          )}
          Minha Localização
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-100 dark:bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-64 sm:h-80 z-0" />

        {!leafletLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-xs text-slate-500 text-xs font-medium gap-2">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            Carregando mapa interativo...
          </div>
        )}

        <div className="absolute bottom-2 left-2 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 shadow-xs">
          <MapPin size={13} className="text-emerald-500" />
          <span>
            {latitude.toFixed(6)}, {longitude.toFixed(6)} • <strong>Raio: {raioMetros}m</strong>
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        💡 <em>Dica: Você pode clicar em qualquer lugar do mapa ou arrastar o marcador para definir a localização exata do polo.</em>
      </p>
    </div>
  );
}
