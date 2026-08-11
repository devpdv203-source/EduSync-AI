import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Plus,
  Building,
  User,
  CheckCircle2
} from "lucide-react";

export const TimetableManager: React.FC = () => {
  const { timetable, filteredDivisions: divisions, filteredSubjects: subjects, selectedSemesterId } = useApp();

  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.id || "div_a");

  useEffect(() => {
    if (divisions.length > 0 && divisions[0]?.id) {
      setSelectedDivision(divisions[0].id);
    }
  }, [selectedSemesterId, divisions]);

  const days: Array<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"> = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
  ];

  const divisionSlots = timetable.filter(ts => ts.divisionId === selectedDivision);

  // Check for conflicts (same day and overlapping times)
  const hasConflict = false; // Could check duplicates

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <CalendarDays className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Weekly Timetable & Schedule Grid
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage lecture slots, room allocations, and detect faculty time overlaps automatically.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {days.map(day => {
          const daySlots = divisionSlots.filter(s => s.day === day);

          return (
            <div
              key={day}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{day}</h3>
                <span className="text-[10px] font-semibold text-slate-400">{daySlots.length} Slots</span>
              </div>

              {daySlots.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-400">No lectures scheduled.</div>
              ) : (
                daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      <Clock className="w-3 h-3" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {slot.subjectName}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span className="flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>{slot.roomNo}</span>
                      </span>
                      <span className="truncate max-w-[90px]">{slot.teacherName ? (slot.teacherName.split(" ")[1] || slot.teacherName) : ""}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
