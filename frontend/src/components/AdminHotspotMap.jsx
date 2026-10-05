"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

// Sample Hotspots with Top 5 Priority
const INITIAL_HOTSPOTS = [
  {
    id: "h1",
    rank: 1,
    name: "Ward 4 - Main St",
    reportsCount: 18,
    avgAge: "3d old",
    urgency: "critical",
    lat: 23.234158,
    lng: 72.500038,
    description:
      "5 active issues, frequent road craters and water main leakages",
    categories: ["pothole", "water leak", "streetlight", "drain"],
  },
  {
    id: "h2",
    rank: 2,
    name: "Market Square",
    reportsCount: 12,
    avgAge: "1d old",
    urgency: "high",
    lat: 23.23891,
    lng: 72.505412,
    description: "Severe pipeline leakage disrupting pedestrian market stalls",
    categories: ["water leak", "pothole"],
  },
  {
    id: "h3",
    rank: 3,
    name: "Metro Gate 2",
    reportsCount: 9,
    avgAge: "6h old",
    urgency: "medium",
    lat: 23.22987,
    lng: 72.49512,
    description: "Streetlights dark across entire transit footway corridor",
    categories: ["streetlight"],
  },
  {
    id: "h4",
    rank: 4,
    name: "Civil Lines Crossroad",
    reportsCount: 7,
    avgAge: "12h old",
    urgency: "medium",
    lat: 23.2415,
    lng: 72.5122,
    description:
      "Stormwater grate clogged causing wastewater spill onto junction",
    categories: ["drain"],
  },
  {
    id: "h5",
    rank: 5,
    name: "Heritage Colony",
    reportsCount: 5,
    avgAge: "2d old",
    urgency: "low",
    lat: 23.2251,
    lng: 72.4893,
    description: "Asphalt subsidence near residential entry Gate 1",
    categories: ["pothole"],
  },
];

// Initial Grievances Data
// Ward 4 contains 5 distinct points that cluster when zoom < 16, and expand to 5 individual pins when zoom >= 16
const INITIAL_MAP_GRIEVANCES = [
  {
    id: "CIGA-849201-412",
    title: "Deep Pothole at Junction",
    category: "pothole",
    status: "pending",
    isUrgent: true,
    isOverdue: true,
    lat: 23.234158,
    lng: 72.500038,
    locationName: "Ward 4 - Main St",
    address: "Ward 4 - S.G. Highway near Junction",
    createdAt: "2026-10-02T10:30:00Z",
    age: "3d old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "અહીં રસ્તા પર બહુ મોટો ખાડો પડી ગયો છે, બાઈક ચાલકો પડી જાય છે.",
      originalLanguage: "Gujarati",
      englishMeaning:
        "There is a very large pothole on the road here, two-wheeler riders are frequently falling over.",
    },
    aiAnalysis: {
      detectedCategory: "Severe Road Pothole",
      confidenceScore: 96.4,
      priority: "Critical (SLA: 24h)",
      assignedDept: "Roads & Civil Works Division",
      reasoning:
        "Road crater exceeding 25cm depth with sharp asphalt edges posing high collision and casualty risk.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 2, 10:30 AM",
        note: "Reported via citizen voice app",
      },
      {
        status: "AI Triaged",
        time: "Oct 2, 10:30 AM",
        note: "Classified as Pothole (96.4% confidence)",
      },
      {
        status: "Acknowledged",
        time: "Oct 2, 12:45 PM",
        note: "Superintending Engineer Verma assigned inspection crew",
      },
      {
        status: "Overdue",
        time: "Oct 3, 10:30 AM",
        note: "Resolution SLA exceeded 24-hour priority limit",
      },
    ],
  },
  {
    id: "CIGA-732104-981",
    title: "Streetlight Fixture Dark",
    category: "streetlight",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    lat: 23.23439,
    lng: 72.50025,
    locationName: "Ward 4 - Main St",
    address: "Ward 4 - Main St Lamppost #14",
    createdAt: "2026-10-05T09:15:00Z",
    age: "6h old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "स्ट्रीट लाइट रात को बंद रहती है, अंधेरे में चलना मुश्किल है।",
      originalLanguage: "Hindi",
      englishMeaning:
        "Street light stays off at night, it is difficult and unsafe to walk in the dark.",
    },
    aiAnalysis: {
      detectedCategory: "Streetlight Outage",
      confidenceScore: 94.2,
      priority: "Medium (SLA: 48h)",
      assignedDept: "Electrical & Street Lighting Squad",
      reasoning:
        "Dead sodium lamp fixture identified, timer wiring replacement needed.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 5, 09:15 AM",
        note: "Reported via web portal",
      },
      {
        status: "AI Triaged",
        time: "Oct 5, 09:16 AM",
        note: "Classified as Streetlight (94.2% confidence)",
      },
      {
        status: "Processing",
        time: "Oct 5, 11:20 AM",
        note: "Electrical lineman dispatched with replacement fixture",
      },
    ],
  },
  {
    id: "CIGA-884912-301",
    title: "Underground Water Leak",
    category: "water leak",
    status: "pending",
    isUrgent: true,
    isOverdue: false,
    lat: 23.23395,
    lng: 72.49982,
    locationName: "Ward 4 - Main St",
    address: "Ward 4 - Main St Crossway 2",
    createdAt: "2026-10-05T12:05:00Z",
    age: "3h old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "પાણીની પાઇપલાઇન તૂટી ગઈ છે, પીવાનું ચોખ્ખું પાણી રસ્તા પર વહી રહ્યું છે.",
      originalLanguage: "Gujarati",
      englishMeaning:
        "Water pipeline has burst, clean drinking water is flooding onto the street.",
    },
    aiAnalysis: {
      detectedCategory: "Drinking Water Pipeline Burst",
      confidenceScore: 98.1,
      priority: "Critical (SLA: 12h)",
      assignedDept: "Municipal Water Supply Board",
      reasoning:
        "Pressurized main line fracture discharging clean potable water onto carriageway.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 5, 12:05 PM",
        note: "Urgent citizen report with GPS",
      },
      {
        status: "AI Triaged",
        time: "Oct 5, 12:06 PM",
        note: "Emergency classification: Water Leak (98.1% confidence)",
      },
    ],
  },
  {
    id: "CIGA-772910-442",
    title: "Broken Stormwater Drain Grate",
    category: "drain",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    lat: 23.23452,
    lng: 72.49971,
    locationName: "Ward 4 - Main St",
    address: "Ward 4 - Main St Drain Point 7",
    createdAt: "2026-10-04T15:40:00Z",
    age: "1d old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1541888946425-d0fbb18f156f?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "गटर का ढक्कन टूटा हुआ है, कोई भी गिर सकता है।",
      originalLanguage: "Hindi",
      englishMeaning:
        "Drain cover is broken and open, anyone walking by could fall inside.",
    },
    aiAnalysis: {
      detectedCategory: "Missing Drain Grate Hazard",
      confidenceScore: 93.8,
      priority: "High (SLA: 24h)",
      assignedDept: "Drainage & Sewerage Network",
      reasoning:
        "Broken cast iron grate on main pedestrian footpath causing imminent fall hazard.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 4, 03:40 PM",
        note: "Reported with damage photo",
      },
      {
        status: "AI Triaged",
        time: "Oct 4, 03:41 PM",
        note: "Classified as Drain (93.8% confidence)",
      },
      {
        status: "Processing",
        time: "Oct 5, 08:00 AM",
        note: "Barricades placed by civic squad",
      },
    ],
  },
  {
    id: "CIGA-661902-881",
    title: "Secondary Road Surface Crack",
    category: "pothole",
    status: "completed",
    isUrgent: false,
    isOverdue: false,
    lat: 23.23402,
    lng: 72.50041,
    locationName: "Ward 4 - Main St",
    address: "Ward 4 - Main St Service Lane",
    createdAt: "2026-10-03T08:20:00Z",
    age: "2d old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "ખાડો નાનો હતો પણ હવે મોટો થઈ રહ્યો છે.",
      originalLanguage: "Gujarati",
      englishMeaning:
        "Pothole was small but was widening under vehicular load.",
    },
    aiAnalysis: {
      detectedCategory: "Minor Road Pothole",
      confidenceScore: 91.5,
      priority: "Standard",
      assignedDept: "Roads & Civil Works Division",
      reasoning: "Cold mix bituminous patch completed with compaction.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 3, 08:20 AM",
        note: "Citizen reported via web",
      },
      {
        status: "Processing",
        time: "Oct 3, 02:00 PM",
        note: "Road squad patched surface",
      },
      {
        status: "Completed",
        time: "Oct 4, 11:30 AM",
        note: "Inspection verified level surface",
      },
    ],
  },

  // Other hotspots
  {
    id: "CIGA-551982-101",
    title: "Market Water Main Seepage",
    category: "water leak",
    status: "pending",
    isUrgent: true,
    isOverdue: true,
    lat: 23.23891,
    lng: 72.505412,
    locationName: "Market Square",
    address: "Market Square North Gate",
    createdAt: "2026-10-04T10:00:00Z",
    age: "1d old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "मार्केट में पानी बह रहा है, दुकानों के आगे कीचड़ हो गया है।",
      originalLanguage: "Hindi",
      englishMeaning:
        "Water is flooding inside the market area, creating mud in front of shops.",
    },
    aiAnalysis: {
      detectedCategory: "Commercial Zone Pipeline Burst",
      confidenceScore: 97.4,
      priority: "Critical (SLA: 12h)",
      assignedDept: "Municipal Water Supply Board",
      reasoning:
        "Heavy leakage in high footfall commercial zone with water wastage.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 4, 10:00 AM",
        note: "Reported by shopkeepers",
      },
      {
        status: "Overdue",
        time: "Oct 5, 10:00 AM",
        note: "Resolution SLA exceeded 12h window",
      },
    ],
  },
  {
    id: "CIGA-441829-221",
    title: "Metro Gate 2 Streetlight Dark",
    category: "streetlight",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    lat: 23.22987,
    lng: 72.49512,
    locationName: "Metro Gate 2",
    address: "Metro Station Exit Gate 2 Pedestrian Walk",
    createdAt: "2026-10-05T08:30:00Z",
    age: "6h old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "मेट्रो स्टेशन के बाहर लाइटें बंद हैं, रात को बहुत अंधेरा रहता है।",
      originalLanguage: "Hindi",
      englishMeaning:
        "Lights are off outside the metro station, it is pitch dark at night.",
    },
    aiAnalysis: {
      detectedCategory: "Transit Corridor Street Lighting Failure",
      confidenceScore: 95.1,
      priority: "High",
      assignedDept: "Electrical & Street Lighting Squad",
      reasoning: "High commuter traffic area with failed feeder circuit.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 5, 08:30 AM",
        note: "Reported by daily commuter",
      },
      {
        status: "Processing",
        time: "Oct 5, 11:00 AM",
        note: "Feeder cable inspection ongoing",
      },
    ],
  },
  {
    id: "CIGA-331702-774",
    title: "Civil Lines Drain Overflow",
    category: "drain",
    status: "pending",
    isUrgent: true,
    isOverdue: false,
    lat: 23.2415,
    lng: 72.5122,
    locationName: "Civil Lines Crossroad",
    address: "Civil Lines Main Circle",
    createdAt: "2026-10-05T02:00:00Z",
    age: "12h old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1541888946425-d0fbb18f156f?w=700&auto=format&fit=crop&q=80",
      originalTranscript:
        "નાળું ભરાઈ ગયું છે અને ગંદુ પાણી રોડ પર આવી રહ્યું છે.",
      originalLanguage: "Gujarati",
      englishMeaning:
        "Drain is choked and contaminated water is spilling out onto the main road.",
    },
    aiAnalysis: {
      detectedCategory: "Stormwater Drain Choke & Backflow",
      confidenceScore: 92.9,
      priority: "High (SLA: 24h)",
      assignedDept: "Drainage & Sewerage Network",
      reasoning:
        "Solid waste blockage causing foul water accumulation on road.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 5, 02:00 AM",
        note: "Night report registered",
      },
      {
        status: "AI Triaged",
        time: "Oct 5, 02:01 AM",
        note: "Emergency squad alerted",
      },
    ],
  },
  {
    id: "CIGA-221601-998",
    title: "Heritage Colony Asphalt Sinkhole",
    category: "pothole",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    lat: 23.2251,
    lng: 72.4893,
    locationName: "Heritage Colony",
    address: "Heritage Colony Gate 1 Main Approach",
    createdAt: "2026-10-03T16:15:00Z",
    age: "2d old",
    citizenReport: {
      photoUrl:
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "કોલોનીના મુખ્ય દરવાજા પાસે રસ્તો બેસી ગયો છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "Road has sunk near the main gate of the colony.",
    },
    aiAnalysis: {
      detectedCategory: "Sub-base Settlement / Sinkhole",
      confidenceScore: 94.6,
      priority: "Medium",
      assignedDept: "Roads & Civil Works Division",
      reasoning:
        "Gradual road settlement requiring stone soling and premix carpeting.",
    },
    history: [
      {
        status: "Received",
        time: "Oct 3, 04:15 PM",
        note: "Reported with GPS tag",
      },
      {
        status: "Processing",
        time: "Oct 4, 10:00 AM",
        note: "Survey completed, repair scheduled",
      },
    ],
  },
];

// Color definitions for problem types
const CATEGORY_COLORS = {
  pothole: {
    bg: "#f97316", // Orange
    border: "#ea580c",
    label: "Pothole",
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
  drain: {
    bg: "#8b5cf6", // Purple / Slate
    border: "#7c3aed",
    label: "Drain",
    textClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

// Helper to render individual marker pin
function renderSingleMarker(L, item, layer, onSelect) {
  const colorInfo = CATEGORY_COLORS[item.category] || {
    bg: "#3b82f6",
    border: "#2563eb",
    label: item.category,
  };
  const isUrgentOrOverdue = item.isUrgent || item.isOverdue;

  const markerHtml = `
    <div class="relative cursor-pointer select-none group pin-drop-animate">
      ${
        isUrgentOrOverdue
          ? `<div class="absolute -inset-2.5 rounded-full pulse-ring-urgent pointer-events-none"></div>`
          : ""
      }
      <div style="background-color: ${colorInfo.bg}; border-color: white;" class="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg border-2 ring-1 ring-black/20 hover:scale-125 transition-transform">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow z-50">
        ${item.title}
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
  const [grievances, setGrievances] = useState(INITIAL_MAP_GRIEVANCES);
  const [hotspots] = useState(INITIAL_HOTSPOTS);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState("h1");
  const [zoomLevel, setZoomLevel] = useState(14);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // SSE & Live Incident Notification
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // On-demand API call when clicking a particular marker
  const handleMarkerClick = async (item) => {
    setIsLoadingDetail(true);
    setSelectedGrievance({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      isUrgent: item.isUrgent,
      isOverdue: item.isOverdue,
      address: item.address || item.locationName,
      age: item.age || "Just now",
    });

    try {
      const res = await fetch(`/api/grievance/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSelectedGrievance(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch detail for marker", item.id, err);
    } finally {
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
        center: [23.234158, 72.500038],
        zoom: 14,
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

      map.on("zoomend", () => {
        setZoomLevel(map.getZoom());
      });
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

      // Separate Ward 4 cluster items from other points
      const ward4Items = filteredGrievances.filter(
        (g) => g.locationName === "Ward 4 - Main St",
      );
      const otherItems = filteredGrievances.filter(
        (g) => g.locationName !== "Ward 4 - Main St",
      );

      // 1. CLUSTERING LOGIC FOR WARD 4:
      // If zoom < 16, collapse into a single cluster marker showing the total count (e.g. 5)
      // If zoom >= 16, expand into all individual markers!
      if (ward4Items.length > 0) {
        if (currentZoom < 16) {
          // Render Single Combined Cluster Marker
          const hasUrgent = ward4Items.some((g) => g.isUrgent || g.isOverdue);
          const clusterHtml = `
            <div class="relative cursor-pointer select-none group">
              ${
                hasUrgent
                  ? `<div class="absolute -inset-2 rounded-full pulse-ring-urgent pointer-events-none"></div>`
                  : ""
              }
              <div class="w-11 h-11 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xl border-3 border-white ring-2 ring-blue-400/50 hover:scale-110 transition-transform">
                ${ward4Items.length}
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow pointer-events-none">
                Ward 4 (${ward4Items.length} reports)
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: "custom-cluster-marker",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          const clusterMarker = L.marker([23.234158, 72.500038], {
            icon: clusterIcon,
          });
          clusterMarker.on("click", () => {
            // Smoothly fly and zoom into Ward 4 to reveal all individual 5 pins
            map.flyTo([23.234158, 72.500038], 17, { duration: 1.2 });
          });
          clusterMarker.addTo(markersLayer);
        } else {
          // Zoom is 16+: Render ALL individual 5 Ward 4 markers!
          ward4Items.forEach((item) => {
            renderSingleMarker(L, item, markersLayer, handleMarkerClick);
          });
        }
      }

      // 2. RENDER OTHER HOTSPOT MARKERS
      otherItems.forEach((item) => {
        renderSingleMarker(L, item, markersLayer, handleMarkerClick);
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
        {/* Top Control Bar with Filters & 3-Second Live Simulation Button */}
        <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Live Infrastructure Map & Cluster Analysis
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              OpenStreetMap cluster view with real-time complaint ingestion
              within 3 seconds
            </p>
          </div>

          {/* Controls: Type Filter, Status Filter */}
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Hotspot Box: Top 5 Priority
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High concentration incident zones
                  </p>
                </div>
              </div>
            </div>

            {/* Hotspots List */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {hotspots.map((spot) => {
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
                          {spot.rank}
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
              })}
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
              <div className="py-16 text-center space-y-3">
                <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Calling API: Fetching photo, multilingual transcript & AI
                  triage telemetry...
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  GET /api/grievance/{selectedGrievance.id}
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
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-video shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedGrievance.citizenReport?.photoUrl}
                        alt={selectedGrievance.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        GPS & EXIF Verified
                      </div>
                    </div>
                  </div>

                  {/* What the Citizen Said (Native) + English Meaning */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span>
                        Citizen Statement (
                        {selectedGrievance.citizenReport?.originalLanguage})
                      </span>
                    </div>
                    <blockquote className="text-xs italic text-slate-700 dark:text-slate-300 border-l-2 border-blue-500 pl-2.5 py-0.5">
                      &ldquo;
                      {selectedGrievance.citizenReport?.originalTranscript}
                      &rdquo;
                    </blockquote>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        English Translation:
                      </span>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        &ldquo;{selectedGrievance.citizenReport?.englishMeaning}
                        &rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Triage Decision & History Timeline */}
                <div className="space-y-4">
                  {/* AI Triage Decision Box */}
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        AI Triage Decision
                      </span>
                      <span className="text-xs font-mono font-extrabold text-indigo-700 dark:text-indigo-300">
                        {selectedGrievance.aiAnalysis?.confidenceScore}%
                        Certainty
                      </span>
                    </div>

                    {/* Confidence Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                      <div
                        style={{
                          width: `${selectedGrievance.aiAnalysis?.confidenceScore}%`,
                        }}
                        className="h-full bg-indigo-600 rounded-full"
                      />
                    </div>

                    <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-500">
                          Predicted Category:{" "}
                        </span>
                        <span className="font-bold">
                          {selectedGrievance.aiAnalysis?.detectedCategory}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">
                          Priority Rating:{" "}
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          {selectedGrievance.aiAnalysis?.priority}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">
                          Assigned Department:{" "}
                        </span>
                        <span className="font-bold">
                          {selectedGrievance.aiAnalysis?.assignedDept}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 italic">
                        &bull; {selectedGrievance.aiAnalysis?.reasoning}
                      </p>
                    </div>
                  </div>

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
