import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AttendanceSessionContext } from "../../types";
import { CalendarCheck, CheckCircle2, XCircle, Clock, Save, Calendar, Search, History, Edit3, Info, LockKeyhole } from "lucide-react";

interface AttendanceManagerProps {
  sessionContext?: AttendanceSessionContext | null;
  onClearSessionContext?: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ sessionContext, onClearSessionContext }) => {
  const {
    currentUser, filteredStudents: students, filteredSubjects: subjects, divisions,
    filteredAttendance: attendance, selectedSemesterId, switchSemester, semesters,
    saveDailyAttendance
  } = useApp();

  const [activeTab, setActiveTab] = useState<"capture" | "history">("capture");
  const [selectedDivisionTarget, setSelectedDivisionTarget] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:00 AM - 10:00 AM");
  const [sessionType, setSessionType] = useState<"lecture" | "lab" | "extra">("lecture");
  const [sessionNotes, setSessionNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadedSessionId, setLoadedSessionId] = useState<string | undefined>();
  const [isScheduled, setIsScheduled] = useState(false);
  const [locked, setLocked] = useState(false);

  const semesterDivisions = useMemo(() => divisions.filter(d => d.semesterId === selectedSemesterId), [divisions, selectedSemesterId]);
  const allDivisionIds = useMemo(() => semesterDivisions.map(d => d.id), [semesterDivisions]);
  const targetOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Divisions", ids: allDivisionIds }];
    semesterDivisions.forEach(d => options.push({ value: d.id, label: d.name, ids: [d.id] }));
    if (semesterDivisions.length >= 4) {
      const a = semesterDivisions.find(d => d.name.toLowerCase().includes("div a"));
      const b = semesterDivisions.find(d => d.name.toLowerCase().includes("div b"));
      const c = semesterDivisions.find(d => d.name.toLowerCase().includes("div c"));
      const d = semesterDivisions.find(d => d.name.toLowerCase().includes("div d"));
      if (a && b) options.push({ value: `${a.id}+${b.id}`, label: "A + B", ids: [a.id, b.id] });
      if (c && d) options.push({ value: `${c.id}+${d.id}`, label: "C + D", ids: [c.id, d.id] });
    }
    return options;
  }, [semesterDivisions, allDivisionIds]);

  const target = targetOptions.find(o => o.value === selectedDivisionTarget) || targetOptions[0];
  const divisionStudents = students.filter(s => target?.ids.includes(s.divisionId));

  useEffect(() => {
    if (!selectedSubject || !subjects.some(s => s.id === selectedSubject)) setSelectedSubject(subjects[0]?.id || "");
    if (!targetOptions.some(o => o.value === selectedDivisionTarget)) setSelectedDivisionTarget("all");
  }, [subjects, targetOptions, selectedSubject, selectedDivisionTarget]);

  useEffect(() => {
    if (!sessionContext) {
      setIsScheduled(false); setLocked(false); return;
    }
    if (sessionContext.semesterId && sessionContext.semesterId !== selectedSemesterId) switchSemester(sessionContext.semesterId);
    setLoadedSessionId(sessionContext.sessionId);
    setSelectedSubject(sessionContext.subjectId);
    setSelectedDate(sessionContext.date);
    setSelectedPeriod(sessionContext.period);
    setSelectedTimeSlot(sessionContext.timeSlot);
    setSessionType(sessionContext.sessionType);
    setSelectedDivisionTarget(sessionContext.targetDivisionIds.length === allDivisionIds.length && allDivisionIds.length > 0 ? "all" : sessionContext.targetDivisionIds.join("+"));
    setIsScheduled(true);
    setLocked(true);
    setActiveTab("capture");
  }, [sessionContext]);

  const existingRecord = attendance.find(r => {
    const sameTarget = (r.targetDivisionIds?.length ? r.targetDivisionIds.join("+") : r.divisionId) === selectedDivisionTarget;
    return r.subjectId === selectedSubject && sameTarget && r.date === selectedDate && r.period === selectedPeriod;
  });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent" | "late">>({});
  useEffect(() => {
    const map: Record<string, "present" | "absent" | "late"> = {};
    divisionStudents.forEach(s => {
      if (existingRecord?.presentStudentIds.includes(s.id)) map[s.id] = "present";
      else if (existingRecord?.lateStudentIds?.includes(s.id)) map[s.id] = "late";
      else if (existingRecord?.absentStudentIds.includes(s.id)) map[s.id] = "absent";
      else map[s.id] = "present";
    });
    setAttendanceMap(map);
    setSessionNotes(existingRecord?.notes || "");
  }, [existingRecord?.id, selectedSubject, selectedDivisionTarget, selectedDate, selectedPeriod, divisionStudents.map(s => s.id).join(",")]);

  const filteredStudents = divisionStudents.filter(s => !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase()));
  const presentCount = Object.values(attendanceMap).filter(v => v === "present").length;
  const absentCount = Object.values(attendanceMap).filter(v => v === "absent").length;
  const lateCount = Object.values(attendanceMap).filter(v => v === "late").length;

  const handleSave = async () => {
    if (!selectedSubject || !target || target.ids.length === 0 || !divisionStudents.length || sessionContext?.status === "cancelled") return;
    const presentIds = Object.entries(attendanceMap).filter(([,v]) => v === "present").map(([id]) => id);
    const absentIds = Object.entries(attendanceMap).filter(([,v]) => v === "absent").map(([id]) => id);
    const lateIds = Object.entries(attendanceMap).filter(([,v]) => v === "late").map(([id]) => id);
    const subjectObj = subjects.find(s => s.id === selectedSubject);
    const result = await saveDailyAttendance({
      subjectId: selectedSubject, subjectName: subjectObj?.name, divisionId: selectedDivisionTarget,
      semesterId: selectedSemesterId, sessionId: loadedSessionId, teacherId: currentUser.uid,
      sessionType, targetDivisionIds: target.ids, date: selectedDate, period: selectedPeriod,
      timeSlot: selectedTimeSlot, recordedBy: currentUser.name, presentStudentIds: presentIds,
      absentStudentIds: absentIds, lateStudentIds: lateIds, notes: sessionNotes
    });
    alert(`${result.message}\nPresent: ${presentIds.length}, Absent: ${absentIds.length}, Late: ${lateIds.length}`);
  };

  const selectTarget = (value: string) => {
    setSelectedDivisionTarget(value);
    if (value === "all") setSessionType("lecture");
    else if (sessionType === "lecture") setSessionType("lab");
  };

  const cancelled = sessionContext?.status === "cancelled";

  return <div className="space-y-6">
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400"><CalendarCheck className="w-5 h-5"/><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subject-Wise Daily Attendance Management</h2></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Capture daily session attendance per period. Scheduled sessions are prefilled from the timetable.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1"><button onClick={() => setActiveTab("capture")} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeTab === "capture" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}><CalendarCheck className="w-3.5 h-3.5 inline mr-1"/>Daily Capture</button><button onClick={() => setActiveTab("history")} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeTab === "history" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}><History className="w-3.5 h-3.5 inline mr-1"/>Session Logs &amp; Audit</button></div>
        {activeTab === "capture" && !cancelled && <button disabled={!divisionStudents.length || !selectedSubject} onClick={handleSave} className="px-5 py-2.5 rounded-2xl bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center space-x-2"><Save className="w-4 h-4"/><span>{existingRecord ? "Update Session Record" : "Save Attendance Record"}</span></button>}
      </div>
    </div>

    {activeTab === "capture" ? <>
      {cancelled && <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2"><LockKeyhole className="w-4 h-4"/>This scheduled class is Cancelled. Attendance cannot be captured.</div>}
      {isScheduled && !cancelled && <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 shrink-0"/><div><strong>Scheduled session</strong> — timetable details are locked and prefilled. Session ID: {loadedSessionId || "scheduled"}</div><button onClick={() => { setIsScheduled(false); setLocked(false); onClearSessionContext?.(); }} className="ml-auto text-[10px] font-bold underline">Switch to manual</button></div>}
      {existingRecord && <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2"><Info className="w-4 h-4"/>Existing session record loaded for editing. No duplicate will be created.</div>}

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <label className="text-[10px] font-bold text-slate-500">Semester<select disabled={locked} value={selectedSemesterId} onChange={e => switchSemester(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold">{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-500">Division / Target<select disabled={locked} value={selectedDivisionTarget} onChange={e => selectTarget(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold">{targetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-500">Subject<select disabled={locked} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold">{subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-500">Session Type<select disabled={locked} value={sessionType} onChange={e => setSessionType(e.target.value as "lecture" | "lab" | "extra")} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"><option value="lecture">Lecture</option><option value="lab">Lab</option><option value="extra">Extra Session</option></select></label>
        <label className="text-[10px] font-bold text-slate-500">Date<input disabled={locked} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"/></label>
        <label className="text-[10px] font-bold text-slate-500">Period<input disabled={locked} type="number" min="1" value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value) || 1)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"/></label>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between"><div className="relative sm:w-72"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-4 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"/></div><div className="flex items-center gap-3 text-xs font-bold"><span className="text-emerald-600">Present {presentCount}</span><span className="text-rose-600">Absent {absentCount}</span><span className="text-amber-600">Late {lateCount}</span></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold"><tr><th className="p-4">Enrollment No</th><th className="p-4">Student</th><th className="p-4">Division</th><th className="p-4">Attendance %</th><th className="p-4 text-center">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredStudents.map(student => { const status = attendanceMap[student.id] || "present"; return <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"><td className="p-4 font-mono">{student.enrollmentNo}</td><td className="p-4 font-bold">{student.name}</td><td className="p-4">{student.divisionName}</td><td className="p-4">{student.overallAttendance}%</td><td className="p-4"><div className="flex justify-center gap-2"><button disabled={cancelled} onClick={() => setAttendanceMap(m => ({...m,[student.id]:"present"}))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${status === "present" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1"/>Present</button><button disabled={cancelled} onClick={() => setAttendanceMap(m => ({...m,[student.id]:"absent"}))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${status === "absent" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}><XCircle className="w-3.5 h-3.5 inline mr-1"/>Absent</button><button disabled={cancelled} onClick={() => setAttendanceMap(m => ({...m,[student.id]:"late"}))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${status === "late" ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-800"}`}><Clock className="w-3.5 h-3.5 inline mr-1"/>Late</button></div></td></tr>})}{!filteredStudents.length && <tr><td colSpan={5} className="p-10 text-center text-xs text-slate-400">No students available for this semester/target.</td></tr>}</tbody></table></div>
      </div>
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border text-xs"><label className="font-bold text-slate-500">Session Notes<textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="mt-1 w-full rounded-xl border bg-white dark:bg-slate-900 p-3" rows={2} placeholder="Optional notes..."/></label></div>
    </> : <div className="space-y-3"><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-xs text-slate-600 dark:text-slate-300">Past attendance sessions for <strong>{semesters.find(s => s.id === selectedSemesterId)?.name}</strong>.</div>{attendance.map(record => <div key={record.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-black">{record.subjectName}</span><span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">Period {record.period}</span>{record.auditTrail?.length ? <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">Edited ({record.auditTrail.length}x)</span> : null}</div><div className="text-xs text-slate-500 mt-2"><Calendar className="w-3.5 h-3.5 inline mr-1"/>{record.date} · {record.recordedBy} · {record.divisionId}</div></div><button onClick={() => { setActiveTab("capture"); setSelectedSubject(record.subjectId); setSelectedDivisionTarget(record.targetDivisionIds?.join("+") || record.divisionId); setSelectedDate(record.date); setSelectedPeriod(record.period); setSelectedTimeSlot(record.timeSlot || ""); setLocked(false); setIsScheduled(false); }} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"><Edit3 className="w-3.5 h-3.5 inline mr-1"/>Edit</button></div>)}</div>}
  </div>;
};
