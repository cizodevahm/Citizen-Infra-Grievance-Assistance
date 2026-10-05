"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LocationPicker({
  location,
  onLocationChange,
}) {
  const [gpsStatus, setGpsStatus] = useState("idle"); // 'idle' | 'requesting' | 'granted' | 'denied' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const requestBrowserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setGpsStatus("requesting");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsStatus("granted");
        onLocationChangeRef.current?.({
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          source: "browser_gps",
        });
      },
      (error) => {
        console.warn("Geolocation permission error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus("denied");
          setErrorMessage(
            "Location permission was denied in your browser. You can enter coordinates manually below."
          );
        } else if (error.code === error.TIMEOUT) {
          setGpsStatus("error");
          setErrorMessage("Location request timed out. You can retry or enter coordinates manually.");
        } else {
          setGpsStatus("error");
          setErrorMessage(error.message || "Failed to retrieve location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Automatically take location on mount or when permission is available
  useEffect(() => {
    if (location) return;

    const timer = setTimeout(() => {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((permissionStatus) => {
            if (permissionStatus.state === "granted" || permissionStatus.state === "prompt") {
              requestBrowserLocation();
            } else if (permissionStatus.state === "denied") {
              setGpsStatus("denied");
            }

            permissionStatus.onchange = () => {
              if (permissionStatus.state === "granted") {
                requestBrowserLocation();
              } else if (permissionStatus.state === "denied") {
                setGpsStatus("denied");
              }
            };
          })
          .catch(() => {
            requestBrowserLocation();
          });
      } else {
        requestBrowserLocation();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location, requestBrowserLocation]);

  const handleManualApply = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert("Please enter a valid latitude between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert("Please enter a valid longitude between -180 and 180.");
      return;
    }
    onLocationChangeRef.current?.({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      source: "manual",
    });
    setShowManualInputs(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              Incident Location
              <span className="text-red-500 font-bold text-base leading-none">*</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified coordinates for civic authority dispatch
            </p>
          </div>
        </div>

        {/* Status / Refresh control */}
        <div className="flex items-center gap-2">
          {gpsStatus === "requesting" && !location && (
            <span className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Detecting...
            </span>
          )}

          {location && (
            <button
              type="button"
              onClick={requestBrowserLocation}
              disabled={gpsStatus === "requesting"}
              title="Refresh GPS location"
              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === "requesting" ? "animate-spin text-blue-600" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Coordinates Acquired Box */}
      {location ? (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Coordinates Acquired:
                </span>
              </div>
              <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 pl-6">
                Lat: <span className="font-bold">{location.latitude}</span>, Lng:{" "}
                <span className="font-bold">{location.longitude}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-6 sm:pl-0">
              <a
                href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                <Map className="w-3.5 h-3.5" />
                View on Map
              </a>
              <button
                type="button"
                onClick={() => {
                  setManualLat(String(location.latitude));
                  setManualLng(String(location.longitude));
                  setShowManualInputs(!showManualInputs);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">
                {gpsStatus === "denied"
                  ? "Location permission was denied in your browser."
                  : gpsStatus === "requesting"
                  ? "Detecting your location from browser GPS..."
                  : errorMessage || "Location not acquired yet."}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {gpsStatus === "denied"
                  ? "You can enter your incident coordinates manually below."
                  : "We automatically detect your position if browser permission is enabled, or you can enter coordinates manually."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManualInputs(!showManualInputs)}
              className="text-xs h-7 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 bg-amber-100/50 hover:bg-amber-100"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              {showManualInputs ? "Hide manual entry" : "Enter coordinates manually"}
            </Button>
            {gpsStatus === "denied" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestBrowserLocation}
                className="text-xs h-7 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry GPS
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Manual Coordinates Input */}
      {showManualInputs && (
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Manual Coordinate Entry
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Latitude (-90 to 90)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 23.234158"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Longitude (-180 to 180)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 72.500038"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowManualInputs(false)}
              className="text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleManualApply}
              className="text-xs h-7 bg-blue-600 text-white"
            >
              Set Coordinates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
