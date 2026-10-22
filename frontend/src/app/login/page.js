"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  // If already authenticated, redirect to admin dashboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ciga_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.email || parsed.name)) {
            router.replace("/admin");
          }
        } catch {}
      }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginAdmin(cleanEmail, password);

      if (response && response.success && response.data) {
        const { user: userData, access_token, token_type, expires_in } =
          response.data;

        // Save authenticated session and tokens to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "ciga_user",
            JSON.stringify({
              id: userData?.id,
              name: userData?.name || "Admin User",
              email: userData?.email || cleanEmail,
              role: "Administrator",
              access_token: access_token,
              token_type: token_type || "Bearer",
              expires_in: expires_in,
              loginTime: new Date().toISOString(),
            }),
          );

          if (access_token) {
            localStorage.setItem("ciga_token", access_token);
            localStorage.setItem("ciga_token_type", token_type || "Bearer");
          }

          // Dispatch event so other components (e.g. Navbar) react immediately
          window.dispatchEvent(new Event("storage"));
        }

        setIsSuccess(true);

        setTimeout(() => {
          router.push("/admin");
        }, 600);
      } else {
        const msg =
          response?.error?.message ||
          response?.error ||
          "Authentication failed. Please verify your credentials.";
        setError(msg);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50/70 dark:bg-slate-950 p-4 relative">
      {/* Return to home link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Portal Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Authority Access
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Citizen Infra
          </h1>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur-md overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Sign in with your administrative credentials
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email / Username field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pl-9 h-10 text-sm font-mono text-slate-800 dark:text-slate-200"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pl-9 pr-9 h-10 text-sm font-mono"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-2 flex flex-col space-y-3">
              <Button
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" />
                    Logged In Successfully!
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Log In
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
