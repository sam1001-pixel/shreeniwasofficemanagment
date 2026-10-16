"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, Lock, User, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("admin@shreeniwas.com");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    { role: "Super Admin", email: "admin@shreeniwas.com", name: "Super Administrator" },
    { role: "Office Manager", email: "manager@shreeniwas.com", name: "Rajesh Kumar" },
    { role: "Accountant", email: "accounts@shreeniwas.com", name: "Sunil Sharma" },
    { role: "Property Agent", email: "priyanka@shreeniwas.com", name: "Priyanka Verma" },
    { role: "Office Staff", email: "amit@shreeniwas.com", name: "Amit Singh" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-indigo-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-700/30 rounded-full blur-2xl"></div>
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-4 border border-white/20">
            <Building2 className="w-8 h-8 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Shree Niwas Properties</h1>
          <p className="text-indigo-200 text-sm mt-1">& Rentals Office Management System</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start space-x-2">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="admin@shreeniwas.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Office Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Role Preset Quick Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Quick Role Switcher
              </span>
              <span className="text-[11px] text-slate-400">Password: Admin@12345</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setIdentifier(acc.email);
                    setPassword("Admin@12345");
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs transition ${
                    identifier === acc.email
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 font-medium"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="font-semibold truncate">{acc.role}</div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted 24h JWT Session with Role Access Control</span>
          </div>
        </div>
      </div>
    </div>
  );
}
