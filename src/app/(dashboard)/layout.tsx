"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  FileSpreadsheet,
  FileCheck2,
  Users,
  Clock,
  Home,
  UserCheck,
  CreditCard,
  Database,
  ShieldAlert,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSession();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minRole: null },
    { name: "Daily Update Report", href: "/daily-updates", icon: FileSpreadsheet, minRole: null },
    { name: "Client Property Form", href: "/client-form", icon: FileCheck2, minRole: null },
    { name: "Attendance System", href: "/attendance", icon: Clock, minRole: null },
    { name: "Employees Directory", href: "/employees", icon: Users, minRole: null },
    { name: "Properties Portfolio", href: "/properties", icon: Home, minRole: null },
    { name: "Customer & Leads CRM", href: "/leads", icon: UserCheck, minRole: null },
    {
      name: "Finance & Payments",
      href: "/finance",
      icon: CreditCard,
      allowedRoles: ["SUPER_ADMIN", "OFFICE_MANAGER", "ACCOUNTANT"],
    },
    {
      name: "Database & Backups",
      href: "/backups",
      icon: Database,
      allowedRoles: ["SUPER_ADMIN"],
    },
    {
      name: "Security Audit Logs",
      href: "/audit-logs",
      icon: ShieldAlert,
      allowedRoles: ["SUPER_ADMIN"],
    },
  ];

  const allowedNav = navigation.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!user) return false;
    return item.allowedRoles.includes(user.role);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-indigo-950 text-white flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo Header */}
        <div className="p-6 border-b border-indigo-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight leading-tight">Shree Niwas</div>
              <div className="text-[11px] text-indigo-300 font-medium tracking-wide">
                Properties & Rentals
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-indigo-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {allowedNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-indigo-200 hover:bg-indigo-900/40 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-indigo-400"}`} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-indigo-900/60 bg-indigo-950/80">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
              <div className="text-xs text-indigo-300 font-mono tracking-wide">
                {user?.role.replace(/_/g, " ")}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-900/60 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block text-xs font-medium text-slate-500">
              System Time: <span className="font-mono text-slate-700">IST (+05:30)</span> | Office:{" "}
              <span className="font-semibold text-indigo-700">Main Office & Lal Bagh Site</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 relative">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`py-3 text-xs ${!n.isRead ? "bg-indigo-50/50 -mx-4 px-4" : ""}`}
                        >
                          <div className="font-semibold text-slate-800">{n.title}</div>
                          <div className="text-slate-600 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-semibold text-slate-800 leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {user?.role.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
