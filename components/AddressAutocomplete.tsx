"use client";

import { useEffect, useRef } from "react";

interface Props {
  address: string;
  lat: number | null;
  lng: number | null;
  onPlaceSelect: (address: string, lat: number, lng: number) => void;
  onAddressChange: (address: string) => void;
}

const MANILA: google.maps.LatLngLiteral = { lat: 14.5995, lng: 120.9842 };

function loadMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const existing = document.getElementById("gmap-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.id = "gmap-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export default function AddressAutocomplete({
  address, lat, lng, onPlaceSelect, onAddressChange,
}: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Stable callback refs — avoids re-running effects when parent re-renders
  const onPlaceSelectRef  = useRef(onPlaceSelect);
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; }, [onPlaceSelect]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  // Boot map + autocomplete once
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || key === "your-google-maps-api-key-here") return;

    loadMapsScript(key).then(() => {
      if (!mapDivRef.current || !inputRef.current) return;

      const hasCoords = lat != null && lng != null;
      const center = hasCoords ? { lat: lat!, lng: lng! } : MANILA;

      // Map
      const map = new google.maps.Map(mapDivRef.current, {
        center,
        zoom: hasCoords ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      });
      mapRef.current = map;

      // Marker
      const marker = new google.maps.Marker({
        map,
        position: hasCoords ? center : undefined,
        visible: hasCoords,
        animation: google.maps.Animation.DROP,
      });
      markerRef.current = marker;

      // Autocomplete
      const ac = new google.maps.places.Autocomplete(inputRef.current!, {
        fields: ["formatted_address", "geometry"],
      });
      ac.bindTo("bounds", map);

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();
        const addr   = place.formatted_address ?? inputRef.current?.value ?? "";

        map.setCenter({ lat: newLat, lng: newLng });
        map.setZoom(17);
        marker.setPosition({ lat: newLat, lng: newLng });
        marker.setVisible(true);
        if (marker.getAnimation() == null) marker.setAnimation(google.maps.Animation.DROP);

        onPlaceSelectRef.current(addr, newLat, newLng);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // Sync map when lat/lng come in from parent (editing an existing venue)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (lat != null && lng != null) {
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(16);
      markerRef.current.setPosition({ lat, lng });
      markerRef.current.setVisible(true);
    }
  }, [lat, lng]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const keyMissing = !apiKey || apiKey === "your-google-maps-api-key-here";

  return (
    <div className="space-y-2">
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none"
          style={{ fontSize: "18px" }}
        >
          search
        </span>
        <input
          ref={inputRef}
          className="input-field pl-9"
          defaultValue={address}
          onChange={(e) => onAddressChangeRef.current(e.target.value)}
          placeholder="Search address on Google Maps…"
          autoComplete="off"
        />
      </div>

      {/* Map widget */}
      <div className="relative rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-mist"
        style={{ height: 220 }}>
        {keyMissing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "32px" }}>map</span>
            <p className="text-xs text-on-surface-variant font-mono">
              Set <code className="bg-surface-mist px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the map
            </p>
          </div>
        ) : (
          <>
            <div ref={mapDivRef} className="w-full h-full" />
            {/* Coordinates overlay */}
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
