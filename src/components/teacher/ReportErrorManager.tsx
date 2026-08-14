import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { ReportIssue, ReportIssueStatus, ReportIssueCategory } from "../../types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck2,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
  Eye,
  BookOpen,
  CalendarCheck,
  Save,
  Send,
  ArrowRight,
  Info,
  Calendar,
  Award,
  Calculator,
  UserCheck
} from "lucide-react";
import { StudentPerformanceReport } from "../shared/StudentPerformanceReport";

export const ReportErrorManager: React.FC = () => {
  const {
    currentUser,
    role,
    students,
    filteredStudents: teacherSemesterStudents,
    selectedSemesterId,
    reportIssues,
    updateReportIssueStatus,
    regenerateStudentReport,
    getStudentReportMetadata,
    midExamMarks,
    updateMidExamMark,
    subjects,
    attendance,
    marks,
    assignments,
    submissions,
    getStudentSubjectAttendance,
    correctStudentAttendanceRecord,
    updateStudentProfileInfo,
    evaluateSubmission
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Response Form state for selected issue
  const [responseText, setResponseText] = useState<string>("");
  const [targetStatus, setTargetStatus] = useState<ReportIssueStatus>("Resolved");
  const [previewReportStudentId, setPreviewReportStudentId] = useState<string | null>(null);
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState<string>("");

  // 1. Marks Correction State
  const [correctSubjectId, setCorrectSubjectId] = useState<string>("");
  const [correctScore, setCorrectScore] = useState<number>(25);
  const [correctMaxScore, setCorrectMaxScore] = useState<number>(30);

  // 2. Attendance Correction State
  const [attSubjectId, setAttSubjectId] = useState<string>("");
  const [selectedAttDate, setSelectedAttDate] = useState<string>("2026-08-07");
  const [selectedAttPeriod, setSelectedAttPeriod] = useState<number>(2);
  const [currentAttStatus, setCurrentAttStatus] = useState<"present" | "absent" | "late">("absent");
  const [newAttStatus, setNewAttStatus] = useState<"present" | "absent" | "late">("present");
  const [attReason, setAttReason] = useState<string>("");
  const [confirmAttModalOpen, setConfirmAttModalOpen] = useState<boolean>(false);

  // 3. Assignment Correction State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [correctAssignmentScore, setCorrectAssignmentScore] = useState<number>(85);

  // 4. Student Info Correction State
  const [editStudentName, setEditStudentName] = useState<string>("");
  const [editEnrollmentNo, setEditEnrollmentNo] = useState<string>("");
  const [editDivisionId, setEditDivisionId] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");

  // Reset selected issue when active semester context changes
  useEffect(() => {
    setSelectedIssueId(null);
    setPreviewReportStudentId(null);
    setCorrectionSuccessMsg("");
  }, [selectedSemesterId]);

  const studentObj = useMemo(() => {
    return students.find(s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email) || null;
  }, [students, currentUser]);

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    return reportIssues.filter(issue => {
      // If student, ONLY show issues submitted by this student!
      if (role === "student") {
        const myStudentId = studentObj?.id || currentUser.uid;
        if (issue.studentId !== myStudentId && issue.studentId !== currentUser.uid && issue.studentId !== studentObj?.uid) {
          return false;
        }
      } else if (role === "teacher") {
        // Filter by active semester students
        const belongsToSemester = teacherSemesterStudents.some(s => s.id === issue.studentId);
        if (!belongsToSemester) return false;
      }
      const matchesStatus = statusFilter === "All" || issue.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        issue.studentName.toLowerCase().includes(q) ||
        issue.studentEnrollmentNo.toLowerCase().includes(q) ||
        issue.reportId.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.category.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [reportIssues, statusFilter, searchQuery, role, studentObj, currentUser, teacherSemesterStudents]);

  // Derive selected issue dynamically from filtered issues list
  const selectedIssue = useMemo(() => {
    if (!selectedIssueId) return null;
    return filteredIssues.find(i => i.id === selectedIssueId) || null;
  }, [filteredIssues, selectedIssueId]);

  // Statistics
  const stats = useMemo(() => {
    const myStudentId = studentObj?.id || currentUser.uid;
    const relevant = role === "student"
      ? reportIssues.filter(i => i.studentId === myStudentId || i.studentId === currentUser.uid || i.studentId === studentObj?.uid)
      : role === "teacher"
      ? reportIssues.filter(i => teacherSemesterStudents.some(s => s.id === i.studentId))
      : reportIssues;

    const total = relevant.length;
    const pending = relevant.filter(i => i.status === "Pending").length;
    const underReview = relevant.filter(i => i.status === "Under Review").length;
    const resolved = relevant.filter(i => i.status === "Resolved").length;
    return { total, pending, underReview, resolved };
  }, [reportIssues, role, studentObj, currentUser, teacherSemesterStudents]);

  // Active student object for selected issue
  const activeStudent = useMemo(() => {
    if (!selectedIssue) return null;
    return students.find(s => s.id === selectedIssue.studentId || s.uid === selectedIssue.studentId) || null;
  }, [selectedIssue, students]);

  // Synchronize and reset all ticket edit and correction state whenever selectedIssue changes
  useEffect(() => {
    if (selectedIssue) {
      setResponseText(selectedIssue.teacherResponse || selectedIssue.adminResponse || "");
      setTargetStatus(selectedIssue.status === "Pending" ? "Under Review" : selectedIssue.status);
      setCorrectionSuccessMsg("");
      setAttReason("");
      setConfirmAttModalOpen(false);

      const targetStudent = students.find(s => s.id === selectedIssue.studentId || s.uid === selectedIssue.studentId);

      // Initialize Marks state
      if (subjects.length > 0 && subjects[0]) {
        setCorrectSubjectId(subjects[0].id);
        setAttSubjectId(subjects[0].id);
        const existingMark = midExamMarks.find(
          m => m.studentId === selectedIssue.studentId && m.subjectId === subjects[0].id
        );
        if (existingMark) {
          setCorrectScore(existingMark.score);
          setCorrectMaxScore(existingMark.maxScore);
        } else {
          setCorrectScore(25);
          setCorrectMaxScore(30);
        }
      }

      // Initialize Student Info state
      if (targetStudent) {
        setEditStudentName(targetStudent.name);
        setEditEnrollmentNo(targetStudent.enrollmentNo);
        setEditDivisionId(targetStudent.divisionId);
        setEditEmail(targetStudent.email || "");
      } else {
        setEditStudentName("");
        setEditEnrollmentNo("");
        setEditDivisionId("");
        setEditEmail("");
      }

      // Initialize Assignment state
      if (assignments.length > 0 && assignments[0]) {
        setSelectedAssignmentId(assignments[0].id);
        const existingSub = submissions.find(
          sub => sub.assignmentId === assignments[0].id && sub.studentId === selectedIssue.studentId
        );
        if (existingSub && existingSub.grade !== undefined) {
          setCorrectAssignmentScore(existingSub.grade);
        } else {
          setCorrectAssignmentScore(85);
        }
      }
    } else {
      setResponseText("");
      setTargetStatus("Resolved");
      setCorrectionSuccessMsg("");
      setAttReason("");
      setConfirmAttModalOpen(false);
      setEditStudentName("");
      setEditEnrollmentNo("");
      setEditDivisionId("");
      setEditEmail("");
    }
  }, [selectedIssue?.id, students, subjects, assignments, midExamMarks, submissions]);

  // Attendance history for active student & selected subject
  const attendanceHistorySummary = useMemo(() => {
    if (!activeStudent || !attSubjectId) return null;
    return getStudentSubjectAttendance(activeStudent.id, attSubjectId);
  }, [activeStudent, attSubjectId, getStudentSubjectAttendance, attendance]);

  // Handle selecting an issue ticket
  const handleSelectIssue = (issue: ReportIssue) => {
    setSelectedIssueId(issue.id);
    setCorrectionSuccessMsg("");
  };

  // Automatically update initial fields when subject changes in attendance panel
  useEffect(() => {
    if (attendanceHistorySummary && attendanceHistorySummary.history && attendanceHistorySummary.history.length > 0) {
      const firstHist = attendanceHistorySummary.history[0];
      if (firstHist) {
        setSelectedAttDate(firstHist.date);
        setSelectedAttPeriod(firstHist.period);
        setCurrentAttStatus(firstHist.status);
        setNewAttStatus(firstHist.status === "absent" ? "present" : "present");
      }
    }
  }, [attSubjectId, attendanceHistorySummary]);

  // Selection from Attendance History Table
  const handleSelectAttendanceRow = (item: { date: string; period: number; status: "present" | "absent" | "late" }) => {
    setSelectedAttDate(item.date);
    setSelectedAttPeriod(item.period);
    setCurrentAttStatus(item.status);
    setNewAttStatus(item.status === "absent" ? "present" : item.status === "present" ? "late" : "present");
  };

  // ----------------------------------------------------
  // CORRECTION ACTIONS
  // ----------------------------------------------------

  // 1. Marks Correction
  const handleApplyMarksCorrection = () => {
    if (!selectedIssue || !activeStudent) return;

    const sub = subjects.find(s => s.id === correctSubjectId);
    updateMidExamMark({
      id: `mid_${activeStudent.id}_${correctSubjectId}`,
      studentId: activeStudent.id,
      subjectId: correctSubjectId,
      subjectName: sub?.name || "Subject",
      score: Number(correctScore),
      maxScore: Number(correctMaxScore),
      examDate: new Date().toISOString().split("T")[0],
      academicPeriod: "Semester V Mid-Exam Correction",
      updatedAt: new Date().toISOString().split("T")[0]
    });

    const newMeta = regenerateStudentReport(activeStudent.id, `Mid Exam score corrected for ${sub?.name || "subject"}`);

    setCorrectionSuccessMsg(
      `Mid Exam score updated & Report regenerated to Version ${newMeta.version}.0!`
    );
    setResponseText(
      `Verified & corrected Mid Exam score for ${sub?.name || "Subject"} to ${correctScore}/${correctMaxScore}. Performance report regenerated to Version ${newMeta.version}.0.`
    );
    setTargetStatus("Resolved");
  };

  // 2. Attendance Correction Confirmation & Trigger
  const handleConfirmAttendanceCorrection = () => {
    if (!selectedIssue || !activeStudent) return;

    const res = correctStudentAttendanceRecord({
      studentId: activeStudent.id,
      subjectId: attSubjectId,
      date: selectedAttDate,
      period: Number(selectedAttPeriod),
      newStatus: newAttStatus,
      reason: attReason || "Report error ticket review",
      modifiedBy: currentUser.name
    });

    if (res.success) {
      const sub = subjects.find(s => s.id === attSubjectId);
      const newMeta = regenerateStudentReport(
        activeStudent.id,
        `Attendance corrected for ${sub?.name || "subject"} on ${selectedAttDate}`
      );

      setCorrectionSuccessMsg(
        `Attendance record updated to '${newAttStatus.toUpperCase()}' on ${selectedAttDate} & Report regenerated to Version ${newMeta.version}.0!`
      );
      setResponseText(
        `Your attendance correction request for ${sub?.name || "Subject"} on ${selectedAttDate} (Period ${selectedAttPeriod}) has been reviewed and updated to '${newAttStatus.toUpperCase()}'. Subject & overall attendance recalculated. Performance report updated to Version ${newMeta.version}.0.`
      );
      setTargetStatus("Resolved");
      setConfirmAttModalOpen(false);
    }
  };

  // 3. Assignment Score Correction
  const handleApplyAssignmentCorrection = () => {
    if (!selectedIssue || !activeStudent) return;

    const asgn = assignments.find(a => a.id === selectedAssignmentId);
    const sub = submissions.find(s => s.assignmentId === selectedAssignmentId && (s.studentId === activeStudent.id || s.studentId === activeStudent.uid));

    if (sub) {
      evaluateSubmission(sub.id, Number(correctAssignmentScore), "Grade updated following error review ticket.");
    }

    const newMeta = regenerateStudentReport(activeStudent.id, `Assignment score updated for ${asgn?.title || "assignment"}`);

    setCorrectionSuccessMsg(
      `Assignment grade updated & Report regenerated to Version ${newMeta.version}.0!`
    );
    setResponseText(
      `Verified and updated assignment evaluation score for '${asgn?.title || "Assignment"}' to ${correctAssignmentScore}/100. Performance report regenerated to Version ${newMeta.version}.0.`
    );
    setTargetStatus("Resolved");
  };

  // 4. Student Profile Info Correction
  const handleApplyStudentInfoCorrection = () => {
    if (!selectedIssue || !activeStudent) return;

    updateStudentProfileInfo(activeStudent.id, {
      name: editStudentName,
      enrollmentNo: editEnrollmentNo,
      divisionId: editDivisionId,
      email: editEmail
    });

    const newMeta = regenerateStudentReport(activeStudent.id, "Student profile directory updated");

    setCorrectionSuccessMsg(
      `Student profile details updated & Report regenerated to Version ${newMeta.version}.0!`
    );
    setResponseText(
      `Student record directory updated (Name: ${editStudentName}, Enrollment: ${editEnrollmentNo}). Official performance transcript regenerated to Version ${newMeta.version}.0.`
    );
    setTargetStatus("Resolved");
  };

  // 5. Calculation / Report Regeneration
  const handleRecalculateAndRegenerate = () => {
    if (!selectedIssue || !activeStudent) return;

    const newMeta = regenerateStudentReport(activeStudent.id, "Full metric recalculation & clean transcript generation");

    setCorrectionSuccessMsg(
      `Performance metrics recalculated & Report regenerated to Version ${newMeta.version}.0!`
    );
    setResponseText(
      `Recalculated overall academic performance metrics dynamically from underlying raw attendance logs and examination records. Clean transcript issued at Version ${newMeta.version}.0.`
    );
    setTargetStatus("Resolved");
  };

  // Final Form Submit: Save Resolution Status & Notify Student
  const handleSaveIssueResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    updateReportIssueStatus(
      selectedIssue.id,
      targetStatus,
      responseText,
      selectedIssue.category.includes("Mid")
        ? "mid_exam"
        : selectedIssue.category.includes("Attendance")
        ? "attendance"
        : selectedIssue.category.includes("Assignment")
        ? "assignment"
        : selectedIssue.category.includes("Information")
        ? "student_info"
        : "other"
    );

    setCorrectionSuccessMsg(`Ticket #${selectedIssue.id.slice(-6)} updated to "${targetStatus}". Student notified.`);
    setTimeout(() => {
      setSelectedIssueId(null);
      setCorrectionSuccessMsg("");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-rose-900/60 px-2.5 py-0.5 rounded-full border border-rose-700/50">
              {role === "student" ? "My Error Tickets" : "Report Correction Dashboard"}
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">
            {role === "student" ? "My Report Error Tickets" : "Student Report Error Notifications & Data Review"}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {role === "student"
              ? "Track the review status and official responses for error tickets submitted on your academic performance report."
              : "Review report error submissions, inspect student academic records, correct underlying source marks or attendance, and trigger report regeneration."}
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
            <span className="block text-slate-400 font-bold text-[10px] uppercase">Pending Tickets</span>
            <span className="text-lg font-black text-rose-400">{stats.pending}</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
            <span className="block text-slate-400 font-bold text-[10px] uppercase">Resolved</span>
            <span className="text-lg font-black text-emerald-400">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
          <div className="flex flex-wrap gap-1">
            {["All", "Pending", "Under Review", "Resolved", "Rejected"].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, enrollment, category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content Layout: Issue Tickets List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List Column */}
        <div className={`${selectedIssue ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Report Error Submissions ({filteredIssues.length})</span>
            <span>Role: {role.toUpperCase()}</span>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Report Error Tickets Found</p>
              <p className="text-xs text-slate-500 mt-1">All student report error inquiries have been reviewed and resolved.</p>
            </div>
          ) : (
            filteredIssues.map(issue => {
              const isSelected = selectedIssue?.id === issue.id;
              return (
                <div
                  key={issue.id}
                  onClick={() => handleSelectIssue(issue)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {issue.studentName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 font-bold">
                          {issue.studentEnrollmentNo}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                        {issue.category}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        issue.status === "Pending"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : issue.status === "Under Review"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          : issue.status === "Resolved"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 italic">
                    "{issue.description}"
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Linked Report: {issue.reportId} (v{issue.reportVersion}.0)</span>
                    <span>Submitted: {issue.submittedAt}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Ticket Review & Source Correction Panel */}
        {selectedIssue && (
          <div key={selectedIssue.id} className="lg:col-span-7 space-y-5">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-5">
              {/* Ticket Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Correction Review Ticket #{selectedIssue.id.slice(-6)}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedIssue.studentName} ({selectedIssue.studentEnrollmentNo})
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewReportStudentId(selectedIssue.studentId)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Student Report</span>
                  </button>
                  <button
                    onClick={() => setSelectedIssueId(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Submitted Issue Details Box */}
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-2 text-xs">
                <div className="flex justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300">
                  <span className="flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Reported Issue: {selectedIssue.category}</span>
                  </span>
                  <span>Report ID: {selectedIssue.reportId} (Version {selectedIssue.reportVersion})</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  "{selectedIssue.description}"
                </p>
                <div className="text-[10px] text-slate-400 text-right">
                  Submitted at {selectedIssue.submittedAt}
                </div>
              </div>              {/* ----------------------------------------------------------------- */}
              {/* STUDENT ROLE: READ-ONLY TICKET STATUS & OFFICIAL FACULTY RESPONSE */}
              {/* ----------------------------------------------------------------- */}
              {role === "student" ? (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span>Notification Status</span>
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                          selectedIssue.status === "Pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : selectedIssue.status === "Under Review"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : selectedIssue.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {selectedIssue.status}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Official Faculty / Administrator Response
                      </span>
                      {selectedIssue.teacherResponse || selectedIssue.adminResponse ? (
                        <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          "{selectedIssue.teacherResponse || selectedIssue.adminResponse}"
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">
                          Your reported issue is currently being reviewed by academic faculty. An official response will be posted here upon verification and report recalculation.
                        </p>
                      )}
                      {selectedIssue.resolvedAt && (
                        <span className="text-[10px] text-emerald-600 font-bold block pt-1">
                          Resolved at: {selectedIssue.resolvedAt}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>Security Notice:</strong> Students are strictly authorized to report or inform errors. Any underlying academic data correction, performance recalculation, and version regeneration must be performed by an authorized Teacher or Administrator.
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewReportStudentId(selectedIssue.studentId)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Updated Performance Report</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ----------------------------------------------------------------- */}
                  {/* DYNAMIC CONDITIONAL CORRECTION INTERFACE BASED ON ERROR CATEGORY */}
                  {/* ----------------------------------------------------------------- */}

                  {/* 1. MARKS / MID EXAMINATION SCORE ERROR */}
                  {(selectedIssue.category === "Incorrect Mid Examination Score" ||
                    selectedIssue.category.includes("Score") ||
                    selectedIssue.category.includes("Exam")) && (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span>Correct Academic Data</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Update the underlying mid exam score directly in the system database. Saving changes will recalculate performance metrics and automatically regenerate the report version.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Target Subject
                          </label>
                          <select
                            value={correctSubjectId}
                            onChange={e => setCorrectSubjectId(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                          >
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Correct Mid Exam Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={correctScore}
                            onChange={e => setCorrectScore(parseInt(e.target.value) || 0)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Max Marks
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="100"
                            value={correctMaxScore}
                            onChange={e => setCorrectMaxScore(parseInt(e.target.value) || 30)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleApplyMarksCorrection}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Apply Correction &amp; Regenerate Report</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. ATTENDANCE ERROR */}
                  {selectedIssue.category === "Incorrect Attendance" && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-900/60 pb-2">
                        <div className="flex items-center space-x-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600" />
                          <span>Attendance Correction</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full text-emerald-800 dark:text-emerald-300">
                          Modifies Daily Attendance Database Log
                        </span>
                      </div>

                      {/* Target Subject Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Target Subject
                        </label>
                        <select
                          value={attSubjectId}
                          onChange={e => setAttSubjectId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                        >
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Attendance History Table for this Student and Selected Subject */}
                      {attendanceHistorySummary && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>Attendance History ({attendanceHistorySummary.subjectCode})</span>
                            <span className="text-[11px] text-emerald-600 font-extrabold">
                              Current Subject Avg: {attendanceHistorySummary.percentage}% ({attendanceHistorySummary.status})
                            </span>
                          </div>

                          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                                <tr>
                                  <th className="p-2">Date</th>
                                  <th className="p-2">Period</th>
                                  <th className="p-2">Current Status</th>
                                  <th className="p-2 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(attendanceHistorySummary.history || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-400 italic text-[11px]">
                                      No specific attendance sessions found for this subject.
                                    </td>
                                  </tr>
                                ) : (
                                  (attendanceHistorySummary.history || []).map(item => {
                                    const isSelected = selectedAttDate === item.date && selectedAttPeriod === item.period;
                                    return (
                                      <tr
                                        key={`${item.date}_${item.period}`}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                          isSelected ? "bg-emerald-50/80 dark:bg-emerald-950/40 font-bold" : ""
                                        }`}
                                      >
                                        <td className="p-2 text-slate-800 dark:text-slate-200 font-mono">
                                          {item.date}
                                        </td>
                                        <td className="p-2 text-slate-600 dark:text-slate-400">
                                          Period {item.period}
                                        </td>
                                        <td className="p-2">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                              item.status === "present"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                : item.status === "late"
                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                            }`}
                                          >
                                            {item.status}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right">
                                          <button
                                            type="button"
                                            onClick={() => handleSelectAttendanceRow(item)}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100"
                                          >
                                            Select
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Date & Period Specific Correction Selection */}
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Correct Session Record</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Student: <strong className="text-slate-700 dark:text-slate-300">{selectedIssue.studentName}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Session Date</label>
                            <input
                              type="date"
                              value={selectedAttDate}
                              onChange={e => setSelectedAttDate(e.target.value)}
                              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Period / Session</label>
                            <select
                              value={selectedAttPeriod}
                              onChange={e => setSelectedAttPeriod(Number(e.target.value))}
                              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
                            >
                              <option value={1}>Period 1 (09:00 AM)</option>
                              <option value={2}>Period 2 (10:15 AM)</option>
                              <option value={3}>Period 3 (11:30 AM)</option>
                              <option value={4}>Period 4 (02:00 PM)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Current Status</label>
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase text-center">
                              {currentAttStatus}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Correct Attendance Status</label>
                          <div className="flex space-x-2">
                            {(["present", "absent", "late"] as const).map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setNewAttStatus(st)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                                  newAttStatus === st
                                    ? st === "present"
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                      : st === "late"
                                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                      : "bg-rose-600 text-white border-rose-600 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Optional Reason / Note</label>
                          <input
                            type="text"
                            placeholder="e.g., Medical leave slip verified / Biometric reader sync delay..."
                            value={attReason}
                            onChange={e => setAttReason(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setConfirmAttModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Correct Attendance &amp; Regenerate Report</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. ASSIGNMENT / ACTIVITY SCORE ERROR */}
                  {selectedIssue.category === "Incorrect Assignment/Activity Score" && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>Assignment &amp; Activity Grade Correction</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Assignment / Activity
                          </label>
                          <select
                            value={selectedAssignmentId}
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                          >
                            {assignments.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.title} ({a.subjectName || "Assignment"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Correct Score (out of 100)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={correctAssignmentScore}
                            onChange={e => setCorrectAssignmentScore(parseInt(e.target.value) || 0)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-amber-600"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleApplyAssignmentCorrection}
                          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-amber-600/20"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Apply Correction &amp; Regenerate Report</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. STUDENT INFORMATION ERROR */}
                  {selectedIssue.category === "Incorrect Student Information" && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Student Profile Directory Correction</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Student Full Name
                          </label>
                          <input
                            type="text"
                            value={editStudentName}
                            onChange={e => setEditStudentName(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Enrollment Number
                          </label>
                          <input
                            type="text"
                            value={editEnrollmentNo}
                            onChange={e => setEditEnrollmentNo(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleApplyStudentInfoCorrection}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Update Profile &amp; Regenerate Report</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. INCORRECT PERFORMANCE CALCULATION */}
                  {selectedIssue.category === "Incorrect Performance Calculation" && (
                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-purple-900 dark:text-purple-200">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <span>Performance Metric Audit &amp; Recalculation</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Overall performance percentage is dynamically derived from underlying attendance logs, mid-term exam marks, and submission grades. Direct typing of arbitrary performance numbers is restricted to preserve academic integrity.
                      </p>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">Calculated Metrics Overview:</p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                          <li>Overall Attendance: <strong>{activeStudent?.overallAttendance || 85}%</strong></li>
                          <li>GPA / Performance Index: <strong>{activeStudent?.gpa || 3.8} / 4.0</strong></li>
                        </ul>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleRecalculateAndRegenerate}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/20"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Recalculate &amp; Regenerate Report</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. REPORT GENERATION ERROR OR OTHER */}
                  {(selectedIssue.category === "Report Generation Error" || selectedIssue.category === "Other") && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <RefreshCw className="w-4 h-4 text-indigo-600" />
                        <span>Report Generation Recovery</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Force fresh compilation and re-issuance of the student performance report transcript.
                      </p>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleRecalculateAndRegenerate}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate Clean Report</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUCCESS BANNER */}
                  {correctionSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fadeIn border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{correctionSuccessMsg}</span>
                    </div>
                  )}

                  {/* Official Reviewer Status Update & Student Response Form */}
                  <form onSubmit={handleSaveIssueResolution} className="space-y-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Update Ticket Status *
                        </label>
                        <select
                          value={targetStatus}
                          onChange={e => setTargetStatus(e.target.value as ReportIssueStatus)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                        >
                          <option value="Under Review">Under Review</option>
                          <option value="Resolved">Resolved (Data Corrected &amp; Report Regenerated)</option>
                          <option value="Rejected">Rejected (Inquiry Invalid)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Authorized Reviewer
                        </label>
                        <input
                          type="text"
                          disabled
                          value={`${currentUser.name} (${role.toUpperCase()})`}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Official Response to Student *
                      </label>
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={e => setResponseText(e.target.value)}
                        placeholder="Provide detailed feedback on how the report issue was investigated and resolved..."
                        className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <Send className="w-4 h-4" />
                        <span>Save Status &amp; Notify Student</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR ATTENDANCE CORRECTION */}
      {confirmAttModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <CalendarCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Confirm Attendance Correction
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please verify the attendance session correction details before updating the database:
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Student:</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedIssue.studentName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Subject:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {subjects.find(s => s.id === attSubjectId)?.name || attSubjectId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Session Date:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedAttDate} (Period {selectedAttPeriod})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-bold">Status Transition:</span>
                <div className="flex items-center space-x-1.5 font-bold">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 uppercase">
                    {currentAttStatus}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                    {newAttStatus}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              This change will modify the daily attendance session log in the database, recalculate subject-wise &amp; overall attendance percentages, recalculate performance metrics, and issue a regenerated performance report.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAttModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAttendanceCorrection}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT PREVIEW MODAL */}
      {previewReportStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Official Performance Report Transcript
              </h3>
              <button
                onClick={() => setPreviewReportStudentId(null)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
              >
                Close Preview
              </button>
            </div>

            <StudentPerformanceReport
              initialStudentId={previewReportStudentId}
              isModal={true}
              onClose={() => setPreviewReportStudentId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
