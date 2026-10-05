"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  CheckCircle2,
  AlertCircle,
  Inbox,
  FolderOpen,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AdminGrievanceTable from "@/components/AdminGrievanceTable";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ciga_user");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser({
              name: "Officer Rajesh Verma",
              role: "Ward Superintending Engineer",
            });
          }
          setIsCheckingAuth(false);
        } else {
          router.push("/login");
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

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
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div> */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100">
                  Citizen Infra
                </span>
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
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                248
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                +14 reported today
              </p>
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
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                42
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Active in pipeline
              </p>
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
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                198
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                92% resolution rate
              </p>
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
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                8
              </div>
              <p className="text-[11px] text-rose-500/80 mt-1">
                Exceeded SLA limit
              </p>
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
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                2.4 hrs
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Median response time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Grievance Requests Management Table */}
        <AdminGrievanceTable />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto bg-white/50 dark:bg-slate-900/50">
        <p>
          Citizen Infrastructure Grievance Assistance &bull; Internal
          Administration Console
        </p>
      </footer>
    </div>
  );
}
