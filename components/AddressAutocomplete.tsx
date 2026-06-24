"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  address: string;
  lat: number | null;
  lng: number | null;
  onPlaceSelect: (address: string, lat: number, lng: number) => void;
  onAddressChange: (address: string) => void;
}

const MANILA = { lat: 14.5995, lng: 120.9842 };

function loadMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const existing = document.getElementById("gmap-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.id = "gmap-script";
    // v=beta loads Places API (New) — avoids LegacyApiNotActivatedMapError
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=places,marker`;
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

type Suggestion = google.maps.places.AutocompleteSuggestion;

export default function AddressAutocomplete({
  address, lat, lng, onPlaceSelect, onAddressChange,
}: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const markerRef  = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const tokenRef   = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const onPlaceSelectRef   = useRef(onPlaceSelect);
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; }, [onPlaceSelect]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  // Fetch key at runtime so Cloud Run env vars are picked up
  useEffect(() => {
    fetch("/api/maps-key")
      .then(r => r.json())
      .then(({ key }: { key: string }) => setApiKey(key ?? ""))
      .catch(() => setApiKey(""));
  }, []);

  // Boot map once key is available
  useEffect(() => {
    if (!apiKey) return;
    loadMapsScript(apiKey).then(() => {
      if (!mapDivRef.current) return;
      const hasCoords = lat != null && lng != null;
      const center = hasCoords ? { lat: lat!, lng: lng! } : MANILA;

      const map = new google.maps.Map(mapDivRef.current, {
        center,
        zoom: hasCoords ? 16 : 12,
        mapId: "bandapa_venue_map",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      });
      mapRef.current = map;

      const pin = document.createElement("div");
      pin.innerHTML = `<span class="material-symbols-outlined" style="font-size:32px;color:#16a34a;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">location_on</span>`;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: hasCoords ? center : null,
        content: pin,
      });
      markerRef.current = marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Debounced autocomplete suggestions via Places API (New)
  const handleInput = useCallback(async (value: string) => {
    onAddressChangeRef.current(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        if (!tokenRef.current) {
          tokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            sessionToken: tokenRef.current,
          });
        setSuggestions(results ?? []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function selectSuggestion(suggestion: Suggestion) {
    const place = suggestion.placePrediction!.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress"] });

    const loc = place.location!;
    const newLat = loc.lat();
    const newLng = loc.lng();
    const addr = place.formattedAddress ?? "";

    if (inputRef.current) inputRef.current.value = addr;
    onAddressChangeRef.current(addr);

    if (mapRef.current && markerRef.current) {
      mapRef.current.setCenter({ lat: newLat, lng: newLng });
      mapRef.current.setZoom(17);
      markerRef.current.position = { lat: newLat, lng: newLng };
    }

    onPlaceSelectRef.current(addr, newLat, newLng);
    setSuggestions([]);
    setShowSuggestions(false);
    tokenRef.current = null; // reset session token after selection completes billing session
  }

  // Sync map when lat/lng come in from parent (editing an existing venue)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (lat != null && lng != null) {
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(16);
      markerRef.current.position = { lat, lng };
    }
  }, [lat, lng]);

  const keyLoading = apiKey === null;
  const keyMissing = apiKey === "";

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none" style={{ fontSize: "18px" }}>
          search
        </span>
        <input
          ref={inputRef}
          className="input-field pl-9"
          defaultValue={address}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search address on Google Maps…"
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-lg border border-outline-variant/40 overflow-hidden">
            {suggestions.map((s, i) => {
              const pred = s.placePrediction!;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-mist flex items-start gap-2.5 transition-colors"
                    onMouseDown={() => selectSuggestion(s)}
                  >
                    <span className="material-symbols-outlined text-on-surface-variant mt-0.5 shrink-0" style={{ fontSize: "16px" }}>location_on</span>
                    <div className="min-w-0">
                      <p className="text-sm text-obsidian font-medium leading-snug truncate">{pred.mainText?.text}</p>
                      <p className="text-xs text-on-surface-variant truncate">{pred.secondaryText?.text}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Map widget */}
      <div className="relative rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-mist" style={{ height: 220 }}>
        {keyLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-on-surface-variant font-mono">Loading map…</span>
          </div>
        ) : keyMissing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "32px" }}>map</span>
            <p className="text-xs text-on-surface-variant font-mono">
              Set <code className="bg-surface-mist px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the map
            </p>
          </div>
        ) : (
          <>
            <div ref={mapDivRef} className="w-full h-full" />
            {lat != null && lng != null && (
              <div className="absolute bottom-2 left-2 bg-obsidian-deep/80 backdrop-blur-sm text-pure-white/80 font-mono text-[10px] px-2 py-1 rounded-lg pointer-events-none">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
