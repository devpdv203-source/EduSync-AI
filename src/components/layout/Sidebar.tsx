import React from "react";
import { useApp } from "../../context/AppContext";
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  FileText,
  BookOpen,
  CalendarDays,
  Megaphone,
  BrainCircuit,
  Users,
  HardDrive,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const { role, reportIssues } = useApp();

  const pendingCount = reportIssues.filter(i => i.status === "Pending").length;

  const getAdminNavItems = () => [
    { id: "user_management", label: "User & Role Management", icon: ShieldCheck, badge: "ADMIN" },
    { id: "dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
    { id: "ai_analytics", label: "AI Workload & Risk", icon: BrainCircuit, badge: "AI" },
    { id: "attendance", label: "Attendance Capture", icon: CalendarCheck },
    { id: "marks", label: "Marks Management", icon: GraduationCap },
    { id: "assignments", label: "Assignments & Grading", icon: FileText },
    { id: "materials", label: "Study Materials", icon: BookOpen },
    { id: "timetable", label: "Timetable Schedule", icon: CalendarDays },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "semester_students", label: "Class & Students", icon: Users },
    { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
    { id: "report_issues", label: "Report Error Tickets", icon: AlertTriangle, badge: pendingCount > 0 ? `${pendingCount}` : undefined },
    { id: "settings", label: "System & Profile", icon: Settings }
  ];

  const getTeacherNavItems = () => [
    { id: "dashboard", label: "Teacher Dashboard", icon: LayoutDashboard },
    { id: "ai_analytics", label: "AI Workload & Risk", icon: BrainCircuit, badge: "AI" },
    { id: "attendance", label: "Attendance Capture", icon: CalendarCheck },
    { id: "marks", label: "Marks Management", icon: GraduationCap },
    { id: "assignments", label: "Assignments & Grading", icon: FileText },
    { id: "materials", label: "Study Materials", icon: BookOpen },
    { id: "timetable", label: "Timetable Schedule", icon: CalendarDays },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "semester_students", label: "Class & Students", icon: Users },
    { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
    { id: "report_issues", label: "Report Error Tickets", icon: AlertTriangle, badge: pendingCount > 0 ? `${pendingCount}` : undefined },
    { id: "settings", label: "Profile & Security", icon: Settings }
  ];

  const getStudentNavItems = () => [
    { id: "dashboard", label: "Student Dashboard", icon: LayoutDashboard },
    { id: "ai_analytics", label: "AI Predictions & Advice", icon: BrainCircuit, badge: "AI" },
    { id: "attendance", label: "My Attendance", icon: CalendarCheck },
    { id: "marks", label: "My Marks & Grades", icon: GraduationCap },
    { id: "assignments", label: "Assignments & Submit", icon: FileText },
    { id: "materials", label: "Study Materials", icon: BookOpen },
    { id: "timetable", label: "My Timetable", icon: CalendarDays },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "personal_storage", label: "Personal Storage", icon: HardDrive },
    { id: "reports", label: "My Performance Report", icon: FileSpreadsheet },
    { id: "report_issues", label: "Report Error Tickets", icon: AlertTriangle },
    { id: "settings", label: "Profile & Security", icon: Settings }
  ];

  const navItems =
    role === "admin"
      ? getAdminNavItems()
      : role === "student"
      ? getStudentNavItems()
      : getTeacherNavItems();

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out flex flex-col justify-between ${
          mobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20 w-64" : "w-64"}`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
                <BrainCircuit className="w-6 h-6" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                    EduSync<span className="text-indigo-600 dark:text-indigo-400"> AI</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Workload System
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 max-h-[calc(100vh-140px)] overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isCollapsedInDesktop = collapsed && !mobileOpen;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  title={isCollapsedInDesktop ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                    />
                    {!isCollapsedInDesktop && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsedInDesktop && item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer System Status Badge */}
        {(!collapsed || mobileOpen) && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 m-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                System Online
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              FastAPI AI Microservice &amp; Firestore active.
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
