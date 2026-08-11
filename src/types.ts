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
  studentId: string;
  subjectId: string;
  subjectName: string;
  internal: number; // Max 20
  practical: number; // Max 30
  termEnd: number; // Max 50
  total: number; // Max 100
  grade: string; // A+, A, B, C, F
  updatedAt: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  divisionId: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  attachmentUrl?: string;
  attachmentName?: string;
  rubric?: string;
  createdBy: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
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

export interface TimetableSlot {
  id: string;
  divisionId: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "10:00"
  subjectId: string;
  subjectName: string;
  teacherName: string;
  roomNo: string;
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
  score: number; // e.g. 24
  maxScore: number; // default 30
  examDate?: string; // e.g. "2026-07-15"
  academicPeriod?: string; // e.g. "Semester V Mid-Exam"
  updatedAt: string;
  updatedBy?: string;
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

