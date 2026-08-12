import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  UserProfile,
  UserRole,
  UserAuditLog,
  Semester,
  Division,
  Subject,
  StudentRecord,
  AttendanceRecord,
  SubjectMarks,
  Assignment,
  Submission,
  StudyMaterial,
  TimetableSlot,
  Announcement,
  AIPrediction,
  PersonalFile,
  NotificationItem,
  SecurityAlert,
  MidExamMarks,
  PerformanceWeightConfig,
  ReportIssue,
  ReportIssueCategory,
  ReportIssueStatus,
  StudentReportMetadata
} from "../types";
import {
  initialUsers,
  initialAuditLogs,
  initialSemesters,
  initialDivisions,
  initialSubjects,
  initialStudents,
  initialAttendanceRecords,
  initialMarks,
  initialAssignments,
  initialSubmissions,
  initialStudyMaterials,
  initialTimetable,
  initialAnnouncements,
  initialAIPredictions,
  initialPersonalFiles,
  initialNotifications,
  initialSecurityAlerts,
  initialMidExamMarks,
  initialPerformanceWeightConfig
} from "../mockData";

interface AppContextType {
  currentUser: UserProfile;
  users: UserProfile[];
  auditLogs: UserAuditLog[];
  role: UserRole;
  switchRole: (role: UserRole) => void;
  canAccessTab: (tabId: string, checkRole?: UserRole) => boolean;
  changeUserRole: (targetUid: string, newRole: UserRole) => Promise<{ success: boolean; message?: string }>;
  toggleUserStatus: (targetUid: string) => Promise<void>;
  addUser: (user: Partial<UserProfile>) => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  cloudSyncStatus: "synced" | "syncing" | "offline";
  isOffline: boolean;
  toggleOfflineMode: () => void;

  // Active Semester Context
  selectedSemesterId: string;
  switchSemester: (semId: string) => void;
  selectedSemester: Semester;
  filteredStudents: StudentRecord[];
  filteredSubjects: Subject[];
  filteredAttendance: AttendanceRecord[];
  filteredMarks: SubjectMarks[];
  filteredAssignments: Assignment[];
  filteredReportIssues: ReportIssue[];

  notifications: NotificationItem[];
  unreadNotifCount: number;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notif: Omit<NotificationItem, "id" | "timestamp" | "read">) => void;

  semesters: Semester[];
  divisions: Division[];
  subjects: Subject[];
  students: StudentRecord[];
  attendance: AttendanceRecord[];
  marks: SubjectMarks[];
  assignments: Assignment[];
  submissions: Submission[];
  studyMaterials: StudyMaterial[];
  timetable: TimetableSlot[];
  announcements: Announcement[];
  aiPredictions: AIPrediction[];
  personalFiles: PersonalFile[];
  securityAlerts: SecurityAlert[];
  midExamMarks: MidExamMarks[];
  weightConfig: PerformanceWeightConfig;
  reportIssues: ReportIssue[];
  reportMetadataMap: Record<string, StudentReportMetadata>;

  // Biometric / MFA Modal state
  mfaModalOpen: boolean;
  mfaActionTitle: string;
  mfaPendingAction: (() => void) | null;
  triggerBiometricVerification: (actionTitle: string, onVerified: () => void) => void;
  closeMfaModal: () => void;
  confirmMfaModal: () => void;

  // Actions
  markAttendance: (record: Omit<AttendanceRecord, "id">) => void;
  saveDailyAttendance: (record: {
    subjectId: string;
    subjectName?: string;
    divisionId: string;
    date: string;
    period: number;
    timeSlot?: string;
    recordedBy: string;
    presentStudentIds: string[];
    absentStudentIds: string[];
    lateStudentIds?: string[];
    notes?: string;
  }) => { success: boolean; isUpdate: boolean; message: string };
  getStudentSubjectAttendance: (studentId: string, subjectId: string) => {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    conducted: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
    status: "Good" | "Satisfactory" | "Low Attendance";
    history: Array<{
      id: string;
      date: string;
      period: number;
      timeSlot?: string;
      status: "present" | "absent" | "late";
      notes?: string;
      recordedBy: string;
    }>;
  };
  getStudentOverallAttendanceSummary: (studentId: string, semesterId?: string) => {
    studentId: string;
    studentName: string;
    totalConducted: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    overallPercentage: number;
    subjectSummaries: Array<{
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      conducted: number;
      present: number;
      absent: number;
      late: number;
      percentage: number;
      status: "Good" | "Satisfactory" | "Low Attendance";
      history: Array<{
        id: string;
        date: string;
        period: number;
        timeSlot?: string;
        status: "present" | "absent" | "late";
        notes?: string;
        recordedBy: string;
      }>;
    }>;
  };
  updateMarks: (newMark: SubjectMarks) => void;
  addAssignment: (assignment: Omit<Assignment, "id" | "createdAt">) => void;
  submitAssignment: (sub: Omit<Submission, "id" | "submittedAt" | "status">) => void;
  evaluateSubmission: (submissionId: string, grade: number, feedback: string) => void;
  addStudyMaterial: (mat: Omit<StudyMaterial, "id" | "createdAt">) => void;
  postAnnouncement: (ann: Omit<Announcement, "id" | "timestamp">) => void;
  addStudent: (stu: Omit<StudentRecord, "id">) => void;
  bulkImportStudents: (studentsList: Array<Omit<StudentRecord, "id">>) => void;
  addPersonalFile: (file: Omit<PersonalFile, "id" | "uploadedAt">) => void;
  generateAIPredictionForStudent: (studentId: string) => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => void;
  updateMidExamMark: (record: MidExamMarks) => void;
  updateWeightConfig: (newConfig: PerformanceWeightConfig) => void;
  submitReportIssue: (issue: {
    studentId: string;
    studentName?: string;
    studentEnrollmentNo?: string;
    divisionId?: string;
    reportId?: string;
    reportVersion?: number;
    category: ReportIssueCategory;
    description: string;
  }) => { success: boolean; message: string; issueId: string };
  updateReportIssueStatus: (
    issueId: string,
    status: ReportIssueStatus,
    responseText?: string,
    correctedSourceType?: "mid_exam" | "attendance" | "assignment" | "student_info" | "other"
  ) => void;
  correctStudentAttendanceRecord: (params: {
    studentId: string;
    subjectId: string;
    date: string;
    period: number;
    newStatus: "present" | "absent" | "late";
    reason?: string;
    modifiedBy: string;
  }) => { success: boolean; message: string };
  updateStudentProfileInfo: (
    studentId: string,
    info: { name?: string; enrollmentNo?: string; divisionId?: string; email?: string }
  ) => void;
  regenerateStudentReport: (studentId: string, reason?: string) => { version: number; generatedAt: string };
  getStudentReportMetadata: (studentId: string) => StudentReportMetadata;
  getReportIssuesForStudent: (studentId: string) => ReportIssue[];
  getReportIssuesForTeacher: (teacherId?: string) => ReportIssue[];
  getAllReportIssues: () => ReportIssue[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>(initialAuditLogs);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUsers[0]); // Admin default
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline">("synced");
  const [isOffline, setIsOffline] = useState(false);

  // Core Data States
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [marks, setMarks] = useState<SubjectMarks[]>(initialMarks);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(initialStudyMaterials);
  const [timetable, setTimetable] = useState<TimetableSlot[]>(initialTimetable);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [aiPredictions, setAiPredictions] = useState<AIPrediction[]>(initialAIPredictions);
  const [personalFiles, setPersonalFiles] = useState<PersonalFile[]>(initialPersonalFiles);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initialSecurityAlerts);
  const [midExamMarks, setMidExamMarks] = useState<MidExamMarks[]>(initialMidExamMarks);
  const [weightConfig, setWeightConfig] = useState<PerformanceWeightConfig>(initialPerformanceWeightConfig);

  const initialReportIssuesList: ReportIssue[] = [
    {
      id: "issue_101",
      studentId: "stu_1",
      studentName: "Alex Morgan",
      studentEnrollmentNo: "EN2026-CS-042",
      divisionId: "div_a",
      reportId: "REP-STU_1",
      reportVersion: 1,
      category: "Incorrect Mid Examination Score",
      description: "My Database Management mid-examination score is displayed as 21, but I received 25 marks on my answer script.",
      submittedAt: "10 Aug 2026, 09:15 AM",
      status: "Under Review",
      teacherResponse: "Checking answer script with faculty coordinator."
    },
    {
      id: "issue_102",
      studentId: "stu_2",
      studentName: "Brandon Lee",
      studentEnrollmentNo: "EN2026-CS-015",
      divisionId: "div_a",
      reportId: "REP-STU_2",
      reportVersion: 1,
      category: "Incorrect Attendance",
      description: "My attendance for Period 2 on Aug 5 was recorded absent, but I was present.",
      submittedAt: "09 Aug 2026, 04:30 PM",
      status: "Pending"
    }
  ];

  const [reportIssues, setReportIssues] = useState<ReportIssue[]>(initialReportIssuesList);
  const [reportMetadataMap, setReportMetadataMap] = useState<Record<string, StudentReportMetadata>>({
    stu_1: {
      studentId: "stu_1",
      reportId: "REP-STU_1",
      version: 1,
      lastGeneratedAt: "10 Aug 2026, 08:00 AM",
      history: [{ version: 1, generatedAt: "10 Aug 2026, 08:00 AM", reasonForRegeneration: "Initial report generation" }]
    },
    stu_2: {
      studentId: "stu_2",
      reportId: "REP-STU_2",
      version: 1,
      lastGeneratedAt: "10 Aug 2026, 08:00 AM",
      history: [{ version: 1, generatedAt: "10 Aug 2026, 08:00 AM", reasonForRegeneration: "Initial report generation" }]
    }
  });

  // MFA / Biometric Modal State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaActionTitle, setMfaActionTitle] = useState("");
  const [mfaPendingAction, setMfaPendingAction] = useState<(() => void) | null>(null);

  // Active Semester State & Calculations
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("sem_5");

  const switchSemester = (semId: string) => {
    setSelectedSemesterId(semId);
  };

  const selectedSemester = useMemo(() => {
    return semesters.find(s => s.id === selectedSemesterId) || semesters[0];
  }, [semesters, selectedSemesterId]);

  const filteredDivisions = useMemo(() => {
    return divisions.filter(div => div.semesterId === selectedSemesterId);
  }, [divisions, selectedSemesterId]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(subj => subj.semesterId === selectedSemesterId);
  }, [subjects, selectedSemesterId]);

  const filteredStudents = useMemo(() => {
    return students.filter(stu => {
      if (stu.semesterId) {
        return stu.semesterId === selectedSemesterId;
      }
      return filteredDivisions.some(d => d.id === stu.divisionId);
    });
  }, [students, selectedSemesterId, filteredDivisions]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(att =>
      filteredSubjects.some(s => s.id === att.subjectId)
    );
  }, [attendance, filteredSubjects]);

  const filteredMarks = useMemo(() => {
    return marks.filter(m => {
      const subj = subjects.find(s => s.id === m.subjectId);
      return subj ? subj.semesterId === selectedSemesterId : false;
    });
  }, [marks, subjects, selectedSemesterId]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a =>
      filteredSubjects.some(s => s.id === a.subjectId)
    );
  }, [assignments, filteredSubjects]);

  const filteredReportIssues = useMemo(() => {
    return reportIssues.filter(r =>
      filteredStudents.some(stu => stu.id === r.studentId)
    );
  }, [reportIssues, filteredStudents]);

  // Apply Theme to document root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const canAccessTab = (tabId: string, checkRole?: UserRole): boolean => {
    const activeRole = checkRole || currentUser.role;

    const adminOnlyTabs = ["user_management"];
    const teacherDeniedTabs = ["user_management"];
    const studentAllowedTabs = [
      "dashboard",
      "assignments",
      "attendance",
      "marks",
      "materials",
      "ai_analytics",
      "timetable",
      "announcements",
      "personal_storage",
      "reports",
      "report_issues",
      "settings"
    ];

    if (activeRole === "admin") {
      return true;
    }

    if (activeRole === "teacher") {
      return !teacherDeniedTabs.includes(tabId);
    }

    if (activeRole === "student") {
      return studentAllowedTabs.includes(tabId);
    }

    return false;
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser = users.find(u => u.role === newRole && u.status !== "Suspended") || {
      ...currentUser,
      role: newRole,
      status: "Active"
    };

    if (targetUser.status === "Suspended") {
      addNotification({
        type: "security",
        title: "Account Suspended",
        message: `Cannot switch to account ${targetUser.name}: Status is Suspended.`
      });
      return;
    }

    setSelectedSemesterId("sem_5");
    setCurrentUser(targetUser);
    addNotification({
      type: "security",
      title: "Authenticated Role Session",
      message: `Active session set to ${newRole.toUpperCase()} (${targetUser.name})`
    });
  };

  const changeUserRole = async (targetUid: string, newRole: UserRole) => {
    // Enforce Authorization Check
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators are authorized to assign or modify user roles."
      });
      return { success: false, message: "Forbidden: Only Administrators can change roles." };
    }

    try {
      // Call backend API endpoint to update server state & verify
      const res = await fetch("/api/rbac/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterUid: currentUser.uid,
          requesterRole: currentUser.role,
          targetUid,
          newRole
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Server rejected role change request.");
      }

      // Update local state
      let updatedTargetName = "";
      setUsers(prev => prev.map(u => {
        if (u.uid === targetUid) {
          updatedTargetName = u.name;
          return { ...u, role: newRole };
        }
        return u;
      }));

      // Update current user if self was edited
      if (currentUser.uid === targetUid) {
        setCurrentUser(prev => ({ ...prev, role: newRole }));
      }

      // Log Audit Entry
      const newAudit: UserAuditLog = {
        id: `audit_${Date.now()}`,
        action: "Role Assigned",
        performedBy: currentUser.name,
        targetUser: updatedTargetName || targetUid,
        details: `Assigned new role '${newRole.toUpperCase()}' via Admin RBAC Control.`,
        timestamp: new Date().toLocaleString()
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      addNotification({
        type: "security",
        title: "User Role Updated",
        message: `Successfully set ${updatedTargetName || targetUid}'s role to ${newRole.toUpperCase()}`
      });

      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Change Role Error:", err);
      addNotification({
        type: "security",
        title: "Role Change Failed",
        message: err?.message || "Failed to update user role."
      });
      return { success: false, message: err?.message };
    }
  };

  const toggleUserStatus = async (targetUid: string) => {
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can modify account active/suspended status."
      });
      return;
    }

    const target = users.find(u => u.uid === targetUid);
    if (!target) return;

    const nextStatus = target.status === "Suspended" ? "Active" : "Suspended";

    try {
      await fetch("/api/rbac/change-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterRole: currentUser.role,
          targetUid,
          newStatus: nextStatus
        })
      });

      setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, status: nextStatus } : u));

      const newAudit: UserAuditLog = {
        id: `audit_${Date.now()}`,
        action: `Account ${nextStatus}`,
        performedBy: currentUser.name,
        targetUser: target.name,
        details: `Set account status to ${nextStatus}.`,
        timestamp: new Date().toLocaleString()
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      addNotification({
        type: "security",
        title: `Account ${nextStatus}`,
        message: `Set ${target.name}'s account status to ${nextStatus}`
      });
    } catch (err) {
      console.error("Toggle Status Error:", err);
    }
  };

  const addUser = async (user: Partial<UserProfile>) => {
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can provision new user accounts."
      });
      return;
    }

    const newUid = `user_${Date.now()}`;
    const newUserRecord: UserProfile = {
      uid: newUid,
      name: user.name || "New User",
      email: user.email || "user@edusync.edu",
      role: user.role || "student", // Safest default
      status: "Active",
      department: user.department || "Computer Science",
      enrollmentNo: user.enrollmentNo,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Just now"
    };

    setUsers(prev => [...prev, newUserRecord]);

    // If student role, also register in student records list
    if (newUserRecord.role === "student") {
      setStudents(prev => [
        ...prev,
        {
          id: `stu_${Date.now()}`,
          uid: newUid,
          enrollmentNo: newUserRecord.enrollmentNo || "EN2026-REG-001",
          name: newUserRecord.name,
          email: newUserRecord.email,
          divisionId: "div_a",
          divisionName: "Div A - CS",
          avatarUrl: newUserRecord.avatarUrl,
          overallAttendance: 100,
          gpa: 4.0,
          riskCategory: "Low",
          status: "Active"
        }
      ]);
    }

    const newAudit: UserAuditLog = {
      id: `audit_${Date.now()}`,
      action: "Account Provisioned",
      performedBy: currentUser.name,
      targetUser: newUserRecord.name,
      details: `Provisioned account with initial role '${newUserRecord.role.toUpperCase()}'.`,
      timestamp: new Date().toLocaleString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    addNotification({
      type: "security",
      title: "User Account Provisioned",
      message: `Created account for ${newUserRecord.name} (${newUserRecord.role.toUpperCase()})`
    });
  };

  const toggleOfflineMode = () => {
    setIsOffline(prev => {
      const next = !prev;
      setCloudSyncStatus(next ? "offline" : "synced");
      addNotification({
        type: "security",
        title: next ? "Offline Mode Enabled" : "Cloud Sync Restored",
        message: next ? "Data saved to secure local vault cache." : "Synchronized with EduSync Cloud Firestore backend."
      });
      return next;
    });
  };

  const simulateCloudSync = () => {
    if (isOffline) return;
    setCloudSyncStatus("syncing");
    setTimeout(() => {
      setCloudSyncStatus("synced");
    }, 800);
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notif: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
    const newItem: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: "Just now",
      read: false
    };
    setNotifications(prev => [newItem, ...prev]);
  };

  const triggerBiometricVerification = (actionTitle: string, onVerified: () => void) => {
    setMfaActionTitle(actionTitle);
    setMfaPendingAction(() => onVerified);
    setMfaModalOpen(true);
  };

  const closeMfaModal = () => {
    setMfaModalOpen(false);
    setMfaPendingAction(null);
  };

  const confirmMfaModal = () => {
    if (mfaPendingAction) {
      mfaPendingAction();
    }
    setMfaModalOpen(false);
    setMfaPendingAction(null);
    addNotification({
      type: "security",
      title: "Biometric MFA Passed",
      message: `Authorized action: ${mfaActionTitle}`
    });
  };

  // Mutators
  const markAttendance = (record: Omit<AttendanceRecord, "id">) => {
    simulateCloudSync();
    const newRecord: AttendanceRecord = {
      ...record,
      id: `att_${Date.now()}`,
      period: (record as any).period || 1,
      recordedBy: (record as any).recordedBy || currentUser.name
    };
    setAttendance(prev => [newRecord, ...prev]);

    // Recalculate student overall attendance
    setStudents(prev => prev.map(s => {
      if (record.presentStudentIds.includes(s.id)) {
        const newPct = Math.min(100, Math.round(s.overallAttendance * 0.9 + 10));
        return { ...s, overallAttendance: newPct };
      } else if (record.absentStudentIds.includes(s.id)) {
        const newPct = Math.max(0, Math.round(s.overallAttendance * 0.9));
        return { ...s, overallAttendance: newPct, riskCategory: newPct < 75 ? "High" : s.riskCategory };
      }
      return s;
    }));

    addNotification({
      type: "attendance",
      title: "Attendance Recorded",
      message: `Marked ${record.presentStudentIds.length} present, ${record.absentStudentIds.length} absent for ${record.subjectName}`
    });
  };

  const saveDailyAttendance = (record: {
    subjectId: string;
    subjectName?: string;
    divisionId: string;
    date: string;
    period: number;
    timeSlot?: string;
    recordedBy: string;
    presentStudentIds: string[];
    absentStudentIds: string[];
    lateStudentIds?: string[];
    notes?: string;
  }) => {
    simulateCloudSync();

    const subjectObj = subjects.find(s => s.id === record.subjectId);
    const resolvedSubjectName = record.subjectName || subjectObj?.name || "Subject";
    const lateIds = record.lateStudentIds || [];

    let isUpdate = false;
    let message = "";

    setAttendance(prev => {
      // Check for duplicate attendance record with same (subjectId, divisionId, date, period)
      const existingIndex = prev.findIndex(
        r =>
          r.subjectId === record.subjectId &&
          r.divisionId === record.divisionId &&
          r.date === record.date &&
          (r.period === record.period || (r.timeSlot && record.timeSlot && r.timeSlot === record.timeSlot))
      );

      if (existingIndex >= 0) {
        isUpdate = true;
        const existing = prev[existingIndex];
        const newAudit = {
          timestamp: new Date().toLocaleString(),
          modifiedBy: currentUser.name,
          details: `Updated attendance for ${record.date} (Period ${record.period}): ${record.presentStudentIds.length} Present, ${record.absentStudentIds.length} Absent, ${lateIds.length} Late`
        };

        const updatedRecord: AttendanceRecord = {
          ...existing,
          presentStudentIds: record.presentStudentIds,
          absentStudentIds: record.absentStudentIds,
          lateStudentIds: lateIds,
          timeSlot: record.timeSlot || existing.timeSlot,
          recordedBy: record.recordedBy || currentUser.name,
          notes: record.notes !== undefined ? record.notes : existing.notes,
          updatedAt: new Date().toISOString().split("T")[0],
          updatedBy: currentUser.name,
          auditTrail: [newAudit, ...(existing.auditTrail || [])]
        };

        const next = [...prev];
        next[existingIndex] = updatedRecord;
        return next;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          subjectId: record.subjectId,
          subjectName: resolvedSubjectName,
          divisionId: record.divisionId,
          date: record.date,
          period: record.period,
          timeSlot: record.timeSlot || `Period ${record.period}`,
          recordedBy: record.recordedBy || currentUser.name,
          presentStudentIds: record.presentStudentIds,
          absentStudentIds: record.absentStudentIds,
          lateStudentIds: lateIds,
          notes: record.notes,
          updatedAt: new Date().toISOString().split("T")[0]
        };
        return [newRecord, ...prev];
      }
    });

    // Recalculate each student's overall attendance percentage based on all records
    setTimeout(() => {
      setStudents(prevStudents =>
        prevStudents.map(student => {
          const studentRecords = attendance.filter(
            a =>
              a.presentStudentIds.includes(student.id) ||
              a.absentStudentIds.includes(student.id) ||
              a.lateStudentIds?.includes(student.id)
          );

          if (studentRecords.length === 0) return student;

          let presentCount = 0;
          let lateCount = 0;
          studentRecords.forEach(r => {
            if (r.presentStudentIds.includes(student.id)) presentCount++;
            else if (r.lateStudentIds?.includes(student.id)) lateCount++;
          });

          const totalSessions = studentRecords.length;
          const weightedScore = presentCount + lateCount * 0.5;
          const pct = Math.min(100, Math.round((weightedScore / totalSessions) * 100));

          return {
            ...student,
            overallAttendance: pct,
            riskCategory: pct < 75 ? "High" : pct < 85 ? "Medium" : "Low"
          };
        })
      );
    }, 50);

    message = isUpdate
      ? `Updated attendance record for ${resolvedSubjectName} on ${record.date} (Period ${record.period}).`
      : `Saved new attendance record for ${resolvedSubjectName} on ${record.date} (Period ${record.period}).`;

    addNotification({
      type: "attendance",
      title: isUpdate ? "Attendance Record Updated" : "Daily Attendance Saved",
      message: `${resolvedSubjectName} (${record.date}, Period ${record.period}): ${record.presentStudentIds.length} Present, ${record.absentStudentIds.length} Absent, ${lateIds.length} Late`
    });

    return { success: true, isUpdate, message };
  };

  const getStudentSubjectAttendance = (studentId: string, subjectId: string) => {
    const targetStudent = students.find(s => s.id === studentId || s.uid === studentId);
    const subjectObj = subjects.find(s => s.id === subjectId);
    const subjectName = subjectObj?.name || "Subject";
    const subjectCode = subjectObj?.code || subjectId;

    if (!targetStudent) {
      return {
        subjectId,
        subjectName,
        subjectCode,
        conducted: 0,
        present: 0,
        absent: 0,
        late: 0,
        percentage: 100,
        status: "Good" as const,
        history: []
      };
    }

    const subjectRecords = attendance.filter(
      r =>
        r.subjectId === subjectId &&
        (r.divisionId === targetStudent.divisionId ||
          r.presentStudentIds.includes(targetStudent.id) ||
          r.absentStudentIds.includes(targetStudent.id) ||
          r.lateStudentIds?.includes(targetStudent.id))
    );

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const history = subjectRecords
      .map(r => {
        let status: "present" | "absent" | "late" = "absent";
        if (r.presentStudentIds.includes(targetStudent.id)) {
          status = "present";
          presentCount++;
        } else if (r.lateStudentIds?.includes(targetStudent.id)) {
          status = "late";
          lateCount++;
        } else {
          status = "absent";
          absentCount++;
        }

        return {
          id: r.id,
          date: r.date,
          period: r.period || 1,
          timeSlot: r.timeSlot,
          status,
          notes: r.notes,
          recordedBy: r.recordedBy || "Faculty"
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.period - a.period);

    const conducted = subjectRecords.length;
    const effectivePresent = presentCount + lateCount * 0.5;
    const percentage = conducted > 0 ? Math.round((effectivePresent / conducted) * 1000) / 10 : 100;

    const status: "Good" | "Satisfactory" | "Low Attendance" =
      percentage >= 85 ? "Good" : percentage >= 75 ? "Satisfactory" : "Low Attendance";

    return {
      subjectId,
      subjectName,
      subjectCode,
      conducted,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      percentage,
      status,
      history
    };
  };

  const getStudentOverallAttendanceSummary = (studentId: string, semesterId?: string) => {
    const targetStudent = students.find(s => s.id === studentId || s.uid === studentId);
    const studentName = targetStudent?.name || "Student";
    const targetSemId = semesterId || selectedSemesterId;

    const targetSubjects = subjects.filter(s => s.semesterId === targetSemId);
    const subjectSummaries = targetSubjects.map(s => getStudentSubjectAttendance(studentId, s.id));

    let totalConducted = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    subjectSummaries.forEach(s => {
      totalConducted += s.conducted;
      totalPresent += s.present;
      totalAbsent += s.absent;
      totalLate += s.late;
    });

    const totalWeightedPresent = totalPresent + totalLate * 0.5;
    const overallPercentage =
      totalConducted > 0 ? Math.round((totalWeightedPresent / totalConducted) * 1000) / 10 : targetStudent?.overallAttendance || 100;

    return {
      studentId,
      studentName,
      totalConducted,
      totalPresent,
      totalAbsent: totalAbsent,
      totalLate,
      overallPercentage,
      subjectSummaries
    };
  };

  const updateMarks = (newMark: SubjectMarks) => {
    simulateCloudSync();
    setMarks(prev => {
      const idx = prev.findIndex(m => m.studentId === newMark.studentId && m.subjectId === newMark.subjectId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newMark;
        return updated;
      }
      return [...prev, newMark];
    });

    addNotification({
      type: "assignment",
      title: "Marks Updated",
      message: `Updated marks for ${newMark.subjectName}: Total ${newMark.total}/100 (${newMark.grade})`
    });
  };

  const updateMidExamMark = (record: MidExamMarks) => {
    simulateCloudSync();
    setMidExamMarks(prev => {
      const idx = prev.findIndex(m => m.studentId === record.studentId && m.subjectId === record.subjectId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [...prev, record];
    });

    addNotification({
      type: "assignment",
      title: "Mid Examination Mark Recorded",
      message: `Score recorded: ${record.score}/${record.maxScore} (${Math.round((record.score / (record.maxScore || 30)) * 100)}%) for ${record.subjectName}`
    });
  };

  const updateWeightConfig = (newConfig: PerformanceWeightConfig) => {
    simulateCloudSync();
    setWeightConfig(newConfig);
    addNotification({
      type: "security",
      title: "Academic Weighting Configured",
      message: `Updated performance weights: Mid Exam ${newConfig.midExamWeight}%, Assignments ${newConfig.assignmentWeight}%, Class Activity ${newConfig.classActivityWeight}%, Other ${newConfig.otherAssessmentsWeight}%`
    });
  };

  const addAssignment = (assignment: Omit<Assignment, "id" | "createdAt">) => {
    simulateCloudSync();
    const newAsgn: Assignment = {
      ...assignment,
      id: `asgn_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0]
    };
    setAssignments(prev => [newAsgn, ...prev]);

    addNotification({
      type: "assignment",
      title: "New Assignment Posted",
      message: `${assignment.title} due on ${assignment.dueDate}`,
      linkTab: "assignments"
    });
  };

  const submitAssignment = (sub: Omit<Submission, "id" | "submittedAt" | "status">) => {
    simulateCloudSync();
    const newSub: Submission = {
      ...sub,
      id: `sub_${Date.now()}`,
      submittedAt: new Date().toLocaleString(),
      status: "pending"
    };
    setSubmissions(prev => [newSub, ...prev]);

    addNotification({
      type: "assignment",
      title: "Assignment Solution Uploaded",
      message: `Successfully submitted solution file ${sub.fileName}`
    });
  };

  const evaluateSubmission = (submissionId: string, grade: number, feedback: string) => {
    simulateCloudSync();
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          grade,
          feedback,
          status: "evaluated",
          evaluatedAt: new Date().toLocaleString()
        };
      }
      return s;
    }));

    addNotification({
      type: "assignment",
      title: "Submission Graded",
      message: `Evaluation completed with score ${grade} pts.`
    });
  };

  const addStudyMaterial = (mat: Omit<StudyMaterial, "id" | "createdAt">) => {
    simulateCloudSync();
    const newMat: StudyMaterial = {
      ...mat,
      id: `mat_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0]
    };
    setStudyMaterials(prev => [newMat, ...prev]);

    addNotification({
      type: "announcement",
      title: "Study Material Uploaded",
      message: `New ${mat.type.toUpperCase()} added: ${mat.title}`,
      linkTab: "materials"
    });
  };

  const postAnnouncement = (ann: Omit<Announcement, "id" | "timestamp">) => {
    simulateCloudSync();
    const newAnn: Announcement = {
      ...ann,
      id: `ann_${Date.now()}`,
      timestamp: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    };
    setAnnouncements(prev => [newAnn, ...prev]);

    addNotification({
      type: "announcement",
      title: `Broadcast: ${ann.title}`,
      message: ann.message,
      linkTab: "announcements"
    });
  };

  const addStudent = (stu: Omit<StudentRecord, "id">) => {
    simulateCloudSync();
    const newStu: StudentRecord = {
      ...stu,
      id: `stu_${Date.now()}`
    };
    setStudents(prev => [...prev, newStu]);
    addNotification({
      type: "security",
      title: "Student Account Created",
      message: `Registered ${stu.name} (${stu.enrollmentNo})`
    });
  };

  const bulkImportStudents = (studentsList: Array<Omit<StudentRecord, "id">>) => {
    simulateCloudSync();
    const created = studentsList.map((s, idx) => ({
      ...s,
      id: `stu_bulk_${Date.now()}_${idx}`
    }));
    setStudents(prev => [...prev, ...created]);
    addNotification({
      type: "security",
      title: "Bulk CSV Import Completed",
      message: `Successfully imported ${created.length} student records into division.`
    });
  };

  const addPersonalFile = (file: Omit<PersonalFile, "id" | "uploadedAt">) => {
    simulateCloudSync();
    const newFile: PersonalFile = {
      ...file,
      id: `pf_${Date.now()}`,
      uploadedAt: new Date().toISOString().split("T")[0]
    };
    setPersonalFiles(prev => [newFile, ...prev]);
    addNotification({
      type: "security",
      title: "Private File Saved",
      message: `Stored encrypted file ${file.name}`
    });
  };

  const generateAIPredictionForStudent = async (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId || s.uid === studentId);
    if (!targetStudent) return;

    try {
      const studentInternalMarks = marks
        .filter(m => m.studentId === targetStudent.id)
        .reduce((acc, curr) => {
          acc[curr.subjectName] = curr.internal;
          return acc;
        }, {} as Record<string, number>);

      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: targetStudent.name,
          attendancePct: targetStudent.overallAttendance,
          subjects: subjects.map(s => s.name),
          internalMarks: Object.keys(studentInternalMarks).length > 0 ? studentInternalMarks : { "CS-501": 15, "CS-502": 14, "CS-504": 11 }
        })
      });

      const data = await res.json();
      if (data.success && data.predictions) {
        const pred = data.predictions;
        const newPrediction: AIPrediction = {
          studentId: targetStudent.id,
          studentName: targetStudent.name,
          subjectId: "all",
          subjectName: "Overall Performance",
          predictedMarks: pred.predictedFinalMarks,
          predictedAttendance: pred.projectedAttendance,
          riskCategory: pred.riskCategory,
          weakTopics: pred.weakSubjects || ["Key concepts under 70%"],
          recommendations: pred.studyRecommendations || ["Review weak units before term end."],
          generatedAt: new Date().toLocaleString()
        };

        setAiPredictions(prev => {
          const filtered = prev.filter(p => p.studentId !== targetStudent.id);
          return [newPrediction, ...filtered];
        });

        // Update student risk status
        setStudents(prev => prev.map(s => s.id === targetStudent.id ? { ...s, riskCategory: pred.riskCategory } : s));

        addNotification({
          type: "risk_alert",
          title: `AI Analysis Ready (${targetStudent.name})`,
          message: `Predicted Final: ${pred.predictedFinalMarks}%, Risk Level: ${pred.riskCategory}`,
          linkTab: "ai_analytics"
        });
      }
    } catch (err) {
      console.error("AI Prediction Error:", err);
    }
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...updated }));
    addNotification({
      type: "security",
      title: "Profile Updated",
      message: "Personal details & security preferences saved."
    });
  };

  const getStudentReportMetadata = (studentId: string): StudentReportMetadata => {
    if (reportMetadataMap[studentId]) {
      return reportMetadataMap[studentId];
    }
    return {
      studentId,
      reportId: `REP-${studentId.toUpperCase()}`,
      version: 1,
      lastGeneratedAt: new Date().toLocaleDateString("en-US", { dateStyle: "medium" }),
      history: [{ version: 1, generatedAt: new Date().toLocaleDateString("en-US", { dateStyle: "medium" }), reasonForRegeneration: "Initial report generation" }]
    };
  };

  const regenerateStudentReport = (studentId: string, reason?: string) => {
    simulateCloudSync();
    const currentMeta = getStudentReportMetadata(studentId);
    const newVer = currentMeta.version + 1;
    const nowStr = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    const updatedMeta: StudentReportMetadata = {
      ...currentMeta,
      version: newVer,
      lastGeneratedAt: nowStr,
      history: [
        {
          version: newVer,
          generatedAt: nowStr,
          reasonForRegeneration: reason || "Source data corrected & report regenerated"
        },
        ...(currentMeta.history || [])
      ]
    };

    setReportMetadataMap(prev => ({
      ...prev,
      [studentId]: updatedMeta
    }));

    addNotification({
      type: "announcement",
      title: "Performance Report Regenerated",
      message: `Student Performance Report updated to Version ${newVer} (${reason || "Data updated"}).`
    });

    return { version: newVer, generatedAt: nowStr };
  };

  const submitReportIssue = (issueData: {
    studentId: string;
    studentName?: string;
    studentEnrollmentNo?: string;
    divisionId?: string;
    reportId?: string;
    reportVersion?: number;
    category: ReportIssueCategory;
    description: string;
  }) => {
    simulateCloudSync();

    let actualStudentId = issueData.studentId;
    let actualStudentName = issueData.studentName;
    let actualEnrollmentNo = issueData.studentEnrollmentNo;
    let actualDivisionId = issueData.divisionId;

    if (currentUser.role === "student") {
      const studentObj = students.find(
        s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email
      );
      actualStudentId = studentObj?.id || currentUser.uid;
      actualStudentName = studentObj?.name || currentUser.name;
      actualEnrollmentNo = studentObj?.enrollmentNo || currentUser.enrollmentNo || "EN2026-CS-042";
      actualDivisionId = studentObj?.divisionId || currentUser.divisionId || "div_a";
    } else {
      const targetStudent = students.find(s => s.id === issueData.studentId || s.uid === issueData.studentId);
      if (targetStudent) {
        actualStudentId = targetStudent.id;
        actualStudentName = targetStudent.name;
        actualEnrollmentNo = targetStudent.enrollmentNo;
        actualDivisionId = targetStudent.divisionId;
      }
    }

    const meta = getStudentReportMetadata(actualStudentId);

    const issueId = `issue_${Date.now()}`;
    const newIssue: ReportIssue = {
      id: issueId,
      studentId: actualStudentId,
      studentName: actualStudentName || "Student",
      studentEnrollmentNo: actualEnrollmentNo || "N/A",
      divisionId: actualDivisionId || "div_a",
      reportId: issueData.reportId || meta.reportId,
      reportVersion: issueData.reportVersion || meta.version,
      category: issueData.category,
      description: issueData.description,
      submittedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      status: "Pending"
    };

    setReportIssues(prev => [newIssue, ...prev]);

    // Backend API verification endpoint call
    fetch("/api/rbac/report-issues/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterRole: currentUser.role,
        requesterStudentId: currentUser.role === "student" ? actualStudentId : undefined,
        targetStudentId: actualStudentId,
        category: issueData.category,
        description: issueData.description
      })
    }).catch(err => console.error("Report Issue Submit API error:", err));

    addNotification({
      type: "risk_alert",
      title: "Report Error Issue Submitted",
      message: `Your report error ticket (${issueData.category}) has been logged for review by Teachers and Administrators.`
    });

    return {
      success: true,
      message: "Your report error notification has been submitted successfully.",
      issueId
    };
  };

  const updateReportIssueStatus = (
    issueId: string,
    status: ReportIssueStatus,
    responseText?: string,
    correctedSourceType?: "mid_exam" | "attendance" | "assignment" | "student_info" | "other"
  ) => {
    simulateCloudSync();

    let targetStudentId = "";
    setReportIssues(prev =>
      prev.map(issue => {
        if (issue.id === issueId) {
          targetStudentId = issue.studentId;
          const isTeacher = currentUser.role === "teacher";
          const isAdmin = currentUser.role === "admin";

          return {
            ...issue,
            status,
            teacherResponse: isTeacher ? responseText || issue.teacherResponse : issue.teacherResponse,
            adminResponse: isAdmin ? responseText || issue.adminResponse : issue.adminResponse,
            resolvedAt: status === "Resolved" || status === "Rejected" ? new Date().toLocaleString() : issue.resolvedAt,
            resolvedBy: status === "Resolved" || status === "Rejected" ? currentUser.name : issue.resolvedBy,
            correctedSourceType: correctedSourceType || issue.correctedSourceType
          };
        }
        return issue;
      })
    );

    // Call API route
    fetch("/api/rbac/report-issues/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterRole: currentUser.role,
        issueId,
        status,
        responseText
      })
    }).catch(err => console.error("Report Issue Status Update API error:", err));

    if (targetStudentId) {
      addNotification({
        type: "attendance",
        title: `Report Issue Updated: ${status}`,
        message: `Your report error issue (#${issueId.slice(-6)}) status is now "${status}". ${
          responseText ? `Response: "${responseText}"` : ""
        }`
      });
    }
  };

  const getReportIssuesForStudent = (studentId: string): ReportIssue[] => {
    return reportIssues.filter(i => i.studentId === studentId);
  };

  const getReportIssuesForTeacher = (teacherId?: string): ReportIssue[] => {
    return reportIssues;
  };

  const getAllReportIssues = (): ReportIssue[] => {
    return reportIssues;
  };

  const correctStudentAttendanceRecord = ({
    studentId,
    subjectId,
    date,
    period,
    newStatus,
    reason,
    modifiedBy
  }: {
    studentId: string;
    subjectId: string;
    date: string;
    period: number;
    newStatus: "present" | "absent" | "late";
    reason?: string;
    modifiedBy: string;
  }) => {
    simulateCloudSync();
    const targetStudent = students.find(s => s.id === studentId || s.uid === studentId);
    const subjectObj = subjects.find(s => s.id === subjectId);
    const subjectName = subjectObj?.name || "Subject";

    if (!targetStudent) {
      return { success: false, message: "Student record not found." };
    }

    setAttendance(prev => {
      const existingIndex = prev.findIndex(
        r => r.subjectId === subjectId && r.date === date && (r.period === period || !period)
      );

      const newAudit = {
        timestamp: new Date().toLocaleString(),
        modifiedBy,
        details: `Corrected attendance for ${targetStudent.name} (${targetStudent.enrollmentNo}) on ${date} (Period ${period}) to '${newStatus.toUpperCase()}'. Reason: ${reason || "Correction Ticket"}`
      };

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const presents = existing.presentStudentIds.filter(id => id !== targetStudent.id);
        const absents = existing.absentStudentIds.filter(id => id !== targetStudent.id);
        const lates = (existing.lateStudentIds || []).filter(id => id !== targetStudent.id);

        if (newStatus === "present") presents.push(targetStudent.id);
        else if (newStatus === "absent") absents.push(targetStudent.id);
        else if (newStatus === "late") lates.push(targetStudent.id);

        const updatedRecord: AttendanceRecord = {
          ...existing,
          presentStudentIds: presents,
          absentStudentIds: absents,
          lateStudentIds: lates,
          updatedAt: new Date().toISOString().split("T")[0],
          updatedBy: modifiedBy,
          auditTrail: [newAudit, ...(existing.auditTrail || [])]
        };

        const next = [...prev];
        next[existingIndex] = updatedRecord;
        return next;
      } else {
        const presents: string[] = [];
        const absents: string[] = [];
        const lates: string[] = [];

        if (newStatus === "present") presents.push(targetStudent.id);
        else if (newStatus === "absent") absents.push(targetStudent.id);
        else if (newStatus === "late") lates.push(targetStudent.id);

        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          subjectId,
          subjectName,
          divisionId: targetStudent.divisionId || "div_a",
          date,
          period: period || 1,
          timeSlot: `Period ${period || 1}`,
          recordedBy: modifiedBy,
          presentStudentIds: presents,
          absentStudentIds: absents,
          lateStudentIds: lates,
          notes: `Correction: ${reason || "Attendance record updated"}`,
          updatedAt: new Date().toISOString().split("T")[0],
          auditTrail: [newAudit]
        };
        return [newRecord, ...prev];
      }
    });

    setTimeout(() => {
      setStudents(prevStudents =>
        prevStudents.map(s => {
          if (s.id !== targetStudent.id) return s;
          const studentRecords = attendance.filter(
            a =>
              a.presentStudentIds.includes(s.id) ||
              a.absentStudentIds.includes(s.id) ||
              a.lateStudentIds?.includes(s.id)
          );
          if (studentRecords.length === 0) return s;

          let presentCount = 0;
          let lateCount = 0;
          studentRecords.forEach(r => {
            if (r.presentStudentIds.includes(s.id)) presentCount++;
            else if (r.lateStudentIds?.includes(s.id)) lateCount++;
          });

          const totalSessions = studentRecords.length;
          const weightedScore = presentCount + lateCount * 0.5;
          const pct = Math.min(100, Math.round((weightedScore / totalSessions) * 100));

          return {
            ...s,
            overallAttendance: pct,
            riskCategory: pct < 75 ? "High" : pct < 85 ? "Medium" : "Low"
          };
        })
      );
    }, 50);

    addNotification({
      type: "attendance",
      title: "Attendance Record Corrected",
      message: `Your attendance correction request for ${subjectName} on ${date} has been reviewed and corrected to '${newStatus.toUpperCase()}'. Your performance report has been regenerated.`
    });

    const newAuditLog: UserAuditLog = {
      id: `audit_${Date.now()}`,
      action: "Attendance Corrected",
      performedBy: modifiedBy,
      targetUser: targetStudent.name,
      details: `Corrected ${subjectName} attendance for ${date} (Period ${period}) to ${newStatus}.`,
      timestamp: new Date().toLocaleString()
    };
    setAuditLogs(prev => [newAuditLog, ...prev]);

    return {
      success: true,
      message: `Attendance record corrected for ${subjectName} on ${date}.`
    };
  };

  const updateStudentProfileInfo = (
    studentId: string,
    info: { name?: string; enrollmentNo?: string; divisionId?: string; email?: string }
  ) => {
    simulateCloudSync();
    setStudents(prev =>
      prev.map(s => {
        if (s.id === studentId || s.uid === studentId) {
          return {
            ...s,
            name: info.name || s.name,
            enrollmentNo: info.enrollmentNo || s.enrollmentNo,
            divisionId: info.divisionId || s.divisionId,
            email: info.email || s.email
          };
        }
        return s;
      })
    );

    addNotification({
      type: "security",
      title: "Student Profile Details Corrected",
      message: `Updated profile record for student ID ${studentId}.`
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        auditLogs,
        role: currentUser.role,
        switchRole,
        canAccessTab,
        changeUserRole,
        toggleUserStatus,
        addUser,
        theme,
        toggleTheme,
        cloudSyncStatus,
        isOffline,
        toggleOfflineMode,
        selectedSemesterId,
        switchSemester,
        selectedSemester,
        filteredStudents,
        filteredSubjects,
        filteredAttendance,
        filteredMarks,
        filteredAssignments,
        filteredReportIssues,
        notifications,
        unreadNotifCount,
        markNotificationRead,
        clearAllNotifications,
        addNotification,
        semesters,
        divisions,
        subjects,
        students,
        attendance,
        marks,
        assignments,
        submissions,
        studyMaterials,
        timetable,
        announcements,
        aiPredictions,
        personalFiles,
        securityAlerts,
        midExamMarks,
        weightConfig,
        reportIssues,
        reportMetadataMap,
        mfaModalOpen,
        mfaActionTitle,
        mfaPendingAction,
        triggerBiometricVerification,
        closeMfaModal,
        confirmMfaModal,
        markAttendance,
        saveDailyAttendance,
        getStudentSubjectAttendance,
        getStudentOverallAttendanceSummary,
        updateMarks,
        updateMidExamMark,
        updateWeightConfig,
        addAssignment,
        submitAssignment,
        evaluateSubmission,
        addStudyMaterial,
        postAnnouncement,
        addStudent,
        bulkImportStudents,
        addPersonalFile,
        generateAIPredictionForStudent,
        updateProfile,
        submitReportIssue,
        updateReportIssueStatus,
        regenerateStudentReport,
        getStudentReportMetadata,
        getReportIssuesForStudent,
        getReportIssuesForTeacher,
        getAllReportIssues,
        correctStudentAttendanceRecord,
        updateStudentProfileInfo
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
