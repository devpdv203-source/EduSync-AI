import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lock,
  Check
} from "lucide-react";

export const StudentAttendanceView: React.FC = () => {
  const {
    currentUser,
    students,
    filteredSubjects: subjects,
    selectedSemesterId,
    selectedSemester,
    getStudentOverallAttendanceSummary
  } = useApp();

  const myStudentObj = students.find(s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email) || students[0] || {
    id: currentUser.uid || "stu_1",
    name: currentUser.name || "Alex Morgan",
    email: currentUser.email || "alex.morgan@edusync.edu"
  };
  const summary = getStudentOverallAttendanceSummary(myStudentObj?.id || currentUser.uid, selectedSemesterId);

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Subject-Wise Attendance Analytics ({selectedSemester.name})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of subject-wise attendance percentage, session logs, and minimum academic eligibility status for {selectedSemester.name}.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only Portal</span>
          </div>

          <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 text-emerald-700 dark:text-emerald-400">
            <Award className="w-5 h-5" />
            <span className="text-sm font-black">{summary.overallPercentage}% Overall</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500">Classes Conducted</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {summary.totalConducted}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across all subjects</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Attended (Present)</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.totalPresent}
          </div>
          <span className="text-[10px] text-emerald-600/70 block mt-0.5">Full credit sessions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Missed (Absent)</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summary.totalAbsent}
          </div>
          <span className="text-[10px] text-rose-600/70 block mt-0.5">Unattended sessions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Late Arrivals</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summary.totalLate}
          </div>
          <span className="text-[10px] text-amber-600/70 block mt-0.5">Partial credit sessions</span>
        </div>
      </div>

      {/* Subject Wise Cards and History Log */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Subject-Wise Breakdown &amp; History Log
        </h3>

        <div className="space-y-4">
          {summary.subjectSummaries.map(subjStat => {
            const isExpanded = expandedSubjectId === subjStat.subjectId;

            return (
              <div
                key={subjStat.subjectId}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Subject Summary Header Bar */}
                <div
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subjStat.subjectId)}
                  className="p-5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {subjStat.subjectCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            subjStat.status === "Good"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : subjStat.status === "Satisfactory"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {subjStat.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {subjStat.subjectName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {subjStat.percentage}%
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {subjStat.present} Attended / {subjStat.conducted} Conducted ({subjStat.absent} Missed, {subjStat.late} Late)
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pb-2">
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        subjStat.percentage >= 85
                          ? "bg-emerald-500"
                          : subjStat.percentage >= 75
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${subjStat.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Session History Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Session-Wise Attendance Log ({subjStat.history.length} Sessions)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Target cutoff: 75% minimum requirement
                      </span>
                    </div>

                    {subjStat.history.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 text-center text-xs text-slate-400">
                        No recorded lectures yet for this subject.
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px]">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Period / Time</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Topic / Notes</th>
                              <th className="p-3">Faculty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(subjStat.history || []).map(hist => (
                              <tr key={hist.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {hist.date}
                                </td>
                                <td className="p-3 text-slate-500 font-mono">
                                  Period {hist.period} {hist.timeSlot ? `(${hist.timeSlot})` : ""}
                                </td>
                                <td className="p-3">
                                  {hist.status === "present" ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Present</span>
                                    </span>
                                  ) : hist.status === "late" ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-bold">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>Late</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[11px] font-bold">
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Absent</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 italic">
                                  {hist.notes || "Lecture session"}
                                </td>
                                <td className="p-3 text-slate-500 font-medium">
                                  {hist.recordedBy}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

