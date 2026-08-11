import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { FileSpreadsheet, Download, FileText, Printer, GraduationCap, Layers } from "lucide-react";
import { StudentPerformanceReport } from "./StudentPerformanceReport";

export const ReportsExporter: React.FC = () => {
  const { role, triggerBiometricVerification } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<"performance_report" | "export_files">("performance_report");

  // Students are strictly restricted to viewing ONLY their own Student Performance Report.
  // Batch Data Ledger Exports, Division Attendance Reports, Official Mark Sheets, and Batch AI Risk Analysis are hidden/blocked for Students.
  if (role === "student") {
    return <StudentPerformanceReport />;
  }

  const handleExportPdf = (reportType: string) => {
    triggerBiometricVerification(`Export ${reportType} Report (PDF)`, () => {
      alert(`Generating printable PDF for ${reportType}... Download started!`);
    });
  };

  const handleExportExcel = (reportType: string) => {
    triggerBiometricVerification(`Export ${reportType} Spreadsheet (XLSX)`, () => {
      alert(`Exported ${reportType} data to Excel spreadsheet file!`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("performance_report")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === "performance_report"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Performance Report</span>
        </button>

        <button
          onClick={() => setActiveSubTab("export_files")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === "export_files"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Batch Data Ledger Exports</span>
        </button>
      </div>

      {activeSubTab === "performance_report" ? (
        <StudentPerformanceReport />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Academic Reports & Data Exporter
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generate official PDF grade transcripts, class attendance ledgers, and AI performance analytics reports.
              </p>
            </div>
          </div>

          {/* Reports Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Report 1: Attendance Report */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 w-fit">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3">
                  Division Attendance Report
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lecture-wise student attendance logs, present/absent counts, and 75% cutoff warnings.
                </p>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleExportPdf("Attendance")}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>
                <button
                  onClick={() => handleExportExcel("Attendance")}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (XLSX)</span>
                </button>
              </div>
            </div>

            {/* Report 2: Marks Sheet */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-fit">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3">
                  Official Mark Sheets & Grades
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Internal, practical, and term-end examination scores formatted for academic archives.
                </p>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleExportPdf("Marks Sheet")}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>
                <button
                  onClick={() => handleExportExcel("Marks Sheet")}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (XLSX)</span>
                </button>
              </div>
            </div>

            {/* Report 3: AI Risk Analysis */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 w-fit">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3">
                  AI Academic Risk & Prediction Analysis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  FastAPI ML predicted final outcomes, weak subjects, and faculty intervention logs.
                </p>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleExportPdf("AI Risk Analysis")}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>
                <button
                  onClick={() => handleExportExcel("AI Risk Analysis")}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center space-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (XLSX)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

