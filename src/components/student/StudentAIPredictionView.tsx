import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { BrainCircuit, Sparkles, TrendingUp, AlertTriangle, BookOpen, RefreshCw } from "lucide-react";

export const StudentAIPredictionView: React.FC = () => {
  const { currentUser, students, aiPredictions, generateAIPredictionForStudent } = useApp();

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
      gpa: 3.5,
      status: "Active" as const
    };
  }, [students, currentUser]);

  const myPrediction = aiPredictions.find(p => p.studentId === myStudentObj.id) || null;

  const [loading, setLoading] = useState(false);

  const handleRefreshPrediction = async () => {
    setLoading(true);
    await generateAIPredictionForStudent(myStudentObj.id);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center w-fit space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>FastAPI Scikit-Learn Regression & Gemini AI</span>
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            Personal Academic AI Prediction Report
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
            AI-driven end-of-semester projected marks, attendance outcomes, weak subject analysis, and tailored study recommendations.
          </p>
        </div>

        <button
          onClick={handleRefreshPrediction}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Calculating..." : "Re-Run Prediction"}</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Predicted Final Score %
          </span>
          <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {myPrediction?.predictedMarks || 92}%
          </div>
          <span className="text-xs text-slate-500 mt-2 block font-medium">
            Based on current internal test scores & assignment grades
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Projected End-of-Sem Attendance
          </span>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {myPrediction?.predictedAttendance || 94}%
          </div>
          <span className="text-xs text-slate-500 mt-2 block font-medium">
            Projected from historical attendance consistency
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Academic Risk Status
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-3 uppercase tracking-wider">
            {myPrediction?.riskCategory || "Low"} Risk
          </div>
          <span className="text-xs text-slate-500 mt-2 block font-medium">
            Eligible for all term-end examinations
          </span>
        </div>
      </div>

      {/* Detailed Recommendations & Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identified Weak Topics */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Identified Weak Topics to Focus On</span>
          </h3>

          <div className="space-y-2">
            {(myPrediction?.weakTopics || [
              "Advanced Graph Optimization Algorithms",
              "Normal Forms & BCNF Decomposition"
            ]).map((topic, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between"
              >
                <span>{topic}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                  Priority
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Study Action Plan */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Tailored AI Study Recommendations</span>
          </h3>

          <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            {(myPrediction?.recommendations || [
              "Complete additional practice sets for Graph Algorithms before Mid-Terms.",
              "Revise Database Normalization slides and consult course instructor."
            ]).map((rec, idx) => (
              <li
                key={idx}
                className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start space-x-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
