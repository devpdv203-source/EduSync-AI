import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { NotificationDrawer } from "./components/layout/NotificationDrawer";
import { BiometricMfaModal } from "./components/common/BiometricMfaModal";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Teacher Views
import { TeacherDashboard } from "./components/teacher/TeacherDashboard";
import { AttendanceManager } from "./components/teacher/AttendanceManager";
import { MarksManager } from "./components/teacher/MarksManager";
import { AssignmentManager } from "./components/teacher/AssignmentManager";
import { StudyMaterialUpload } from "./components/teacher/StudyMaterialUpload";
import { TimetableManager } from "./components/teacher/TimetableManager";
import { TeacherAIDashboard } from "./components/teacher/TeacherAIDashboard";
import { SemesterStudentManager } from "./components/teacher/SemesterStudentManager";

// Student Views
import { StudentDashboard } from "./components/student/StudentDashboard";
import { StudentAttendanceView } from "./components/student/StudentAttendanceView";
import { StudentMarksView } from "./components/student/StudentMarksView";
import { StudentAssignmentsView } from "./components/student/StudentAssignmentsView";
import { StudentMaterialsView } from "./components/student/StudentMaterialsView";
import { StudentAIPredictionView } from "./components/student/StudentAIPredictionView";
import { StudentPersonalStorage } from "./components/student/StudentPersonalStorage";

// Admin Views
import { UserManagementView } from "./components/admin/UserManagementView";

// Shared Views
import { AnnouncementsView } from "./components/shared/AnnouncementsView";
import { ProfileSettings } from "./components/shared/ProfileSettings";
import { ReportsExporter } from "./components/shared/ReportsExporter";
import { ReportErrorManager } from "./components/teacher/ReportErrorManager";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const MainAppContent: React.FC = () => {
  const { role, currentUser, canAccessTab } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // AUTOMATIC AUTHORIZED ROUTE REDIRECT ON ROLE SWITCH
  useEffect(() => {
    setActiveTab("dashboard");
  }, [currentUser.uid, role]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  const renderActiveTabContent = () => {
    // 1. Protected Route Access Check
    if (!canAccessTab(activeTab)) {
      return (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-900/50 max-w-2xl mx-auto my-12 space-y-4 shadow-xl">
          <ShieldAlert className="w-16 h-16 text-rose-600 dark:text-rose-400 mx-auto animate-bounce" />
          <div>
            <h2 className="text-xl font-bold text-rose-950 dark:text-rose-100">
              403 - Access Forbidden
            </h2>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-2 max-w-md mx-auto leading-relaxed">
              Your active session role (<strong className="uppercase">{role}</strong>) does not have authorization to access <strong>{activeTab.replace(/_/g, " ")}</strong>. This route is protected by backend RBAC security policy.
            </p>
          </div>

          <button
            onClick={() => setActiveTab("dashboard")}
            className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Authorized Dashboard</span>
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "user_management":
        return <UserManagementView />;

      case "dashboard":
        return role === "student" ? (
          <StudentDashboard onNavigateTab={setActiveTab} />
        ) : (
          <TeacherDashboard onNavigateTab={setActiveTab} />
        );

      case "ai_analytics":
        return role === "student" ? (
          <StudentAIPredictionView />
        ) : (
          <TeacherAIDashboard />
        );

      case "attendance":
        return role === "student" ? (
          <StudentAttendanceView />
        ) : (
          <AttendanceManager />
        );

      case "marks":
        return role === "student" ? (
          <StudentMarksView />
        ) : (
          <MarksManager />
        );

      case "assignments":
        return role === "student" ? (
          <StudentAssignmentsView />
        ) : (
          <AssignmentManager />
        );

      case "materials":
        return role === "student" ? (
          <StudentMaterialsView />
        ) : (
          <StudyMaterialUpload />
        );

      case "timetable":
        return <TimetableManager />;

      case "announcements":
        return <AnnouncementsView />;

      case "semester_students":
        return <SemesterStudentManager />;

      case "personal_storage":
        return <StudentPersonalStorage />;

      case "reports":
        return <ReportsExporter />;

      case "report_issues":
        return <ReportErrorManager />;

      case "settings":
        return <ProfileSettings />;

      default:
        return role === "student" ? (
          <StudentDashboard onNavigateTab={setActiveTab} />
        ) : (
          <TeacherDashboard onNavigateTab={setActiveTab} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onToggleSidebar={handleToggleSidebar}
          onOpenNotifications={() => setNotifDrawerOpen(true)}
          activeTab={activeTab}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <ErrorBoundary key={activeTab}>
            {renderActiveTabContent()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Drawers & Modals */}
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        onNavigateTab={setActiveTab}
      />

      <BiometricMfaModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
