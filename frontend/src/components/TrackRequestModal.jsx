"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  X,
  MapPin,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  FileText,
  Image as ImageIcon,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  completed: {
    label: "Completed",
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  processing: {
    label: "Processing",
    badgeClass:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300",
    dotClass: "bg-sky-500",
  },
  pending: {
    label: "Pending",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
    dotClass: "bg-amber-500",
  },
};

function formatTimestamp(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export default function TrackRequestModal({
  isOpen,
  onClose,
  initialTicketId = "",
}) {
  const [ticketInput, setTicketInput] = useState(initialTicketId);
  const [prevInitialId, setPrevInitialId] = useState(initialTicketId);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchedId, setSearchedId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync state during render when initialTicketId prop changes
  if (initialTicketId !== prevInitialId) {
    setPrevInitialId(initialTicketId);
    setTicketInput(initialTicketId);
  }

  const fetchTracking = useCallback(async (idToSearch) => {
    const query = (idToSearch || "").trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    setSearchedId(query);
    setErrorMessage(null);
    setSearchResult(null);

    try {
      const res = await fetch(
        `/api/complaints/track/${encodeURIComponent(query)}`,
      );
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setSearchResult(json.data);
      } else {
        setErrorMessage(
          json.error || `No active grievance record found for ID "${query}".`,
        );
      }
    } catch (err) {
      console.error("Tracking API error:", err);
      setErrorMessage(
        "Network error while tracking complaint. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchTracking(ticketInput);
  };

  const handleLoadSample = (sampleId) => {
    setTicketInput(sampleId);
    fetchTracking(sampleId);
  };

  // Auto-search if opened with an initial ticket ID
  useEffect(() => {
    if (!isOpen || !initialTicketId) return;

    const timer = setTimeout(() => {
      fetchTracking(initialTicketId);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, initialTicketId, fetchTracking]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Track Grievance Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your tracking ticket ID to inspect real-time complaint
              progress
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Search Bar Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="text"
                  placeholder="Enter Tracking ID (e.g. RIF-7NRGN7)"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="pl-9 h-10 text-sm font-mono uppercase"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !ticketInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 text-sm shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-1.5" />
                    Track
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Enter the exact tracking ID provided upon submission.</span>
              <button
                type="button"
                onClick={() => handleLoadSample("RIF-7NRGN7")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Try sample: RIF-7NRGN7
              </button>
            </div>
          </form>

          {/* Search Result - ONLY Requested Fields:
              1. Tracking ID
              2. Category
              3. Status
              4. Summary
              5. Image
              6. Lat and Longitude
              7. History
          */}
          {hasSearched && !isLoading && (
            <div>
              {searchResult ? (
                <div className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5">
                  {/* 1. Tracking ID, 2. Category, 3. Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                        Tracking ID
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
                          {searchResult.tracking_id}
                        </span>
                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize font-semibold ${
                            STATUS_STYLES[searchResult.status]?.badgeClass ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                              STATUS_STYLES[searchResult.status]?.dotClass ||
                              "bg-slate-400"
                            }`}
                          />
                          {searchResult.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="sm:text-right space-y-1">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                        Category
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold capitalize bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1"
                      >
                        {searchResult.category}
                      </Badge>
                    </div>
                  </div>

                  {/* 4. Summary */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      Summary
                    </div>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                      {searchResult.summary || "No summary provided."}
                    </div>
                  </div>

                  {/* 5. Image & 6. Lat/Longitude Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 5. Image */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        Grievance Photo
                      </div>
                      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[180px] max-h-[220px]">
                        {searchResult.image_url ? (
                          <div className="relative group w-full h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={searchResult.image_url}
                              alt={`Evidence for ${searchResult.tracking_id}`}
                              className="w-full h-48 object-cover"
                            />
                            <a
                              href={searchResult.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Full Size
                            </a>
                          </div>
                        ) : (
                          <div className="text-center p-6 text-slate-400 text-xs">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                            No photo attached
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. Lat and Longitude */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Location (Lat / Long)
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between h-[180px] sm:h-48">
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">
                            GPS Coordinates:
                          </div>
                          <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {searchResult.lat != null &&
                            searchResult.lng != null ? (
                              <span>
                                {searchResult.lat}, {searchResult.lng}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">
                                Coordinates not available
                              </span>
                            )}
                          </div>
                        </div>

                        {searchResult.lat != null &&
                          searchResult.lng != null && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${searchResult.lat}&mlon=${searchResult.lng}#map=17/${searchResult.lat}/${searchResult.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors border border-blue-200 dark:border-blue-900"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View on OpenStreetMap
                            </a>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* 7. History */}
                  <div className="space-y-2.5 pt-2">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Status History
                    </div>

                    {searchResult.history && searchResult.history.length > 0 ? (
                      <div className="space-y-0">
                        {searchResult.history.map((item, idx) => {
                          const isLast =
                            idx === searchResult.history.length - 1;
                          const isInitial = item.old_status === null;

                          return (
                            <div key={idx} className="flex gap-3">
                              {/* Left Column: Strictly Centered Check Circle & Connecting Line */}
                              <div className="flex flex-col items-center shrink-0 w-6">
                                {/* Check Circle Indicator */}
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                                    isLast
                                      ? "bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 dark:ring-blue-950/60"
                                      : "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-500"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>

                                {/* Connecting Vertical Line (Mathematically Centered) */}
                                {!isLast && (
                                  <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 my-1 min-h-[30px]" />
                                )}
                              </div>

                              {/* Right Column: Event Content Card */}
                              <div
                                className={`flex-1 ${!isLast ? "pb-3.5" : ""}`}
                              >
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-1 shadow-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 capitalize">
                                      {isInitial ? (
                                        <span>
                                          Report Created &rarr;{" "}
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] uppercase font-mono px-1.5 py-0 ml-1"
                                          >
                                            {item.new_status}
                                          </Badge>
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <span className="text-slate-500">
                                            {item.old_status}
                                          </span>
                                          <ArrowRight className="w-3 h-3 text-slate-400" />
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                                            {item.new_status}
                                          </span>
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] font-mono text-slate-400">
                                      {formatTimestamp(item.changed_at)}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Updated by:{" "}
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      {item.changed_by || "System"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No history records available yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Error / Not Found */
                <div className="text-center p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Complaint Not Found
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {errorMessage || (
                        <>
                          Could not locate record for tracking ID{" "}
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            &quot;{searchedId}&quot;
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Initial State / Help Guide */}
          {!hasSearched && (
            <div className="text-center p-6 space-y-3 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Live Complaint Tracking
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enter your tracking ticket ID above (such as{" "}
                  <button
                    type="button"
                    onClick={() => handleLoadSample("RIF-7NRGN7")}
                    className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    RIF-7NRGN7
                  </button>
                  ) to see live status, incident photo, location, and progress
                  history.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
