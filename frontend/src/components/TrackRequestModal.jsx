"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  Calendar,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data representing what the API will return later
const MOCK_TICKET_DATA = {
  "CIGA-849201-412": {
    ticketId: "CIGA-849201-412",
    status: "in_progress", // 'received' | 'verified' | 'in_progress' | 'resolved'
    statusLabel: "Work in Progress",
    statusVariant: "warning",
    category: "Pothole & Road Damage",
    submittedAt: "Oct 04, 2026 at 11:20 AM",
    expectedResolution: "Oct 08, 2026",
    location: {
      latitude: 23.234158,
      longitude: 72.500038,
      address: "Near S.G. Highway, Ward 12, West Zone",
    },
    description: "Deep pothole causing traffic slowdown and potential two-wheeler accidents.",
    assignedDepartment: "Road Maintenance Division",
    officerInCharge: "Er. Rajesh Verma (Ward Engineer)",
    timeline: [
      {
        title: "Grievance Lodged",
        date: "Oct 04, 2026 - 11:20 AM",
        completed: true,
        desc: "Logged by citizen with photo and GPS location.",
      },
      {
        title: "Technical Review & Priority Set",
        date: "Oct 04, 2026 - 02:45 PM",
        completed: true,
        desc: "Severity marked as High. Assigned to local municipal division.",
      },
      {
        title: "Field Team Dispatched",
        date: "Oct 05, 2026 - 09:30 AM",
        completed: true,
        desc: "Road repair crew assigned with hot-mix asphalt patching material.",
      },
      {
        title: "Repair & Photo Verification",
        date: "Estimated: Oct 08, 2026",
        completed: false,
        desc: "Resolution confirmation by on-site supervisor and civic closing report.",
      },
    ],
  },
};

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

  // Adjust state when initialTicketId prop changes
  if (initialTicketId !== prevInitialId) {
    setPrevInitialId(initialTicketId);
    setTicketInput(initialTicketId);
  }

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = ticketInput.trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    setSearchedId(query);

    // Simulate API search latency (ready for real backend API integration)
    setTimeout(() => {
      // Check mock or generate a realistic tracking status for any valid looking ID
      const exactMatch = MOCK_TICKET_DATA[query.toUpperCase()];
      if (exactMatch) {
        setSearchResult(exactMatch);
      } else if (query.toUpperCase().startsWith("CIGA") || query.length >= 6) {
        // Dynamic mock preview for newly generated tickets
        setSearchResult({
          ticketId: query.toUpperCase(),
          status: "verified",
          statusLabel: "Under Review & Verification",
          statusVariant: "default",
          category: "Infrastructure Grievance",
          submittedAt: "Recently reported",
          expectedResolution: "Within 4 business days",
          location: {
            latitude: 23.234158,
            longitude: 72.500038,
            address: "Municipal Corporation Jurisdiction",
          },
          description: "Grievance received and queued for technical inspection.",
          assignedDepartment: "Public Works Department",
          officerInCharge: "Supervising Officer (Assigned on review)",
          timeline: [
            {
              title: "Grievance Lodged",
              date: "Recently",
              completed: true,
              desc: "Digital report recorded with image and coordinates.",
            },
            {
              title: "Initial Verification",
              date: "In progress",
              completed: true,
              desc: "Verifying jurisdiction and dispatch priority.",
            },
            {
              title: "Field Action",
              date: "Pending verification",
              completed: false,
              desc: "Assigning municipal repair squad.",
            },
            {
              title: "Closure & Feedback",
              date: "Pending",
              completed: false,
              desc: "Inspection report and citizen notification.",
            },
          ],
        });
      } else {
        setSearchResult(null);
      }
      setIsLoading(false);
    }, 600);
  };

  const handleLoadSample = () => {
    setTicketInput("CIGA-849201-412");
    setSearchedId("CIGA-849201-412");
    setSearchResult(MOCK_TICKET_DATA["CIGA-849201-412"]);
    setHasSearched(true);
  };

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
              Enter your ticket reference ID to see live inspection and resolution progress
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
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="text"
                  placeholder="Enter Tracking ID (e.g. CIGA-849201-412)"
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
                    Searching...
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
              <span>Tracking IDs are issued immediately upon report submission.</span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Try sample: CIGA-849201-412
              </button>
            </div>
          </form>

          {/* Search Results Display */}
          {hasSearched && !isLoading && (
            <div>
              {searchResult ? (
                <div className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                          {searchResult.ticketId}
                        </span>
                        <Badge
                          variant={searchResult.statusVariant || "default"}
                          className="text-xs capitalize font-medium"
                        >
                          {searchResult.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {searchResult.category}
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-500">
                      <div>Logged: <span className="text-slate-700 dark:text-slate-300 font-medium">{searchResult.submittedAt}</span></div>
                      <div>Target: <span className="text-slate-700 dark:text-slate-300 font-medium">{searchResult.expectedResolution}</span></div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        Incident Coordinates
                      </div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                        {searchResult.location.latitude}, {searchResult.location.longitude}
                      </div>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${searchResult.location.latitude}&mlon=${searchResult.location.longitude}#map=17/${searchResult.location.latitude}/${searchResult.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View in OpenStreetMap
                      </a>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-emerald-500" />
                        Assigned Authority
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {searchResult.assignedDepartment}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {searchResult.officerInCharge}
                      </div>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Resolution Progress
                    </h4>
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {searchResult.timeline.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Dot */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                              step.completed
                                ? "bg-emerald-600 border-white dark:border-slate-900 text-white"
                                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-transparent"
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </div>

                          {/* Content */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={`font-semibold ${
                                  step.completed
                                    ? "text-slate-900 dark:text-slate-100"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {step.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {step.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* No Results Found */
                <div className="text-center p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No Records Found
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Could not locate an active grievance record for ID{" "}
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        &quot;{searchedId}&quot;
                      </span>
                      . Please check the ticket number and try again.
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
                  Real-time Grievance Tracking
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Every submitted issue receives a unique tracking ticket like{" "}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                    CIGA-XXXXXX-XXX
                  </code>
                  . Enter it above to check the engineering team&apos;s repair status.
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
