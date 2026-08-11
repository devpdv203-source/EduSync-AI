import React from "react";
import { useApp } from "../../context/AppContext";
import {
  GraduationCap,
  CalendarCheck,
  FileText,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  Clock,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    students,
    semesters,
    selectedSemesterId,
    selectedSemester,
    switchSemester,
    filteredMarks: marks,
    filteredAssignments: assignments,
    submissions,
    announcements,
    aiPredictions,
    getStudentOverallAttendanceSummary
  } = useApp();

  const myStudentObj = React.useMemo(() => {
    return students.find(s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email) || {
      id: currentUser.uid,
      uid: currentUser.uid,
      name: currentUser.name,
      enrollmentNo: currentUser.enrollmentNo || "EN2026-CS-042",
      email: currentUser.email,
      divisionId: currentUser.divisionId || "div_a",
      divisionName: currentUser.divisionName || "Div A - CS",
      overallAttendance: 85,
      gpa: 3.8,
      status: "Active" as const
    };
  }, [students, currentUser]);

  const attendanceSummary = getStudentOverallAttendanceSummary(myStudentObj.id, selectedSemesterId);
  const myMarks = marks.filter(m => m.studentId === myStudentObj.id);
  const myPendingAssignments = assignments.filter(a =>
    !submissions.some(sub => sub.assignmentId === a.id && sub.studentId === myStudentObj.id)
  );
  const myPrediction = aiPredictions.find(p => p.studentId === myStudentObj.id) || null;

  const attendanceTrend = [
    { week: "W1", attendance: 95 },
    { week: "W2", attendance: 92 },
    { week: "W3", attendance: 88 },
    { week: "W4", attendance: Math.round(attendanceSummary.overallPercentage) }
  ];

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-violet-900 to-slate-900 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-indigo-200">
            Student Academic Portal
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            Welcome Back, {currentUser.name}!
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
            Track your lecture attendance, review academic mark sheets, submit coursework assignments, and inspect your personal AI performance prediction.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={() => onNavigateTab("reports")}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <GraduationCap className="w-4 h-4 text-emerald-300" />
            <span>My Performance Report</span>
          </button>

          <button
            onClick={() => onNavigateTab("ai_analytics")}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>View AI Predictions</span>
          </button>
        </div>
      </div>

      {/* Semester Selector Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Select Active Semester Context:
          </span>
          <span className="text-[10px] text-slate-400">
            (Controls academic data across Dashboard, Marks, Attendance &amp; Reports)
          </span>
        </div>

        <select
          value={selectedSemesterId}
          onChange={e => switchSemester(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>
              {sem.name} {sem.isActive ? "• Current Active" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Semester Attendance</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {attendanceSummary.overallPercentage}%
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {attendanceSummary.overallPercentage >= 75 ? "Above 75% Cutoff" : "Low Attendance Warning"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* GPA */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cumulative GPA</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {myStudentObj.gpa} / 4.0
            </div>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block">{selectedSemester.name}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Assignments</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {myPendingAssignments.length} <span className="text-xs font-normal text-slate-400">Due</span>
            </div>
            <button
              onClick={() => onNavigateTab("assignments")}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 flex items-center"
            >
              Submit Solutions <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* AI Predicted Outcome */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Predicted Term Score</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {myPrediction?.predictedMarks || 92}%
            </div>
            <span className="text-[10px] font-bold text-emerald-600 mt-1 block">Low Risk Category</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Row: Attendance Trend & AI Study Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Attendance Consistency
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weekly attendance trend line across all division subjects
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("attendance")}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
            >
              View Subject Breakdown <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="stuAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Area type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#stuAtt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Study Advisor
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {(myPrediction?.recommendations || [
                "Complete practice problem sets for Graph Optimization.",
                "Review Database Normalization slides and practice BCNF exercises."
              ]).map((rec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300 flex items-start space-x-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                  <p className="leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("ai_analytics")}
            className="mt-6 w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 text-center"
          >
            Open Complete AI Prediction Report
          </button>
        </div>
      </div>
    </div>
  );
};
