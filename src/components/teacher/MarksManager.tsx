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
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [midDrafts, setMidDrafts] = useState<Record<string, number>>({});
  const [termDrafts, setTermDrafts] = useState<Record<string, { internal: number; practical: number; termEnd: number }>>({});
  const [savingMarkKey, setSavingMarkKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // Update selected subject when active semester context or subjects list changes
  useEffect(() => {
    if (subjects.length > 0 && (!selectedSubject || !subjects.some(s => s.id === selectedSubject))) {
      setSelectedSubject(subjects[0]?.id || "");
    }
    setMidDrafts({});
    setTermDrafts({});
  }, [selectedSemesterId, subjects]);

  useEffect(() => {
    setMidDrafts({});
    setTermDrafts({});
  }, [selectedSubject]);

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
    const existing = marks.find(m => m.studentId === studentId && m.subjectId === selectedSubject && m.semesterId === selectedSemesterId);
    const current = termDrafts[studentId] || {
      internal: existing?.internal ?? 0,
      practical: existing?.practical ?? 0,
      termEnd: existing?.termEnd ?? 0
    };
    const limits = { internal: 20, practical: 30, termEnd: 50 };
    setTermDrafts(prev => ({
      ...prev,
      [studentId]: { ...current, [field]: Math.min(limits[field], Math.max(0, value)) }
    }));
  };

  const saveTermMarks = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const existing = marks.find(m => (m.studentId === studentId || m.studentId === student?.uid) && m.subjectId === selectedSubject && m.semesterId === selectedSemesterId);
    const draft = termDrafts[studentId] || {
      internal: existing?.internal ?? 0,
      practical: existing?.practical ?? 0,
      termEnd: existing?.termEnd ?? 0
    };
    const total = draft.internal + draft.practical + draft.termEnd;
    setSavingMarkKey(`term:${studentId}`);
    try {
      const result = await updateMarks({
        ...(existing || {}),
        studentId: student.uid || student.id,
        subjectId: selectedSubject,
        subjectName: activeSubject?.name || "Subject",
        semesterId: selectedSemesterId,
        divisionId: student.divisionId,
        internal: draft.internal,
        practical: draft.practical,
        termEnd: draft.termEnd,
        total,
        grade: calculateGrade(total),
        updatedAt: new Date().toISOString()
      });
      if (!result.success) alert(`Could not save ${student.name}: ${result.message}`);
    } finally {
      setSavingMarkKey(null);
    }
  };

  const handleMidExamScoreChange = (studentId: string, scoreValue: number) => {
    const validScore = Math.min(30, Math.max(0, scoreValue));
    setMidDrafts(prev => ({ ...prev, [studentId]: validScore }));
  };

  const saveMidExamMark = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const existing = midExamMarks.find(m => (m.studentId === studentId || m.studentId === student?.uid) && m.subjectId === selectedSubject && m.semesterId === selectedSemesterId);
    const score = midDrafts[studentId] ?? existing?.score ?? 0;
    setSavingMarkKey(`mid:${studentId}`);
    try {
      const result = await updateMidExamMark({
        id: existing?.id || "",
        ...(existing || {}),
        studentId: student.uid || student.id,
        subjectId: selectedSubject,
        subjectName: activeSubject?.name || "Subject",
        score,
        maxScore: 30,
        examDate: existing?.examDate || new Date().toISOString().slice(0, 10),
        academicPeriod: existing?.academicPeriod || "Mid-Exam",
        semesterId: selectedSemesterId,
        divisionId: student.divisionId,
        updatedAt: new Date().toISOString()
      });
      if (!result.success) alert(`Could not save ${student.name}: ${result.message}`);
    } finally {
      setSavingMarkKey(null);
    }
  };

  const saveAllMidExamMarks = async () => {
    if (!selectedSubject || filteredStudents.length === 0) return;
    setSavingAll(true);
    try {
      const results = await Promise.all(
        filteredStudents.map(async (student) => {
          const existing = midExamMarks.find(
            m => (m.studentId === student.id || m.studentId === student.uid) &&
              m.subjectId === selectedSubject &&
              m.semesterId === selectedSemesterId
          );
          const score = midDrafts[student.id] ?? existing?.score ?? 0;
          return updateMidExamMark({
            id: existing?.id || "",
            ...(existing || {}),
            studentId: student.uid || student.id,
            subjectId: selectedSubject,
            subjectName: activeSubject?.name || "Subject",
            score,
            maxScore: 30,
            examDate: existing?.examDate || new Date().toISOString().slice(0, 10),
            academicPeriod: existing?.academicPeriod || "Mid-Exam",
            semesterId: selectedSemesterId,
            divisionId: student.divisionId,
            updatedAt: new Date().toISOString()
          });
        })
      );
      const failed = results.map((result, index) => ({ result, student: filteredStudents[index] })).filter(item => !item.result.success);
      if (failed.length > 0) {
        const detail = failed.map(item => `${item.student.name}: ${item.result.message}`).join("\n");
        throw new Error(`${failed.length} student mark(s) could not be saved.\n\n${detail}`);
      }
      setMidDrafts({});
      alert(`Mid Examination marks saved for ${results.length} student(s).`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save all Mid Examination marks.");
    } finally {
      setSavingAll(false);
    }
  };

  const saveAllTermMarks = async () => {
    if (!selectedSubject || filteredStudents.length === 0) return;
    setSavingAll(true);
    try {
      const results = await Promise.all(
        filteredStudents.map(async (student) => {
          const existing = marks.find(
            m => (m.studentId === student.id || m.studentId === student.uid) &&
              m.subjectId === selectedSubject &&
              m.semesterId === selectedSemesterId
          );
          const draft = termDrafts[student.id] || {
            internal: existing?.internal ?? 0,
            practical: existing?.practical ?? 0,
            termEnd: existing?.termEnd ?? 0
          };
          const total = draft.internal + draft.practical + draft.termEnd;
          return updateMarks({
            ...(existing || {}),
            studentId: student.uid || student.id,
            subjectId: selectedSubject,
            subjectName: activeSubject?.name || "Subject",
            semesterId: selectedSemesterId,
            divisionId: student.divisionId,
            internal: draft.internal,
            practical: draft.practical,
            termEnd: draft.termEnd,
            total,
            grade: calculateGrade(total),
            updatedAt: new Date().toISOString()
          });
        })
      );
      const failed = results.map((result, index) => ({ result, student: filteredStudents[index] })).filter(item => !item.result.success);
      if (failed.length > 0) {
        const detail = failed.map(item => `${item.student.name}: ${item.result.message}`).join("\n");
        throw new Error(`${failed.length} student mark(s) could not be saved.\n\n${detail}`);
      }
      setTermDrafts({});
      alert(`Semester Examination marks saved for ${results.length} student(s).`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save all Semester Examination marks.");
    } finally {
      setSavingAll(false);
    }
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
          <button
            type="button"
            onClick={() => void (activeTab === "mid" ? saveAllMidExamMarks() : saveAllTermMarks())}
            disabled={savingAll || filteredStudents.length === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap shadow-sm"
          >
            {savingAll ? "Saving All..." : activeTab === "mid" ? "Save All Mid Marks" : "Save All Semester Marks"}
          </button>
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
                  <th className="p-4 text-center">Enrollment No.</th>
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
                    m => m.studentId === student.id && m.subjectId === selectedSubject && m.semesterId === selectedSemesterId
                  );
                  const displayedScore = midDrafts[student.id] ?? midMarkObj?.score ?? 0;
                  const pct = Math.round((displayedScore / 30) * 100);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono font-bold tracking-wide">
                          {student.enrollmentNo || "—"}
                        </span>
                      </td>

                      <td className="p-4 text-center font-mono text-slate-500">
                        {midMarkObj?.examDate || "Pending"}
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        30
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={displayedScore}
                          onChange={e => handleMidExamScoreChange(student.id, Number(e.target.value) || 0)}
                          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-extrabold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => void saveMidExamMark(student.id)}
                          disabled={savingMarkKey === `mid:${student.id}`}
                          className="ml-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold"
                        >
                          {savingMarkKey === `mid:${student.id}` ? "Saving..." : "Save"}
                        </button>
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
                  <th className="p-4 text-center">Enrollment No.</th>
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
                    m => m.studentId === student.id && m.subjectId === selectedSubject && m.semesterId === selectedSemesterId
                  );
                  const termDraft = termDrafts[student.id] || {
                    internal: markObj?.internal ?? 0,
                    practical: markObj?.practical ?? 0,
                    termEnd: markObj?.termEnd ?? 0
                  };
                  const termTotal = termDraft.internal + termDraft.practical + termDraft.termEnd;
                  const termGrade = calculateGrade(termTotal);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono font-bold tracking-wide">
                          {student.enrollmentNo || "—"}
                        </span>
                      </td>

                      <td className="p-4">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={termDraft.internal}
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
                          value={termDraft.practical}
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
                          value={termDraft.termEnd}
                          onChange={e =>
                            handleMarkInputChange(student.id, "termEnd", parseInt(e.target.value) || 0)
                          }
                          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => void saveTermMarks(student.id)}
                          disabled={savingMarkKey === `term:${student.id}`}
                          className="ml-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold"
                        >
                          {savingMarkKey === `term:${student.id}` ? "Saving..." : "Save"}
                        </button>
                      </td>

                      <td className="p-4">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {termTotal} / 100
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            termGrade === "A+" || termGrade === "A"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : termGrade === "B" || termGrade === "C"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {termGrade}
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
