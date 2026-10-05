"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  CheckCircle2,
  AlertCircle,
  Inbox,
  FolderOpen,
  Timer,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AdminGrievanceTable from "@/components/AdminGrievanceTable";
import AdminHotspotMap from "@/components/AdminHotspotMap";
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/api";

// Helper to format average acknowledge time without duplicating units
function formatAcknowledgeTime(val) {
  if (val == null || val === "") return "N/A";
  const str = String(val).trim();

  // If the value already includes units (e.g., "19 mins", "2 hrs", "45 min", "1 hr 15 mins")
  if (/(?:min|hr|hour|day|sec)/i.test(str)) {
    return str;
  }

  // If it's a numeric value without unit
  const num = Number(str);
  if (!isNaN(num)) {
    if (num === 0) return "0 mins";
    if (num < 1) {
      return `${Math.round(num * 60)} mins`;
    }
    return `${num} hrs`;
  }

  return str;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Live Admin Dashboard Statistics State
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const loadDashboardStats = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoadingStats(true);
      setStatsError(null);
    }
    try {
      const response = await getAdminDashboardStats();
      if (response && response.success && response.data) {
        setStats(response.data);
        setLastRefreshedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      } else if (!isBackground) {
        setStatsError(response?.error || "Failed to load dashboard metrics");
      }
    } catch (err) {
      if (!isBackground) {
        console.error("Dashboard stats error:", err);
        setStatsError(err.message || "Failed to load live statistics");
      }
    } finally {
      if (!isBackground) {
        setIsLoadingStats(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ciga_user");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser({
              name: "Admin User",
              role: "Administrator",
            });
          }
          setIsCheckingAuth(false);
          loadDashboardStats(false);
        } else {
          router.push("/login");
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router, loadDashboardStats]);

  // Periodic stats poll every 3 seconds to keep metrics in sync
  useEffect(() => {
    if (isCheckingAuth) return;

    const interval = setInterval(() => {
      loadDashboardStats(true);
    }, 3000);

    const handleSync = () => {
      loadDashboardStats(true);
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
  }, [isCheckingAuth, loadDashboardStats]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ciga_user");
      router.push("/login");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Verifying administrator session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Admin Navbar */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div> */}
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100"
                >
                  Citizen Infra
                </Link>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                >
                  Admin Panel
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 hidden sm:inline">
                {user.name}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-9 font-medium px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 border-slate-300 dark:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Dashboard Metrics Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              System Overview & Metrics
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
              >
                Live Sync
              </Badge>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated grievance lifecycle metrics and resolution telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            {lastRefreshedAt && (
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Synced at {lastRefreshedAt}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardStats}
              disabled={isLoadingStats}
              className="text-xs h-8 px-2.5 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isLoadingStats ? "animate-spin text-blue-600" : ""}`}
              />
              {isLoadingStats ? "Syncing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Stats Error Alert if any */}
        {statsError && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              {statsError}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDashboardStats}
              className="text-xs h-7 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              Retry
            </Button>
          </div>
        )}

        {/* 5 Stats Cards: Received, Open, Resolved, Overdue, Average Time to Acknowledge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Received */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Received
              </CardTitle>
              <Inbox className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats?.received ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Open */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open
              </CardTitle>
              <FolderOpen className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {stats?.open ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Resolved */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Resolved
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats?.resolved ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Overdue */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Overdue
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                  {stats?.overdue ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Average Time to Acknowledge */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle
                className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate"
                title="Average Time to Acknowledge"
              >
                Avg. Acknowledge Time
              </CardTitle>
              <Timer className="w-4 h-4 text-indigo-500 shrink-0 ml-1" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatAcknowledgeTime(stats?.avg_time_to_acknowledge)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Infrastructure Map & Hotspot Analysis */}
        <AdminHotspotMap />

        {/* Grievance Requests Management Table */}
        <AdminGrievanceTable />
      </main>
    </div>
  );
}
