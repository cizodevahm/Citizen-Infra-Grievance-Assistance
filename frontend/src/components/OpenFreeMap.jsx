"use client";

import React, { useEffect, useRef, useState } from "react";
import { Map, Marker, NavigationControl, AttributionControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ExternalLink } from "lucide-react";

export default function OpenFreeMap({
  latitude,
  longitude,
  onCoordinatesChange,
  interactive = true,
  className = "",
  styleName = "liberty", // 'liberty' | 'bright' | 'positron'
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onCoordsChangeRef = useRef(onCoordinatesChange);
  const [currentStyle, setCurrentStyle] = useState(styleName);

  useEffect(() => {
    onCoordsChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  const defaultLng = longitude || 77.209;
  const defaultLat = latitude || 28.6139;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre with OpenFreeMap tiles
    const map = new Map({
      container: mapContainerRef.current,
      style: `https://tiles.openfreemap.org/styles/${currentStyle}`,
      center: [defaultLng, defaultLat],
      zoom: latitude && longitude ? 15 : 11,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: true }), "top-right");

    const attribution = new AttributionControl({
      customAttribution:
        '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      compact: true,
    });
    map.addControl(attribution, "bottom-right");

    if (latitude && longitude) {
      const marker = new Marker({
        color: "#2563eb",
        draggable: interactive,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      if (interactive) {
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onCoordsChangeRef.current?.({
            latitude: Number(lngLat.lat.toFixed(6)),
            longitude: Number(lngLat.lng.toFixed(6)),
            source: "map_pin",
          });
        });
      }

      markerRef.current = marker;
    }

    if (interactive) {
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        const newCoords = {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          source: "map_pin",
        };

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new Marker({
            color: "#2563eb",
            draggable: true,
          })
            .setLngLat([lng, lat])
            .addTo(map);

          markerRef.current.on("dragend", () => {
            const pos = markerRef.current.getLngLat();
            onCoordsChangeRef.current?.({
              latitude: Number(pos.lat.toFixed(6)),
              longitude: Number(pos.lng.toFixed(6)),
              source: "map_pin",
            });
          });
        }

        onCoordsChangeRef.current?.(newCoords);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStyle]);

  // Update marker & center view when coordinates change
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    } else {
      markerRef.current = new Marker({
        color: "#2563eb",
        draggable: interactive,
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);
    }

    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      essential: true,
    });
  }, [latitude, longitude, interactive]);

  const openInOsm = () => {
    if (latitude && longitude) {
      window.open(
        `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />

      {/* Top Overlay controls */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-medium text-slate-700 dark:text-slate-300">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span>OpenFreeMap</span>
        {latitude && longitude && (
          <span className="text-[11px] text-slate-500 font-mono ml-1">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        )}
      </div>

      {/* Open in OSM Button */}
      {latitude && longitude && (
        <button
          type="button"
          onClick={openInOsm}
          title="Open in OpenStreetMap"
          className="absolute bottom-6 left-2.5 z-10 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <ExternalLink className="w-3 h-3" />
          <span>OpenFreeMap / OSM View</span>
        </button>
      )}

      {/* Style switcher */}
      <div className="absolute top-2.5 right-12 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-[11px]">
        {["liberty", "bright", "positron"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setCurrentStyle(s)}
            className={`px-1.5 py-0.5 rounded capitalize ${
              currentStyle === s
                ? "bg-blue-600 text-white font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
