import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AttendanceSessionContext, TimetableSlot } from "../../types";
import { CalendarDays, Clock, Building, CheckCircle2, LockKeyhole } from "lucide-react";

interface TimetableManagerProps { onTakeAttendance?: (context: AttendanceSessionContext) => void; }

export const TimetableManager: React.FC<TimetableManagerProps> = ({ onTakeAttendance }) => {
  const { timetable, divisions, filteredSubjects: subjects, selectedSemesterId, currentUser, role } = useApp();
  const semesterDivisions = useMemo(() => divisions.filter(d => d.semesterId === selectedSemesterId), [divisions, selectedSemesterId]);
  const [selectedDivision, setSelectedDivision] = useState("all");
  useEffect(() => { setSelectedDivision("all"); }, [selectedSemesterId]);

  const semesterSlots = useMemo(() => timetable.filter(slot => {
    const subject = subjects.find(s => s.id === slot.subjectId);
    const divisionBelongs = semesterDivisions.some(d => d.id === slot.divisionId);
    return (!slot.semesterId || slot.semesterId === selectedSemesterId) && (divisionBelongs || !slot.divisionId) && !!subject;
  }), [timetable, subjects, semesterDivisions, selectedSemesterId]);

  const days: Array<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"> = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const slotsForView = selectedDivision === "all" ? semesterSlots : semesterSlots.filter(s => s.divisionId === selectedDivision);
  const divisionLabel = (id: string) => semesterDivisions.find(d => d.id === id)?.name || id;

  const buildContext = (slot: TimetableSlot): AttendanceSessionContext => {
    const isLab = slot.sessionType === "lab" || /lab/i.test(slot.subjectName);
    const ids = slot.targetDivisionIds?.length ? slot.targetDivisionIds : (isLab ? [slot.divisionId] : semesterDivisions.map(d => d.id));
    const targetId = ids.length === semesterDivisions.length ? "all" : ids.join("+");
    return {
      sessionId: slot.sessionId || slot.id,
      semesterId: slot.semesterId || selectedSemesterId,
      subjectId: slot.subjectId,
      teacherId: currentUser.uid,
      divisionId: targetId,
      targetDivisionIds: ids,
      date: slot.date || new Date().toISOString().split("T")[0],
      timeSlot: `${slot.startTime} - ${slot.endTime}`,
      period: slot.period || 1,
     
sessionType:
  slot.sessionType?.toLowerCase() === "lab"
    ? "lab"
    : slot.sessionType?.toLowerCase() === "extra"
      ? "extra"
      : "lecture",
status:
  slot.status?.toLowerCase() === "cancelled"
    ? "cancelled"
    : "scheduled"

    };
  };

  return <div className="space-y-6">
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400"><CalendarDays className="w-5 h-5"/><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Weekly Timetable & Schedule Grid</h2></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View scheduled classes and open the existing Attendance Capture for eligible sessions.</p></div><select value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} className="px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-bold"><option value="all">All Divisions</option>{semesterDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{days.map(day => { const daySlots = slotsForView.filter(s => s.day === day); return <div key={day} className="p-4 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm space-y-3"><div className="pb-3 border-b flex items-center justify-between"><h3 className="text-sm font-bold">{day}</h3><span className="text-[10px] font-semibold text-slate-400">{daySlots.length} Slots</span></div>{!daySlots.length ? <div className="py-8 text-center text-[11px] text-slate-400">No lectures scheduled.</div> : daySlots.map(slot => { const context = buildContext(slot); const cancelled = context.status === "cancelled"; return <div key={slot.id} className={`p-3 rounded-2xl border space-y-2 ${cancelled ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200" : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/60"}`}><div className="flex items-center space-x-1 text-[10px] font-bold text-indigo-600"><Clock className="w-3 h-3"/><span>{slot.startTime} - {slot.endTime}</span></div><h4 className="text-xs font-bold line-clamp-2">{slot.subjectName}</h4><div className="text-[10px] text-slate-500">{slot.roomNo} · {divisionLabel(slot.divisionId)}</div>{cancelled ? <div className="pt-2 text-[10px] font-black text-rose-600 flex items-center gap-1"><LockKeyhole className="w-3 h-3"/>Cancelled</div> : role !== "student" ? <button onClick={() => onTakeAttendance?.(context)} className="w-full mt-1 px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Take Attendance</button> : null}</div>; })}</div>; })}</div>
  </div>;
};
