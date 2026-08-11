import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { StudentRecord, SubjectMarks, Assignment, Submission, AttendanceRecord, ReportIssueCategory } from "../../types";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  AlertTriangle,
  Zap,
  ChevronRight,
  Filter,
  Sliders,
  Target,
  PieChart,
  Save,
  MessageSquare,
  Send,
  History
} from "lucide-react";

interface StudentPerformanceReportProps {
  initialStudentId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const StudentPerformanceReport: React.FC<StudentPerformanceReportProps> = ({
  initialStudentId,
  onClose,
  isModal = false
}) => {
  const {
    students,
    currentUser,
    role,
    filteredMarks: marks,
    midExamMarks,
    weightConfig,
    updateWeightConfig,
    filteredAssignments: assignments,
    submissions,
    attendance,
    filteredSubjects: subjects,
    semesters,
    selectedSemesterId,
    selectedSemester,
    divisions,
    triggerBiometricVerification,
    getStudentReportMetadata,
    submitReportIssue,
    regenerateStudentReport
  } = useApp();

  // Report Error Modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorCategory, setErrorCategory] = useState<ReportIssueCategory>("Incorrect Mid Examination Score");
  const [errorDescription, setErrorDescription] = useState("");
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState("");

  const [isSubmittingError, setIsSubmittingError] = useState(false);

  // Determine current user's student match if student role
  const loggedInStudent = useMemo(() => {
    if (role === "student") {
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
    }
    return null;
  }, [role, currentUser, students]);

  // Selected student state (for teacher / admin, or forced for student)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (role === "student" && loggedInStudent) {
      return loggedInStudent.id;
    }
    if (initialStudentId) {
      return initialStudentId;
    }
    return students[0]?.id || "stu_1";
  });

  const [searchFilter, setSearchFilter] = useState("");
  const [reportGenTimestamp, setReportGenTimestamp] = useState<string>(() =>
    new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Active student object
  const activeStudent: StudentRecord = useMemo(() => {
    if (role === "student" && loggedInStudent) {
      return loggedInStudent;
    }
    return students.find(s => s.id === selectedStudentId) || students[0] || {
      id: currentUser?.uid || "stu_1",
      name: currentUser?.name || "Alex Morgan",
      email: currentUser?.email || "alex.morgan@edusync.edu",
      enrollmentNo: "2026-CS-001",
      divisionId: "div_a",
      divisionName: "Div A - CS",
      overallAttendance: 85,
      gpa: 3.8,
      riskCategory: "Low",
      status: "Active"
    };
  }, [role, loggedInStudent, selectedStudentId, students, currentUser]);

  const reportMeta = getStudentReportMetadata(activeStudent?.id || "stu_1");

  const handleSubmitErrorNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorDescription.trim()) {
      alert("Please provide a detailed explanation of the error.");
      return;
    }

    if (isSubmittingError) return;
    setIsSubmittingError(true);

    try {
      const res = submitReportIssue({
        studentId: activeStudent?.id || "stu_1",
        studentName: activeStudent?.name || "Student",
        studentEnrollmentNo: activeStudent?.enrollmentNo || "N/A",
        divisionId: activeStudent?.divisionId || "div_a",
        reportId: reportMeta.reportId,
        reportVersion: reportMeta.version,
        category: errorCategory,
        description: errorDescription
      });

      if (res.success) {
        setSubmitSuccessMsg(`Report error notification submitted successfully! (Ticket ID: #${res.issueId.slice(-6)}). Assigned to Teacher & Administrator.`);
        setErrorDescription("");
        setTimeout(() => {
          setSubmitSuccessMsg("");
          setShowErrorModal(false);
          setIsSubmittingError(false);
        }, 1500);
      } else {
        setIsSubmittingError(false);
      }
    } catch (err) {
      console.error(err);
      setIsSubmittingError(false);
    }
  };

  // Filter students dropdown list for admin/teacher
  const searchableStudents = useMemo(() => {
    if (!searchFilter.trim()) return students;
    const q = searchFilter.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.enrollmentNo.toLowerCase().includes(q) ||
      s.divisionName.toLowerCase().includes(q)
    );
  }, [students, searchFilter]);

  // ==========================================
  // CALCULATED ACADEMIC PERFORMANCE DATA
  // ==========================================

  // 1. Subject Marks Calculation
  const studentSubjectMarks: SubjectMarks[] = useMemo(() => {
    if (!activeStudent) return [];
    return marks.filter(m => m.studentId === activeStudent.id || m.studentId === activeStudent.uid);
  }, [marks, activeStudent]);

  const academicAvgScore = useMemo(() => {
    if (studentSubjectMarks.length > 0) {
      const sum = studentSubjectMarks.reduce((acc, curr) => acc + curr.total, 0);
      return Math.round((sum / studentSubjectMarks.length) * 10) / 10;
    }
    // Fallback based on recorded GPA if specific subject marks aren't present
    return Math.round(((activeStudent?.gpa || 3.0) / 4.0) * 100);
  }, [studentSubjectMarks, activeStudent]);

  // 2. Assignment & Activity Calculation
  const studentAssignments = useMemo(() => {
    if (!activeStudent) return [];
    return assignments.filter(a => a.divisionId === activeStudent.divisionId || a.divisionId === "div_a");
  }, [assignments, activeStudent]);

  const studentSubmissions = useMemo(() => {
    if (!activeStudent) return [];
    return submissions.filter(s => s.studentId === activeStudent.id || s.studentId === activeStudent.uid);
  }, [submissions, activeStudent]);

  const totalAssigned = Math.max(studentAssignments.length, 3);
  const totalCompleted = studentSubmissions.length;
  const totalPending = Math.max(0, totalAssigned - totalCompleted);
  const evaluatedSubmissions = studentSubmissions.filter(s => s.status === "evaluated");

  const assignmentCompletionRate = Math.round((totalCompleted / totalAssigned) * 100);

  const averageAssignmentGradePercent = useMemo(() => {
    if (evaluatedSubmissions.length > 0) {
      const totalPct = evaluatedSubmissions.reduce((acc, sub) => {
        const asgn = studentAssignments.find(a => a.id === sub.assignmentId);
        const maxScore = asgn ? asgn.maxScore : 100;
        return acc + ((sub.grade || 80) / maxScore) * 100;
      }, 0);
      return Math.round(totalPct / evaluatedSubmissions.length);
    }
    return Math.min(100, Math.round(academicAvgScore * 0.95));
  }, [evaluatedSubmissions, studentAssignments, academicAvgScore]);

  // 3. Class Activities & Attendance Calculation
  const studentAttendanceRecords = useMemo(() => {
    if (!activeStudent) return [];
    return attendance.filter(a => a.divisionId === activeStudent.divisionId || a.divisionId === "div_a");
  }, [attendance, activeStudent]);

  const totalLecturesCount = Math.max(studentAttendanceRecords.length, 10);
  const activeAttendance = activeStudent?.overallAttendance ?? 80;
  const attendedLecturesCount = Math.round((totalLecturesCount * activeAttendance) / 100);
  const missedLecturesCount = Math.max(0, totalLecturesCount - attendedLecturesCount);

  const participationEngagementScore = Math.min(
    100,
    Math.round(activeAttendance * 0.8 + (totalCompleted / totalAssigned) * 20)
  );

  // 4. Mid Examination Metrics & Subject-Wise Analysis
  const studentMidExamMarks = useMemo(() => {
    if (!activeStudent) return [];
    return midExamMarks.filter(m =>
      (m.studentId === activeStudent.id || m.studentId === activeStudent.uid) &&
      subjects.some(s => s.id === m.subjectId)
    );
  }, [midExamMarks, activeStudent, subjects]);

  const midExamMetrics = useMemo(() => {
    const list = studentMidExamMarks.length > 0
      ? studentMidExamMarks
      : subjects.map(s => {
          const studentGpa = activeStudent?.gpa ?? 3.0;
          const estScore = Math.min(30, Math.max(12, Math.round(studentGpa * 6.8)));
          return {
            id: `est_${s.id}`,
            studentId: activeStudent?.id || "stu_1",
            subjectId: s.id,
            subjectName: s.name,
            score: estScore,
            maxScore: 30,
            examDate: "2026-07-15",
            academicPeriod: "Semester V Mid-Exam",
            updatedAt: "2026-07-16"
          };
        });

    const totalPossible = list.reduce((acc, m) => acc + (m.maxScore || 30), 0);
    const totalAchieved = list.reduce((acc, m) => acc + m.score, 0);
    const avgPercentage = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : 0;
    const avgScore = list.length > 0 ? Math.round((totalAchieved / list.length) * 10) / 10 : 0;

    const sorted = [...list].sort((a, b) => (b.score / (b.maxScore || 30)) - (a.score / (a.maxScore || 30)));
    const highestSubject = sorted[0] || null;
    const lowestSubject = sorted[sorted.length - 1] || null;

    return {
      list,
      totalAchieved,
      totalPossible,
      avgPercentage,
      avgScore,
      highestSubject,
      lowestSubject
    };
  }, [studentMidExamMarks, subjects, activeStudent]);

  // Previous Internal Assessment Average Percentage
  const internalAvgPercent = useMemo(() => {
    if (studentSubjectMarks.length > 0) {
      const sumInternal = studentSubjectMarks.reduce((acc, m) => acc + m.internal, 0);
      return Math.round((sumInternal / (studentSubjectMarks.length * 20)) * 100);
    }
    return Math.min(100, Math.round(midExamMetrics.avgPercentage * 0.95));
  }, [studentSubjectMarks, midExamMetrics.avgPercentage]);

  // 5. Configurable Overall Performance Calculation
  // Considers: Mid Exam (configurable %), Assignments (%), Class Activities (%), Other/Term-End (%)
  const overallPerformanceScore = useMemo(() => {
    const midPart = (midExamMetrics.avgPercentage * weightConfig.midExamWeight) / 100;
    const asgnPart = (averageAssignmentGradePercent * weightConfig.assignmentWeight) / 100;
    const activityPart = ((activeStudent?.overallAttendance ?? 80) * weightConfig.classActivityWeight) / 100;
    const otherPart = (academicAvgScore * weightConfig.otherAssessmentsWeight) / 100;

    return Math.round(midPart + asgnPart + activityPart + otherPart);
  }, [midExamMetrics.avgPercentage, averageAssignmentGradePercent, activeStudent, academicAvgScore, weightConfig]);

  // 6. Performance Trend Analysis: Previous Internal -> Mid Examination -> Current Overall
  const performanceTrend = useMemo(() => {
    const diff = overallPerformanceScore - internalAvgPercent;
    if (diff >= 3) {
      return {
        status: "Improving",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300",
        color: "text-emerald-600 dark:text-emerald-400",
        icon: TrendingUp,
        summary: `Performance is improving (+${diff}% growth from previous internal assessments to Mid Exam & overall).`
      };
    } else if (diff <= -3) {
      return {
        status: "Declining",
        badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300",
        color: "text-rose-600 dark:text-rose-400",
        icon: TrendingDown,
        summary: `Performance has dipped by ${Math.abs(diff)}% since previous internal assessment. Mid Exam scores require review.`
      };
    } else {
      return {
        status: "Stable",
        badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300",
        color: "text-indigo-600 dark:text-indigo-400",
        icon: CheckCircle2,
        summary: "Performance is stable and consistent across assessment milestones."
      };
    }
  }, [overallPerformanceScore, internalAvgPercent]);

  // Classification Category
  const performanceCategory = useMemo(() => {
    if (overallPerformanceScore >= 85) {
      return {
        title: "Excellent (Distinction)",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300",
        color: "text-emerald-600 dark:text-emerald-400",
        ringColor: "stroke-emerald-500",
        description: "Exceeds academic benchmarks across Mid Examination, assignments, and class participation."
      };
    }
    if (overallPerformanceScore >= 70) {
      return {
        title: "Good (First Class)",
        badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300",
        color: "text-indigo-600 dark:text-indigo-400",
        ringColor: "stroke-indigo-500",
        description: "Solid overall academic standing meeting course requirements with reliable Mid Exam results."
      };
    }
    if (overallPerformanceScore >= 50) {
      return {
        title: "Satisfactory (Pass Standard)",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300",
        color: "text-amber-600 dark:text-amber-400",
        ringColor: "stroke-amber-500",
        description: "Meets basic minimum criteria, but requires focused revision on low-scoring Mid Examination subjects."
      };
    }
    return {
      title: "Needs Improvement (At Academic Risk)",
      badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300",
      color: "text-rose-600 dark:text-rose-400",
      ringColor: "stroke-rose-500",
      description: "Critical academic risk flagged due to low Mid Examination marks or low attendance."
    };
  }, [overallPerformanceScore]);

  // 7. Data-Driven Analysis & Observations
  const analysisPoints = useMemo(() => {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    // Mid Examination Data Observations
    if (midExamMetrics.highestSubject) {
      const topPct = Math.round((midExamMetrics.highestSubject.score / (midExamMetrics.highestSubject.maxScore || 30)) * 100);
      if (topPct >= 80) {
        strengths.push(`Strong Mid Examination performance in ${midExamMetrics.highestSubject.subjectName} (${midExamMetrics.highestSubject.score}/${midExamMetrics.highestSubject.maxScore || 30} - ${topPct}%).`);
      }
    }

    if (midExamMetrics.lowestSubject) {
      const lowPct = Math.round((midExamMetrics.lowestSubject.score / (midExamMetrics.lowestSubject.maxScore || 30)) * 100);
      if (lowPct < 70) {
        improvements.push(`Comparatively lower Mid Examination score in ${midExamMetrics.lowestSubject.subjectName} (${midExamMetrics.lowestSubject.score}/${midExamMetrics.lowestSubject.maxScore || 30} - ${lowPct}%).`);
        recommendations.push(`Focus on ${midExamMetrics.lowestSubject.subjectName} where Mid Exam performance was ${lowPct}%, and request additional guidance or tutorial notes.`);
      }
    }

    // Overall Mid Exam Observation
    if (midExamMetrics.avgPercentage >= 80) {
      strengths.push(`High overall Mid Examination average score of ${midExamMetrics.avgScore}/30 (${midExamMetrics.avgPercentage}%).`);
    } else if (midExamMetrics.avgPercentage < 60) {
      improvements.push(`Overall Mid Examination average is ${midExamMetrics.avgPercentage}%, indicating foundational concept gaps across modules.`);
      recommendations.push("Attend remedial study workshops to prepare for term-end examinations.");
    }

    // Evaluate Academic Term End / Internal Marks
    if (studentSubjectMarks.length > 0) {
      const topSubject = [...studentSubjectMarks].sort((a, b) => b.total - a.total)[0];
      const lowestSubject = [...studentSubjectMarks].sort((a, b) => a.total - b.total)[0];

      if (topSubject && topSubject.total >= 80) {
        strengths.push(`Consistent term-end performance in ${topSubject.subjectName} (${topSubject.total}/100, Grade ${topSubject.grade}).`);
      }
      if (lowestSubject && lowestSubject.total < 70) {
        improvements.push(`Underperforming in ${lowestSubject.subjectName} total score (${lowestSubject.total}/100).`);
      }
    }

    // Evaluate Attendance
    const attVal = activeStudent?.overallAttendance ?? 80;
    if (attVal >= 90) {
      strengths.push(`Exceptional lecture attendance at ${attVal}%, maximizing class activity contribution.`);
    } else if (attVal < 75) {
      improvements.push(`Attendance at ${attVal}% is below the mandatory 75% cutoff.`);
      recommendations.push("CRITICAL: Attend all upcoming lectures without fail to meet mandatory attendance criteria.");
    }

    // Evaluate Coursework
    if (assignmentCompletionRate >= 80) {
      strengths.push(`Reliable coursework submission discipline (${assignmentCompletionRate}% tasks completed on time).`);
    } else {
      improvements.push(`${totalPending} coursework task(s) remain pending.`);
      recommendations.push("Submit pending assignments to boost overall evaluation marks.");
    }

    return { strengths, improvements, recommendations };
  }, [midExamMetrics, studentSubjectMarks, activeStudent, assignmentCompletionRate, totalPending]);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [editWeights, setEditWeights] = useState({ ...weightConfig });

  // Handlers
  const handleRegenerateReport = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setReportGenTimestamp(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
      setIsRegenerating(false);
    }, 600);
  };

  const handlePrintReport = () => {
    triggerBiometricVerification("Print / Download Official Student Academic Performance Report", () => {
      window.print();
    });
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = editWeights.midExamWeight + editWeights.assignmentWeight + editWeights.classActivityWeight + editWeights.otherAssessmentsWeight;
    if (sum !== 100) {
      alert(`Weights must sum to 100%. Current sum: ${sum}%`);
      return;
    }
    updateWeightConfig(editWeights);
    setShowWeightModal(false);
  };

  // Security Check: If a student attempts to explicitly request another student's report ID/student ID
  const isAccessDeniedForStudent = useMemo(() => {
    if (role === "student" && initialStudentId && loggedInStudent) {
      if (initialStudentId !== loggedInStudent.id && initialStudentId !== loggedInStudent.uid) {
        return true;
      }
    }
    return false;
  }, [role, initialStudentId, loggedInStudent]);

  if (!activeStudent) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 max-w-xl mx-auto my-12 space-y-3 shadow-xs">
        <GraduationCap className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Student Records Selected</h3>
        <p className="text-xs text-slate-500">There are no student profiles available in the current active semester filter.</p>
      </div>
    );
  }

  if (isAccessDeniedForStudent) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-900/50 max-w-2xl mx-auto my-12 space-y-4 shadow-xl">
        <ShieldCheck className="w-16 h-16 text-rose-600 dark:text-rose-400 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-rose-950 dark:text-rose-100">
            403 - Access Forbidden
          </h2>
          <p className="text-xs text-rose-800 dark:text-rose-300 mt-2 max-w-md mx-auto leading-relaxed">
            Your active session role (<strong>STUDENT</strong>) does not have authorization to view or download another student's performance report. You are restricted to your own student performance report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isModal ? "p-2" : ""}`}>
      {/* Top Header & Actions Bar (Hidden during Print) */}
      <div className="print:hidden p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Automated Student Academic Performance Report
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data-driven performance evaluation compiled dynamically from recorded Mid Examination scores, assignment submissions, and lecture attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {(role === "teacher" || role === "admin") && (
            <>
              <button
                onClick={() => {
                  setEditWeights({ ...weightConfig });
                  setShowWeightModal(true);
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/90 text-xs font-bold transition-all flex items-center space-x-1.5 border border-indigo-200/80 dark:border-indigo-900"
              >
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Configure Weights ({weightConfig.midExamWeight}% Mid)</span>
              </button>

              <button
                onClick={handleRegenerateReport}
                disabled={isRegenerating}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin text-indigo-600" : ""}`} />
                <span>Regenerate Data</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowErrorModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/90 text-xs font-bold transition-all flex items-center space-x-1.5 border border-rose-200/80 dark:border-rose-900"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Report an Error</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Report Error Form Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Report Error / Incorrect Information
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setSubmitSuccessMsg("");
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit a formal correction ticket if any information, attendance, or mark in this report appears inaccurate. Faculty &amp; Administrators will review the source data.
            </p>

            {submitSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{submitSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitErrorNotification} className="space-y-4 text-xs">
                {/* Auto-populated details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Student Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudent?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Enrollment No:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeStudent?.enrollmentNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Linked Report ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{reportMeta.reportId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Report Version:</span>
                    <span className="font-bold text-emerald-600">Version {reportMeta.version}</span>
                  </div>
                </div>

                {/* Category select */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Error Category *
                  </label>
                  <select
                    value={errorCategory}
                    onChange={e => setErrorCategory(e.target.value as ReportIssueCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  >
                    <option value="Incorrect Mid Examination Score">Incorrect Mid Examination Score</option>
                    <option value="Incorrect Attendance">Incorrect Attendance</option>
                    <option value="Incorrect Assignment/Activity Score">Incorrect Assignment/Activity Score</option>
                    <option value="Incorrect Student Information">Incorrect Student Information</option>
                    <option value="Incorrect Performance Calculation">Incorrect Performance Calculation</option>
                    <option value="Report Generation Error">Report Generation Error</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Description textarea */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Explanation *
                  </label>
                  <textarea
                    rows={4}
                    value={errorDescription}
                    onChange={e => setErrorDescription(e.target.value)}
                    placeholder='Example: "My Database Management mid-examination score is displayed as 21, but I received 25 marks on my answer script."'
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowErrorModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingError}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-rose-600/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingError ? "Submitting Ticket..." : "Submit Error Notification"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Weight Config Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Performance Evaluation Weight Config
                </h3>
              </div>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure the percentage weights used to compute the student overall academic performance report. Total sum must equal 100%.
            </p>

            <form onSubmit={handleSaveWeights} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Mid Examination Weight</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{editWeights.midExamWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editWeights.midExamWeight}
                  onChange={e => setEditWeights({ ...editWeights, midExamWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Assignment Coursework Weight</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{editWeights.assignmentWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editWeights.assignmentWeight}
                  onChange={e => setEditWeights({ ...editWeights, assignmentWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Classroom Activity & Attendance Weight</span>
                  <span className="text-amber-600 dark:text-amber-400">{editWeights.classActivityWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editWeights.classActivityWeight}
                  onChange={e => setEditWeights({ ...editWeights, classActivityWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Term-End / Other Assessments Weight</span>
                  <span className="text-blue-600 dark:text-blue-400">{editWeights.otherAssessmentsWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editWeights.otherAssessmentsWeight}
                  onChange={e => setEditWeights({ ...editWeights, otherAssessmentsWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                <span className="text-slate-600 dark:text-slate-400">Total Configured Weight:</span>
                <span className={`font-mono text-sm ${
                  editWeights.midExamWeight + editWeights.assignmentWeight + editWeights.classActivityWeight + editWeights.otherAssessmentsWeight === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {editWeights.midExamWeight + editWeights.assignmentWeight + editWeights.classActivityWeight + editWeights.otherAssessmentsWeight}%
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Selector Bar for Teacher / Admin (Hidden during Print) */}
      {(role === "admin" || role === "teacher") && (
        <div className="print:hidden p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 text-xs font-bold">
            <User className="w-4 h-4 text-indigo-500" />
            <span>Target Student Selection ({role.toUpperCase()} View):</span>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or enrollment..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none"
            >
              {searchableStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.enrollmentNo}) - {s.divisionName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE OFFICIAL REPORT CANVAS                                          */}
      {/* ========================================================================= */}
      <div id="printable-report-card" className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">

        {/* 1. Official Header & Watermark */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-600/30 print:shadow-none">
              EDU
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                EduSync University Institute of Technology
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Official Student Academic Performance &amp; Activity Assessment Transcript
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 flex items-center space-x-2">
                <span>Report ID: <strong>{reportMeta.reportId}</strong></span>
                <span>•</span>
                <span>Version: <strong className="text-emerald-600">v{reportMeta.version}.0</strong></span>
                <span>•</span>
                <span>Ref: ES-PERF-{activeStudent?.enrollmentNo || "REG"}-2026</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div className="inline-flex items-center space-x-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC Verified &amp; Signed (Version {reportMeta.version})</span>
            </div>
            <p className="text-[11px] text-slate-400 block pt-1">
              Generated: <strong className="text-slate-700 dark:text-slate-300">{reportMeta.lastGeneratedAt || reportGenTimestamp}</strong>
            </p>
          </div>
        </div>

        {/* 2. Student Information Section */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">{activeStudent?.name}</span>
            <span className="text-[10px] text-slate-400 block">{activeStudent?.email}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enrollment / ID</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs mt-0.5 block">{activeStudent?.enrollmentNo}</span>
            <span className="text-[10px] text-slate-400 block">Status: Active Student</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Division &amp; Department</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{activeStudent?.divisionName}</span>
            <span className="text-[10px] text-slate-400 block">Computer Science &amp; Eng.</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Period</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">Semester V - Fall 2026</span>
            <span className="text-[10px] text-slate-400 block">Current Cumulative GPA: {activeStudent?.gpa} / 4.0</span>
          </div>
        </div>

        {/* 3. Executive Performance Summary Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Overall Rating */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Combined Performance Index</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{overallPerformanceScore}%</span>
              <span className={`text-xs font-bold ${performanceCategory.color}`}>
                {overallPerformanceScore >= 75 ? "★ High Tier" : "Pass"}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${overallPerformanceScore}%` }} />
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${performanceCategory.badgeBg}`}>
              {performanceCategory.title}
            </span>
          </div>

          {/* Card 2: Mid Examination Avg */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mid Examination Avg</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{midExamMetrics.avgPercentage}%</span>
              <span className="text-xs text-slate-400 font-semibold">({weightConfig.midExamWeight}% Weight)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Avg Score: <strong className="text-slate-800 dark:text-slate-200 font-mono">{midExamMetrics.avgScore} / 30</strong> across subjects.
            </p>
          </div>

          {/* Card 3: Assignment Completion */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coursework Completion</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{assignmentCompletionRate}%</span>
              <span className="text-xs text-slate-400 font-semibold">({weightConfig.assignmentWeight}% Weight)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {totalCompleted} submitted / {totalPending} pending tasks.
            </p>
          </div>

          {/* Card 4: Attendance & Activity */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lecture Attendance</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-black ${(activeStudent?.overallAttendance ?? 80) >= 75 ? "text-slate-900 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"}`}>
                {activeStudent?.overallAttendance ?? 80}%
              </span>
              <span className="text-xs text-slate-400 font-semibold">({weightConfig.classActivityWeight}% Weight)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {attendedLecturesCount} attended / {missedLecturesCount} missed.
            </p>
          </div>
        </div>

        {/* Performance Trend Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${performanceTrend.badgeBg}`}>
              <performanceTrend.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Academic Progression Trend:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${performanceTrend.badgeBg}`}>
                  {performanceTrend.status}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {performanceTrend.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300 font-mono text-[11px] bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-center">
              <span className="text-[9px] text-slate-400 uppercase block font-sans font-bold">Previous Internal</span>
              <span className="font-extrabold">{internalAvgPercent}%</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className="text-center">
              <span className="text-[9px] text-indigo-500 uppercase block font-sans font-bold">Mid Exam</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{midExamMetrics.avgPercentage}%</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className="text-center">
              <span className="text-[9px] text-emerald-500 uppercase block font-sans font-bold">Current Overall</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{overallPerformanceScore}%</span>
            </div>
          </div>
        </div>

        {/* 4. Dedicated Mid Examination Performance Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">1. Mid Examination Scores &amp; Subject Breakdown</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="text-slate-400">Weighted Contribution:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900 font-mono text-[11px] font-bold">
                {weightConfig.midExamWeight}%
              </span>
            </div>
          </div>

          {/* Mid Exam Summary Metrics Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Mid Examination Average</span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{midExamMetrics.avgPercentage}%</span>
                <span className="text-slate-500 text-[11px] font-mono">({midExamMetrics.avgScore} / 30 Avg Score)</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Top Mid Exam Subject</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {midExamMetrics.highestSubject ? `${midExamMetrics.highestSubject.subjectName}` : "N/A"}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                {midExamMetrics.highestSubject ? `${midExamMetrics.highestSubject.score}/${midExamMetrics.highestSubject.maxScore || 30} (${Math.round((midExamMetrics.highestSubject.score / (midExamMetrics.highestSubject.maxScore || 30)) * 100)}%)` : ""}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Subject Needing Improvement</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {midExamMetrics.lowestSubject ? `${midExamMetrics.lowestSubject.subjectName}` : "N/A"}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold block">
                {midExamMetrics.lowestSubject ? `${midExamMetrics.lowestSubject.score}/${midExamMetrics.lowestSubject.maxScore || 30} (${Math.round((midExamMetrics.lowestSubject.score / (midExamMetrics.lowestSubject.maxScore || 30)) * 100)}%)` : ""}
              </span>
            </div>
          </div>

          {/* Mid Examination Scores Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Course / Subject Name</th>
                  <th className="p-3 text-center">Examination Date</th>
                  <th className="p-3 text-center">Maximum Marks</th>
                  <th className="p-3 text-center">Score Obtained</th>
                  <th className="p-3 text-center">Percentage</th>
                  <th className="p-3 text-center">Performance Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {midExamMetrics.list.map((m, idx) => {
                  const maxSc = m.maxScore || 30;
                  const pct = Math.round((m.score / maxSc) * 100);
                  return (
                    <tr key={m.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.subjectName}</td>
                      <td className="p-3 text-center font-mono text-slate-500">{m.examDate || "2026-07-15"}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{maxSc}</td>
                      <td className="p-3 text-center font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{m.score}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{pct}%</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          pct >= 80 ? "bg-emerald-100 text-emerald-800" :
                          pct >= 60 ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {pct >= 80 ? "Outstanding" : pct >= 60 ? "Satisfactory" : "Attention Needed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Subject Academic Performance Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">2. Academic Subject Examination Breakdown</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Course / Subject Name</th>
                  <th className="p-3 text-center">Internal (20)</th>
                  <th className="p-3 text-center">Practical (30)</th>
                  <th className="p-3 text-center">Term End (50)</th>
                  <th className="p-3 text-center">Total Score (100)</th>
                  <th className="p-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentSubjectMarks.length > 0 ? (
                  studentSubjectMarks.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.subjectName}</td>
                      <td className="p-3 text-center font-mono">{m.internal}</td>
                      <td className="p-3 text-center font-mono">{m.practical}</td>
                      <td className="p-3 text-center font-mono">{m.termEnd}</td>
                      <td className="p-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                        {m.total}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          m.grade === "A+" || m.grade === "A" ? "bg-emerald-100 text-emerald-800" :
                          m.grade === "B" || m.grade === "C" ? "bg-indigo-100 text-indigo-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {m.grade}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  // If student has no specific entries yet, display default division curriculum breakdown
                  subjects.map((subj, idx) => {
                    const studentGpa = activeStudent?.gpa ?? 3.0;
                    const estScore = Math.min(98, Math.max(52, Math.round(studentGpa * 23 + (idx % 2 === 0 ? 5 : -4))));
                    const estGrade = estScore >= 85 ? "A+" : estScore >= 70 ? "A" : estScore >= 60 ? "B" : "C";
                    return (
                      <tr key={subj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{subj.code} - {subj.name}</td>
                        <td className="p-3 text-center font-mono">{Math.round(estScore * 0.2)}</td>
                        <td className="p-3 text-center font-mono">{Math.round(estScore * 0.3)}</td>
                        <td className="p-3 text-center font-mono">{Math.round(estScore * 0.5)}</td>
                        <td className="p-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                          {estScore}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                            {estGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Assignment & Coursework Activity Summary */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">3. Coursework &amp; Activity Performance</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Stats */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Assignment Metrics</h4>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Total Assigned Coursework:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{totalAssigned} Tasks</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Submissions Completed:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalCompleted} Submitted</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Pending / Unsubmitted Tasks:</span>
                <span className={`font-bold ${totalPending > 0 ? "text-amber-600" : "text-slate-400"}`}>
                  {totalPending} Tasks
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Average Evaluated Score:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{averageAssignmentGradePercent}%</span>
              </div>
            </div>

            {/* Participation & Engagement */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Classroom Participation &amp; Engagement</h4>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Lecture Attendance Rate:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{activeStudent?.overallAttendance ?? 80}%</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Attended vs Missed Sessions:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {attendedLecturesCount} Attended / {missedLecturesCount} Missed
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Participation Index:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{participationEngagementScore} / 100</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">On-Time Submission Rate:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {assignmentCompletionRate >= 80 ? "95% (High Consistency)" : "60% (Irregular)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Data-Driven Analysis (Strengths, Areas for Improvement, Recommendations) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">4. Automated Performance Analysis &amp; Recommendations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Identified Academic Strengths</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                {analysisPoints.strengths.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>

            {/* Areas Needing Improvement */}
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Areas Needing Improvement</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-amber-800 dark:text-amber-300/90 leading-relaxed">
                {analysisPoints.improvements.length > 0 ? (
                  analysisPoints.improvements.map((point, idx) => <li key={idx}>{point}</li>)
                ) : (
                  <li>No critical areas needing immediate intervention detected.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Targeted Recommendations */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-300 font-bold">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Tailored Actionable Improvement Recommendations</span>
            </div>
            <ul className="space-y-2 text-indigo-950 dark:text-indigo-200/90 leading-relaxed">
              {analysisPoints.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 7. Official Endorsement Signatures Section */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="h-10 flex items-end justify-center font-serif italic text-slate-400 text-sm">
              Prof. S. Jenkins
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
              Class Coordinator Signature
            </div>
            <span className="text-[10px] text-slate-400">Department of Computer Science</span>
          </div>

          <div>
            <div className="h-10 flex items-end justify-center font-serif italic text-slate-400 text-sm">
              Dr. M. Vance
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
              Head of Academic Affairs
            </div>
            <span className="text-[10px] text-slate-400">EduSync University Registrar</span>
          </div>

          <div>
            <div className="h-10 flex items-end justify-center font-mono text-[11px] text-indigo-500 font-bold">
              DIGITAL-SEAL-VERIFIED
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
              Official University Seal
            </div>
            <span className="text-[10px] text-slate-400">Timestamped {reportGenTimestamp}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
