import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Users, Plus, Upload, Search, X, GraduationCap, Pencil, UserX } from "lucide-react";
import { StudentRecord } from "../../types";
import { StudentPerformanceReport } from "../shared/StudentPerformanceReport";

export const SemesterStudentManager: React.FC = () => {
  const {
    role,
    filteredStudents: contextFilteredStudents,
    divisions,
    semesters,
    selectedSemesterId,
    switchSemester,
    addStudent,
    bulkImportStudents,
    updateStudentProfileInfo,
  } = useApp();

  const semesterDivisions = useMemo(
    () => divisions.filter(d => d.semesterId === selectedSemesterId),
    [divisions, selectedSemesterId]
  );

  const [divisionFilter, setDivisionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<Omit<StudentRecord, "id"> & { department?: string }>>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [department, setDepartment] = useState("");
  const [divisionId, setDivisionId] = useState("");

  useEffect(() => {
    setDivisionFilter("all");
    setSelectedReportStudentId(null);
    setDivisionId(prev => semesterDivisions.some(d => d.id === prev) ? prev : semesterDivisions[0]?.id || "");
  }, [selectedSemesterId, semesterDivisions]);

  const visibleStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contextFilteredStudents.filter(student => {
      const matchesDivision = divisionFilter === "all" || student.divisionId === divisionFilter;
      const matchesSearch = !query || student.name.toLowerCase().includes(query) || student.enrollmentNo.toLowerCase().includes(query);
      return matchesDivision && matchesSearch;
    });
  }, [contextFilteredStudents, divisionFilter, searchQuery]);

  const resetForm = () => {
    setName(""); setEmail(""); setEnrollmentNo(""); setDepartment("");
    setDivisionId(semesterDivisions[0]?.id || "");
  };

  const openAdd = () => { resetForm(); setAddModalOpen(true); };

  const openEdit = (student: StudentRecord) => {
    setEditStudent(student);
    setName(student.name);
    setEmail(student.email);
    setEnrollmentNo(student.enrollmentNo);
    setDepartment("");
    setDivisionId(student.divisionId);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDivision = semesterDivisions.find(d => d.id === divisionId);
    if (!name.trim() || !email.trim() || !enrollmentNo.trim() || !department.trim() || !selectedSemesterId || !selectedDivision) return;
    addStudent({
      uid: "",
      enrollmentNo: enrollmentNo.trim(),
      name: name.trim(),
      email: email.trim(),
      divisionId: selectedDivision.id,
      divisionName: selectedDivision.name,
      semesterId: selectedSemesterId,
      contact: "",
      overallAttendance: 0,
      gpa: 0,
      riskCategory: "Low",
      status: "Active",
      department: department.trim()
    });
    setAddModalOpen(false);
    resetForm();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent || !name.trim() || !email.trim() || !enrollmentNo.trim()) return;
    const selectedDivision = semesterDivisions.find(d => d.id === divisionId);
    if (!selectedDivision) return;
    await updateStudentProfileInfo(editStudent.id || editStudent.uid, {
      name: name.trim(), email: email.trim(), enrollmentNo: enrollmentNo.trim(),
      divisionId: selectedDivision.id, divisionName: selectedDivision.name,
      semesterId: selectedSemesterId
    });
    setEditStudent(null);
    resetForm();
  };

  const handleDeactivate = async (student: StudentRecord) => {
    if (role !== "admin") return;
    if (!window.confirm(`Deactivate ${student.name}? Their academic history will be retained.`)) return;
    await updateStudentProfileInfo(student.id || student.uid, { status: "Inactive" });
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const get = (cells: string[], ...keys: string[]) => {
      const idx = keys.map(k => headers.indexOf(k)).find(i => i >= 0);
      return idx === undefined ? "" : (cells[idx] || "").trim();
    };
    return lines.slice(1).map(line => {
      const cells = line.split(",").map(v => v.trim());
      const semValue = get(cells, "semesterid", "semester");
      const divValue = get(cells, "divisionid", "division");
      const semester = semesters.find(s => s.id === semValue || s.name.toLowerCase() === semValue.toLowerCase());
      const semesterId = semester?.id || selectedSemesterId;
      const divs = divisions.filter(d => d.semesterId === semesterId);
      const division = divs.find(d => d.id === divValue || d.name.toLowerCase() === divValue.toLowerCase());
      return {
        uid: "", enrollmentNo: get(cells, "enrollmentno", "enrollment", "enrollment number"),
        name: get(cells, "name", "student name"), email: get(cells, "email"),
        divisionId: division?.id || "", divisionName: division?.name || "",
        semesterId, contact: "", overallAttendance: 0, gpa: 0, riskCategory: "Low" as const, status: "Active" as const,
        department: get(cells, "department")
      };
    }).filter(r => r.name && r.email && r.enrollmentNo && r.divisionId && r.semesterId);
  };

  const handleCsvFile = async (file?: File) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    setCsvPreview(rows);
    setCsvModalOpen(true);
  };

  const handleConfirmCsvImport = () => {
    if (!csvPreview.length) return;
    bulkImportStudents(csvPreview);
    setCsvModalOpen(false);
    setCsvPreview([]);
  };

  const formOpen = addModalOpen || !!editStudent;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Semester & Student Roster Management</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage semester rosters and division assignments without mixing academic terms.</p>
        </div>
        <div className="flex items-center space-x-2">
          {role === "admin" && <label className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer">
            <Upload className="w-4 h-4" /><span>Bulk CSV Import</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleCsvFile(e.target.files?.[0])} />
          </label>}
          {role === "admin" && <button onClick={openAdd} className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"><Plus className="w-4 h-4" /><span>Add Student</span></button>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Semester</span>
              <select value={selectedSemesterId} onChange={e => switchSemester(e.target.value)} className="bg-transparent text-xs font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none">
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Division</span>
              <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none">
                <option value="all">All Divisions</option>
                {semesterDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by student or enrollment no..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none" />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Total Students: {visibleStudents.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold"><tr><th className="p-4">Enrollment No</th><th className="p-4">Student Name</th><th className="p-4">Division</th><th className="p-4">Attendance %</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleStudents.map(student => <tr key={student.id || student.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-mono font-medium text-slate-600 dark:text-slate-400">{student.enrollmentNo}</td>
                <td className="p-4"><div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold">{student.name.slice(0,1).toUpperCase()}</div><div><span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span><span className="block text-[10px] text-slate-400">{student.email}</span></div></div></td>
                <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{student.divisionName}</td>
                <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{student.overallAttendance}%</td>
                <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${student.status === "Active" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>{student.status}</span></td>
                <td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedReportStudentId(student.id || student.uid)} className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold inline-flex items-center space-x-1"><GraduationCap className="w-3.5 h-3.5" /><span>Report</span></button>{role === "admin" && <><button onClick={() => openEdit(student)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" title="Edit student"><Pencil className="w-3.5 h-3.5" /></button>{student.status === "Active" && <button onClick={() => handleDeactivate(student)} className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600" title="Deactivate student"><UserX className="w-3.5 h-3.5" /></button>}</>}</div></td>
              </tr>)}
              {visibleStudents.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-xs text-slate-400">No students found for this semester/division.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"><div className="flex justify-between items-center"><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editStudent ? "Edit Student" : "Add New Student"}</h3><button onClick={() => { setAddModalOpen(false); setEditStudent(null); resetForm(); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button></div><form onSubmit={editStudent ? handleEdit : handleAdd} className="space-y-3">
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" />
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" />
        <input required value={enrollmentNo} onChange={e => setEnrollmentNo(e.target.value)} placeholder="Enrollment Number" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono" />
        {!editStudent && <input required value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" />}
        <div className="grid grid-cols-2 gap-2"><div><label className="block text-[10px] font-bold text-slate-500 mb-1">Semester</label><select disabled={!!editStudent} value={selectedSemesterId} onChange={e => switchSemester(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs">{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="block text-[10px] font-bold text-slate-500 mb-1">Division</label><select required value={divisionId} onChange={e => setDivisionId(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"><option value="">Select Division</option>{semesterDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setAddModalOpen(false); setEditStudent(null); resetForm(); }} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">{editStudent ? "Update Student" : "Save Student"}</button></div>
      </form></div></div>}

      {csvModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4"><h3 className="text-lg font-bold">Bulk CSV Roster Import</h3><p className="text-xs text-slate-500">CSV columns: name,email,enrollmentNo,department,semester,division. Invalid/unresolved rows are omitted before submission.</p><div className="max-h-56 overflow-y-auto space-y-2">{csvPreview.map((row, i) => <div key={`${row.email}-${i}`} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between"><span className="font-bold">{row.name}<span className="block text-[10px] text-slate-400">{row.enrollmentNo}</span></span><span className="text-emerald-600 font-bold">Ready</span></div>)}</div><div className="flex justify-end gap-2"><button onClick={() => setCsvModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold">Cancel</button><button disabled={!csvPreview.length} onClick={handleConfirmCsvImport} className="px-5 py-2 rounded-xl bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold">Confirm Import</button></div></div></div>}

      {selectedReportStudentId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 overflow-y-auto"><div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-8"><StudentPerformanceReport initialStudentId={selectedReportStudentId} onClose={() => setSelectedReportStudentId(null)} isModal /></div></div>}
    </div>
  );
};
