import React from "react";
import { useApp } from "../../context/AppContext";
import { GraduationCap, Download } from "lucide-react";

export const StudentMarksView: React.FC = () => {
  const {
    currentUser,
    students,
    filteredMarks: marks,
    midExamMarks,
    filteredSubjects: subjects,
    selectedSemester,
    selectedSemesterId,
  } = useApp();

  const myStudent = students.find(
    (student) => student.uid === currentUser.uid || student.id === currentUser.uid
  );
  const trustedOwnStudentIds = new Set(
    [currentUser.uid, myStudent?.id, myStudent?.uid, myStudent?.enrollmentNo].filter(
      (value): value is string => Boolean(value)
    )
  );

  const myMarks = marks.filter(
    (mark) => trustedOwnStudentIds.has(mark.studentId) && mark.semesterId === selectedSemesterId
  );
  const myMidExamMarks = midExamMarks.filter(
    (mark) => trustedOwnStudentIds.has(mark.studentId) && mark.semesterId === selectedSemesterId
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              My Marks &amp; Academic Transcript ({selectedSemester.name})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View your Mid Examination and Semester Examination marks separately for {selectedSemester.name}.
          </p>
          {myStudent?.enrollmentNo && (
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">
              Enrollment No.: <span className="text-indigo-600 dark:text-indigo-400">{myStudent.enrollmentNo}</span>
            </p>
          )}
        </div>

        <button
          onClick={() => alert(`Downloading PDF Grade Transcript for ${selectedSemester.name}...`)}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Transcript (PDF)</span>
        </button>
      </div>

      {/* Mid Examination — separate from the main semester examination. */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">Mid Examination Marks</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Maximum 30 marks. These scores are separate from the Semester Examination.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Subject</th>
                <th className="p-4">Examination Date</th>
                <th className="p-4">Score</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjects.map((subj) => {
                const mid = myMidExamMarks.find((mark) => mark.subjectId === subj.id);
                const score = mid?.score;
                const percentage = typeof score === "number" ? Math.round((score / 30) * 100) : null;
                return (
                  <tr key={subj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{subj.code} - {subj.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{mid?.examDate || "Pending"}</td>
                    <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">{typeof score === "number" ? `${score} / 30` : "Pending"}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{percentage !== null ? `${percentage}%` : "-"}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeof score === "number" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                        {typeof score === "number" ? "Published" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Main Semester Examination — internal and external components are explicitly separated. */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Semester Examination Marks</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Main semester examination components, shown separately as Internal and External.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Subject</th>
                <th className="p-4">Internal Assessment (20)</th>
                <th className="p-4">Practical (30)</th>
                <th className="p-4">Internal Total (50)</th>
                <th className="p-4">External / Term-End (50)</th>
                <th className="p-4">Semester Total (100)</th>
                <th className="p-4">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjects.map((subj) => {
                const mark = myMarks.find((item) => item.subjectId === subj.id);
                const internal = mark?.internal;
                const practical = mark?.practical;
                const external = mark?.termEnd;
                const internalTotal = typeof internal === "number" && typeof practical === "number" ? internal + practical : null;
                return (
                  <tr key={subj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{subj.code} - {subj.name}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{typeof internal === "number" ? `${internal} / 20` : "Pending"}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{typeof practical === "number" ? `${practical} / 30` : "Pending"}</td>
                    <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">{internalTotal !== null ? `${internalTotal} / 50` : "Pending"}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{typeof external === "number" ? `${external} / 50` : "Pending"}</td>
                    <td className="p-4 font-black text-indigo-600 dark:text-indigo-400">{mark ? `${mark.total} / 100` : "Pending"}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        {mark?.grade || "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
