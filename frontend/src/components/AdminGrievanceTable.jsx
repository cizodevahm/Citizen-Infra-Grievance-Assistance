"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Initial mock requests
const INITIAL_REQUESTS = [
  {
    id: "CIGA-849201-412",
    category: "pothole",
    status: "processing",
    createdAt: "2026-10-05T10:30:00Z",
    location: "S.G. Highway, Ward 12",
    notes: "Deep pothole reported near junction.",
  },
  {
    id: "CIGA-732104-981",
    category: "streetlight",
    status: "pending",
    createdAt: "2026-10-05T09:15:00Z",
    location: "Ring Road Sector 4",
    notes: "Streetlight fixture flickering and dark at night.",
  },
  {
    id: "CIGA-621908-112",
    category: "water_leak",
    status: "processing",
    createdAt: "2026-10-04T16:45:00Z",
    location: "Market Square Main Pipeline",
    notes: "Water main leaking onto pedestrian sidewalk.",
  },
  {
    id: "CIGA-519823-334",
    category: "drain",
    status: "completed",
    createdAt: "2026-10-04T11:20:00Z",
    location: "Civil Lines Crossroad",
    notes: "Stormwater drain blocked by debris; cleared by squad.",
  },
  {
    id: "CIGA-408712-556",
    category: "pothole",
    status: "pending",
    createdAt: "2026-10-03T14:10:00Z",
    location: "Ashram Road lane 3",
    notes: "Multiple road craters reported by commuters.",
  },
  {
    id: "CIGA-394812-778",
    category: "streetlight",
    status: "completed",
    createdAt: "2026-10-02T19:50:00Z",
    location: "Park Avenue Boulevard",
    notes: "Bulb replaced and timer calibrated.",
  },
  {
    id: "CIGA-283719-889",
    category: "water_leak",
    status: "pending",
    createdAt: "2026-10-02T08:05:00Z",
    location: "Heritage Colony Gate 2",
    notes: "Underground pipe seepage detected.",
  },
  {
    id: "CIGA-172608-990",
    category: "drain",
    status: "processing",
    createdAt: "2026-10-01T15:30:00Z",
    location: "Metro Station Exit B",
    notes: "Drain grate damaged and open.",
  },
];

// Category label helper
const CATEGORY_MAP = {
  pothole: { label: "Pothole", badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  streetlight: { label: "Streetlight", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  "water leak": { label: "Water Leak", badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  water_leak: { label: "Water Leak", badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  drain: { label: "Drain", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
};

// Status label and color helper (Green for completed, Blue for processing with light bg, Yellow for pending)
const STATUS_MAP = {
  pending: {
    label: "Pending",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800",
    dotClass: "bg-yellow-500",
  },
  processing: {
    label: "Processing",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
    dotClass: "bg-green-500",
  },
};

export default function AdminGrievanceTable() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = newest first, 'asc' = oldest first

  // Edit Modal State
  const [editingRequest, setEditingRequest] = useState(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [editCategory, setEditCategory] = useState("pothole");
  const [editNotes, setEditNotes] = useState("");

  // Delete Modal State
  const [deletingRequestId, setDeletingRequestId] = useState(null);

  // Filter & Sort Logic
  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter((req) => {
        // Status filter
        if (statusFilter !== "all" && req.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        // Category filter (handles 'water leak' and 'water_leak')
        if (categoryFilter !== "all") {
          const reqCat = req.category.replace("_", " ").toLowerCase();
          const filterCat = categoryFilter.replace("_", " ").toLowerCase();
          if (reqCat !== filterCat) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [requests, statusFilter, categoryFilter, sortOrder]);

  // Toggle sort order
  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  // Open Edit Modal
  const handleOpenEdit = (req) => {
    setEditingRequest(req);
    setEditStatus(req.status);
    setEditCategory(req.category);
    setEditNotes(req.notes || "");
  };

  // Save Edit
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    setRequests((prev) =>
      prev.map((r) =>
        r.id === editingRequest.id
          ? {
              ...r,
              status: editStatus,
              category: editCategory,
              notes: editNotes,
            }
          : r
      )
    );
    setEditingRequest(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingRequestId) return;
    setRequests((prev) => prev.filter((r) => r.id !== deletingRequestId));
    setDeletingRequestId(null);
  };

  // Format date helper
  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
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
              {filteredAndSortedRequests.length} of {requests.length}
            </Badge>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage, review, and update citizen infrastructure reports
          </p>
        </div>

        {/* Filter Controls (Status & Category Dropdowns) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="statusFilter" className="text-xs font-medium text-slate-500 hidden sm:inline">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
            <label htmlFor="categoryFilter" className="text-xs font-medium text-slate-500 hidden sm:inline">
              Category:
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="pothole">Pothole</option>
              <option value="streetlight">Streetlight</option>
              <option value="water leak">Water Leak</option>
              <option value="drain">Drain</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 uppercase tracking-wider font-semibold">
              <th scope="col" className="py-3 px-4 sm:px-6">ID</th>
              <th scope="col" className="py-3 px-4 sm:px-6">Category</th>
              <th scope="col" className="py-3 px-4 sm:px-6">Status</th>
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
              <th scope="col" className="py-3 px-4 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAndSortedRequests.length > 0 ? (
              filteredAndSortedRequests.map((req) => {
                const cat = CATEGORY_MAP[req.category] || { label: req.category, badgeClass: "" };
                const st = STATUS_MAP[req.status] || {
                  label: req.status,
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                  dotClass: "bg-slate-400",
                };

                return (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {req.id}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                    </td>

                    {/* Status (Green for completed, Blue for processing with light bg, Yellow for pending) */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`}></span>
                        {st.label}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {formatDate(req.createdAt)}
                    </td>

                    {/* Action (Edit & Delete) */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(req)}
                          title={`Edit ${req.id}`}
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingRequestId(req.id)}
                          title={`Delete ${req.id}`}
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
                <td colSpan={5} className="py-12 text-center text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No requests match your filter criteria
                  </p>
                  <p className="text-xs text-slate-400">
                    Try selecting &quot;All Statuses&quot; or &quot;All Categories&quot;.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Edit Request ({editingRequest.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="pothole">Pothole</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="water leak">Water Leak</option>
                  <option value="drain">Drain</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Internal Remarks / Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none"
                  placeholder="Add notes for field engineers..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRequest(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Delete Grievance Request?
                </h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove request <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{deletingRequestId}</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeletingRequestId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                className="text-xs"
              >
                Delete Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
