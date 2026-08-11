import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Users,
  CalendarCheck,
  FileCheck,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  BrainCircuit,
  Plus,
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface TeacherDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigateTab }) => {
  const {
    filteredStudents: students,
    filteredAttendance: attendance,
    filteredAssignments: assignments,
    submissions,
    semesters,
    selectedSemesterId,
    switchSemester,
    selectedSemester,
    triggerBiometricVerification
  } = useApp();

  const totalStudents = students.length;
  const avgAttendance = Math.round(
    students.reduce((acc, curr) => acc + curr.overallAttendance, 0) / (totalStudents || 1)
  );
  const pendingSubmissions = submissions.filter(s => s.status === "pending").length;
  const atRiskStudents = students.filter(s => s.riskCategory === "High" || s.overallAttendance < 75);

  const attendanceChartData = [
    { day: "Mon", attendance: 92 },
    { day: "Tue", attendance: 88 },
    { day: "Wed", attendance: 85 },
    { day: "Thu", attendance: 91 },
    { day: "Fri", attendance: 86 }
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Banner & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-950/20">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-indigo-200">
            Teacher Operations Workspace
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
            Class Overview & Workload Insights
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
            Monitor attendance %, evaluate assignment submissions, and track AI early-intervention alerts for at-risk students in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab("attendance")}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all flex items-center space-x-1.5 shadow-md shrink-0"
          >
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
            <span>Mark Today's Attendance</span>
          </button>
          <button
            onClick={() => onNavigateTab("assignments")}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Academic Context & Semester Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Academic Context & Data Scope
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {selectedSemester?.name || "Active Semester"}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <label htmlFor="teacher-semester-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-2 shrink-0">
            Select Semester:
          </label>
          <select
            id="teacher-semester-select"
            value={selectedSemesterId}
            onChange={e => switchSemester(e.target.value)}
            className="bg-white dark:bg-slate-900 font-bold text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            {semesters.map(sem => (
              <option key={sem.id} value={sem.id}>
                {sem.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Class Strength */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {totalStudents} <span className="text-xs font-normal text-slate-400">Students</span>
            </div>
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> Active Division A
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Avg */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class Attendance %</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {avgAttendance}%
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
              Cutoff Limit: 75%
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Evaluations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Evaluations</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {pendingSubmissions} <span className="text-xs font-normal text-slate-400">Unreviewed</span>
            </div>
            <button
              onClick={() => onNavigateTab("assignments")}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 flex items-center"
            >
              Grade Submissions <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* AI At-Risk Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">At-Risk Alerts</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {atRiskStudents.length} <span className="text-xs font-normal text-slate-400">Students</span>
            </div>
            <button
              onClick={() => onNavigateTab("ai_analytics")}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline mt-1 flex items-center"
            >
              View Risk Matrix <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Weekly Chart & AI At-Risk Intervention Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Weekly Attendance Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily attendance percentage across lectures
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Div A - Semester V
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceChartData}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Area type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#attGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI At-Risk Early Intervention Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  AI At-Risk Interventions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Students flagged below threshold
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {atRiskStudents.map(stu => (
                <div
                  key={stu.id}
                  className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={stu.avatarUrl}
                      alt={stu.name}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-rose-500/30"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{stu.name}</h4>
                      <p className="text-[10px] text-slate-500">
                        Attendance: <span className="font-semibold text-rose-600">{stu.overallAttendance}%</span> | GPA: {stu.gpa}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerBiometricVerification(`Send AI remediation notice to ${stu.name}`, () => {
                        alert(`Remedial study plan & consultation notification dispatched to ${stu.name}!`);
                      });
                    }}
                    className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-all shadow-xs"
                  >
                    Notify
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("ai_analytics")}
            className="mt-6 w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center space-x-1"
          >
            <span>Open AI Risk Matrix</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
