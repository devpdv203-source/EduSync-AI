import {
  UserProfile,
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
  PerformanceWeightConfig
} from "./types";

export const initialUsers: UserProfile[] = [
  {
    uid: "admin_01",
    name: "Dr. Marcus Vance (Admin)",
    email: "admin@edusync.edu",
    role: "admin",
    status: "Active",
    department: "Academic Affairs & IT",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 999-0000",
    createdAt: "2026-01-01",
    lastLogin: "2026-08-10 09:00 AM",
    biometricEnabled: true,
    mfaEnabled: true
  },
  {
    uid: "teacher_01",
    name: "Prof. Sarah Jenkins",
    email: "sarah.jenkins@edusync.edu",
    role: "teacher",
    status: "Active",
    department: "Computer Science & Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 234-5678",
    createdAt: "2026-01-15",
    lastLogin: "2026-08-09 04:30 PM",
    biometricEnabled: true,
    mfaEnabled: true
  },
  {
    uid: "teacher_02",
    name: "Prof. Robert Chen",
    email: "robert.chen@edusync.edu",
    role: "teacher",
    status: "Active",
    department: "Information Technology",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 345-6789",
    createdAt: "2026-02-01",
    lastLogin: "2026-08-08 11:20 AM",
    biometricEnabled: false,
    mfaEnabled: true
  },
  {
    uid: "student_01",
    name: "Alex Morgan",
    email: "alex.morgan@edusync.edu",
    role: "student",
    status: "Active",
    enrollmentNo: "EN2026-CS-042",
    divisionId: "div_a",
    divisionName: "Div A - Computer Science",
    department: "Computer Science & Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 876-5432",
    createdAt: "2026-08-01",
    lastLogin: "2026-08-10 08:45 AM",
    biometricEnabled: true,
    mfaEnabled: false
  },
  {
    uid: "student_02",
    name: "Brandon Lee",
    email: "brandon.lee@edusync.edu",
    role: "student",
    status: "Active",
    enrollmentNo: "EN2026-CS-015",
    divisionId: "div_a",
    divisionName: "Div A - Computer Science",
    department: "Computer Science & Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 222-3344",
    createdAt: "2026-08-01",
    lastLogin: "2026-08-08 11:58 PM",
    biometricEnabled: false,
    mfaEnabled: false
  },
  {
    uid: "student_03",
    name: "Chloe Patel",
    email: "chloe.patel@edusync.edu",
    role: "student",
    status: "Active",
    enrollmentNo: "EN2026-CS-022",
    divisionId: "div_a",
    divisionName: "Div A - Computer Science",
    department: "Computer Science & Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    phone: "+1 (555) 333-4455",
    createdAt: "2026-08-01",
    lastLogin: "2026-08-09 02:15 PM"
  }
];

export const initialAuditLogs: UserAuditLog[] = [
  {
    id: "log_01",
    action: "Role Modified",
    performedBy: "Dr. Marcus Vance (Admin)",
    targetUser: "Prof. Sarah Jenkins",
    details: "Assigned role 'teacher' with full content management permissions.",
    timestamp: "2026-08-01 10:00 AM"
  },
  {
    id: "log_02",
    action: "Account Provisioned",
    performedBy: "System Default",
    targetUser: "Alex Morgan",
    details: "Assigned default role 'student' upon enrollment registration.",
    timestamp: "2026-08-01 10:05 AM"
  },
  {
    id: "log_03",
    action: "Unauthorized Access Blocked",
    performedBy: "System Guard",
    targetUser: "Alex Morgan (Student)",
    details: "Direct request to /admin/user-management intercepted and rejected with 403 Forbidden.",
    timestamp: "2026-08-09 03:12 PM"
  }
];

export const initialSemesters: Semester[] = [
  { id: "sem_1", name: "Semester 1 (Fall 2024)", startDate: "2024-08-01", endDate: "2024-12-20", isActive: false },
  { id: "sem_2", name: "Semester 2 (Spring 2025)", startDate: "2025-01-10", endDate: "2025-05-30", isActive: false },
  { id: "sem_3", name: "Semester 3 (Fall 2025)", startDate: "2025-08-01", endDate: "2025-12-20", isActive: false },
  { id: "sem_4", name: "Semester 4 (Spring 2026)", startDate: "2026-01-10", endDate: "2026-05-30", isActive: false },
  { id: "sem_5", name: "Semester 5 (Fall 2026)", startDate: "2026-08-01", endDate: "2026-12-20", isActive: true },
  { id: "sem_6", name: "Semester 6 (Spring 2027)", startDate: "2027-01-05", endDate: "2027-05-25", isActive: false }
];

export const initialDivisions: Division[] = [
  { id: "div_a", semesterId: "sem_5", name: "Div A - CS (Semester 5)", studentCount: 42, subjectIds: ["subj_1", "subj_2", "subj_3", "subj_4"] },
  { id: "div_b", semesterId: "sem_5", name: "Div B - CS (Semester 5)", studentCount: 38, subjectIds: ["subj_1", "subj_2", "subj_3"] },
  { id: "div_4a", semesterId: "sem_4", name: "Div A - CS (Semester 4)", studentCount: 40, subjectIds: ["subj_401", "subj_402"] },
  { id: "div_3a", semesterId: "sem_3", name: "Div A - CS (Semester 3)", studentCount: 35, subjectIds: ["subj_301"] },
  { id: "div_2a", semesterId: "sem_2", name: "Div A - CS (Semester 2)", studentCount: 36, subjectIds: ["subj_201"] },
  { id: "div_1a", semesterId: "sem_1", name: "Div A - CS (Semester 1)", studentCount: 38, subjectIds: ["subj_101"] },
  { id: "div_6a", semesterId: "sem_6", name: "Div A - CS (Semester 6)", studentCount: 39, subjectIds: ["subj_601"] }
];

export const initialSubjects: Subject[] = [
  { id: "subj_1", code: "CS-501", name: "Advanced Data Structures & Algorithms", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_5", credits: 4 },
  { id: "subj_2", code: "CS-502", name: "Database Management Systems", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_5", credits: 4 },
  { id: "subj_3", code: "CS-503", name: "Full Stack Web Technologies", teacherId: "teacher_02", teacherName: "Prof. Robert Chen", semesterId: "sem_5", credits: 3 },
  { id: "subj_4", code: "CS-504", name: "Machine Learning & AI Foundations", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_5", credits: 4 },
  { id: "subj_401", code: "CS-401", name: "Operating Systems & Kernels", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_4", credits: 4 },
  { id: "subj_402", code: "CS-402", name: "Computer Networks & Protocols", teacherId: "teacher_02", teacherName: "Prof. Robert Chen", semesterId: "sem_4", credits: 4 },
  { id: "subj_301", code: "CS-301", name: "Data Structures Foundations", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_3", credits: 3 },
  { id: "subj_201", code: "CS-201", name: "Object Oriented Programming", teacherId: "teacher_02", teacherName: "Prof. Robert Chen", semesterId: "sem_2", credits: 3 },
  { id: "subj_101", code: "CS-101", name: "Introduction to Computer Science", teacherId: "teacher_01", teacherName: "Prof. Sarah Jenkins", semesterId: "sem_1", credits: 3 },
  { id: "subj_601", code: "CS-601", name: "Distributed Systems & Cloud", teacherId: "teacher_02", teacherName: "Prof. Robert Chen", semesterId: "sem_6", credits: 4 }
];

export const initialStudents: StudentRecord[] = [
  { id: "stu_1", uid: "student_01", enrollmentNo: "EN2026-CS-042", name: "Alex Morgan", email: "alex.morgan@edusync.edu", semesterId: "sem_5", divisionId: "div_a", divisionName: "Div A - CS", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", contact: "+1 555-876-5432", overallAttendance: 91, gpa: 3.82, riskCategory: "Low", status: "Active" },
  { id: "stu_2", uid: "student_02", enrollmentNo: "EN2026-CS-015", name: "Brandon Lee", email: "brandon.lee@edusync.edu", semesterId: "sem_5", divisionId: "div_a", divisionName: "Div A - CS", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", contact: "+1 555-222-3344", overallAttendance: 68, gpa: 2.45, riskCategory: "High", status: "Active" },
  { id: "stu_3", uid: "student_03", enrollmentNo: "EN2026-CS-022", name: "Chloe Patel", email: "chloe.patel@edusync.edu", semesterId: "sem_5", divisionId: "div_a", divisionName: "Div A - CS", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", contact: "+1 555-333-4455", overallAttendance: 88, gpa: 3.65, riskCategory: "Low", status: "Active" },
  { id: "stu_4", uid: "student_04", enrollmentNo: "EN2026-CS-009", name: "David Kim", email: "david.kim@edusync.edu", semesterId: "sem_4", divisionId: "div_4a", divisionName: "Div A - CS (Sem 4)", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", contact: "+1 555-444-5566", overallAttendance: 74, gpa: 2.88, riskCategory: "Medium", status: "Active" },
  { id: "stu_5", uid: "student_05", enrollmentNo: "EN2026-CS-031", name: "Emma Watson", email: "emma.watson@edusync.edu", semesterId: "sem_4", divisionId: "div_4a", divisionName: "Div A - CS (Sem 4)", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", contact: "+1 555-555-6677", overallAttendance: 95, gpa: 3.95, riskCategory: "Low", status: "Active" },
  { id: "stu_6", uid: "student_06", enrollmentNo: "EN2026-CS-055", name: "Faisal Hassan", email: "faisal.hassan@edusync.edu", semesterId: "sem_4", divisionId: "div_4a", divisionName: "Div A - CS (Sem 4)", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", contact: "+1 555-666-7788", overallAttendance: 62, gpa: 2.15, riskCategory: "High", status: "Active" },
  { id: "stu_7", uid: "student_07", enrollmentNo: "EN2026-CS-071", name: "Grace Hopper", email: "grace.hopper@edusync.edu", semesterId: "sem_3", divisionId: "div_3a", divisionName: "Div A - CS (Sem 3)", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", contact: "+1 555-777-8899", overallAttendance: 89, gpa: 3.75, riskCategory: "Low", status: "Active" },
  { id: "stu_8", uid: "student_08", enrollmentNo: "EN2026-CS-081", name: "Henry Ford", email: "henry.ford@edusync.edu", semesterId: "sem_2", divisionId: "div_2a", divisionName: "Div A - CS (Sem 2)", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", contact: "+1 555-888-9900", overallAttendance: 82, gpa: 3.10, riskCategory: "Low", status: "Active" },
  { id: "stu_9", uid: "student_09", enrollmentNo: "EN2026-CS-091", name: "Ian Wright", email: "ian.wright@edusync.edu", semesterId: "sem_1", divisionId: "div_1a", divisionName: "Div A - CS (Sem 1)", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", contact: "+1 555-999-0011", overallAttendance: 90, gpa: 3.40, riskCategory: "Low", status: "Active" },
  { id: "stu_10", uid: "student_10", enrollmentNo: "EN2026-CS-101", name: "Julia Roberts", email: "julia.roberts@edusync.edu", semesterId: "sem_6", divisionId: "div_6a", divisionName: "Div A - CS (Sem 6)", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", contact: "+1 555-000-1122", overallAttendance: 94, gpa: 3.88, riskCategory: "Low", status: "Active" }
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  // CS-501 Advanced Data Structures
  {
    id: "att_101",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures & Algorithms",
    divisionId: "div_a",
    date: "2026-08-10",
    period: 1,
    timeSlot: "09:00 AM - 10:00 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_4", "stu_5"],
    absentStudentIds: ["stu_2", "stu_6"],
    lateStudentIds: ["stu_4"],
    notes: "Dijkstra Algorithm graph traversal demo."
  },
  {
    id: "att_102",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures & Algorithms",
    divisionId: "div_a",
    date: "2026-08-08",
    period: 1,
    timeSlot: "09:00 AM - 10:00 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_2", "stu_3", "stu_4", "stu_5"],
    absentStudentIds: ["stu_6"],
    notes: "AVL Tree Rotations and balancing."
  },
  {
    id: "att_103",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures & Algorithms",
    divisionId: "div_a",
    date: "2026-08-05",
    period: 2,
    timeSlot: "10:15 AM - 11:15 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_5"],
    absentStudentIds: ["stu_2", "stu_4", "stu_6"],
    notes: "Red-Black tree properties."
  },
  {
    id: "att_104",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures & Algorithms",
    divisionId: "div_a",
    date: "2026-08-01",
    period: 1,
    timeSlot: "09:00 AM - 10:00 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_2", "stu_3", "stu_4", "stu_5", "stu_6"],
    absentStudentIds: [],
    notes: "Orientation & Course Syllabus."
  },

  // CS-502 Database Management Systems
  {
    id: "att_201",
    subjectId: "subj_2",
    subjectName: "CS-502 Database Management Systems",
    divisionId: "div_a",
    date: "2026-08-10",
    period: 2,
    timeSlot: "10:15 AM - 11:15 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_5"],
    absentStudentIds: ["stu_2", "stu_4", "stu_6"],
    notes: "Normalization 3NF and BCNF concepts."
  },
  {
    id: "att_202",
    subjectId: "subj_2",
    subjectName: "CS-502 Database Management Systems",
    divisionId: "div_a",
    date: "2026-08-07",
    period: 2,
    timeSlot: "10:15 AM - 11:15 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_4", "stu_5"],
    absentStudentIds: ["stu_2", "stu_6"],
    notes: "Relational Algebra operators."
  },
  {
    id: "att_203",
    subjectId: "subj_2",
    subjectName: "CS-502 Database Management Systems",
    divisionId: "div_a",
    date: "2026-08-04",
    period: 1,
    timeSlot: "09:00 AM - 10:00 AM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_2", "stu_3", "stu_5"],
    absentStudentIds: ["stu_4", "stu_6"],
    notes: "ER Modeling and Entity Relationships."
  },

  // CS-503 Full Stack Web Technologies
  {
    id: "att_301",
    subjectId: "subj_3",
    subjectName: "CS-503 Full Stack Web Technologies",
    divisionId: "div_a",
    date: "2026-08-09",
    period: 3,
    timeSlot: "11:30 AM - 12:30 PM",
    recordedBy: "Prof. Robert Chen",
    presentStudentIds: ["stu_1", "stu_2", "stu_3", "stu_4", "stu_5"],
    absentStudentIds: ["stu_6"],
    notes: "RESTful API design and Express routing."
  },
  {
    id: "att_302",
    subjectId: "subj_3",
    subjectName: "CS-503 Full Stack Web Technologies",
    divisionId: "div_a",
    date: "2026-08-06",
    period: 3,
    timeSlot: "11:30 AM - 12:30 PM",
    recordedBy: "Prof. Robert Chen",
    presentStudentIds: ["stu_1", "stu_3", "stu_4", "stu_5", "stu_6"],
    absentStudentIds: ["stu_2"],
    notes: "React Hooks and Context API management."
  },

  // CS-504 Machine Learning & AI Foundations
  {
    id: "att_401",
    subjectId: "subj_4",
    subjectName: "CS-504 Machine Learning & AI Foundations",
    divisionId: "div_a",
    date: "2026-08-08",
    period: 4,
    timeSlot: "02:00 PM - 03:00 PM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_5"],
    absentStudentIds: ["stu_2", "stu_4", "stu_6"],
    notes: "Gradient Descent and Cost Optimization."
  },
  {
    id: "att_402",
    subjectId: "subj_4",
    subjectName: "CS-504 Machine Learning & AI Foundations",
    divisionId: "div_a",
    date: "2026-08-06",
    period: 4,
    timeSlot: "02:00 PM - 03:00 PM",
    recordedBy: "Prof. Sarah Jenkins",
    presentStudentIds: ["stu_1", "stu_3", "stu_4", "stu_5"],
    absentStudentIds: ["stu_2", "stu_6"],
    notes: "Linear & Logistic Regression formulas."
  }
];

export const initialMarks: SubjectMarks[] = [
  // Alex Morgan (stu_1) - Sem 5
  { studentId: "stu_1", subjectId: "subj_1", subjectName: "CS-501 Advanced Algorithms", internal: 18, practical: 28, termEnd: 45, total: 91, grade: "A+", updatedAt: "2026-08-05" },
  { studentId: "stu_1", subjectId: "subj_2", subjectName: "CS-502 Database Systems", internal: 17, practical: 27, termEnd: 43, total: 87, grade: "A", updatedAt: "2026-08-05" },
  { studentId: "stu_1", subjectId: "subj_3", subjectName: "CS-503 Web Technologies", internal: 19, practical: 29, termEnd: 47, total: 95, grade: "A+", updatedAt: "2026-08-05" },
  { studentId: "stu_1", subjectId: "subj_4", subjectName: "CS-504 Machine Learning", internal: 18, practical: 26, termEnd: 42, total: 86, grade: "A", updatedAt: "2026-08-05" },

  // Alex Morgan (stu_1) - Historical Semesters
  { studentId: "stu_1", subjectId: "subj_401", subjectName: "CS-401 Operating Systems & Kernels", internal: 18, practical: 27, termEnd: 44, total: 89, grade: "A", updatedAt: "2026-05-20" },
  { studentId: "stu_1", subjectId: "subj_402", subjectName: "CS-402 Computer Networks & Protocols", internal: 19, practical: 28, termEnd: 46, total: 93, grade: "A+", updatedAt: "2026-05-20" },
  { studentId: "stu_1", subjectId: "subj_301", subjectName: "CS-301 Data Structures Foundations", internal: 17, practical: 26, termEnd: 42, total: 85, grade: "A", updatedAt: "2025-12-18" },
  { studentId: "stu_1", subjectId: "subj_201", subjectName: "CS-201 Object Oriented Programming", internal: 18, practical: 27, termEnd: 43, total: 88, grade: "A", updatedAt: "2025-05-25" },
  { studentId: "stu_1", subjectId: "subj_101", subjectName: "CS-101 Introduction to Computer Science", internal: 19, practical: 29, termEnd: 46, total: 94, grade: "A+", updatedAt: "2024-12-15" },

  // Brandon Lee (stu_2)
  { studentId: "stu_2", subjectId: "subj_1", subjectName: "CS-501 Advanced Algorithms", internal: 11, practical: 18, termEnd: 28, total: 57, grade: "C", updatedAt: "2026-08-05" },
  { studentId: "stu_2", subjectId: "subj_2", subjectName: "CS-502 Database Systems", internal: 10, practical: 15, termEnd: 25, total: 50, grade: "D", updatedAt: "2026-08-05" },
  { studentId: "stu_2", subjectId: "subj_3", subjectName: "CS-503 Web Technologies", internal: 14, practical: 20, termEnd: 32, total: 66, grade: "B", updatedAt: "2026-08-05" },
  { studentId: "stu_2", subjectId: "subj_4", subjectName: "CS-504 Machine Learning", internal: 9, practical: 14, termEnd: 22, total: 45, grade: "F", updatedAt: "2026-08-05" },

  // Emma Watson (stu_5)
  { studentId: "stu_5", subjectId: "subj_1", subjectName: "CS-501 Advanced Algorithms", internal: 20, practical: 30, termEnd: 49, total: 99, grade: "A+", updatedAt: "2026-08-05" },
  { studentId: "stu_5", subjectId: "subj_2", subjectName: "CS-502 Database Systems", internal: 19, practical: 28, termEnd: 46, total: 93, grade: "A+", updatedAt: "2026-08-05" }
];

export const initialAssignments: Assignment[] = [
  {
    id: "asgn_01",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures",
    divisionId: "div_a",
    title: "Graph Shortest Path Implementation in C++ / Python",
    description: "Implement Dijkstra's algorithm and Bellman-Ford with comparison benchmarks on random graphs of 10,000 vertices.",
    dueDate: "2026-08-18",
    maxScore: 100,
    attachmentUrl: "https://edusync.edu/files/assignments/graph_problem_set.pdf",
    attachmentName: "Graph_Problem_Set.pdf",
    rubric: "Correctness (50%), Time Complexity Analysis (30%), Code Quality (20%)",
    createdBy: "Prof. Sarah Jenkins",
    createdAt: "2026-08-02"
  },
  {
    id: "asgn_02",
    subjectId: "subj_2",
    subjectName: "CS-502 Database Management Systems",
    divisionId: "div_a",
    title: "Relational Schema Design & Complex SQL Queries",
    description: "Design a 3NF normalized schema for an E-commerce system and write 10 nested analytical queries with indexes.",
    dueDate: "2026-08-22",
    maxScore: 50,
    attachmentUrl: "https://edusync.edu/files/assignments/db_assignment_2.pdf",
    attachmentName: "Database_Schema_Req.pdf",
    rubric: "Normalization (20 pts), Query Efficiency (20 pts), Documentation (10 pts)",
    createdBy: "Prof. Sarah Jenkins",
    createdAt: "2026-08-05"
  }
];

export const initialSubmissions: Submission[] = [
  {
    id: "sub_01",
    assignmentId: "asgn_01",
    assignmentTitle: "Graph Shortest Path Implementation",
    studentId: "stu_1",
    studentName: "Alex Morgan",
    fileUrl: "https://edusync.edu/storage/submissions/alex_morgan_graph_asgn.zip",
    fileName: "AlexMorgan_GraphAlgo_Solution.zip",
    fileSize: "2.4 MB",
    submittedAt: "2026-08-08 14:30",
    status: "evaluated",
    grade: 96,
    feedback: "Exceptional efficiency analysis. Well documented code!",
    evaluatedAt: "2026-08-09 09:15"
  },
  {
    id: "sub_02",
    assignmentId: "asgn_01",
    assignmentTitle: "Graph Shortest Path Implementation",
    studentId: "stu_2",
    studentName: "Brandon Lee",
    fileUrl: "https://edusync.edu/storage/submissions/brandon_lee_graph.cpp",
    fileName: "BrandonLee_Graph.cpp",
    fileSize: "145 KB",
    submittedAt: "2026-08-08 23:58",
    status: "pending"
  }
];

export const initialStudyMaterials: StudyMaterial[] = [
  {
    id: "mat_01",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures",
    title: "Unit 2: Red-Black Trees & AVL Self-Balancing Trees",
    unit: "Unit 2",
    type: "pdf",
    fileUrl: "https://edusync.edu/storage/materials/unit2_balancing_trees.pdf",
    fileSize: "4.8 MB",
    uploadedBy: "Prof. Sarah Jenkins",
    createdAt: "2026-08-01"
  },
  {
    id: "mat_02",
    subjectId: "subj_2",
    subjectName: "CS-502 Database Management Systems",
    title: "Unit 3: Transaction Management & ACID Properties Lecture Notes",
    unit: "Unit 3",
    type: "notes",
    fileUrl: "https://edusync.edu/storage/materials/db_transactions.pdf",
    fileSize: "1.9 MB",
    uploadedBy: "Prof. Sarah Jenkins",
    createdAt: "2026-08-04"
  },
  {
    id: "mat_03",
    subjectId: "subj_4",
    subjectName: "CS-504 Machine Learning & AI Foundations",
    title: "Supervised Learning Regression Video Tutorial Link",
    unit: "Unit 1",
    type: "video",
    fileUrl: "https://youtube.com/watch?v=sample_ml_lecture",
    uploadedBy: "Prof. Sarah Jenkins",
    createdAt: "2026-08-06"
  }
];

export const initialTimetable: TimetableSlot[] = [
  { id: "ts_1", divisionId: "div_a", day: "Monday", startTime: "09:00", endTime: "10:00", subjectId: "subj_1", subjectName: "CS-501 Advanced Algorithms", teacherName: "Prof. Sarah Jenkins", roomNo: "Lab 302" },
  { id: "ts_2", divisionId: "div_a", day: "Monday", startTime: "10:15", endTime: "11:15", subjectId: "subj_2", subjectName: "CS-502 Database Systems", teacherName: "Prof. Sarah Jenkins", roomNo: "Room 105" },
  { id: "ts_3", divisionId: "div_a", day: "Tuesday", startTime: "09:00", endTime: "10:00", subjectId: "subj_3", subjectName: "CS-503 Web Tech", teacherName: "Prof. Robert Chen", roomNo: "Lab 201" },
  { id: "ts_4", divisionId: "div_a", day: "Wednesday", startTime: "11:00", endTime: "12:00", subjectId: "subj_4", subjectName: "CS-504 Machine Learning", teacherName: "Prof. Sarah Jenkins", roomNo: "Room 105" },
  { id: "ts_5", divisionId: "div_a", day: "Thursday", startTime: "02:00", endTime: "04:00", subjectId: "subj_1", subjectName: "CS-501 Algorithm Lab", teacherName: "Prof. Sarah Jenkins", roomNo: "Lab 302" },
  { id: "ts_6", divisionId: "div_a", day: "Friday", startTime: "10:00", endTime: "11:00", subjectId: "subj_2", subjectName: "CS-502 Database Systems", teacherName: "Prof. Sarah Jenkins", roomNo: "Room 105" }
];

export const initialAnnouncements: Announcement[] = [
  {
    id: "ann_01",
    title: "Mid-Semester Examination Schedule Announced",
    message: "The Mid-Sem exams for Semester V will commence from September 12th. Please review the detailed timetable in the portal.",
    targetDivisionId: "all",
    targetDivisionName: "All Divisions",
    postedBy: "Dr. Marcus Vance (Admin)",
    postedRole: "admin",
    timestamp: "2026-08-08 10:00 AM",
    isImportant: true
  },
  {
    id: "ann_02",
    title: "Submission Deadline Extended for Graph Algorithm Assignment",
    message: "Based on student requests, Assignment 1 due date is extended by 24 hours to August 18th, 11:59 PM.",
    targetDivisionId: "div_a",
    targetDivisionName: "Div A - CS",
    postedBy: "Prof. Sarah Jenkins",
    postedRole: "teacher",
    timestamp: "2026-08-07 04:15 PM",
    isImportant: false
  }
];

export const initialAIPredictions: AIPrediction[] = [
  {
    studentId: "stu_1",
    studentName: "Alex Morgan",
    subjectId: "subj_1",
    subjectName: "CS-501 Advanced Data Structures",
    predictedMarks: 92,
    predictedAttendance: 94,
    riskCategory: "Low",
    weakTopics: ["B-Trees Deletion", "Red-Black Tree Rotations"],
    recommendations: [
      "Review edge cases in B-Tree deletion algorithms.",
      "Practice 2-3 advanced DP optimization exercises on LeetCode.",
      "Maintain current 90%+ attendance streak for maximum internal score."
    ],
    generatedAt: "2026-08-09 08:00 AM"
  },
  {
    studentId: "stu_2",
    studentName: "Brandon Lee",
    subjectId: "subj_4",
    subjectName: "CS-504 Machine Learning",
    predictedMarks: 48,
    predictedAttendance: 64,
    riskCategory: "High",
    weakTopics: ["Logistic Regression Loss Function", "Gradient Descent Derivatives", "Regularization L1/L2"],
    recommendations: [
      "CRITICAL: Attendance is at 68% (below 75% exam cutoff). Attend all upcoming lectures.",
      "Complete Unit 1 & Unit 2 practice worksheets to regain internal marks.",
      "Schedule 1-on-1 tutoring with Prof. Jenkins during office hours on Wednesdays."
    ],
    generatedAt: "2026-08-09 08:00 AM"
  }
];

export const initialPersonalFiles: PersonalFile[] = [
  { id: "pf_1", studentId: "stu_1", name: "Data_Structures_Self_Notes_Unit1.pdf", category: "Notes", size: "3.2 MB", uploadedAt: "2026-08-03", fileUrl: "#", isEncrypted: true },
  { id: "pf_2", studentId: "stu_1", name: "AWS_Cloud_Practitioner_Certificate.pdf", category: "Certificates", size: "1.1 MB", uploadedAt: "2026-07-28", fileUrl: "#", isEncrypted: true }
];

export const initialNotifications: NotificationItem[] = [
  { id: "notif_1", type: "risk_alert", title: "At-Risk Alert: Brandon Lee", message: "Student attendance dropped to 68%. AI flags High Risk category.", timestamp: "10 mins ago", read: false, linkTab: "ai_analytics" },
  { id: "notif_2", type: "assignment", title: "Assignment Submitted", message: "Alex Morgan submitted solution for Graph Shortest Path.", timestamp: "1 hour ago", read: false, linkTab: "assignments" },
  { id: "notif_3", type: "security", title: "Biometric MFA Verified", message: "Secure login session established from Chrome Dev container.", timestamp: "2 hours ago", read: true }
];

export const initialSecurityAlerts: SecurityAlert[] = [
  { id: "sec_1", severity: "medium", event: "Multiple failed login attempts detected for user account [stu_6]", location: "IP: 192.168.1.45 (Campus WiFi)", timestamp: "2026-08-09 08:12", status: "resolved" },
  { id: "sec_2", severity: "high", event: "Grade Override Attempt Blocked without Biometric MFA", location: "IP: 10.0.4.12 (Lab 201)", timestamp: "2026-08-08 17:45", status: "flagged" }
];

export const initialPerformanceWeightConfig: PerformanceWeightConfig = {
  midExamWeight: 40,
  assignmentWeight: 25,
  classActivityWeight: 20,
  otherAssessmentsWeight: 15
};

export const initialMidExamMarks: MidExamMarks[] = [
  // Alex Morgan (stu_1) - Strong Mid Exam Performance (Sem 5)
  { id: "mid_1_1", studentId: "stu_1", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 27, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_1_2", studentId: "stu_1", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 25, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" },
  { id: "mid_1_3", studentId: "stu_1", subjectId: "subj_3", subjectName: "CS-503 Full Stack Web Technologies", score: 28, maxScore: 30, examDate: "2026-07-17", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-18" },
  { id: "mid_1_4", studentId: "stu_1", subjectId: "subj_4", subjectName: "CS-504 Machine Learning & AI Foundations", score: 24, maxScore: 30, examDate: "2026-07-18", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-19" },

  // Alex Morgan (stu_1) - Historical Mid Exam Performance
  { id: "mid_1_401", studentId: "stu_1", subjectId: "subj_401", subjectName: "CS-401 Operating Systems & Kernels", score: 26, maxScore: 30, examDate: "2026-03-15", academicPeriod: "Semester IV Mid-Exam", updatedAt: "2026-03-16" },
  { id: "mid_1_402", studentId: "stu_1", subjectId: "subj_402", subjectName: "CS-402 Computer Networks & Protocols", score: 28, maxScore: 30, examDate: "2026-03-16", academicPeriod: "Semester IV Mid-Exam", updatedAt: "2026-03-17" },
  { id: "mid_1_301", studentId: "stu_1", subjectId: "subj_301", subjectName: "CS-301 Data Structures Foundations", score: 25, maxScore: 30, examDate: "2025-10-15", academicPeriod: "Semester III Mid-Exam", updatedAt: "2025-10-16" },

  // Brandon Lee (stu_2) - Weak Mid Exam Performance
  { id: "mid_2_1", studentId: "stu_2", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 18, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_2_2", studentId: "stu_2", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 15, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" },
  { id: "mid_2_3", studentId: "stu_2", subjectId: "subj_3", subjectName: "CS-503 Full Stack Web Technologies", score: 20, maxScore: 30, examDate: "2026-07-17", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-18" },
  { id: "mid_2_4", studentId: "stu_2", subjectId: "subj_4", subjectName: "CS-504 Machine Learning & AI Foundations", score: 14, maxScore: 30, examDate: "2026-07-18", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-19" },

  // Chloe Patel (stu_3) - Good Mid Exam Performance
  { id: "mid_3_1", studentId: "stu_3", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 25, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_3_2", studentId: "stu_3", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 26, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" },
  { id: "mid_3_3", studentId: "stu_3", subjectId: "subj_3", subjectName: "CS-503 Full Stack Web Technologies", score: 24, maxScore: 30, examDate: "2026-07-17", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-18" },
  { id: "mid_3_4", studentId: "stu_3", subjectId: "subj_4", subjectName: "CS-504 Machine Learning & AI Foundations", score: 23, maxScore: 30, examDate: "2026-07-18", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-19" },

  // David Kim (stu_4) - Satisfactory Mid Exam Performance
  { id: "mid_4_1", studentId: "stu_4", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 21, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_4_2", studentId: "stu_4", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 19, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" },

  // Emma Watson (stu_5) - Outstanding Mid Exam Performance
  { id: "mid_5_1", studentId: "stu_5", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 29, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_5_2", studentId: "stu_5", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 30, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" },

  // Faisal Hassan (stu_6) - Needs Improvement
  { id: "mid_6_1", studentId: "stu_6", subjectId: "subj_1", subjectName: "CS-501 Advanced Data Structures", score: 14, maxScore: 30, examDate: "2026-07-15", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-16" },
  { id: "mid_6_2", studentId: "stu_6", subjectId: "subj_2", subjectName: "CS-502 Database Management Systems", score: 12, maxScore: 30, examDate: "2026-07-16", academicPeriod: "Semester V Mid-Exam", updatedAt: "2026-07-17" }
];

