import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Calendar,
  Search,
  Filter,
  Users,
  ShieldAlert,
  History,
  FileText,
  AlertCircle,
  Edit3,
  Check,
  Info
} from "lucide-react";

export const AttendanceManager: React.FC = () => {
  const {
    currentUser,
    filteredStudents: students,
    filteredSubjects: subjects,
    filteredDivisions: divisions,
    filteredAttendance: attendance,
    selectedSemesterId,
    selectedSemester,
    saveDailyAttendance,
    triggerBiometricVerification
  } = useApp();

  const [activeTab, setActiveTab] = useState<"capture" | "history">("capture");
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div_a");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || "subj_1");

  // Reset selected division & subject when active semester context or filtered lists change
  useEffect(() => {
    if (divisions.length > 0 && (!selectedDivision || !divisions.some(d => d.id === selectedDivision))) {
      setSelectedDivision(divisions[0]?.id || "div_a");
    }
    if (subjects.length > 0 && (!selectedSubject || !subjects.some(s => s.id === selectedSubject))) {
      setSelectedSubject(subjects[0]?.id || "subj_1");
    }
  }, [selectedSemesterId, divisions, subjects]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:00 AM - 10:00 AM");
  const [sessionNotes, setSessionNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const divisionStudents = students.filter(s => s.divisionId === selectedDivision);

  // Check if an existing attendance record exists for (subject, division, date, period)
  const existingRecord = attendance.find(
    r =>
      r.subjectId === selectedSubject &&
      r.divisionId === selectedDivision &&
      r.date === selectedDate &&
      (r.period === selectedPeriod || r.timeSlot === selectedTimeSlot)
  );

  // Attendance status mapping for each student
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent" | "late">>({});

  // Sync state whenever filters change or existing record is loaded
  useEffect(() => {
    const newMap: Record<string, "present" | "absent" | "late"> = {};

    if (existingRecord) {
      divisionStudents.forEach(s => {
        if (existingRecord.presentStudentIds.includes(s.id)) {
          newMap[s.id] = "present";
        } else if (existingRecord.lateStudentIds?.includes(s.id)) {
          newMap[s.id] = "late";
        } else if (existingRecord.absentStudentIds.includes(s.id)) {
          newMap[s.id] = "absent";
        } else {
          newMap[s.id] = "present";
        }
      });
      setSessionNotes(existingRecord.notes || "");
    } else {
      divisionStudents.forEach(s => {
        newMap[s.id] = "present";
      });
      setSessionNotes("");
    }

    setAttendanceMap(newMap);
  }, [selectedSubject, selectedDivision, selectedDate, selectedPeriod, selectedTimeSlot, existingRecord?.id]);

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: "present" | "absent") => {
    const updated: Record<string, "present" | "absent" | "late"> = {};
    divisionStudents.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    const presentIds = Object.entries(attendanceMap)
      .filter(([_, status]) => status === "present")
      .map(([id]) => id);
    const absentIds = Object.entries(attendanceMap)
      .filter(([_, status]) => status === "absent")
      .map(([id]) => id);
    const lateIds = Object.entries(attendanceMap)
      .filter(([_, status]) => status === "late")
      .map(([id]) => id);

    const subjectObj = subjects.find(s => s.id === selectedSubject);

    // Call server endpoint to verify RBAC
    try {
      const res = await fetch("/api/rbac/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterRole: currentUser.role,
          subjectId: selectedSubject,
          divisionId: selectedDivision,
          date: selectedDate,
          period: selectedPeriod,
          presentStudentIds: presentIds,
          absentStudentIds: absentIds
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Security Error: ${data.error}`);
        return;
      }
    } catch (err) {
      console.warn("Backend RBAC check skipped, completing in client context.");
    }

    triggerBiometricVerification(
      `${existingRecord ? "Update" : "Capture"} Daily Attendance for ${subjectObj?.name || 'Subject'} (${selectedDate}, Period ${selectedPeriod})`,
      () => {
        const result = saveDailyAttendance({
          subjectId: selectedSubject,
          subjectName: subjectObj?.name || "Subject",
          divisionId: selectedDivision,
          date: selectedDate,
          period: selectedPeriod,
          timeSlot: selectedTimeSlot,
          recordedBy: currentUser.name,
          presentStudentIds: presentIds,
          absentStudentIds: absentIds,
          lateStudentIds: lateIds,
          notes: sessionNotes
        });

        alert(
          `${result.message}\nPresent: ${presentIds.length}, Absent: ${absentIds.length}, Late: ${lateIds.length}`
        );
      }
    );
  };

  const filteredStudents = divisionStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceMap).filter(v => v === "present").length;
  const absentCount = Object.values(attendanceMap).filter(v => v === "absent").length;
  const lateCount = Object.values(attendanceMap).filter(v => v === "late").length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <CalendarCheck className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Subject-Wise Daily Attendance Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Capture daily session attendance per period. Prevents duplicate records and automatically updates student performance reports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setActiveTab("capture")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === "capture"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Daily Capture</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Session Logs &amp; Audit</span>
            </button>
          </div>

          {activeTab === "capture" && (
            <button
              onClick={handleSaveAttendance}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{existingRecord ? "Update Session Record" : "Save Attendance Record"}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "capture" ? (
        <>
          {/* Duplicate Session Notice / Info Card */}
          {existingRecord ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start space-x-3 text-xs">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold flex items-center space-x-2">
                  <span>Existing Session Record Loaded for Editing</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px]">
                    No Duplicates Created
                  </span>
                </div>
                <p className="mt-1">
                  Attendance for <strong>{existingRecord.subjectName}</strong> on <strong>{existingRecord.date}</strong> (Period {existingRecord.period}) was recorded by {existingRecord.recordedBy}. Submitting will update the existing session record and recalculate student performance percentages.
                </p>
                {existingRecord.auditTrail && existingRecord.auditTrail.length > 0 && (
                  <div className="mt-2 text-[11px] font-mono opacity-85">
                    Last modified: {existingRecord.auditTrail[0]?.timestamp} by {existingRecord.auditTrail[0]?.modifiedBy}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-300 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>New Session: Select subject, date, and period below to capture today's class attendance.</span>
              </div>
            </div>
          )}

          {/* Filter & Selector Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            {/* Division Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Class / Division
              </label>
              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Class Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Period / Session */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Period / Session
              </label>
              <select
                value={selectedPeriod}
                onChange={e => {
                  const p = parseInt(e.target.value);
                  setSelectedPeriod(p);
                  if (p === 1) setSelectedTimeSlot("09:00 AM - 10:00 AM");
                  else if (p === 2) setSelectedTimeSlot("10:15 AM - 11:15 AM");
                  else if (p === 3) setSelectedTimeSlot("11:30 AM - 12:30 PM");
                  else setSelectedTimeSlot("02:00 PM - 04:00 PM (Lab)");
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>Period 1 (09:00 AM - 10:00 AM)</option>
                <option value={2}>Period 2 (10:15 AM - 11:15 AM)</option>
                <option value={3}>Period 3 (11:30 AM - 12:30 PM)</option>
                <option value={4}>Period 4 / Lab (02:00 PM - 04:00 PM)</option>
              </select>
            </div>

            {/* Session Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Session Topic / Notes
              </label>
              <input
                type="text"
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="e.g. Graph Traversal Algorithms"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Realtime Session Stats & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Class Roll Summary:</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                Present: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold">
                Absent: {absentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
                Late: {lateCount}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search student..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleMarkAll("present")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleMarkAll("absent")}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100"
                >
                  Mark All Absent
                </button>
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Enrollment No</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Overall Attendance %</th>
                    <th className="p-4 text-center">Session Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map(student => {
                    const status = attendanceMap[student.id] || "present";
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-medium text-slate-600 dark:text-slate-400">
                          {student.enrollmentNo}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                              <span className="block text-[10px] text-slate-400">{student.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  student.overallAttendance >= 85
                                    ? "bg-emerald-500"
                                    : student.overallAttendance >= 75
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${student.overallAttendance}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {student.overallAttendance}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleStatusChange(student.id, "present")}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center space-x-1 ${
                                status === "present"
                                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>

                            <button
                              onClick={() => handleStatusChange(student.id, "absent")}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center space-x-1 ${
                                status === "absent"
                                  ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>

                            <button
                              onClick={() => handleStatusChange(student.id, "late")}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center space-x-1 ${
                                status === "late"
                                  ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Late</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* History & Session Log View */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Showing past class attendance sessions for <strong>{divisions.find(d => d.id === selectedDivision)?.name}</strong> across all subjects.
            </div>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {attendance
              .filter(a => selectedSubject === "all" || a.subjectId === selectedSubject)
              .map(record => {
                const totalStudents = record.presentStudentIds.length + record.absentStudentIds.length + (record.lateStudentIds?.length || 0);
                const pct = totalStudents > 0 ? Math.round(((record.presentStudentIds.length + (record.lateStudentIds?.length || 0) * 0.5) / totalStudents) * 100) : 100;

                return (
                  <div
                    key={record.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                          {record.subjectName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                          Period {record.period || 1}
                        </span>
                        {record.auditTrail && record.auditTrail.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                            Edited ({record.auditTrail.length}x)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{record.date}</span>
                        </span>
                        <span>•</span>
                        <span>Recorded by: {record.recordedBy}</span>
                        {record.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-600 dark:text-slate-300">"{record.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-xs">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          {pct}% Turnout
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {record.presentStudentIds.length} Present • {record.absentStudentIds.length} Absent
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSubject(record.subjectId);
                          setSelectedDivision(record.divisionId);
                          setSelectedDate(record.date);
                          setSelectedPeriod(record.period || 1);
                          setActiveTab("capture");
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-slate-600 dark:text-slate-300 transition-all flex items-center space-x-1 text-xs font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

