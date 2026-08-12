import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  BrainCircuit,
  AlertTriangle,
  Award,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  Users,
  RefreshCw,
  Send
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export const TeacherAIDashboard: React.FC = () => {
  const {
    filteredStudents: students,
    filteredMarks: marks,
    filteredSubjects: subjects,
    selectedSemesterId,
    aiPredictions,
    generateAIPredictionForStudent
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);

  useEffect(() => {
    if (students.length > 0 && (!selectedStudentId || !students.some(s => s.id === selectedStudentId))) {
      setSelectedStudentId(students[0]?.id || null);
    } else if (students.length === 0) {
      setSelectedStudentId(null);
    }
  }, [selectedSemesterId, students]);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [teacherAiInsights, setTeacherAiInsights] = useState<string[]>([
    "Conduct a dedicated remedial lab session for Machine Learning (CS-504) regression topics.",
    "Issue automated academic warnings to 2 students with attendance below 70%.",
    "Encourage peer tutoring pairs between top rankers (Emma Watson) and struggling students."
  ]);

  const handleRunAiAnalysis = async () => {
    setAnalyzingAi(true);
    try {
      if (selectedStudentId) {
        await generateAIPredictionForStudent(selectedStudentId);
      }
      // Call teacher insights
      const res = await fetch("/api/ai/teacher-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: "Div A - Computer Science",
          totalStudents: students.length,
          atRiskCount: students.filter(s => s.riskCategory === "High").length,
          weakSubjects: ["CS-504 Machine Learning", "CS-502 Database Systems"]
        })
      });
      const data = await res.json();
      if (data.insights && data.insights.length > 0) {
        setTeacherAiInsights(data.insights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Class Subject Performance Averages for BarChart
  const subjectChartData = subjects.map(subj => {
    const subjMarks = marks.filter(m => m.subjectId === subj.id);
    const avg = Math.round(
      subjMarks.reduce((acc, curr) => acc + curr.total, 0) / (subjMarks.length || 1)
    );
    return {
      name: subj.code,
      average: avg || 75
    };
  });

  // Risk Distribution Data for PieChart
  const riskPieData = [
    { name: "Low Risk", value: students.filter(s => s.riskCategory === "Low").length || 4, color: "#10b981" },
    { name: "Medium Risk", value: students.filter(s => s.riskCategory === "Medium").length || 2, color: "#f59e0b" },
    { name: "High Risk", value: students.filter(s => s.riskCategory === "High").length || 2, color: "#ef4444" }
  ];

  // Ranked students by GPA/Total score
  const rankedStudents = [...students].sort((a, b) => b.gpa - a.gpa);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedPrediction = aiPredictions.find(p => p.studentId === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center w-fit space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>FastAPI REST & Gemini AI Analytics Engine</span>
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            Predictive Student Risk & Performance Workspace
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
            Detect at-risk students, analyze weak subject areas, compute composite class rankings, and receive Gemini AI teaching recommendations.
          </p>
        </div>

        <button
          onClick={handleRunAiAnalysis}
          disabled={analyzingAi}
          className="px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/30 flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${analyzingAi ? "animate-spin" : ""}`} />
          <span>{analyzingAi ? "Running AI Models..." : "Re-Calculate AI Predictions"}</span>
        </button>
      </div>

      {/* AI Strategy Recommendations Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="w-5 h-5" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            AI Teaching Strategy Recommendations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teacherAiInsights.map((insight, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Charts & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Average Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            Subject Performance Average (%)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Class average score breakdown per subject
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Bar dataKey="average" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Risk Distribution Pie Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Class Academic Risk Category Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Categorized by attendance, internal marks, and ML predictions
            </p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
            {riskPieData.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Division Student Ranking & Individual AI Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Ranking Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Division Academic Rank Leaderboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by overall GPA & performance composite index
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              Composite Ranking
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Attendance %</th>
                  <th className="p-3">GPA</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Inspect AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rankedStudents.map((stu, index) => (
                  <tr
                    key={stu.id}
                    onClick={() => setSelectedStudentId(stu.id)}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      selectedStudentId === stu.id ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      <span
                        className={`w-6 h-6 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                          index === 0
                            ? "bg-amber-400 text-amber-950"
                            : index === 1
                            ? "bg-slate-300 text-slate-900"
                            : index === 2
                            ? "bg-amber-700 text-amber-100"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <img src={stu.avatarUrl} alt={stu.name} className="w-7 h-7 rounded-lg object-cover" />
                        <span className="font-bold text-slate-900 dark:text-slate-100">{stu.name}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {stu.overallAttendance}%
                    </td>
                    <td className="p-3 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {stu.gpa}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          stu.riskCategory === "High"
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
                            : stu.riskCategory === "Medium"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {stu.riskCategory} Risk
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedStudentId(stu.id);
                          generateAIPredictionForStudent(stu.id);
                        }}
                        className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Student AI Detail Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <img
              src={selectedStudent?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={selectedStudent?.name}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/30"
            />
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedStudent?.name || "Select Student"}
              </h4>
              <p className="text-xs text-slate-500">{selectedStudent?.enrollmentNo}</p>
            </div>
          </div>

          {selectedPrediction ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Predicted Final Marks</span>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedPrediction.predictedMarks}%
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Projected Attendance</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedPrediction.predictedAttendance}%
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Identified Weak Areas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedPrediction.weakTopics || []).map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-semibold text-[10px]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">AI Action Plan:</span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc pl-4">
                  {(selectedPrediction.recommendations || []).map((rec, i) => (
                    <li key={i} className="leading-relaxed">{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Click "Re-Calculate AI Predictions" or tap the sparkle icon next to a student to generate custom predictions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
