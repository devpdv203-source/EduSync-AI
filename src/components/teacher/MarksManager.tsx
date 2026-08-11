import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  GraduationCap,
  Save,
  FileSpreadsheet,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Award
} from "lucide-react";
import { SubjectMarks, MidExamMarks } from "../../types";

export const MarksManager: React.FC = () => {
  const {
    filteredStudents: students,
    filteredSubjects: subjects,
    filteredMarks: marks,
    selectedSemesterId,
    updateMarks,
    midExamMarks,
    updateMidExamMark,
    triggerBiometricVerification
  } = useApp();

  const [activeTab, setActiveTab] = useState<"term" | "mid">("mid");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || "subj_1");
  const [searchQuery, setSearchQuery] = useState("");

  // Update selected subject when active semester context or subjects list changes
  useEffect(() => {
    if (subjects.length > 0 && (!selectedSubject || !subjects.some(s => s.id === selectedSubject))) {
      setSelectedSubject(subjects[0]?.id || "subj_1");
    }
  }, [selectedSemesterId, subjects]);

  const activeSubject = subjects.find(s => s.id === selectedSubject);

  const calculateGrade = (total: number) => {
    if (total >= 90) return "A+";
    if (total >= 80) return "A";
    if (total >= 70) return "B";
    if (total >= 60) return "C";
    if (total >= 50) return "D";
    return "F";
  };

  const handleMarkInputChange = (
    studentId: string,
    field: "internal" | "practical" | "termEnd",
    value: number
  ) => {
    const existing = marks.find(m => m.studentId === studentId && m.subjectId === selectedSubject) || {
      studentId,
      subjectId: selectedSubject,
      subjectName: activeSubject?.name || "Subject",
      internal: 0,
      practical: 0,
      termEnd: 0,
      total: 0,
      grade: "F",
      updatedAt: new Date().toISOString().split("T")[0]
    };

    let updatedInternal = field === "internal" ? Math.min(20, Math.max(0, value)) : existing.internal;
    let updatedPractical = field === "practical" ? Math.min(30, Math.max(0, value)) : existing.practical;
    let updatedTermEnd = field === "termEnd" ? Math.min(50, Math.max(0, value)) : existing.termEnd;

    const total = updatedInternal + updatedPractical + updatedTermEnd;
    const grade = calculateGrade(total);

    const updatedMark: SubjectMarks = {
      ...existing,
      internal: updatedInternal,
      practical: updatedPractical,
      termEnd: updatedTermEnd,
      total,
      grade,
      updatedAt: new Date().toISOString().split("T")[0]
    };

    updateMarks(updatedMark);
  };

  const handleMidExamScoreChange = (studentId: string, score: number) => {
    const existing = midExamMarks.find(m => m.studentId === studentId && m.subjectId === selectedSubject) || {
      id: `mid_${studentId}_${selectedSubject}`,
      studentId,
      subjectId: selectedSubject,
      subjectName: activeSubject?.name || "Subject",
      score: 0,
      maxScore: 30,
      examDate: "2026-07-15",
      academicPeriod: "Semester V Mid-Exam",
      updatedAt: new Date().toISOString().split("T")[0]
    };

    const validScore = Math.min(30, Math.max(0, score));

    const updatedMidMark: MidExamMarks = {
      ...existing,
      score: validScore,
      updatedAt: new Date().toISOString().split("T")[0]
    };

    updateMidExamMark(updatedMidMark);
  };

  const handlePublishMarkSheet = () => {
    triggerBiometricVerification(`Publish ${activeTab === "mid" ? "Mid Examination" : "Term-End"} Mark Sheet for ${activeSubject?.name}`, () => {
      alert(`${activeTab === "mid" ? "Mid Examination" : "Term-End"} mark sheet for ${activeSubject?.name} finalized and published to student performance reports!`);
    });
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Academic Marks &amp; Examination Evaluation
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage Mid Examination scores (Max 30) and Term-End/Internal assessment scores across subjects.
          </p>
        </div>

        <button
          onClick={handlePublishMarkSheet}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Publish Official Mark Sheet</span>
        </button>
      </div>

      {/* Tabs & Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 self-start">
          <button
            onClick={() => setActiveTab("mid")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "mid"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Mid Examination Marks (Max 30)</span>
          </button>
          <button
            onClick={() => setActiveTab("term")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "term"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Term End / Internal Assessment (Max 100)</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>

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
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === "mid" ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4 text-center">Examination Date</th>
                  <th className="p-4 text-center">Maximum Marks</th>
                  <th className="p-4 text-center">Score Obtained (0 - 30)</th>
                  <th className="p-4 text-center">Percentage</th>
                  <th className="p-4 text-center">Performance Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(student => {
                  const midMarkObj = midExamMarks.find(
                    m => m.studentId === student.id && m.subjectId === selectedSubject
                  ) || {
                    score: Math.min(30, Math.max(12, Math.round(student.gpa * 6.8))),
                    maxScore: 30,
                    examDate: "2026-07-15"
                  };

                  const pct = Math.round((midMarkObj.score / (midMarkObj.maxScore || 30)) * 100);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{student.enrollmentNo}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono text-slate-500">
                        {midMarkObj.examDate || "2026-07-15"}
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        30
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={midMarkObj.score}
                          onChange={e =>
                            handleMidExamScoreChange(student.id, parseInt(e.target.value) || 0)
                          }
                          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-extrabold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4 text-center font-mono font-extrabold text-slate-800 dark:text-slate-200">
                        {pct}%
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            pct >= 80
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : pct >= 60
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {pct >= 80 ? "Outstanding" : pct >= 60 ? "Satisfactory" : "Needs Review"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Internal (Max 20)</th>
                  <th className="p-4">Practical (Max 30)</th>
                  <th className="p-4">Term-End (Max 50)</th>
                  <th className="p-4">Total Score (100)</th>
                  <th className="p-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(student => {
                  const markObj = marks.find(
                    m => m.studentId === student.id && m.subjectId === selectedSubject
                  ) || {
                    internal: 0,
                    practical: 0,
                    termEnd: 0,
                    total: 0,
                    grade: "F"
                  };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{student.enrollmentNo}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={markObj.internal}
                          onChange={e =>
                            handleMarkInputChange(student.id, "internal", parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={markObj.practical}
                          onChange={e =>
                            handleMarkInputChange(student.id, "practical", parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={markObj.termEnd}
                          onChange={e =>
                            handleMarkInputChange(student.id, "termEnd", parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="p-4">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {markObj.total} / 100
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            markObj.grade === "A+" || markObj.grade === "A"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : markObj.grade === "B" || markObj.grade === "C"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {markObj.grade}
                        </span>
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
