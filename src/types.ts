export type UserRole = "teacher" | "student" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status?: "Active" | "Suspended";
  avatarUrl?: string;
  department?: string;
  enrollmentNo?: string;
  divisionId?: string;
  divisionName?: string;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
  biometricEnabled?: boolean;
  mfaEnabled?: boolean;
}

export interface UserAuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUser: string;
  details: string;
  timestamp: string;
}

export interface Semester {
  id: string;
  name: string; // e.g., "Semester V - Fall 2026"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Division {
  id: string;
  semesterId: string;
  name: string; // e.g., "Div A - Computer Science"
  studentCount: number;
  subjectIds: string[];
}

export interface Subject {
  id: string;
  code: string; // e.g., "CS-501"
  name: string; // e.g., "Data Structures & Algorithms"
  teacherId: string;
  teacherName: string;
  semesterId: string;
  credits: number;
}

export interface StudentRecord {
  id: string;
  uid: string;
  enrollmentNo: string;
  name: string;
  email: string;
  divisionId: string;
  divisionName: string;
  semesterId?: string;
  department?: string;
  avatarUrl?: string;
  contact?: string;
  overallAttendance: number; // percentage
  gpa: number;
  riskCategory: "Low" | "Medium" | "High";
  status: "Active" | "Inactive";
}


export interface AttendanceRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  divisionId: string;
  /** Optional scheduled-session context. */
  semesterId?: string;
  sessionId?: string;
  teacherId?: string;
  sessionType?: "lecture" | "lab" | "extra";
  targetDivisionIds?: string[];
  targetGroup?: string;
  timetableSlotId?: string;
  date: string; // YYYY-MM-DD
  period: number; // e.g. 1, 2, 3, 4
  timeSlot?: string; // e.g., "09:00 AM - 10:00 AM"
  recordedBy: string;
  presentStudentIds: string[];
  absentStudentIds: string[];
  lateStudentIds?: string[];
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
  auditTrail?: {
    timestamp: string;
    modifiedBy: string;
    details: string;
  }[];
}


export interface SubjectMarks {
  id?: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  semesterId?: string;
  divisionId?: string;
  internal: number; // Max 20
  practical: number; // Max 30
  termEnd: number; // Max 50
  total: number; // Max 100
  grade: string; // A+, A, B, C, F
  updatedAt: string;
  updatedBy?: string;
  recordedBy?: string;
  auditTrail?: { timestamp: string; modifiedBy: string; details: string }[];
}

export interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  divisionId: string;
  targetDivisionIds?: string[];
  semesterId?: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  attachmentUrl?: string;
  attachmentName?: string;
  rubric?: string;
  note?: string;
  attachmentPath?: string;
  createdBy: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  semesterId?: string;
  divisionId?: string;
  studentId: string;
  studentName: string;
  studentEnrollmentNo?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  submittedAt: string;
  status: "pending" | "submitted" | "evaluated";
  grade?: number;
  feedback?: string;
  evaluatedAt?: string;
}

export interface StudyMaterial {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  unit: string; // e.g. "Unit 1: Introduction to Trees"
  type: "pdf" | "ppt" | "video" | "link" | "notes";
  fileUrl: string;
  fileSize?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface AttendanceSessionContext {
  sessionId?: string;
  semesterId: string;
  subjectId: string;
  teacherId?: string;
  divisionId: string;
  targetDivisionIds: string[];
  date: string;
  timeSlot: string;
  period: number;
  sessionType: "lecture" | "lab" | "extra";
  status?: "scheduled" | "cancelled";
}


export interface TimetableSlot {
  id: string;
  /** Optional fields used when a schedule entry is a real attendance session. */
  sessionId?: string;
  semesterId?: string;
  divisionId: string;
  targetDivisionIds?: string[];
  targetGroup?: string;
  sessionType?: "lecture" | "lab" | "extra" | "Lecture" | "Lab";
  status?: "scheduled" | "cancelled" | "Scheduled" | "Completed" | "Cancelled";
  date?: string;
  period?: number;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  roomNo: string;
  cancellationReason?: string;
}


export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetDivisionId: string; // 'all' or divisionId
  targetDivisionName: string;
  postedBy: string;
  postedRole: UserRole;
  timestamp: string;
  isImportant?: boolean;
}

export interface AIPrediction {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  predictedMarks: number;
  predictedAttendance: number;
  riskCategory: "Low" | "Medium" | "High";
  weakTopics: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface PersonalFile {
  id: string;
  studentId: string;
  name: string;
  category: "Notes" | "Certificates" | "Assignments" | "Other";
  size: string;
  uploadedAt: string;
  fileUrl: string;
  isEncrypted: boolean;
}

export interface NotificationItem {
  id: string;
  type: "announcement" | "assignment" | "risk_alert" | "security" | "attendance";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export interface SecurityAlert {
  id: string;
  severity: "low" | "medium" | "high";
  event: string;
  location: string;
  timestamp: string;
  status: "resolved" | "flagged";
}

export interface MidExamMarks {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  semesterId?: string;
  divisionId?: string;
  score: number; // e.g. 24
  maxScore: number; // default 30
  examDate?: string; // e.g. "2026-07-15"
  academicPeriod?: string; // e.g. "Semester V Mid-Exam"
  updatedAt: string;
  updatedBy?: string;
  recordedBy?: string;
  auditTrail?: { timestamp: string; modifiedBy: string; details: string }[];
}

export interface PerformanceWeightConfig {
  midExamWeight: number; // default 40 (%)
  assignmentWeight: number; // default 25 (%)
  classActivityWeight: number; // default 20 (%)
  otherAssessmentsWeight: number; // default 15 (%)
}

export type ReportIssueCategory =
  | "Incorrect Mid Examination Score"
  | "Incorrect Attendance"
  | "Incorrect Assignment/Activity Score"
  | "Incorrect Student Information"
  | "Incorrect Performance Calculation"
  | "Report Generation Error"
  | "Other";

export type ReportIssueStatus =
  | "Pending"
  | "Under Review"
  | "Resolved"
  | "Rejected"
  | "Need More Information";

export interface ReportIssue {
  id: string;
  studentId: string;
  semesterId: string;
  studentName: string;
  studentEnrollmentNo: string;
  divisionId: string;
  reportId: string;
  reportVersion: number;
  category: ReportIssueCategory;
  description: string;
  submittedAt: string;
  status: ReportIssueStatus;
  teacherResponse?: string;
  adminResponse?: string;
  assignedTeacherId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  correctedSourceType?: "mid_exam" | "attendance" | "assignment" | "student_info" | "other";
}

export interface StudentReportMetadata {
  studentId: string;
  reportId: string;
  version: number;
  lastGeneratedAt: string;
  history: {
    version: number;
    generatedAt: string;
    reasonForRegeneration?: string;
  }[];
}

