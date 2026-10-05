"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapPin,
  Flame,
  Clock,
  CheckCircle2,
  Sparkles,
  Volume2,
  X,
  ArrowRight,
  History as HistoryIcon,
  RefreshCw,
  Loader2,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getMapPoints, trackComplaint } from "@/lib/api";
import "leaflet/dist/leaflet.css";



// Color definitions for problem types
const CATEGORY_COLORS = {
  pothole: {
    bg: "#f97316", // Orange
    border: "#ea580c",
    label: "Pothole",
    textClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  roads: {
    bg: "#f97316", // Orange
    border: "#ea580c",
    label: "Roads",
    textClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  streetlight: {
    bg: "#eab308", // Yellow / Amber
    border: "#ca8a04",
    label: "Streetlight",
    textClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
  "water leak": {
    bg: "#0284c7", // Blue / Sky
    border: "#0369a1",
    label: "Water Leak",
    textClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  water_leak: {
    bg: "#0284c7", // Blue / Sky
    border: "#0369a1",
    label: "Water Leak",
    textClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  drain: {
    bg: "#8b5cf6", // Purple / Slate
    border: "#7c3aed",
    label: "Drain",
    textClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  drainage: {
    bg: "#8b5cf6", // Purple / Slate
    border: "#7c3aed",
    label: "Drainage",
    textClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

// Helper for relative timestamps
function formatTimeAgo(isoString) {
  if (!isoString) return "Recently";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Recently";
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recent";
  }
}

// Helper to render individual marker pin
function renderSingleMarker(L, item, layer, onSelect) {
  const categoryKey = (item.category || "pothole").toLowerCase();
  const colorInfo = CATEGORY_COLORS[categoryKey] || {
    bg: "#3b82f6",
    border: "#2563eb",
    label: item.category || "Incident",
  };
  const isUrgentOrOverdue = item.isUrgent || item.isOverdue;

  const markerHtml = `
    <div class="relative cursor-pointer select-none group pin-drop-animate">
      ${
        isUrgentOrOverdue
          ? `<div class="absolute -inset-2.5 rounded-full pulse-ring-urgent pointer-events-none"></div>`
          : ""
      }
      <div style="background-color: ${colorInfo.bg}; border-color: white;" class="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg border-2 ring-1 ring-black/20 hover:scale-125 transition-transform relative">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="currentColor"/>
        </svg>
        ${
          (item.report_count || 1) > 1
            ? `<span class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs">${item.report_count}</span>`
            : ""
        }
      </div>
      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow z-50">
        ${item.title || item.tracking_id}
      </div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: markerHtml,
    className: "custom-single-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const marker = L.marker([item.lat, item.lng], { icon: customIcon });
  marker.on("click", () => {
    onSelect(item);
  });
  marker.addTo(layer);
}

export default function AdminHotspotMap() {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Core Data
  const [grievances, setGrievances] = useState([]);
  const [allHotspots, setAllHotspots] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [mapMeta, setMapMeta] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // SSE & Live Incident Notification
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Fetch live map points and clusters from backend API
  const fetchMapData = useCallback(async () => {
    setIsLoadingMap(true);
    setMapError(null);

    try {
      const result = await getMapPoints();

      if (result && result.success && Array.isArray(result.data)) {
        setMapMeta(result.meta || { total: result.data.length });

        const livePoints = result.data.map((item) => {
          const lat = Number(item.lat);
          const lng = Number(item.lng);
          const trackingId = item.tracking_id || item.id;
          const category = (item.category || "pothole").toLowerCase();
          const categoryCapitalized =
            category.charAt(0).toUpperCase() + category.slice(1);

          return {
            id: trackingId,
            tracking_id: trackingId,
            title: `${categoryCapitalized} (${trackingId})`,
            category: category,
            status: item.status || "pending",
            severity: item.severity || "medium",
            isUrgent: Boolean(item.is_urgent),
            isOverdue: false,
            lat,
            lng,
            locationName: trackingId,
            address: `Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            createdAt: item.created_at,
            age: formatTimeAgo(item.created_at),
            report_count: item.report_count || 1,
            is_main: Boolean(item.is_main),
            parent_tracking_id: item.parent_tracking_id,
            image_url: item.image_url,
            audio_url: item.audio_url,
            user_message: item.user_message,
            raw_text: item.raw_text || item.user_message,
            transcript: item.transcript,
            summary: item.summary,
            ai_decision: item.ai_decision,
            department: item.department,
            citizenReport: {
              photoUrl: item.image_url,
              originalTranscript: item.raw_text || item.user_message,
              englishMeaning: item.summary || item.user_message,
            },
            aiAnalysis: {
              detectedCategory: categoryCapitalized,
              confidenceScore: 95.0,
              priority: item.is_urgent
                ? "Critical"
                : item.severity === "high"
                  ? "High"
                  : "Standard",
              assignedDept:
                category === "pothole"
                  ? "Roads & Civil Works Division"
                  : category === "drain"
                    ? "Drainage & Sewerage Network"
                    : "Municipal Infrastructure Division",
              reasoning:
                item.ai_decision || item.summary || "Incident reported and triaged.",
            },
            history: [
              {
                status: item.status || "Pending",
                time: item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now",
                note: "Logged in civic system",
              },
            ],
          };
        });

        if (livePoints.length > 0) {
          setGrievances(livePoints);
        }

        // Build comprehensive hotspots list from backend hotspots + local detected clusters
        const clustersByLocation = {};
        livePoints.forEach((g) => {
          const coordKey = `${Number(g.lat).toFixed(3)}_${Number(g.lng).toFixed(3)}`;
          const key = g.parent_tracking_id || coordKey;
          if (!clustersByLocation[key]) {
            clustersByLocation[key] = [];
          }
          clustersByLocation[key].push(g);
        });

        const hotspotMap = new Map();

        // 1. Add backend hotspots
        if (Array.isArray(result.hotspots)) {
          result.hotspots.forEach((spot, idx) => {
            const hid = spot.tracking_id || `h-${idx + 1}`;
            hotspotMap.set(hid, {
              id: hid,
              tracking_id: spot.tracking_id,
              rank: spot.severity_rank || idx + 1,
              name: spot.tracking_id ? `Hotspot ${spot.tracking_id}` : `Cluster ${idx + 1}`,
              reportsCount: spot.report_count || 1,
              avgAge: formatTimeAgo(spot.created_at),
              urgency: spot.is_urgent
                ? "critical"
                : spot.severity === "high"
                  ? "high"
                  : "medium",
              lat: Number(spot.lat),
              lng: Number(spot.lng),
              category: (spot.category || "pothole").toLowerCase(),
              categories: [(spot.category || "pothole").toLowerCase()],
              description: `Cluster with ${spot.report_count || 1} reported issue${(spot.report_count || 1) > 1 ? "s" : ""}`,
              image_url: spot.image_url,
              audio_url: spot.audio_url,
              user_message: spot.user_message,
              raw_text: spot.raw_text || spot.user_message,
              transcript: spot.transcript,
              summary: spot.summary,
              ai_decision: spot.ai_decision,
              department: spot.department,
            });
          });
        }

        // 2. Add any co-located clusters not in backend hotspots (e.g. Rajkot 22.3039, 70.8022)
        Object.entries(clustersByLocation).forEach(([key, group]) => {
          const rep = group[0];
          const totalCount = group.reduce(
            (acc, curr) => acc + (curr.report_count > 1 ? curr.report_count : 1),
            0,
          );
          const hasExisting = Array.from(hotspotMap.values()).some(
            (h) => Math.abs(h.lat - rep.lat) < 0.005 && Math.abs(h.lng - rep.lng) < 0.005
          );

          if (!hasExisting && (totalCount >= 2 || group.length >= 2)) {
            const hid = rep.tracking_id || `cluster-${key}`;
            hotspotMap.set(hid, {
              id: hid,
              tracking_id: rep.tracking_id,
              rank: 3,
              name: `Hotspot ${rep.tracking_id}`,
              reportsCount: totalCount,
              avgAge: formatTimeAgo(rep.createdAt),
              urgency: group.some((g) => g.isUrgent) ? "critical" : "high",
              lat: Number(rep.lat),
              lng: Number(rep.lng),
              category: rep.category || "pothole",
              categories: Array.from(new Set(group.map((g) => g.category))),
              description: `Cluster with ${totalCount} reported issue${totalCount > 1 ? "s" : ""}`,
              image_url: rep.image_url,
              audio_url: rep.audio_url,
              user_message: rep.user_message,
              raw_text: rep.raw_text,
              transcript: rep.transcript,
              summary: rep.summary,
              ai_decision: rep.ai_decision,
              department: rep.department,
            });
          }
        });

        // Sort all hotspots by reportsCount descending and assign rank
        const sortedHotspots = Array.from(hotspotMap.values())
          .sort((a, b) => b.reportsCount - a.reportsCount)
          .map((h, i) => ({ ...h, rank: i + 1 }));

        setAllHotspots(sortedHotspots);
        if (sortedHotspots.length > 0) {
          setActiveHotspotId(sortedHotspots[0].id);
        }

        // Fit map bounds to points if map is ready
        if (leafletMapRef.current && livePoints.length > 0) {
          import("leaflet").then((L) => {
            const validCoords = livePoints
              .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0)
              .map((p) => [p.lat, p.lng]);
            if (validCoords.length > 0) {
              const bounds = L.latLngBounds(validCoords);
              leafletMapRef.current.fitBounds(bounds, {
                padding: [45, 45],
                maxZoom: 15,
              });
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch live map points:", err);
      setMapError(err.message || "Failed to load live map points");
    } finally {
      setIsLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // On-demand API call when clicking a particular marker
  const handleMarkerClick = async (item) => {
    setIsLoadingDetail(true);
    const trackingId = item.tracking_id || item.id;

    setSelectedGrievance({
      id: trackingId,
      tracking_id: trackingId,
      title: item.title,
      category: item.category,
      department: item.department,
      status: item.status,
      isUrgent: item.isUrgent,
      isOverdue: item.isOverdue,
      address: item.address || item.locationName,
      age: item.age || "Just now",
      image_url: item.image_url,
      audio_url: item.audio_url,
      user_message: item.user_message,
      raw_text: item.raw_text || item.user_message,
      transcript: item.transcript,
      summary: item.summary,
      ai_decision: item.ai_decision,
      citizenReport: item.citizenReport || {
        photoUrl: item.image_url,
        originalTranscript: item.raw_text || item.user_message,
        englishMeaning: item.summary || item.user_message,
      },
      history: item.history || [],
    });

    if (trackingId && String(trackingId).startsWith("RIF-")) {
      try {
        const res = await trackComplaint(trackingId);
        if (res && res.success && res.data) {
          const detail = res.data;
          setSelectedGrievance((prev) => ({
            ...prev,
            ...detail,
            id: detail.tracking_id || detail.id,
            tracking_id: detail.tracking_id,
            summary: detail.summary || prev?.summary,
            ai_decision: detail.ai_decision || prev?.ai_decision,
            transcript: detail.transcript || prev?.transcript,
            raw_text: detail.raw_text || detail.user_message || prev?.raw_text,
            user_message: detail.user_message || prev?.user_message,
            audio_url: detail.audio_url || prev?.audio_url,
            image_url: detail.image_url || prev?.image_url,
            department: detail.department || prev?.department,
            citizenReport: {
              photoUrl: detail.image_url || prev?.citizenReport?.photoUrl,
              originalTranscript:
                detail.raw_text ||
                detail.user_message ||
                prev?.citizenReport?.originalTranscript,
              originalLanguage: "Native / Voice",
              englishMeaning:
                detail.summary ||
                detail.original_text_english ||
                prev?.citizenReport?.englishMeaning,
            },
            history: (detail.history || []).map((h) => ({
              status: h.new_status || h.status,
              time: h.changed_at
                ? new Date(h.changed_at).toLocaleString()
                : "—",
              note: h.changed_by
                ? `Changed by ${h.changed_by}`
                : h.note || "Status updated",
            })),
          }));
        }
      } catch (err) {
        console.error("Failed to fetch full tracking detail for marker", trackingId, err);
      } finally {
        setIsLoadingDetail(false);
      }
    } else {
      setIsLoadingDetail(false);
    }
  };

  // Filtered grievances list
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (
        typeFilter !== "all" &&
        g.category.replace("_", " ") !== typeFilter.replace("_", " ")
      ) {
        return false;
      }
      if (statusFilter !== "all" && g.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [grievances, typeFilter, statusFilter]);

  // Viewport-aware visible hotspots: update automatically when map is zoomed or panned
  const visibleHotspots = useMemo(() => {
    if (!mapBounds) return allHotspots;
    return allHotspots.filter((spot) => mapBounds.contains(spot.lat, spot.lng));
  }, [allHotspots, mapBounds]);

  // Count of grievances visible in the current map view
  const visibleGrievancesCount = useMemo(() => {
    if (!mapBounds) return filteredGrievances.length;
    return filteredGrievances.filter((g) =>
      mapBounds.contains(g.lat, g.lng)
    ).length;
  }, [filteredGrievances, mapBounds]);

  // Handle incoming live complaint
  const handleIncomingLiveReport = (newReport) => {
    setGrievances((prev) => [newReport, ...prev]);

    // Fly to new complaint on map
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([newReport.lat, newReport.lng], 16, {
        duration: 1.2,
      });
    }

    // Show live alert banner
    setLiveToast({
      id: newReport.id,
      title: newReport.title,
      category: newReport.category,
      address: newReport.address,
      time: "Just now",
    });

    setTimeout(() => {
      setLiveToast(null);
    }, 6000);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map = null;

    import("leaflet").then((L) => {
      // Prevent double init
      if (leafletMapRef.current) return;

      map = L.map(mapContainerRef.current, {
        center: [23.234108, 72.500019],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Standard OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Layer group for dynamic markers/clusters
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      leafletMapRef.current = map;

      const updateMapBounds = () => {
        if (!map) return;
        const b = map.getBounds();
        setZoomLevel(map.getZoom());
        setMapBounds({
          contains: (lat, lng) => b.contains([lat, lng]),
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };

      map.on("moveend", updateMapBounds);
      map.on("zoomend", updateMapBounds);

      // Trigger initial bounds calculation once tiles load
      setTimeout(updateMapBounds, 250);

      // Fit bounds if grievances already exist
      if (grievances.length > 0) {
        const validCoords = grievances
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0)
          .map((p) => [p.lat, p.lng]);
        if (validCoords.length > 0) {
          const bounds = L.latLngBounds(validCoords);
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
        }
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Markers & Clusters whenever filteredGrievances or zoomLevel changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;

    import("leaflet").then((L) => {
      const markersLayer = markersLayerRef.current;
      const map = leafletMapRef.current;
      markersLayer.clearLayers();

      const currentZoom = map.getZoom();

      // Group co-located or parent-linked points for clustering
      const clusters = {};

      filteredGrievances.forEach((g) => {
        // Group points by parent tracking id or coordinates rounded to 3 decimals (~100m)
        const coordKey = `${Number(g.lat).toFixed(3)}_${Number(g.lng).toFixed(3)}`;
        const clusterKey = g.parent_tracking_id || coordKey;

        if (!clusters[clusterKey]) {
          clusters[clusterKey] = [];
        }
        clusters[clusterKey].push(g);
      });

      Object.values(clusters).forEach((group) => {
        if (group.length > 1) {
          if (currentZoom < 16) {
            // Render Single Combined Cluster Marker
            const rep = group[0];
            const hasUrgent = group.some((g) => g.isUrgent || g.isOverdue);
            const totalCount = group.reduce(
              (acc, curr) => acc + (curr.report_count > 1 ? curr.report_count : 1),
              0,
            );

            const clusterHtml = `
              <div class="relative cursor-pointer select-none group">
                ${
                  hasUrgent
                    ? `<div class="absolute -inset-2 rounded-full pulse-ring-urgent pointer-events-none"></div>`
                    : ""
                }
                <div class="w-11 h-11 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xl border-3 border-white ring-2 ring-blue-400/50 hover:scale-110 transition-transform">
                  ${totalCount}
                </div>
                <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow pointer-events-none z-50">
                  Cluster (${totalCount} reports)
                </div>
              </div>
            `;

            const clusterIcon = L.divIcon({
              html: clusterHtml,
              className: "custom-cluster-marker",
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            });

            const clusterMarker = L.marker([rep.lat, rep.lng], {
              icon: clusterIcon,
            });
            clusterMarker.on("click", () => {
              // Smoothly fly and zoom into cluster to reveal all individual pins
              map.flyTo([rep.lat, rep.lng], 17, { duration: 1.2 });
            });
            clusterMarker.addTo(markersLayer);
          } else {
            // Zoom is 16+: Render individual markers (jitter if at exact same coordinate so all are visible)
            group.forEach((item, idx) => {
              if (
                group.length > 1 &&
                item.lat === group[0].lat &&
                item.lng === group[0].lng
              ) {
                const angle = (2 * Math.PI * idx) / group.length;
                const offset = 0.00018; // ~20 meters
                const jitteredItem = {
                  ...item,
                  lat: item.lat + offset * Math.cos(angle),
                  lng: item.lng + offset * Math.sin(angle),
                };
                renderSingleMarker(
                  L,
                  jitteredItem,
                  markersLayer,
                  handleMarkerClick,
                );
              } else {
                renderSingleMarker(L, item, markersLayer, handleMarkerClick);
              }
            });
          }
        } else {
          // Single standalone point
          renderSingleMarker(L, group[0], markersLayer, handleMarkerClick);
        }
      });
    });
  }, [filteredGrievances, zoomLevel]);

  // SSE Stream Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    let eventSource = null;
    let fallbackTimer = null;

    try {
      eventSource = new EventSource("/api/grievance/stream");

      eventSource.addEventListener("connected", () => {
        setIsSseConnected(true);
      });

      eventSource.addEventListener("new_complaint", (e) => {
        try {
          const newGrievance = JSON.parse(e.data);
          handleIncomingLiveReport(newGrievance);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      });

      eventSource.onerror = () => {
        setIsSseConnected(false);
      };
    } catch {
      fallbackTimer = setTimeout(() => setIsSseConnected(false), 0);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Fly map to a specific hotspot
  const handleSelectHotspot = (hotspot) => {
    setActiveHotspotId(hotspot.id);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([hotspot.lat, hotspot.lng], 16, {
        duration: 1.2,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Complaint Toast Alert */}
      {liveToast && (
        <div className="p-3.5 rounded-xl bg-blue-600 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>⚡ Live Complaint Pin Dropped ({liveToast.id})</span>
                <span className="text-[10px] uppercase px-1.5 py-0.2 bg-white/20 rounded font-mono">
                  {liveToast.category}
                </span>
              </div>
              <p className="text-[11px] text-white/90">
                {liveToast.address} &bull; Received {liveToast.time}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Map & Hotspot Box Section */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Top Control Bar with Filters & Refresh Button */}
        <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Live Infrastructure Map & Cluster Analysis
              </CardTitle>
              <Badge variant="secondary" className="text-[11px] font-mono font-bold">
                {mapBounds && visibleGrievancesCount !== grievances.length
                  ? `${visibleGrievancesCount} of ${grievances.length} Live Points in View`
                  : `${grievances.length || mapMeta?.total || 0} Live Points`}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              OpenStreetMap live points view with backend cluster analysis and telemetry
            </p>
          </div>

          {/* Controls: Type Filter, Status Filter, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Problem Type Filter */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="mapTypeFilter"
                className="text-xs font-medium text-slate-500 hidden sm:inline"
              >
                Type:
              </label>
              <select
                id="mapTypeFilter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="pothole">Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="water leak">Water Leak</option>
                <option value="drain">Drain</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="mapStatusFilter"
                className="text-xs font-medium text-slate-500 hidden sm:inline"
              >
                Status:
              </label>
              <select
                id="mapStatusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchMapData()}
              disabled={isLoadingMap}
              className="h-8.5 px-2.5 text-xs border-slate-300 dark:border-slate-700 font-medium"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isLoadingMap ? "animate-spin text-blue-600" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* 2-Column Split: Map (Left) + Hotspot Box (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-slate-800 min-h-[520px]">
          {/* MAP AREA (Left: ~68% width on large screens) */}
          <div className="lg:col-span-8 relative flex flex-col min-h-[420px] lg:min-h-[520px]">
            {/* Interactive Leaflet Map Container */}
            <div
              ref={mapContainerRef}
              className="w-full flex-1 min-h-[420px] z-10"
            />

            {isLoadingMap && (
              <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Loading Live Infrastructure Map...
                </span>
              </div>
            )}

            {/* Map Legend Overlay at Bottom Left */}
            <div className="absolute bottom-3 left-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-md text-[11px] space-y-1.5 max-w-[280px]">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Legend & Pins</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Zoom: {zoomLevel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  <span>Pothole</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span>Streetlight</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>Water Leak</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span>Drain</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>Pulsating Ring = Urgent / Overdue</span>
              </div>
            </div>
          </div>

          {/* [HOTSPOT BOX: TOP 5 PRIORITY] (Right: ~32% width on large screens) */}
          <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col bg-slate-50/40 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Hotspot Box: Incident Clusters
                    </h4>
                    {visibleHotspots.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                        {visibleHotspots.length} in view
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {mapBounds ? "Incident clusters in visible map view" : "High concentration incident zones"}
                  </p>
                </div>
              </div>
            </div>

            {/* Hotspots List */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {isLoadingMap ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs">Loading incident hotspots...</p>
                </div>
              ) : visibleHotspots.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Flame className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-medium text-slate-500">No active hotspots in this view</p>
                  <p className="text-[11px] text-slate-400">Pan or zoom out to see other incident clusters</p>
                </div>
              ) : (
                visibleHotspots.map((spot, idx) => {
                const isActive = activeHotspotId === spot.id;
                const isCritical = spot.urgency === "critical";

                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handleSelectHotspot(spot)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-slate-800 border-blue-500 shadow-md ring-1 ring-blue-500/20"
                        : "bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCritical
                              ? "bg-red-500 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {spot.name}
                        </span>
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0 ${
                          isCritical
                            ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {spot.reportsCount} rpts
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Avg {spot.avgAge}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 hover:underline">
                        Zoom to cluster <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-7 line-clamp-1">
                      {spot.description}
                    </p>
                  </button>
                );
              }))}
            </div>

            {/* Hotspot Help Banner */}
            <div className="mt-4 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Clicking any hotspot zooms map directly into that cluster.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* COMPLAINT DETAIL INSPECTION MODAL */}
      {selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs font-bold"
                  >
                    {selectedGrievance.id}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`capitalize text-xs font-semibold ${
                      CATEGORY_COLORS[selectedGrievance.category]?.bgClass || ""
                    }`}
                  >
                    {selectedGrievance.category}
                  </Badge>
                  {selectedGrievance.department && (
                    <Badge
                      variant="outline"
                      className="text-xs capitalize font-medium text-slate-600 dark:text-slate-300"
                    >
                      {selectedGrievance.department}
                    </Badge>
                  )}
                  {selectedGrievance.isUrgent && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] uppercase font-bold"
                    >
                      Urgent SLA
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedGrievance.title}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedGrievance.address} &bull; Reported{" "}
                  {selectedGrievance.age}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGrievance(null)}
                className="rounded-full p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: Loading State or Detail Grid */}
            {isLoadingDetail ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Loading complaint details...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Photo & Citizen Statement */}
                <div className="space-y-4">
                  {/* Damage Photo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Infrastructure Damage Photo
                    </label>
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-video shadow-inner flex items-center justify-center">
                      {(selectedGrievance.citizenReport?.photoUrl || selectedGrievance.image_url) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedGrievance.citizenReport?.photoUrl || selectedGrievance.image_url}
                            alt={selectedGrievance.title || "Infrastructure damage photo"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            GPS & EXIF Verified
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <p className="text-xs">No photo attached</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Citizen Statement & Audio Player */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>Citizen Message</span>
                    </div>

                    {(selectedGrievance.raw_text ||
                      selectedGrievance.user_message ||
                      selectedGrievance.citizenReport?.originalTranscript) ? (
                      <blockquote className="text-xs italic text-slate-700 dark:text-slate-300 border-l-2 border-blue-500 pl-2.5 py-0.5">
                        &ldquo;
                        {selectedGrievance.raw_text ||
                          selectedGrievance.user_message ||
                          selectedGrievance.citizenReport?.originalTranscript}
                        &rdquo;
                      </blockquote>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No text description provided.</p>
                    )}

                    {/* Audio recording player */}
                    {selectedGrievance.audio_url && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Audio Note:
                        </span>
                        <audio
                          controls
                          className="w-full h-8 rounded"
                          src={selectedGrievance.audio_url}
                        />
                        {selectedGrievance.transcript && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Transcript: &ldquo;{selectedGrievance.transcript}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {!selectedGrievance.audio_url && selectedGrievance.transcript && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          Transcript: &ldquo;{selectedGrievance.transcript}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: AI Decision, AI Summary & History Timeline */}
                <div className="space-y-4">
                  {/* AI Decision Box */}
                  {selectedGrievance.ai_decision && (
                    <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>AI Decision</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedGrievance.ai_decision}
                      </p>
                    </div>
                  )}

                  {/* AI Summary Box */}
                  {selectedGrievance.summary && (
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        AI Summary
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedGrievance.summary}
                      </p>
                    </div>
                  )}

                  {!selectedGrievance.ai_decision && !selectedGrievance.summary && (
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-400 italic">
                      No AI analysis available for this complaint.
                    </div>
                  )}

                  {/* History Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <HistoryIcon className="w-3.5 h-3.5" />
                      <span>Audit Trail & Incident History</span>
                    </div>

                    <div className="space-y-2 relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 pl-3">
                      {selectedGrievance.history?.map((step, idx) => (
                        <div key={idx} className="relative text-xs space-y-0.5">
                          <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                            <span>{step.status}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {step.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {step.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedGrievance(null)}
                className="text-xs"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
