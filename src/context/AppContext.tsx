import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import { firebaseAuth } from "../firebase";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "../lib/apiClient";
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

/** Real Firebase-authenticated session state (Phase 3). */
export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AppContextType {
  currentUser: UserProfile;
  users: UserProfile[];
  auditLogs: UserAuditLog[];
  role: UserRole;
  authStatus: AuthStatus;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  canAccessTab: (tabId: string, checkRole?: UserRole) => boolean;
  changeUserRole: (targetUid: string, newRole: UserRole) => Promise<{ success: boolean; message?: string }>;
  toggleUserStatus: (targetUid: string) => Promise<void>;
  getDivisionsForSemester: (semesterId: string) => Promise<Division[]>;
  addUser: (user: Partial<UserProfile>) => Promise<boolean>;
  createEnrollment: (params: {
    studentId: string;
    semesterId: string;
    divisionId: string;
    subjectIds?: string[];
  }) => Promise<{ success: boolean; message?: string }>;
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
  markAttendance: (record: Omit<AttendanceRecord, "id">) => Promise<{ success: boolean; isUpdate: boolean; message: string }>;
  saveDailyAttendance: (record: {
    subjectId: string;
    subjectName?: string;
    divisionId: string;
    semesterId?: string;
    sessionId?: string;
    teacherId?: string;
    sessionType?: "lecture" | "lab" | "extra";
    targetDivisionIds?: string[];
    date: string;
    period: number;
    timeSlot?: string;
    recordedBy: string;
    presentStudentIds: string[];
    absentStudentIds: string[];
    lateStudentIds?: string[];
    notes?: string;
  }) => Promise<{ success: boolean; isUpdate: boolean; message: string }>;
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
  updateMarks: (newMark: SubjectMarks) => Promise<{ success: boolean; message: string }>;
  addAssignment: (assignment: Omit<Assignment, "id" | "createdAt">) => Promise<{ success: boolean; message: string; assignment?: Assignment }>;
  submitAssignment: (sub: Omit<Submission, "id" | "submittedAt" | "status">) => Promise<{ success: boolean; message: string }>;
  evaluateSubmission: (submissionId: string, grade: number, feedback: string) => Promise<{ success: boolean; message: string }>;
  updateAssignment: (assignmentId: string, updates: Partial<Assignment>) => Promise<{ success: boolean; message: string; assignment?: Assignment }>;
  deleteAssignment: (assignmentId: string) => Promise<{ success: boolean; message: string }>;
  addStudyMaterial: (mat: Omit<StudyMaterial, "id" | "createdAt">) => void;
  postAnnouncement: (ann: Omit<Announcement, "id" | "timestamp">) => void;
  addStudent: (stu: Omit<StudentRecord, "id">) => void;
  bulkImportStudents: (studentsList: Array<Omit<StudentRecord, "id">>) => void;
  addPersonalFile: (file: Omit<PersonalFile, "id" | "uploadedAt">) => void;
  generateAIPredictionForStudent: (studentId: string) => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => void;
  updateMidExamMark: (record: MidExamMarks) => Promise<{ success: boolean; message: string }>;
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
}) => Promise<{ success: boolean; message: string; issueId: string }>;
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
  }) => Promise<{ success: boolean; message: string }>;
  updateStudentProfileInfo: (
    studentId: string,
    info: {
      name?: string;
      enrollmentNo?: string;
      divisionId?: string;
      divisionName?: string;
      semesterId?: string;
      email?: string;
      status?: "Active" | "Inactive";
    }
  ) => Promise<void>;

regenerateStudentReport: (
  studentId: string,
  reason?: string
) => Promise<{ version: number; generatedAt: string }>;

  getStudentReportMetadata: (studentId: string) => StudentReportMetadata;
  getReportIssuesForStudent: (studentId: string) => ReportIssue[];
  getReportIssuesForTeacher: (teacherId?: string) => ReportIssue[];
  getAllReportIssues: () => ReportIssue[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Placeholder shown only while authStatus is "loading" or "unauthenticated" — App.tsx's
 * AuthGate never renders MainAppContent (and therefore nothing that reads currentUser)
 * in either of those states, so this value is never actually displayed to anyone. It exists
 * purely so `currentUser` can keep its non-null UserProfile type without a null-check ripple
 * across every existing component. This is NOT a fallback identity in the stu_1/Alex Morgan
 * sense — it never stands in for a failed lookup of a real user; it only exists before any
 * user has signed in at all.
 */
const UNAUTHENTICATED_PLACEHOLDER_USER: UserProfile = {
  uid: "",
  name: "",
  email: "",
  role: "student"
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>(initialAuditLogs);
  const [currentUser, setCurrentUser] = useState<UserProfile>(UNAUTHENTICATED_PLACEHOLDER_USER);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline">("synced");
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Fetches the caller's own profile from the backend using a fresh Firebase ID token,
   * and populates currentUser from that verified, server-derived data — never from any
   * client-side default or role switcher.
   */
  const loadSessionProfile = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const idToken = await fbUser.getIdToken();
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Account authenticated with Firebase but has no provisioned Firestore profile,
        // or some other server-side rejection. Do NOT fall back to a default identity —
        // sign the user back out and surface a clear error instead.
        setAuthError(data.error || "Your account could not be verified. Contact an administrator.");
        await signOut(firebaseAuth);
        setCurrentUser(UNAUTHENTICATED_PLACEHOLDER_USER);
        setAuthStatus("unauthenticated");
        return;
      }

      setAuthError(null);
      setCurrentUser(data.user as UserProfile);
      setAuthStatus("authenticated");
    } catch (err: any) {
      console.error("Failed to load session profile:", err);
      setAuthError(err?.message || "Failed to verify your session. Please try signing in again.");
      await signOut(firebaseAuth).catch(() => {});
      setCurrentUser(UNAUTHENTICATED_PLACEHOLDER_USER);
      setAuthStatus("unauthenticated");
    }
  }, []);

  // Subscribes to Firebase's own auth state — this is the single source of truth for
  // whether anyone is signed in, replacing the old "default to admin" behavior entirely.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setAuthStatus("loading");
        loadSessionProfile(fbUser);
      } else {
        setCurrentUser(UNAUTHENTICATED_PLACEHOLDER_USER);
        setAuthStatus("unauthenticated");
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, [loadSessionProfile]);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // onAuthStateChanged above picks up the result and loads the session profile.
      return { success: true };
    } catch (err: any) {
      const message =
        err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found"
          ? "Incorrect email or password."
          : err?.message || "Sign-in failed.";
      setAuthError(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    await signOut(firebaseAuth);
    setCurrentUser(UNAUTHENTICATED_PLACEHOLDER_USER);
    setAuthStatus("unauthenticated");
  };

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
      semesterId: "sem_5",
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
      semesterId: "sem_5",
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
  
const loadReportIssues = async () => {
  if (
    authStatus !== "authenticated" ||
    (currentUser.role !== "teacher" && currentUser.role !== "admin") ||
    !selectedSemesterId
  ) {
    return;
  }

  try {
    const res = await apiGet<{ items: ReportIssue[] }>(
      `/api/reports/issues?semesterId=${encodeURIComponent(selectedSemesterId)}`
    );

    setReportIssues(res.items);
  } catch (err) {
    console.error("Failed to load report issues:", err);
    addNotification({
      type: "security",
      title: "Failed to Load Report Issues",
      message:
        err instanceof Error
          ? err.message
          : "Could not load report issues from the server."
    });
  }
};

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

  // Active Semester State & Calculations.
  // PHASE 4: default is now "" rather than the old hardcoded "sem_5" — that ID was a
  // mockData.ts artifact and would never match a real Firestore-generated semester ID.
  // The semester-loading effect below resolves this to a real semester once fetched
  // (preferring whichever semester has isActive === true).
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

  const switchSemester = (semId: string) => {
    setSelectedSemesterId(semId);
  };

  /* ==========================================================================================
   * PHASE 4 DATA LOADING — real Firestore-backed data via the Express API, replacing mockData
   * as the source of truth for users/students/teachers/semesters/divisions/subjects.
   *
   * These populate the SAME useState arrays (`semesters`, `divisions`, `subjects`, `students`,
   * `users`) that every existing component already reads via useApp() — so no component JSX
   * changes are needed. Switching semesters (switchSemester → setSelectedSemesterId above)
   * triggers a real backend refetch scoped to the new semesterId, not a client-side filter
   * over a static mock array, per the semester-isolation requirement.
   *
   * mockData.ts is NOT deleted and still seeds attendance/marks/assignments/reportIssues/etc,
   * which remain out of scope for Phase 4 (attendance, marks, mid-exam, assignments, reports
   * are explicitly deferred to later phases).
   * ========================================================================================== */

  // Load the semester list once authenticated (every role needs it for dropdowns/filters).
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiGet<{ items: Semester[] }>("/api/semesters?limit=100");
        if (cancelled) return;
        setSemesters(res.items);
        setSelectedSemesterId(prev => {
          if (prev && res.items.some(s => s.id === prev)) return prev;
          const active = res.items.find(s => s.isActive);
          return active?.id || res.items[0]?.id || "";
        });
      } catch (err: any) {
        console.error("Failed to load semesters:", err);
        addNotification({
          type: "security",
          title: "Failed to Load Semesters",
          message: err?.message || "Could not reach the server."
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  // Load divisions + subjects scoped to the active semester whenever it changes.
  useEffect(() => {
    if (authStatus !== "authenticated" || !selectedSemesterId) return;
    let cancelled = false;

    (async () => {
      try {
        const [divRes, subjRes] = await Promise.all([
          apiGet<{ items: Division[] }>(`/api/divisions?semesterId=${selectedSemesterId}&limit=100`),
          apiGet<{ items: Subject[] }>(`/api/subjects?semesterId=${selectedSemesterId}&limit=200`)
        ]);
        if (cancelled) return;
        setDivisions(divRes.items);
        setSubjects(subjRes.items);
      } catch (err: any) {
        console.error("Failed to load divisions/subjects:", err);
        addNotification({
          type: "security",
          title: "Failed to Load Semester Data",
          message: err?.message || "Could not load divisions/subjects for this semester."
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, selectedSemesterId]);
  
  // Load report issues whenever the authenticated user or semester changes.
  useEffect(() => {
    if (
      authStatus !== "authenticated" ||
      !selectedSemesterId ||
      (currentUser.role !== "teacher" && currentUser.role !== "admin")
    ) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiGet<{ items: ReportIssue[] }>(
          `/api/reports/issues?semesterId=${encodeURIComponent(selectedSemesterId)}`
        );

        if (cancelled) return;
        setReportIssues(res.items);
      } catch (err: unknown) {
        if (cancelled) return;

        console.error("Failed to load report issues:", err);
        addNotification({
          type: "security",
          title: "Failed to Load Report Issues",
          message:
            err instanceof Error
              ? err.message
              : "Could not load report issues from the server."
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, currentUser.role, selectedSemesterId]);


  /**
   * Loads the student roster for the current viewer:
   *   - student role  → their OWN record only, via /api/students/me (never a client-supplied
   *     studentId, never a fallback to another student). A 404 here means "no student profile
   *     provisioned yet" — a legitimate empty state, not an error to alarm the user with.
   *   - teacher/admin → the roster for the active semester, via /api/students?semesterId=.
   * Exposed as a stable function so addStudent/bulkImportStudents can refresh the roster
   * after a successful write without duplicating this fetch logic.
   */
  const loadStudents = useCallback(async () => {
    if (authStatus !== "authenticated") return;

    try {
      if (currentUser.role === "student") {
        const res = await apiGet<{ student: StudentRecord }>("/api/students/me");
        setStudents([res.student]);
        // A student's own semester context should always reflect their real enrollment,
        // never an admin/teacher's last-selected semester.
        if (res.student.semesterId && res.student.semesterId !== selectedSemesterId) {
          setSelectedSemesterId(res.student.semesterId);
        }
      } else if (currentUser.role === "teacher" || currentUser.role === "admin") {
        if (!selectedSemesterId) return;
        const res = await apiGet<{ items: StudentRecord[] }>(
          `/api/students?semesterId=${selectedSemesterId}&limit=200`
        );
        setStudents(res.items);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        // No student profile provisioned yet for this account — legitimate empty state.
        setStudents([]);
        return;
      }
      console.error("Failed to load students:", err);
      addNotification({
        type: "security",
        title: "Failed to Load Students",
        message: err?.message || "Could not reach the server."
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, currentUser.role, currentUser.uid, selectedSemesterId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /**
   * PHASE 5: load attendance from the real Express/Firestore API for the active semester.
   * Students are always self-scoped by the backend; teachers/admins receive only the
   * attendance they are authorized to access. The UI continues consuming the same local
   * `attendance` array, but its source of truth is now Firestore after authentication.
   */
  const loadAttendance = useCallback(async () => {
    if (authStatus !== "authenticated" || !selectedSemesterId) return;

    try {
      const res = await apiGet<{ items: AttendanceRecord[] }>(
        `/api/attendance?semesterId=${encodeURIComponent(selectedSemesterId)}`
      );
      setAttendance(res.items);
    } catch (err: unknown) {
      console.error("Failed to load attendance:", err);
      setAttendance([]);
      addNotification({
        type: "security",
        title: "Failed to Load Attendance",
        message: err instanceof Error ? err.message : "Could not load attendance from the server."
      });
    }
  }, [authStatus, selectedSemesterId, currentUser.role]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // PHASE 7: assignments and submissions now come from Firestore-backed APIs.
  const loadAssignments = useCallback(async () => {
    if (authStatus !== "authenticated" || !selectedSemesterId) return;

    // Keep assignment visibility independent from submission loading. A submission-query
    // failure must never make a published assignment disappear from the student's screen.
    try {
      const assignmentRes = await apiGet<{ items: Assignment[] }>(
        `/api/assignments?semesterId=${encodeURIComponent(selectedSemesterId)}`
      );
      setAssignments(assignmentRes.items);
    } catch (err: unknown) {
      console.error("Failed to load assignments:", err);
      setAssignments([]);
      addNotification({
        type: "security",
        title: "Failed to Load Assignments",
        message: err instanceof Error ? err.message : "Could not load assignments from the server."
      });
    }

    try {
      const submissionRes = await apiGet<{ items: Submission[] }>(
        `/api/assignments/submissions?semesterId=${encodeURIComponent(selectedSemesterId)}`
      );
      setSubmissions(submissionRes.items);
    } catch (err: unknown) {
      console.error("Failed to load assignment submissions:", err);
      setSubmissions([]);
      addNotification({
        type: "security",
        title: "Failed to Load Submissions",
        message: err instanceof Error ? err.message : "Could not load assignment submissions from the server."
      });
    }
  }, [authStatus, selectedSemesterId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Admin-only: load the full user list for user management screens.
  useEffect(() => {
    if (authStatus !== "authenticated" || currentUser.role !== "admin") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiGet<{ items: UserProfile[] }>("/api/users?limit=200");
        if (cancelled) return;
        setUsers(res.items);
      } catch (err: any) {
        console.error("Failed to load users:", err);
        addNotification({
          type: "security",
          title: "Failed to Load Users",
          message: err?.message || "Could not reach the server."
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, currentUser.role]);

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
      att.semesterId === selectedSemesterId &&
      filteredSubjects.some(s => s.id === att.subjectId)
    );
  }, [attendance, filteredSubjects, selectedSemesterId]);

  const filteredMarks = useMemo(() => {
    return marks.filter(m => m.semesterId === selectedSemesterId || (!m.semesterId && subjects.some(s => s.id === m.subjectId && s.semesterId === selectedSemesterId)));
  }, [marks, subjects, selectedSemesterId]);

  const filteredAssignments = useMemo(() => {
    // Assignment visibility is already authorized and semester-scoped by the backend.
    // Do not require the separately loaded subject list here: a temporary subject fetch
    // failure must not hide a valid published assignment from the student.
    return assignments.filter(a => !a.semesterId || a.semesterId === selectedSemesterId);
  }, [assignments, selectedSemesterId]);

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

  /**
   * PHASE 3 CHANGE: this used to let anyone become any demo user just by picking a role
   * from the Header dropdown — effectively a client-side fake login with no verification.
   * That directly contradicts "never trust a client-asserted role," so it no longer changes
   * who you're signed in as. The dropdown UI is left in place unchanged (see Header.tsx);
   * clicking an option now just explains how real role changes work. Real role assignment
   * happens server-side via an admin (Firestore users/{uid}.role + a refreshed custom claim),
   * to be wired up to this UI in a later phase.
   */
  const switchRole = (newRole: UserRole) => {
    if (newRole === currentUser.role) return;

    addNotification({
      type: "security",
      title: "Role Switch Unavailable",
      message: "Your role is assigned by an administrator and verified by the server — it can't be changed from this menu."
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
      // PHASE 4: real backend call — server derives the requester's identity/role from the
      // verified Firebase ID token attached by apiPatch, never from anything sent in the body.
      const data = await apiPatch<{ success: boolean; role: UserRole }>(
        `/api/users/${targetUid}/role`,
        { role: newRole }
      );

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

      return { success: true, message: `Role updated to ${data.role}.` };
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
      // PHASE 4: real backend call — this is what actually blocks a suspended user's API
      // access immediately (backend/middleware/auth.ts checks Firestore status on every
      // request), not just a cosmetic label change in local state.
      await apiPatch(`/api/users/${targetUid}/status`, { status: nextStatus });

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
    } catch (err: any) {
      console.error("Toggle Status Error:", err);
      addNotification({
        type: "security",
        title: "Status Change Failed",
        message: err?.message || "Failed to update account status."
      });
    }
  };

  const getDivisionsForSemester = useCallback(async (semesterId: string): Promise<Division[]> => {
    if (!semesterId || authStatus !== "authenticated") return [];
    const res = await apiGet<{ items: Division[] }>(
      `/api/divisions?semesterId=${encodeURIComponent(semesterId)}&limit=100`
    );
    return res.items;
  }, [authStatus]);

  const addUser = async (user: Partial<UserProfile>) => {
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can provision new user accounts."
      });
      return false;
    }

    try {
      // PHASE 4: real backend call. The server creates the Firebase Auth account, the
      // users/{uid} document, and — when role is "student" — the students/{uid} and
      // enrollments/{uid}_{semesterId} documents together, using the REAL Firebase Auth
      // uid throughout. There is no client-generated `user_${Date.now()}` id anymore, and
      // no "div_a" default: divisionId/semesterId are required fields on the request when
      // role is "student" (see the Division/Semester fields added to the Add User form in
      // UserManagementView.tsx).
      const payload: Record<string, unknown> = {
        name: user.name,
        email: user.email,
        role: user.role || "student",
        department: user.department
      };
      if ((user.role || "student") === "student") {
        payload.enrollmentNo = user.enrollmentNo;
        payload.divisionId = (user as any).divisionId;
        payload.semesterId = (user as any).semesterId;
      }

      const data = await apiPost<{
        user: UserProfile;
        student?: StudentRecord;
        tempPassword: string;
      }>("/api/users", payload);

      setUsers(prev => [...prev, data.user]);
      if (data.student) {
        setStudents(prev => [...prev, data.student as StudentRecord]);
      }

      const newAudit: UserAuditLog = {
        id: `audit_${Date.now()}`,
        action: "Account Provisioned",
        performedBy: currentUser.name,
        targetUser: data.user.name,
        details: `Provisioned account with initial role '${data.user.role.toUpperCase()}'.`,
        timestamp: new Date().toLocaleString()
      };
      setAuditLogs(prev => [newAudit, ...prev]);

      addNotification({
        type: "security",
        title: "User Account Provisioned",
        message: `Created account for ${data.user.name} (${data.user.role.toUpperCase()}). Temporary password: ${data.tempPassword}`
      });
      return true;
    } catch (err: any) {
      console.error("Add User Error:", err);
      addNotification({
        type: "security",
        title: "Failed to Create User",
        message: err?.message || "Could not create the account."
      });
      return false;
    }
  };

  const createEnrollment = async (params: {
    studentId: string;
    semesterId: string;
    divisionId: string;
    subjectIds?: string[];
  }) => {
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can manage student enrollments."
      });
      return { success: false, message: "Forbidden: Only Administrators can manage enrollments." };
    }

    try {
      await apiPost("/api/enrollments", params);
      addNotification({
        type: "security",
        title: "Enrollment Saved",
        message: "Student enrollment updated for the selected semester."
      });
      if (params.semesterId === selectedSemesterId) {
        await loadStudents();
      }
      return { success: true };
    } catch (err: any) {
      console.error("Create Enrollment Error:", err);
      addNotification({
        type: "security",
        title: "Enrollment Failed",
        message: err?.message || "Could not save the enrollment."
      });
      return { success: false, message: err?.message };
    }
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
  const markAttendance = async (record: Omit<AttendanceRecord, "id">) => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      return { success: false, isUpdate: false, message: "Only teachers and administrators can record attendance." };
    }

    try {
      const data = await apiPost<{
        success: boolean;
        isUpdate: boolean;
        message: string;
        attendance: AttendanceRecord;
      }>("/api/attendance", {
        ...record,
        semesterId: record.semesterId || selectedSemesterId,
        recordedBy: currentUser.uid,
        teacherId: record.teacherId || (currentUser.role === "teacher" ? currentUser.uid : undefined),
      });

      setAttendance(prev => {
        const index = prev.findIndex(item => item.id === data.attendance.id);
        if (index < 0) return [data.attendance, ...prev];
        const next = [...prev];
        next[index] = data.attendance;
        return next;
      });

      await loadStudents();
      addNotification({
        type: "attendance",
        title: data.isUpdate ? "Attendance Record Updated" : "Attendance Recorded",
        message: data.message
      });

      return { success: true, isUpdate: data.isUpdate, message: data.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Failed to save attendance.";
      addNotification({ type: "security", title: "Attendance Save Failed", message });
      return { success: false, isUpdate: false, message };
    }
  };

  const saveDailyAttendance = async (record: {
    subjectId: string;
    subjectName?: string;
    divisionId: string;
    semesterId?: string;
    sessionId?: string;
    teacherId?: string;
    sessionType?: "lecture" | "lab" | "extra";
    targetDivisionIds?: string[];
    date: string;
    period: number;
    timeSlot?: string;
    recordedBy: string;
    presentStudentIds: string[];
    absentStudentIds: string[];
    lateStudentIds?: string[];
    notes?: string;
  }) => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      const message = "Only teachers and administrators can record attendance.";
      addNotification({ type: "security", title: "Attendance Save Failed", message });
      return { success: false, isUpdate: false, message };
    }

    try {
      const data = await apiPost<{
        success: boolean;
        isUpdate: boolean;
        message: string;
        attendance: AttendanceRecord;
      }>("/api/attendance", {
        ...record,
        semesterId: record.semesterId || selectedSemesterId,
        recordedBy: currentUser.uid,
        teacherId: record.teacherId || (currentUser.role === "teacher" ? currentUser.uid : undefined),
      });

      setAttendance(prev => {
        const index = prev.findIndex(item => item.id === data.attendance.id);
        if (index < 0) return [data.attendance, ...prev];
        const next = [...prev];
        next[index] = data.attendance;
        return next;
      });

      await loadStudents();
      addNotification({
        type: "attendance",
        title: data.isUpdate ? "Attendance Record Updated" : "Daily Attendance Saved",
        message: `${data.message} Present: ${data.attendance.presentStudentIds.length}, Absent: ${data.attendance.absentStudentIds.length}, Late: ${data.attendance.lateStudentIds?.length || 0}`
      });

      return { success: true, isUpdate: data.isUpdate, message: data.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Failed to save attendance.";
      addNotification({ type: "security", title: "Attendance Save Failed", message });
      return { success: false, isUpdate: false, message };
    }
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

    const targetSemesterId = targetStudent.semesterId || selectedSemesterId;
    const subjectRecords = attendance.filter(
      r =>
        r.subjectId === subjectId &&
        r.semesterId === targetSemesterId &&
        (r.presentStudentIds.includes(targetStudent.id) ||
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

  const loadMarks = useCallback(async () => {
    if (authStatus !== "authenticated" || !selectedSemesterId) return;
    try {
      const [marksRes, midRes] = await Promise.all([
        apiGet<{ items: SubjectMarks[] }>(`/api/marks?semesterId=${encodeURIComponent(selectedSemesterId)}`),
        apiGet<{ items: MidExamMarks[] }>(`/api/mid-exam-marks?semesterId=${encodeURIComponent(selectedSemesterId)}`)
      ]);
      setMarks(marksRes.items);
      setMidExamMarks(midRes.items);
    } catch (err: unknown) {
      console.error("Failed to load marks:", err);
      setMarks([]);
      setMidExamMarks([]);
      addNotification({ type: "security", title: "Failed to Load Marks", message: err instanceof Error ? err.message : "Could not load marks from the server." });
    }
  }, [authStatus, selectedSemesterId]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  const updateMarks = async (newMark: SubjectMarks) => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      return { success: false, message: "Forbidden: Only teachers and administrators can update marks." };
    }
    const student = students.find(s => s.id === newMark.studentId || s.uid === newMark.studentId);
    const semesterId = newMark.semesterId || selectedSemesterId;
    const divisionId = newMark.divisionId || student?.divisionId;
    if (!semesterId || !divisionId) return { success: false, message: "Semester and division context are required." };
    try {
      const data = await apiPost<{ success: boolean; mark: SubjectMarks }>("/api/marks", {
        studentId: newMark.studentId, enrollmentNo: student?.enrollmentNo, subjectId: newMark.subjectId, semesterId, divisionId,
        internal: newMark.internal, practical: newMark.practical, termEnd: newMark.termEnd,
        recordedBy: currentUser.uid
      });
      setMarks(prev => [...prev.filter(m => m.id !== data.mark.id && !(m.studentId === data.mark.studentId && m.subjectId === data.mark.subjectId && m.semesterId === data.mark.semesterId)), data.mark]);
      await loadMarks();
      addNotification({ type: "assignment", title: "Marks Updated", message: `Updated marks for ${data.mark.subjectName}: Total ${data.mark.total}/100 (${data.mark.grade})` });
      return { success: true, message: "Marks saved successfully." };
    } catch (err: unknown) {
      const message = err instanceof ApiError && typeof err.body?.details === "string"
        ? `${err.message} (${err.body.details})`
        : err instanceof Error ? err.message : "Failed to save marks.";
      addNotification({ type: "security", title: "Marks Save Failed", message });
      return { success: false, message };
    }
  };

  const updateMidExamMark = async (record: MidExamMarks) => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") return { success: false, message: "Forbidden: Only teachers and administrators can update marks." };
    const student = students.find(s => s.id === record.studentId || s.uid === record.studentId);
    const semesterId = record.semesterId || selectedSemesterId;
    const divisionId = record.divisionId || student?.divisionId;
    if (!semesterId || !divisionId) return { success: false, message: "Semester and division context are required." };
    try {
      const data = await apiPost<{ success: boolean; mark: MidExamMarks }>("/api/mid-exam-marks", {
        studentId: record.studentId, enrollmentNo: student?.enrollmentNo, subjectId: record.subjectId, semesterId, divisionId, score: record.score, maxScore: 30,
        examDate: record.examDate, academicPeriod: record.academicPeriod, recordedBy: currentUser.uid
      });
      setMidExamMarks(prev => [...prev.filter(m => m.id !== data.mark.id && !(m.studentId === data.mark.studentId && m.subjectId === data.mark.subjectId && m.semesterId === data.mark.semesterId)), data.mark]);
      // Re-read the server after a successful write so tab switches/re-renders never
      // fall back to stale in-memory values.
      await loadMarks();
      addNotification({ type: "assignment", title: "Mid Examination Mark Recorded", message: `Score recorded: ${data.mark.score}/${data.mark.maxScore} (${Math.round((data.mark.score / (data.mark.maxScore || 30)) * 100)}%) for ${data.mark.subjectName}` });
      return { success: true, message: "Mid Exam mark saved successfully." };
    } catch (err: unknown) {
      const message = err instanceof ApiError && typeof err.body?.details === "string"
        ? `${err.message} (${err.body.details})`
        : err instanceof Error ? err.message : "Failed to save Mid Exam mark.";
      addNotification({ type: "security", title: "Mid Exam Save Failed", message });
      return { success: false, message };
    }
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

  const addAssignment = async (assignment: Omit<Assignment, "id" | "createdAt">): Promise<{ success: boolean; message: string; assignment?: Assignment }> => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      return { success: false, message: "Only teachers and admins can publish assignments." };
    }
    try {
      const res = await apiPost<{ assignment: Assignment }>("/api/assignments", {
        ...assignment,
        semesterId: assignment.semesterId || selectedSemesterId,
      });
      setAssignments(prev => [res.assignment, ...prev.filter(a => a.id !== res.assignment.id)]);
      addNotification({
        type: "assignment",
        title: "New Assignment Posted",
        message: `${res.assignment.title} due on ${res.assignment.dueDate}`,
        linkTab: "assignments"
      });
      return { success: true, message: "Assignment published successfully.", assignment: res.assignment };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to publish assignment." };
    }
  };

  const updateAssignment = async (assignmentId: string, updates: Partial<Assignment>): Promise<{ success: boolean; message: string; assignment?: Assignment }> => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") return { success: false, message: "Only teachers and admins can edit assignments." };
    try {
      const res = await apiPatch<{ assignment: Assignment }>(`/api/assignments/${encodeURIComponent(assignmentId)}`, updates);
      setAssignments(prev => prev.map(a => a.id === assignmentId ? res.assignment : a));
      return { success: true, message: "Assignment updated successfully.", assignment: res.assignment };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to update assignment." };
    }
  };

  const deleteAssignment = async (assignmentId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") return { success: false, message: "Only teachers and admins can delete assignments." };
    try {
      await apiDelete(`/api/assignments/${encodeURIComponent(assignmentId)}`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      setSubmissions(prev => prev.filter(s => s.assignmentId !== assignmentId));
      return { success: true, message: "Assignment deleted successfully." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to delete assignment." };
    }
  };

  const submitAssignment = async (sub: Omit<Submission, "id" | "submittedAt" | "status">): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== "student") return { success: false, message: "Only students can submit assignments." };
    try {
      const res = await apiPost<{ submission: Submission }>("/api/assignments/submissions", sub);
      setSubmissions(prev => [res.submission, ...prev.filter(s => s.id !== res.submission.id)]);
      addNotification({
        type: "assignment",
        title: "Assignment Solution Uploaded",
        message: `Successfully submitted ${sub.fileName}`
      });
      return { success: true, message: "Assignment submitted successfully." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to submit assignment." };
    }
  };

  const evaluateSubmission = async (submissionId: string, grade: number, feedback: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") return { success: false, message: "Only teachers and admins can evaluate submissions." };
    try {
      const res = await apiPatch<{ submission: Submission }>(`/api/assignments/submissions/${encodeURIComponent(submissionId)}/evaluate`, { grade, feedback });
      setSubmissions(prev => prev.map(s => s.id === submissionId ? res.submission : s));
      addNotification({
        type: "assignment",
        title: "Submission Graded",
        message: `Evaluation completed with score ${grade} pts.`
      });
      return { success: true, message: "Submission evaluated successfully." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to evaluate submission." };
    }
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
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can register new students."
      });
      return;
    }

    // PHASE 4: this UI passes a client-fabricated `stu_${Date.now()}` uid (see
    // SemesterStudentManager.tsx) and no semesterId — neither is trustworthy for a real
    // Firestore identity. The caller's uid is ignored entirely; the backend creates the
    // REAL Firebase Auth account and returns its real uid. semesterId defaults to whatever
    // semester is currently selected in the UI (a real, active application-level context —
    // not a hardcoded fallback like the old "div_a" default).
    (async () => {
      try {
        const data = await apiPost<{ user: UserProfile; student: StudentRecord; tempPassword: string }>(
          "/api/users",
          {
            name: stu.name,
            email: stu.email,
            role: "student",
            enrollmentNo: stu.enrollmentNo,
            divisionId: stu.divisionId,
            semesterId: stu.semesterId || selectedSemesterId
          }
        );

        setStudents(prev => [...prev, data.student]);
        setUsers(prev => [...prev, data.user]);

        addNotification({
          type: "security",
          title: "Student Account Created",
          message: `Registered ${data.student.name} (${data.student.enrollmentNo}). Temporary password: ${data.tempPassword}`
        });
      } catch (err: any) {
        console.error("Add Student Error:", err);
        addNotification({
          type: "security",
          title: "Failed to Create Student",
          message: err?.message || "Could not register the student."
        });
      }
    })();
  };

  const bulkImportStudents = (studentsList: Array<Omit<StudentRecord, "id">>) => {
    if (currentUser.role !== "admin") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "Only Administrators can bulk-import students."
      });
      return;
    }

    // PHASE 4: real backend call to POST /api/students/bulk-import. Every row is validated
    // server-side (required fields, email format, duplicate email/enrollment number, valid
    // semester/division, division-belongs-to-semester) and writes are chunked into batches
    // of ≤150 rows (≤450 Firestore writes each, safely under the 500-write batch limit —
    // each row writes 3 documents: users, students, enrollments). A few invalid rows never
    // block the rest of the import — every row gets its own success/failure result.
    (async () => {
      try {
        const rows = studentsList.map(s => ({
          name: s.name,
          email: s.email,
          enrollmentNo: s.enrollmentNo,
          divisionId: s.divisionId,
          divisionName: s.divisionName,
          semesterId: s.semesterId || selectedSemesterId
        }));

        const data = await apiPost<{
          totalRows: number;
          successCount: number;
          failureCount: number;
          results: Array<{ row: number; success: boolean; email?: string; error?: string }>;
        }>("/api/students/bulk-import", { rows });

        // Refresh the roster from the server rather than reconstructing StudentRecord
        // objects from the summary response — guarantees local state matches Firestore.
        await loadStudents();

        const failures = data.results.filter(r => !r.success);
        if (failures.length > 0) {
          console.warn("Bulk import row failures:", failures);
        }

        addNotification({
          type: "security",
          title: "Bulk CSV Import Completed",
          message:
            failures.length === 0
              ? `Successfully imported ${data.successCount} student records.`
              : `Imported ${data.successCount} of ${data.totalRows} students. ${failures.length} row(s) failed — see console for details.`
        });
      } catch (err: any) {
        console.error("Bulk Import Error:", err);
        addNotification({
          type: "security",
          title: "Bulk Import Failed",
          message: err?.message || "Could not complete the bulk import."
        });
      }
    })();
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
  const student = students.find(
    s => s.id === studentId || s.uid === studentId
  );

  const semesterId =
    student?.semesterId || selectedSemesterId;

  return {
    studentId,
    reportId: `student-report-${studentId}-${semesterId}`,
    version: 1,
    lastGeneratedAt: new Date().toISOString(),
    history: [
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        reasonForRegeneration: "Dynamic Firestore report"
      }
    ]
  };
};

const regenerateStudentReport = async (
  studentId: string,
  reason?: string
): Promise<{ version: number; generatedAt: string }> => {
  const semesterId = selectedSemesterId;

  if (!semesterId) {
    throw new Error("Please select a semester before generating the report.");
  }

  const endpoint =
    currentUser.role === "student"
      ? `/api/reports/me?semesterId=${encodeURIComponent(semesterId)}`
      : `/api/reports/${encodeURIComponent(studentId)}?semesterId=${encodeURIComponent(semesterId)}`;

  try {
    await apiGet<{
      success: boolean;
      student: StudentRecord;
      semester: unknown;
      summary: unknown;
      subjects: unknown[];
    }>(endpoint);

    const generatedAt = new Date().toISOString();

    addNotification({
      type: "announcement",
      title: "Performance Report Refreshed",
      message:
        reason ||
        "Student performance report has been recalculated from Firestore data."
    });

    return {
      version: 1,
      generatedAt
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to regenerate performance report.";

    addNotification({
      type: "security",
      title: "Report Generation Failed",
      message
    });

    throw err;
  }
};

const submitReportIssue = async (issueData: {
  studentId: string;
  studentName?: string;
  studentEnrollmentNo?: string;
  divisionId?: string;
  reportId?: string;
  reportVersion?: number;
  category: ReportIssueCategory;
  description: string;
}): Promise<{
  success: boolean;
  message: string;
  issueId: string;
}> => {
  const semesterId = selectedSemesterId;

  if (!semesterId) {
    return {
      success: false,
      message: "Please select a semester before submitting a report issue.",
      issueId: ""
    };
  }

  try {
    const data = await apiPost<{
      success: boolean;
      issue: {
        id: string;
        studentId: string;
        semesterId: string;
        category: ReportIssueCategory;
        description: string;
        status: ReportIssueStatus;
        submittedAt: string;
      };
    }>("/api/reports/issues", {
      semesterId,
      studentId: issueData.studentId,
      reportId: issueData.reportId,
      reportVersion: issueData.reportVersion,
      category: issueData.category,
      description: issueData.description
    });

    addNotification({
      type: "risk_alert",
      title: "Report Issue Submitted",
      message:
        "Your report issue has been saved successfully and sent for review."
    });

    return {
      success: true,
      message: "Report issue submitted successfully.",
      issueId: data.issue.id
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to submit report issue.";

    addNotification({
      type: "security",
      title: "Report Issue Submission Failed",
      message
    });

    return {
      success: false,
      message,
      issueId: ""
    };
  }
};

const updateReportIssueStatus = async (
  issueId: string,
  status: ReportIssueStatus,
  responseText?: string,
  correctedSourceType?: "mid_exam" | "attendance" | "assignment" | "student_info" | "other"
) => {
  if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
    addNotification({
      type: "security",
      title: "Forbidden Action",
      message: "Only teachers and administrators can update report issues."
    });
    return;
  }

  try {
    await apiPatch<{
      success: boolean;
      issue: ReportIssue;
    }>(
      `/api/reports/issues/${encodeURIComponent(issueId)}`,
      {
        status,
        responseText,
        correctedSourceType
      }
    );

    addNotification({
      type: "attendance",
      title: `Report Issue Updated: ${status}`,
      message: `Report issue ${issueId} was updated successfully.`
    });

    // Refresh local issue list from Firestore-backed source.
    await loadReportIssues();
  } catch (err: unknown) {
    addNotification({
      type: "security",
      title: "Report Issue Update Failed",
      message:
        err instanceof Error
          ? err.message
          : "Failed to update report issue."
    });
  }
};

const getReportIssuesForStudent = (
  studentId: string
): ReportIssue[] => {
  return reportIssues.filter(
    issue =>
      issue.studentId === studentId &&
      issue.semesterId === selectedSemesterId
  );
};

const getReportIssuesForTeacher = (
  _teacherId?: string
): ReportIssue[] => {
  return reportIssues.filter(
    issue => issue.semesterId === selectedSemesterId
  );
};

const getAllReportIssues = (): ReportIssue[] => {
  return reportIssues.filter(
    issue => issue.semesterId === selectedSemesterId
  );
};

  const correctStudentAttendanceRecord = async ({
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
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      return { success: false, message: "Only teachers and administrators can correct attendance." };
    }

    const targetStudent = students.find(s => s.id === studentId || s.uid === studentId);
    if (!targetStudent) {
      return { success: false, message: "Student record not found." };
    }

    const subjectObj = subjects.find(s => s.id === subjectId);
    if (!subjectObj) {
      return { success: false, message: "Subject record not found." };
    }

    const targetSemesterId = targetStudent.semesterId || selectedSemesterId;
    const candidate = attendance.find(record =>
      record.subjectId === subjectId &&
      record.semesterId === targetSemesterId &&
      record.date === date &&
      record.period === period &&
      (record.presentStudentIds.includes(targetStudent.id) ||
        record.absentStudentIds.includes(targetStudent.id) ||
        record.lateStudentIds?.includes(targetStudent.id))
    );

    if (!candidate) {
      return { success: false, message: "Attendance session for this student/date/period was not found." };
    }

    try {
      const data = await apiPatch<{
        success: boolean;
        message: string;
        attendance: AttendanceRecord;
      }>(`/api/attendance/${encodeURIComponent(candidate.id)}/correct`, {
        studentId: targetStudent.uid || targetStudent.id,
        newStatus,
        reason,
        modifiedBy: currentUser.uid,
      });

      setAttendance(prev => prev.map(record => record.id === data.attendance.id ? data.attendance : record));
      await loadStudents();

      addNotification({
        type: "attendance",
        title: "Attendance Record Corrected",
        message: `Corrected ${subjectObj.name} attendance for ${date} (Period ${period}) to ${newStatus.toUpperCase()}.`
      });

      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Failed to correct attendance.";
      addNotification({ type: "security", title: "Attendance Correction Failed", message });
      return { success: false, message };
    }
  };

  const updateStudentProfileInfo = async (
    studentId: string,
    info: {
      name?: string;
      enrollmentNo?: string;
      divisionId?: string;
      divisionName?: string;
      semesterId?: string;
      email?: string;
      status?: "Active" | "Inactive";
    }
  ) => {
    if (currentUser.role !== "admin" && currentUser.role !== "teacher") {
      addNotification({
        type: "security",
        title: "Forbidden Action Intercepted",
        message: "You are not authorized to update student profile information."
      });
      return;
    }

    try {
      const data = await apiPatch<{ success: boolean; student: StudentRecord }>(
        `/api/students/${encodeURIComponent(studentId)}`,
        info
      );

      setStudents(prev => prev.map(student =>
        student.id === studentId || student.uid === studentId ? data.student : student
      ));

      addNotification({
        type: "security",
        title: "Student Profile Updated",
        message: `Updated profile record for ${data.student.name}.`
      });
    } catch (err: unknown) {
      console.error("Update Student Profile Error:", err);
      addNotification({
        type: "security",
        title: "Student Profile Update Failed",
        message: err instanceof Error ? err.message : "Failed to update the student profile."
      });
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        auditLogs,
        role: currentUser.role,
        authStatus,
        authError,
        login,
        logout,
        switchRole,
        canAccessTab,
        changeUserRole,
        toggleUserStatus,
        getDivisionsForSemester,
        addUser,
        createEnrollment,
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
        updateAssignment,
        deleteAssignment,
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
