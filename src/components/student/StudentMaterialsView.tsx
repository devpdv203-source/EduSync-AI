import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { BookOpen, Download, FileText, Search, Video } from "lucide-react";

export const StudentMaterialsView: React.FC = () => {
  const { studyMaterials, filteredSubjects: subjects } = useApp();

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaterials = studyMaterials.filter(m => {
    const isSubjectMatch = selectedSubject === "all" ? subjects.some(s => s.id === m.subjectId) : m.subjectId === selectedSubject;
    const isSearchMatch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return isSubjectMatch && isSearchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Study Materials & Course Resources
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access lecture notes, unit slides, and reference materials uploaded by your professors.
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes or topics..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSubject("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedSubject === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          All Subjects
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubject === s.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Material Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(mat => (
          <div
            key={mat.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                  {mat.unit}
                </span>
                <span className="text-[10px] text-slate-400">{mat.createdAt}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 line-clamp-2">
                {mat.title}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Subject: <span className="font-semibold">{mat.subjectName}</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{mat.fileSize || "1.5 MB"}</span>
              <a
                href={mat.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
