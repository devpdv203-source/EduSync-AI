import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  FileText,
  Plus,
  Calendar,
  CheckCircle,
  FileCheck,
  Download,
  Award,
  Send,
  X
} from "lucide-react";

export const AssignmentManager: React.FC = () => {
  const {
    filteredAssignments: assignments,
    submissions,
    filteredSubjects: subjects,
    filteredDivisions: divisions,
    selectedSemesterId,
    addAssignment,
    evaluateSubmission,
    currentUser
  } = useApp();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    assignments[0]?.id || null
  );

  useEffect(() => {
    if (assignments.length > 0 && (!selectedAssignmentId || !assignments.some(a => a.id === selectedAssignmentId))) {
      setSelectedAssignmentId(assignments[0]?.id || null);
    }
    if (subjects.length > 0 && (!subjectId || !subjects.some(s => s.id === subjectId))) {
      setSubjectId(subjects[0]?.id || "subj_1");
    }
    if (divisions.length > 0 && (!divisionId || !divisions.some(d => d.id === divisionId))) {
      setDivisionId(divisions[0]?.id || "div_a");
    }
  }, [selectedSemesterId, assignments, subjects, divisions]);

  // New Assignment Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "subj_1");
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || "div_a");
  const [dueDate, setDueDate] = useState("2026-08-25");
  const [maxScore, setMaxScore] = useState(100);
  const [rubric, setRubric] = useState("Code Quality (40%), Documentation (30%), Correctness (30%)");

  // Evaluation state
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState("");

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const subjectObj = subjects.find(s => s.id === subjectId);
    addAssignment({
      subjectId,
      subjectName: subjectObj?.name || "Subject",
      divisionId,
      title,
      description,
      dueDate,
      maxScore,
      rubric,
      createdBy: currentUser.name,
      attachmentName: "Assignment_Guidelines.pdf",
      attachmentUrl: "#"
    });

    setCreateModalOpen(false);
    setTitle("");
    setDescription("");
    alert("New assignment published to division students!");
  };

  const handleSaveEvaluation = (subId: string) => {
    evaluateSubmission(subId, gradeInput, feedbackInput);
    setGradingSubmissionId(null);
    setFeedbackInput("");
    alert("Student submission evaluated!");
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const currentSubmissions = submissions.filter(s => s.assignmentId === selectedAssignmentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Assignments & Evaluation Desk
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create coursework tasks, inspect student file submissions, assign grades, and provide feedback.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Assignment</span>
        </button>
      </div>

      {/* Main Layout: Assignments List & Submissions Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Published Assignments list */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Published Tasks ({assignments.length})
          </h3>

          {assignments.map(asgn => {
            const isSelected = asgn.id === selectedAssignmentId;
            const subCount = submissions.filter(s => s.assignmentId === asgn.id).length;

            return (
              <div
                key={asgn.id}
                onClick={() => setSelectedAssignmentId(asgn.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {asgn.subjectName ? asgn.subjectName.split(" ")[0] : "Subject"}
                  </span>
                  <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                    Due: {asgn.dueDate}
                  </span>
                </div>

                <h4 className={`text-sm font-bold mt-2 line-clamp-1 ${isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                  {asgn.title}
                </h4>

                <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? "text-indigo-100/90" : "text-slate-500 dark:text-slate-400"}`}>
                  {asgn.description}
                </p>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className={isSelected ? "text-indigo-200" : "text-slate-400"}>
                    Submissions: <strong className={isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}>{subCount}</strong>
                  </span>
                  <span className={`font-semibold ${isSelected ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`}>
                    Max {asgn.maxScore} Pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Assignment Submissions Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAssignment ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              {/* Assignment Detail Summary */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedAssignment.title}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedAssignment.subjectName}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {selectedAssignment.description}
                </p>

                {selectedAssignment.rubric && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-200">Grading Rubric:</span> {selectedAssignment.rubric}
                  </div>
                )}
              </div>

              {/* Submissions Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Student Submissions ({currentSubmissions.length})
                </h4>

                {currentSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No submissions received yet for this assignment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSubmissions.map(sub => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {sub.studentName}
                              </h5>
                              <span className="text-[10px] text-slate-400">Submitted: {sub.submittedAt}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={sub.fileUrl}
                              download
                              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 flex items-center space-x-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{sub.fileName}</span>
                            </a>

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                sub.status === "evaluated"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {sub.status === "evaluated" ? `Graded (${sub.grade} pts)` : "Pending Evaluation"}
                            </span>
                          </div>
                        </div>

                        {/* Grading Action or Display */}
                        {gradingSubmissionId === sub.id ? (
                          <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 space-y-3">
                            <div className="flex items-center space-x-3">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Score (out of {selectedAssignment.maxScore}):
                              </label>
                              <input
                                type="number"
                                max={selectedAssignment.maxScore}
                                value={gradeInput}
                                onChange={e => setGradeInput(parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center"
                              />
                            </div>

                            <textarea
                              rows={2}
                              value={feedbackInput}
                              onChange={e => setFeedbackInput(e.target.value)}
                              placeholder="Write constructive evaluation feedback..."
                              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setGradingSubmissionId(null)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEvaluation(sub.id)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center space-x-1"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Save Grade</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/40 dark:border-slate-800">
                            <span className="text-slate-500">
                              {sub.feedback ? `Feedback: "${sub.feedback}"` : "No evaluation recorded yet."}
                            </span>
                            <button
                              onClick={() => {
                                setGradingSubmissionId(sub.id);
                                setGradeInput(sub.grade || 85);
                                setFeedbackInput(sub.feedback || "");
                              }}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{sub.status === "evaluated" ? "Edit Grade" : "Evaluate"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select an assignment to inspect submissions.</div>
          )}
        </div>
      </div>

      {/* Modal: Create Assignment */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Publish Assignment</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Graph Traversal Algorithms Implementation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Description & Requirements</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detailed assignment instructions for students..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Grading Rubric</label>
                <input
                  type="text"
                  value={rubric}
                  onChange={e => setRubric(e.target.value)}
                  placeholder="e.g. Correctness (50%), Documentation (30%), Design (20%)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
