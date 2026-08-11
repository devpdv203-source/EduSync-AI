import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Bell,
  Sun,
  Moon,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Search,
  UserCheck,
  Menu,
  ChevronDown,
  WifiOff
} from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNotifications,
}) => {
  const {
    currentUser,
    role,
    switchRole,
    theme,
    toggleTheme,
    cloudSyncStatus,
    isOffline,
    toggleOfflineMode,
    unreadNotifCount,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Responsive Search Bar */}
      <div className="hidden sm:flex items-center max-w-xs md:max-w-sm w-full mx-2 sm:mx-4 relative">
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Right Controls: Cloud Sync Badge, Notifications, Profile Dropdown */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Cloud Sync & Offline Toggle - Hidden on small mobile to save space */}
        <button
          onClick={toggleOfflineMode}
          title={isOffline ? "Offline Mode Active (Click to sync)" : "Cloud Synced (Click to simulate offline)"}
          className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            isOffline
              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50"
              : cloudSyncStatus === "syncing"
              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/50"
              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50"
          }`}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </>
          ) : cloudSyncStatus === "syncing" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <CloudCheck className="w-3.5 h-3.5" />
              <span>Cloud Synced</span>
            </>
          )}
        </button>

        {/* Notifications Trigger */}
        <button
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
              {unreadNotifCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(prev => !prev)}
            className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
          >
            <img
              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={currentUser?.name || "User"}
              className="w-7 h-7 rounded-lg object-cover ring-2 ring-indigo-500/30"
            />
            <div className="hidden md:flex flex-col text-left text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser?.name ? currentUser.name.split(" ")[0] : "User"}
              </span>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser.email}</p>
              </div>

              {/* Theme Toggle option inside profile dropdown */}
              <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    <span>{theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}</span>
                  </span>
                </button>
              </div>

              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Role Mode
              </div>

              <button
                onClick={() => {
                  switchRole("teacher");
                  setRoleDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                  role === "teacher"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>Prof. Sarah (Teacher)</span>
                {role === "teacher" && <UserCheck className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  switchRole("student");
                  setRoleDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                  role === "student"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>Alex Morgan (Student)</span>
                {role === "student" && <UserCheck className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  switchRole("admin");
                  setRoleDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                  role === "admin"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>Dr. Vance (Admin)</span>
                {role === "admin" && <UserCheck className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
