import React from "react";
import { useApp } from "../../context/AppContext";
import { GraduationCap, Award, FileSpreadsheet, Download } from "lucide-react";

export const StudentMarksView: React.FC = () => {
  const { currentUser, students, filteredMarks: marks, filteredSubjects: subjects, selectedSemester } = useApp();

  const myStudentObj = students.find(s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email) || students[0] || {
    id: currentUser.uid || "stu_1",
    name: currentUser.name || "Alex Morgan",
    email: currentUser.email || "alex.morgan@edusync.edu"
  };
  const myMarks = marks.filter(m => m.studentId === (myStudentObj?.id || currentUser.uid));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              My Marks &amp; Academic Transcript ({selectedSemester.name})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official internal assessment, practical viva, and term-end examination scores for {selectedSemester.name}.
          </p>
        </div>

        <button
          onClick={() => alert(`Downloading PDF Grade Transcript for ${selectedSemester.name}...`)}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Transcript (PDF)</span>
        </button>
      </div>

      {/* Marks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {subjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No subjects found for {selectedSemester.name}.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Internal (20)</th>
                  <th className="p-4">Practical (30)</th>
                  <th className="p-4">Term-End (50)</th>
                  <th className="p-4">Total Score (100)</th>
                  <th className="p-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subjects.map(subj => {
                  const markObj = myMarks.find(m => m.subjectId === subj.id);

                  return (
                    <tr key={subj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        {subj.code} - {subj.name}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {markObj ? `${markObj.internal} / 20` : "-"}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {markObj ? `${markObj.practical} / 30` : "-"}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {markObj ? `${markObj.termEnd} / 50` : "-"}
                      </td>
                      <td className="p-4 font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {markObj ? `${markObj.total} / 100` : "-"}
                      </td>
                      <td className="p-4">
                        {markObj ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                            {markObj.grade}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
