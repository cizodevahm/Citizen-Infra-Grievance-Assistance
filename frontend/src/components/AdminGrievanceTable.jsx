"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Volume2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getComplaintsList,
  updateComplaintStatus,
  deleteComplaint,
} from "@/lib/api";

// Category label helper
const CATEGORY_MAP = {
  pothole: {
    label: "Pothole",
    badgeClass:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  streetlight: {
    label: "Streetlight",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  "water leak": {
    label: "Water Leak",
    badgeClass:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  water_leak: {
    label: "Water Leak",
    badgeClass:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  drain: {
    label: "Drain",
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
  roads: {
    label: "Roads",
    badgeClass:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

// Status label and color helper
const STATUS_MAP = {
  pending: {
    label: "Pending",
    badgeClass:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800",
    dotClass: "bg-yellow-500",
  },
  processing: {
    label: "Processing",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    badgeClass:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
    dotClass: "bg-green-500",
  },
  deleted: {
    label: "Deleted",
    badgeClass:
      "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    dotClass: "bg-rose-500",
  },
};

export default function AdminGrievanceTable() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = newest first, 'asc' = oldest first

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });

  // Modals state
  const [inspectRequest, setInspectRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch Complaints from Backend API
  const fetchComplaints = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const params = {
        page,
        limit,
        sort_by: "created_at",
        order: sortOrder,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (categoryFilter !== "all") {
        params.category = categoryFilter;
      }

      const res = await getComplaintsList(params);

      if (res && res.success && Array.isArray(res.data)) {
        setRequests(res.data);
        if (res.meta) {
          setMeta(res.meta);
        }
      } else if (!isBackground) {
        setErrorMessage(
          res?.error || "Failed to load complaints from backend.",
        );
      }
    } catch (err) {
      if (!isBackground) {
        console.error("Error fetching complaints list:", err);
        setErrorMessage(err.message || "Network error loading complaints list.");
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [page, limit, sortOrder, statusFilter, categoryFilter]);

  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(() => {
      if (!isCancelled) {
        fetchComplaints(false);
      }
    }, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [fetchComplaints]);

  // Periodic poll every 3 seconds to keep table updated with newly submitted complaints
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComplaints(true);
    }, 3000);

    const handleSync = () => {
      fetchComplaints(true);
    };

    let bc = null;
    try {
      bc = new BroadcastChannel("ciga_live_complaints");
      bc.onmessage = (e) => {
        if (e?.data?.type === "NEW_COMPLAINT") {
          handleSync();
        }
      };
    } catch {}

    window.addEventListener("ciga_live_complaint", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener("ciga_live_complaint", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchComplaints]);

  // Filter & Sort Change Handlers
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  // Pagination Handlers
  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (page < meta.total_pages) setPage((prev) => prev + 1);
  };

  // Open Edit Modal (only status can be edited)
  const handleOpenEdit = (req) => {
    setEditingRequest(req);
    setEditStatus(req.status || "pending");
    setEditError(null);
  };

  // Save Edit (calls PATCH API to update status)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    const trackingId = editingRequest.tracking_id || editingRequest.id;
    if (!trackingId) return;

    setIsSavingEdit(true);
    setEditError(null);

    // Retrieve logged-in admin user's name if available
    let changedBy = "admin";
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ciga_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name) {
            changedBy = parsed.name.trim();
          }
        }
      }
    } catch {
      // fallback to admin
    }

    try {
      const response = await updateComplaintStatus(
        trackingId,
        editStatus,
        changedBy,
      );

      // Update state locally with new status and updated timestamps
      setRequests((prev) =>
        prev.map((r) =>
          (r.tracking_id || r.id) === trackingId
            ? {
                ...r,
                ...(response.data || {}),
                status: editStatus,
              }
            : r,
        ),
      );

      // Close modal
      setEditingRequest(null);
    } catch (err) {
      setEditError(err.message || "Failed to update status. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (req) => {
    setDeletingRequest(req);
    setDeleteReason("");
    setDeleteError(null);
  };

  // Confirm Delete (calls DELETE API with mandatory reason)
  const handleConfirmDelete = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deletingRequest) return;

    const trackingId = deletingRequest.tracking_id || deletingRequest.id;
    if (!trackingId) return;

    if (!deleteReason.trim()) {
      setDeleteError("Please specify a reason before deleting this complaint.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    // Retrieve logged-in admin user's name if available
    let deletedBy = "admin";
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ciga_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name) {
            deletedBy = parsed.name.trim();
          }
        }
      }
    } catch {
      // fallback to admin
    }

    try {
      await deleteComplaint(trackingId, deleteReason.trim(), deletedBy);

      // Remove deleted complaint from the active table list
      setRequests((prev) =>
        prev.filter((r) => (r.tracking_id || r.id) !== trackingId),
      );

      // Update total count in meta if present
      setMeta((prev) => ({
        ...prev,
        total: Math.max(0, (prev.total || 1) - 1),
      }));

      // Close modal and reset state
      setDeletingRequest(null);
      setDeleteReason("");
    } catch (err) {
      setDeleteError(
        err.message || "Failed to delete complaint. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-0">
      {/* Table Header & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/60">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Grievance Requests
            <Badge variant="secondary" className="text-xs font-mono">
              {requests.length} of {meta.total} reports
            </Badge>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live infrastructure complaints feed with real-time status and
            telemetry
          </p>
        </div>

        {/* Filter Controls (Status & Category Dropdowns + Refresh) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="statusFilter"
              className="text-xs font-medium text-slate-500 hidden sm:inline"
            >
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="categoryFilter"
              className="text-xs font-medium text-slate-500 hidden sm:inline"
            >
              Category:
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="pothole">Pothole</option>
              <option value="streetlight">Streetlight</option>
              <option value="water leak">Water Leak</option>
              <option value="drain">Drain</option>
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComplaints}
            disabled={isLoading}
            className="h-9 text-xs px-2.5 border-slate-300 dark:border-slate-700"
            title="Refresh complaints list"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden sm:inline ml-1.5">Sync</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {errorMessage}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchComplaints}
            className="text-xs h-7 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Loading complaints...
              </span>
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 uppercase tracking-wider font-semibold">
              <th scope="col" className="py-3 px-4 sm:px-6">
                ID / Tracking
              </th>

              <th scope="col" className="py-3 px-4 sm:px-6">
                Category
              </th>
              <th scope="col" className="py-3 px-4 sm:px-6">
                Status
              </th>
              <th scope="col" className="py-3 px-4 sm:px-6">
                <button
                  type="button"
                  onClick={handleToggleSort}
                  className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 font-semibold cursor-pointer select-none group"
                  title={`Sort by Created At (${sortOrder === "desc" ? "Newest first" : "Oldest first"})`}
                >
                  <span>Created At</span>
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowUp
                      className={`w-3.5 h-3.5 transition-colors ${
                        sortOrder === "asc"
                          ? "text-blue-600 dark:text-blue-400 stroke-[2.5]"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                    <ArrowDown
                      className={`w-3.5 h-3.5 transition-colors ${
                        sortOrder === "desc"
                          ? "text-blue-600 dark:text-blue-400 stroke-[2.5]"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </span>
                </button>
              </th>
              <th scope="col" className="py-3 px-4 sm:px-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {requests.length > 0 ? (
              requests.map((req) => {
                const reqKey = req.tracking_id || req.id;
                const cat = CATEGORY_MAP[req.category] || {
                  label: req.category,
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                };
                const st = STATUS_MAP[req.status] || {
                  label: req.status,
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                  dotClass: "bg-slate-400",
                };

                return (
                  <tr
                    key={reqKey}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* ID & Cluster Indicator */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {req.tracking_id || `ID-${req.id}`}
                        </span>
                        {req.parent_tracking_id ? (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                            Merged &rarr; {req.parent_tracking_id}
                          </span>
                        ) : req.report_count > 1 ? (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                            Cluster ({req.report_count} reports)
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Category & Severity */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cat.badgeClass}`}
                        >
                          {cat.label}
                        </span>
                        {/* {req.severity && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            {req.severity}
                          </span>
                        )} */}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`}
                        ></span>
                        {st.label}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {formatDate(req.created_at || req.createdAt)}
                    </td>

                    {/* Actions (Inspect, Edit, Delete) */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Inspect Details Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setInspectRequest(req)}
                          title={`Inspect ${reqKey}`}
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(req)}
                          title={`Edit ${reqKey}`}
                          className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(req)}
                          title={`Delete ${reqKey}`}
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-slate-400 space-y-2"
                >
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No complaints match your filter criteria
                  </p>
                  <p className="text-xs text-slate-400">
                    Try selecting &quot;All Statuses&quot; or &quot;All
                    Categories&quot;.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 sm:px-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing page{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {meta.page || page}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {meta.total_pages || 1}
          </span>{" "}
          ({meta.total} total complaints)
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page <= 1 || isLoading}
            className="h-8 px-2.5 text-xs border-slate-300 dark:border-slate-700"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= meta.total_pages || isLoading}
            className="h-8 px-2.5 text-xs border-slate-300 dark:border-slate-700"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Inspect / View Complaint Details Modal */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {inspectRequest.tracking_id || `ID-${inspectRequest.id}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectRequest(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 items-center">
                <Badge
                  variant="outline"
                  className={
                    STATUS_MAP[inspectRequest.status]?.badgeClass ||
                    "bg-slate-100"
                  }
                >
                  Status: {inspectRequest.status}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  Category: {inspectRequest.category}
                </Badge>
                {inspectRequest.severity && (
                  <Badge variant="outline" className="capitalize">
                    Severity: {inspectRequest.severity}
                  </Badge>
                )}
                {inspectRequest.department && (
                  <Badge variant="outline" className="capitalize">
                    Dept: {inspectRequest.department}
                  </Badge>
                )}
              </div>

              {/* Summary */}
              {inspectRequest.summary && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    AI Summary
                  </span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed">
                    {inspectRequest.summary}
                  </p>
                </div>
              )}

              {/* Image Preview */}
              {inspectRequest.image_url && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Incident Image
                  </span>
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 max-h-48 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={inspectRequest.image_url}
                      alt="Complaint photo"
                      className="w-full h-48 object-cover"
                    />
                    <a
                      href={inspectRequest.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Full Size
                    </a>
                  </div>
                </div>
              )}

              {/* Audio Note Player */}
              {inspectRequest.audio_url && (
                <div className="space-y-1.5 text-left">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                    Recorded Audio Note
                  </span>
                  <div className="flex flex-col items-start">
                    <audio
                      controls
                      src={inspectRequest.audio_url}
                      className="h-10 w-full max-w-[320px] rounded-lg"
                    />
                    {inspectRequest.transcript && (
                      <p className="text-[11px] text-slate-500 italic mt-1 text-left">
                        Transcript: &quot;{inspectRequest.transcript}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* User Message (shows raw_text if present) */}
              {(inspectRequest.raw_text || inspectRequest.user_message) && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    User Message
                  </span>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {inspectRequest.raw_text || inspectRequest.user_message}
                  </p>
                </div>
              )}

              {/* Coordinates */}
              {inspectRequest.lat != null && inspectRequest.lng != null && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Incident Location
                  </span>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {inspectRequest.lat}, {inspectRequest.lng}
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${inspectRequest.lat}&mlon=${inspectRequest.lng}#map=17/${inspectRequest.lat}/${inspectRequest.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Map
                    </a>
                  </div>
                </div>
              )}

              {/* AI Decision */}
              {inspectRequest.ai_decision && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    AI Decision Analysis
                  </span>
                  <p className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-900 leading-relaxed">
                    {inspectRequest.ai_decision}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectRequest(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal (Status Only) */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Update Complaint Status
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {editingRequest.tracking_id || editingRequest.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSavingEdit && setEditingRequest(null)}
                disabled={isSavingEdit}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {/* Complaint Overview Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] font-semibold ${CATEGORY_MAP[editingRequest.category]?.badgeClass || "bg-slate-100 text-slate-700"}`}
                  >
                    {CATEGORY_MAP[editingRequest.category]?.label || editingRequest.category || "—"}
                  </Badge>
                </div>
                {editingRequest.department && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Department:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {editingRequest.department}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] font-semibold ${STATUS_MAP[editingRequest.status]?.badgeClass || "bg-slate-100 text-slate-700"}`}
                  >
                    {STATUS_MAP[editingRequest.status]?.label || editingRequest.status || "—"}
                  </Badge>
                </div>
                {(editingRequest.summary || editingRequest.user_message || editingRequest.raw_text) && (
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block mb-0.5">Description:</span>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                      &quot;{editingRequest.summary || editingRequest.user_message || editingRequest.raw_text}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Status Select Field */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Select New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Changing the status will update backend records and log this action in tracking history.
                </p>
              </div>

              {/* Error Message */}
              {editError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRequest(null)}
                  disabled={isSavingEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Requires Reason) */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Delete Grievance Request
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {deletingRequest.tracking_id || deletingRequest.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeletingRequest(null)}
                disabled={isDeleting}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="p-5 space-y-4 text-xs">
              {/* Caution Warning */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Permanent Deletion Warning
                </p>
                <p className="text-[11px] leading-relaxed opacity-90 pl-5">
                  Are you sure you want to delete complaint{" "}
                  <span className="font-mono font-bold">
                    {deletingRequest.tracking_id || deletingRequest.id}
                  </span>
                  ? This action will mark this complaint as deleted and cannot be undone.
                </p>
              </div>

              {/* Complaint Overview Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] font-semibold ${CATEGORY_MAP[deletingRequest.category]?.badgeClass || "bg-slate-100 text-slate-700"}`}
                  >
                    {CATEGORY_MAP[deletingRequest.category]?.label || deletingRequest.category || "—"}
                  </Badge>
                </div>
                {(deletingRequest.summary || deletingRequest.user_message || deletingRequest.raw_text) && (
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block mb-0.5">Description:</span>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                      &quot;{deletingRequest.summary || deletingRequest.user_message || deletingRequest.raw_text}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Reason for Deletion */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Reason for Deletion <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Required</span>
                </div>

                {/* Quick Selection Presets */}
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    "duplicate report",
                    "invalid / spam report",
                    "resolved offline",
                    "wrong department",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isDeleting}
                      onClick={() => {
                        setDeleteReason(preset);
                        if (deleteError) setDeleteError(null);
                      }}
                      className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                        deleteReason === preset
                          ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 font-medium"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    if (deleteError) setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  placeholder="Enter specific reason (e.g. duplicate report, spam, testing)..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                />
              </div>

              {/* Error Message */}
              {deleteError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingRequest(null)}
                  disabled={isDeleting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting || !deleteReason.trim()}
                  className="text-xs font-semibold px-4"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Request"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
