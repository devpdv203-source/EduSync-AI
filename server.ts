import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client lazily
let aiClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "EduSync AI Backend", timestamp: new Date().toISOString() });
});

// Mock Server In-Memory User Store for Backend Authorization Verification
let serverUsersStore = [
  {
    uid: "admin_01",
    name: "Dr. Marcus Vance (Admin)",
    email: "admin@edusync.edu",
    role: "admin",
    status: "Active",
    department: "Academic Affairs & IT"
  },
  {
    uid: "teacher_01",
    name: "Prof. Sarah Jenkins",
    email: "sarah.jenkins@edusync.edu",
    role: "teacher",
    status: "Active",
    department: "Computer Science & Engineering"
  },
  {
    uid: "teacher_02",
    name: "Prof. Robert Chen",
    email: "robert.chen@edusync.edu",
    role: "teacher",
    status: "Active",
    department: "Information Technology"
  },
  {
    uid: "student_01",
    name: "Alex Morgan",
    email: "alex.morgan@edusync.edu",
    role: "student",
    status: "Active",
    enrollmentNo: "EN2026-CS-042"
  },
  {
    uid: "student_02",
    name: "Brandon Lee",
    email: "brandon.lee@edusync.edu",
    role: "student",
    status: "Active",
    enrollmentNo: "EN2026-CS-015"
  }
];

// Server RBAC Middleware / Endpoint: GET Users (Admin Only)
app.get("/api/rbac/users", (req, res) => {
  const requesterRole = req.headers["x-user-role"] || req.query.requesterRole;
  if (requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Access Denied. Only Administrators can view the full user list."
    });
  }
  return res.json({ success: true, users: serverUsersStore });
});

// Server RBAC Endpoint: Change User Role (Admin Only)
app.post("/api/rbac/change-role", (req, res) => {
  const { requesterUid, requesterRole, targetUid, newRole } = req.body;

  // 1. Authenticate / Verify Requester Role
  if (requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Only Administrators are authorized to change user roles or assign permissions."
    });
  }

  // 2. Validate Target User
  const targetUser = serverUsersStore.find(u => u.uid === targetUid);
  if (targetUser) {
    targetUser.role = newRole;
  } else {
    // Add to server store if new
    serverUsersStore.push({
      uid: targetUid,
      name: `User ${targetUid}`,
      email: `${targetUid}@edusync.edu`,
      role: newRole,
      status: "Active",
      department: "General"
    });
  }

  return res.json({
    success: true,
    message: `User role updated to ${newRole.toUpperCase()} successfully.`,
    targetUid,
    newRole
  });
});

// Server RBAC Endpoint: Change User Account Status (Admin Only)
app.post("/api/rbac/change-status", (req, res) => {
  const { requesterRole, targetUid, newStatus } = req.body;

  if (requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Only Administrators can modify account active/suspended status."
    });
  }

  const targetUser = serverUsersStore.find(u => u.uid === targetUid);
  if (targetUser) {
    targetUser.status = newStatus;
  }

  return res.json({
    success: true,
    message: `Account status for ${targetUid} changed to ${newStatus}.`,
    targetUid,
    newStatus
  });
});

// Server RBAC Endpoint: Capture / Save Daily Session Attendance (Teachers & Admins Only)
app.post("/api/rbac/attendance/save", (req, res) => {
  const { requesterRole, subjectId, divisionId, date, period, presentStudentIds, absentStudentIds } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are not authorized to record, edit, or delete attendance records."
    });
  }

  if (!subjectId || !divisionId || !date || !period) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: subjectId, divisionId, date, and period are required."
    });
  }

  return res.json({
    success: true,
    message: `Attendance saved/updated for subject ${subjectId}, division ${divisionId}, date ${date}, period ${period}.`,
    recordedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Student Report Access Verification
app.post("/api/rbac/report-access/verify", (req, res) => {
  const { requesterRole, requesterStudentId, targetStudentId } = req.body;

  if (requesterRole === "student") {
    if (requesterStudentId && targetStudentId && requesterStudentId !== targetStudentId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Students are strictly forbidden from viewing, downloading, or accessing another student's report."
      });
    }
  }

  return res.json({
    success: true,
    message: "Report access authorized."
  });
});

// Server RBAC Endpoint: Submit Report Error Notification (Students only for themselves, or teachers/admins)
app.post("/api/rbac/report-issues/submit", (req, res) => {
  const { requesterRole, requesterStudentId, targetStudentId, category, description } = req.body;

  if (requesterRole === "student" && requesterStudentId && targetStudentId && requesterStudentId !== targetStudentId) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students can only submit report error notifications for their own report."
    });
  }

  if (!category || !description) {
    return res.status(400).json({
      success: false,
      error: "Category and description are required fields."
    });
  }

  return res.json({
    success: true,
    message: "Report error notification submitted successfully."
  });
});

// Server RBAC Endpoint: Update Report Issue Status / Response (Teachers & Admins Only)
app.post("/api/rbac/report-issues/update-status", (req, res) => {
  const { requesterRole, issueId, status, responseText } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students cannot resolve or modify report error notifications."
    });
  }

  return res.json({
    success: true,
    message: `Report issue ${issueId} updated to status '${status}'.`
  });
});

// Server RBAC Endpoint: Update Mid Examination Marks (Teachers & Admins Only)
app.post("/api/rbac/mid-exam-marks/update", (req, res) => {
  const { requesterRole, studentId, subjectId, score, maxScore } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are strictly prohibited from creating or modifying examination scores."
    });
  }

  if (score < 0 || score > (maxScore || 30)) {
    return res.status(400).json({
      success: false,
      error: `Invalid score. Mid examination score must be between 0 and ${maxScore || 30}.`
    });
  }

  return res.json({
    success: true,
    message: `Mid examination score of ${score}/${maxScore || 30} recorded successfully for student ${studentId}.`,
    updatedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Correct Attendance Record (Teachers & Admins Only)
app.post("/api/rbac/attendance/correct", (req, res) => {
  const { requesterRole, studentId, subjectId, date, period, newStatus } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are strictly prohibited from altering or correcting attendance records."
    });
  }

  return res.json({
    success: true,
    message: `Attendance for student ${studentId} on ${date} (period ${period}) updated to '${newStatus}'.`,
    updatedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Correct Assignment Score (Teachers & Admins Only)
app.post("/api/rbac/assignment-score/correct", (req, res) => {
  const { requesterRole, studentId, assignmentId, newScore } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are strictly prohibited from modifying coursework evaluation grades."
    });
  }

  return res.json({
    success: true,
    message: `Assignment score for student ${studentId} updated to ${newScore}.`,
    updatedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Correct Student Profile Information (Teachers & Admins Only)
app.post("/api/rbac/student-profile/correct", (req, res) => {
  const { requesterRole, studentId, name, enrollmentNo, email } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are strictly prohibited from editing official institutional student records."
    });
  }

  return res.json({
    success: true,
    message: `Profile info for student ${studentId} updated successfully.`,
    updatedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Regenerate Performance Report (Teachers & Admins Only)
app.post("/api/rbac/report/regenerate", (req, res) => {
  const { requesterRole, studentId } = req.body;

  if (requesterRole !== "teacher" && requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Students are strictly prohibited from initiating manual report regeneration or version overrides."
    });
  }

  return res.json({
    success: true,
    message: `Report for student ${studentId} recalculated and regenerated successfully.`,
    updatedByRole: requesterRole
  });
});

// Server RBAC Endpoint: Update Performance Calculation Weightings (Admin Only)
app.post("/api/rbac/weight-config/update", (req, res) => {
  const { requesterRole, midExamWeight, assignmentWeight, classActivityWeight, otherAssessmentsWeight } = req.body;

  if (requesterRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Only Administrators can configure academic performance calculation weights."
    });
  }

  const totalWeight = Number(midExamWeight) + Number(assignmentWeight) + Number(classActivityWeight) + Number(otherAssessmentsWeight);
  if (totalWeight !== 100) {
    return res.status(400).json({
      success: false,
      error: `Invalid weight configuration: Total weights sum to ${totalWeight}%, but must equal exactly 100%.`
    });
  }

  return res.json({
    success: true,
    message: "Academic performance calculation weights updated successfully.",
    weights: { midExamWeight, assignmentWeight, classActivityWeight, otherAssessmentsWeight }
  });
});

// Server RBAC Endpoint: Validate Route / Tab Access Permissions
app.post("/api/rbac/verify-access", (req, res) => {
  const { userRole, targetTab } = req.body;

  const adminOnlyTabs = ["user_management"];
  const teacherTabs = ["dashboard", "semester_students", "attendance", "marks", "assignments", "materials", "timetable", "announcements", "ai_analytics", "reports", "report_issues", "settings"];
  const studentTabs = ["dashboard", "assignments", "attendance", "marks", "materials", "ai_analytics", "timetable", "announcements", "personal_storage", "reports", "report_issues", "settings"];

  if (adminOnlyTabs.includes(targetTab) && userRole !== "admin") {
    return res.status(403).json({
      allowed: false,
      error: "Access Denied: Tab requires Administrator privileges."
    });
  }

  if (userRole === "student" && !studentTabs.includes(targetTab)) {
    return res.status(403).json({
      allowed: false,
      error: "Access Denied: Students do not have access to teacher or administrative areas."
    });
  }

  return res.json({ allowed: true });
});

// Server RBAC Endpoint: Report Access & Ownership Authorization
app.post("/api/rbac/report/view", (req, res) => {
  const { requesterRole, requesterStudentId, targetStudentId } = req.body;

  if (requesterRole === "admin") {
    return res.json({
      success: true,
      allowed: true,
      message: "Administrator authorized for full report access."
    });
  }

  if (requesterRole === "teacher") {
    return res.json({
      success: true,
      allowed: true,
      message: "Teacher authorized for student report access."
    });
  }

  if (requesterRole === "student") {
    if (requesterStudentId && targetStudentId && requesterStudentId === targetStudentId) {
      return res.json({
        success: true,
        allowed: true,
        message: "Student authorized to view own academic performance report."
      });
    } else {
      return res.status(403).json({
        success: false,
        allowed: false,
        error: "403 Forbidden: Students are strictly restricted to viewing ONLY their own generated report."
      });
    }
  }

  return res.status(403).json({
    success: false,
    allowed: false,
    error: "403 Forbidden: Unauthorized report request."
  });
});

// Server RBAC Endpoints for Batch & Division Reports (Forbidden for Students)
app.post(["/api/report/batch-export", "/api/report/division-attendance", "/api/report/official-mark-sheets", "/api/report/ai-risk-analysis"], (req, res) => {
  const { requesterRole } = req.body;
  if (requesterRole === "student") {
    return res.status(403).json({
      success: false,
      allowed: false,
      error: "403 Forbidden: Students are not authorized to access batch data ledger exports, division attendance reports, or official class mark sheets."
    });
  }
  return res.json({
    success: true,
    allowed: true,
    message: "Authorized for export operation."
  });
});

// Server RBAC Endpoint: Submit Report Error Issue Ticket
app.post("/api/rbac/report-issues/submit", (req, res) => {
  const { requesterRole, requesterStudentId, targetStudentId, category, description } = req.body;

  if (requesterRole === "student") {
    if (!requesterStudentId || !targetStudentId || requesterStudentId !== targetStudentId) {
      return res.status(403).json({
        success: false,
        allowed: false,
        error: "403 Forbidden: Students are strictly restricted to submitting error tickets for their own report."
      });
    }
  }

  return res.json({
    success: true,
    allowed: true,
    message: "Report error issue ticket logged successfully."
  });
});

// Server RBAC Endpoint: Update Report Issue Status & Response
app.post("/api/rbac/report-issues/update-status", (req, res) => {
  const { requesterRole, issueId, status } = req.body;

  if (requesterRole === "student") {
    return res.status(403).json({
      success: false,
      allowed: false,
      error: "403 Forbidden: Students cannot modify ticket status or record administrative resolutions."
    });
  }

  return res.json({
    success: true,
    allowed: true,
    message: `Issue ${issueId} status updated to ${status}.`
  });
});

// AI Prediction & Risk Analysis API Endpoint
app.post("/api/ai/predict", async (req, res) => {
  try {
    const { studentName, attendancePct, subjects, internalMarks } = req.body;

    const ai = getGenAIClient();
    if (!ai) {
      // Fallback deterministic ML calculation if API key is not configured
      const avgInternal = Object.values(internalMarks as Record<string, number>).reduce((a, b) => a + b, 0) / (Object.keys(internalMarks).length || 1);
      const projectedAttendance = Math.min(100, Math.round(attendancePct * 1.02));
      const predictedMarks = Math.min(100, Math.round(avgInternal * 4 + (attendancePct > 80 ? 5 : -5)));
      const riskCategory = attendancePct < 75 || avgInternal < 12 ? "High" : avgInternal < 15 ? "Medium" : "Low";

      return res.json({
        success: true,
        source: "local-ml-engine",
        predictions: {
          projectedAttendance,
          predictedFinalMarks: predictedMarks,
          riskCategory,
          weakSubjects: Object.entries(internalMarks as Record<string, number>)
            .filter(([_, score]) => score < 14)
            .map(([subj]) => subj),
          studyRecommendations: [
            "Focus on weak subjects with score below 14/20.",
            "Maintain at least 75% attendance to qualify for term-end examinations.",
            "Complete pending practice assignments to boost internal scores."
          ]
        }
      });
    }

    const prompt = `You are EduSync AI, an academic performance prediction assistant. Analyze the following student record:
Student Name: ${studentName || "Student"}
Current Attendance: ${attendancePct}%
Subjects: ${JSON.stringify(subjects)}
Internal Marks (out of 20): ${JSON.stringify(internalMarks)}

Respond with a JSON object ONLY in the following format:
{
  "projectedAttendance": number (0-100),
  "predictedFinalMarks": number (0-100 percentage overall),
  "riskCategory": "Low" | "Medium" | "High",
  "weakSubjects": [string],
  "studyRecommendations": [string (3 actionable tips)]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);

    return res.json({
      success: true,
      source: "gemini-3.6-flash",
      predictions: parsed
    });
  } catch (err: any) {
    console.error("AI Prediction Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate prediction",
      message: err?.message || String(err)
    });
  }
});

// AI Class Interventions & Analytics Endpoint
app.post("/api/ai/teacher-insights", async (req, res) => {
  try {
    const { className, totalStudents, atRiskCount, weakSubjects } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      return res.json({
        success: true,
        source: "local-ml-engine",
        insights: [
          `Conduct remedial sessions for ${weakSubjects.join(", ") || "underperforming subjects"}.`,
          `Schedule 1-on-1 academic counseling with the ${atRiskCount} at-risk students.`,
          "Distribute revision notes and unit study packages before upcoming term-end exams."
        ]
      });
    }

    const prompt = `You are EduSync AI Teacher Advisor. Class: ${className}, Total Students: ${totalStudents}, At Risk Count: ${atRiskCount}, Weak Subjects: ${JSON.stringify(weakSubjects)}. Provide 3 concise, highly actionable teaching strategy recommendations for the teacher in JSON format: {"insights": [string]}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || '{"insights": []}');
    return res.json({ success: true, insights: parsed.insights });
  } catch (err) {
    res.json({
      success: true,
      insights: [
        "Schedule additional tutorial classes for high-risk students.",
        "Review attendance patterns for lectures with frequent absenteeism.",
        "Provide supplementary online study materials via Firebase storage."
      ]
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduSync AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
