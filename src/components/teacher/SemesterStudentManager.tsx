import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Users,
  Plus,
  Upload,
  UserCheck,
  UserX,
  Search,
  FileSpreadsheet,
  Building,
  CheckCircle,
  X,
  FileText,
  GraduationCap
} from "lucide-react";
import { StudentRecord } from "../../types";
import { StudentPerformanceReport } from "../shared/StudentPerformanceReport";

export const SemesterStudentManager: React.FC = () => {
  const {
    filteredStudents: contextFilteredStudents,
    filteredDivisions,
    selectedSemesterId,
    selectedSemester,
    addStudent,
    bulkImportStudents,
    triggerBiometricVerification
  } = useApp();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Clear selected report student whenever active semester changes
  useEffect(() => {
    setSelectedReportStudentId(null);
  }, [selectedSemesterId]);

  // Single Student Form State
  const [name, setName] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [email, setEmail] = useState("");
  const [divisionId, setDivisionId] = useState(filteredDivisions[0]?.id || "div_a");
  const [contact, setContact] = useState("+1 555-000-1122");

  // CSV Bulk Import Simulated Data
  const [csvPreview, setCsvPreview] = useState<Array<Omit<StudentRecord, "id">>>([
    {
      uid: "stu_bulk_1",
      enrollmentNo: "EN2026-CS-088",
      name: "Hannah Abbott",
      email: "hannah.abbott@edusync.edu",
      divisionId: "div_a",
      divisionName: "Div A - CS",
      contact: "+1 555-888-9900",
      overallAttendance: 85,
      gpa: 3.5,
      riskCategory: "Low",
      status: "Active"
    },
    {
      uid: "stu_bulk_2",
      enrollmentNo: "EN2026-CS-089",
      name: "Ian Wright",
      email: "ian.wright@edusync.edu",
      divisionId: "div_a",
      divisionName: "Div A - CS",
      contact: "+1 555-888-9911",
      overallAttendance: 72,
      gpa: 2.7,
      riskCategory: "Medium",
      status: "Active"
    }
  ]);

  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !enrollmentNo.trim()) return;

    const divObj = filteredDivisions.find(d => d.id === divisionId);
    addStudent({
      uid: `stu_${Date.now()}`,
      enrollmentNo,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@edusync.edu`,
      divisionId,
      divisionName: divObj?.name || "Div A",
      contact,
      overallAttendance: 85,
      gpa: 3.2,
      riskCategory: "Low",
      status: "Active",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    });

    setAddModalOpen(false);
    setName("");
    setEnrollmentNo("");
    setEmail("");
    alert("New student registered into division!");
  };

  const handleConfirmCsvImport = () => {
    triggerBiometricVerification("Bulk Import CSV Roster into Firestore", () => {
      bulkImportStudents(csvPreview);
      setCsvModalOpen(false);
      alert(`Bulk imported ${csvPreview.length} students successfully!`);
    });
  };

  const filteredStudents = contextFilteredStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Semester & Student Roster Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage division rosters, add single student records, or perform bulk CSV roster imports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Roster Search & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student or enrollment no..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">Total Students: {filteredStudents.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Enrollment No</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Division</th>
                <th className="p-4">Attendance %</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Academic Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-medium text-slate-600 dark:text-slate-400">
                    {student.enrollmentNo}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img src={student.avatarUrl} alt={student.name} className="w-8 h-8 rounded-xl object-cover" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                        <span className="block text-[10px] text-slate-400">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                    {student.divisionName}
                  </td>
                  <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                    {student.overallAttendance}%
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase">
                      {student.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedReportStudentId(student.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-all inline-flex items-center space-x-1 border border-indigo-200/60 dark:border-indigo-900/50"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Single Student */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Student</h3>
            <form onSubmit={handleAddSingleStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Hannah Abbott"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Enrollment Number</label>
                <input
                  type="text"
                  required
                  value={enrollmentNo}
                  onChange={e => setEnrollmentNo(e.target.value)}
                  placeholder="EN2026-CS-102"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Division</label>
                <select
                  value={divisionId}
                  onChange={e => setDivisionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  {filteredDivisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk CSV Import Preview */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bulk CSV Roster Import</h3>
            <p className="text-xs text-slate-500">Preview extracted student rows from uploaded CSV:</p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {csvPreview.map((row, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{row.enrollmentNo}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">Ready</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Student Performance Report */}
      {selectedReportStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-8">
            <StudentPerformanceReport
              initialStudentId={selectedReportStudentId}
              onClose={() => setSelectedReportStudentId(null)}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
