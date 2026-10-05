"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn, Search, LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrackRequestModal from "./TrackRequestModal";

export default function Navbar() {
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in via static session
    const checkUser = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ciga_user");
        if (stored) {
          try {
            setLoggedInUser(JSON.parse(stored));
          } catch {
            setLoggedInUser(null);
          }
        } else {
          setLoggedInUser(null);
        }
      }
    };

    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ciga_user");
      setLoggedInUser(null);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
              Citizen Infra
            </span>
            <span className="hidden sm:inline text-xs font-normal text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-2">
              Grievance Assistance
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTrackModalOpen(true)}
              className="text-xs h-9 font-medium px-3.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <Search className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
              Track Request
            </Button>

            {loggedInUser ? (
              <div className="flex items-center gap-2">
                <Link href="/admin">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-medium px-3 shadow-xs"
                  >
                    Admin Panel
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="text-xs h-9 font-medium px-3 border-slate-300 dark:border-slate-700 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 font-medium px-3.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Standalone Track Request Modal */}
      <TrackRequestModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </>
  );
}
