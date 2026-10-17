import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { FileText, Plus, Award, X, Save, Loader2 } from "lucide-react";

export const AssignmentManager: React.FC = () => {
  const {
    filteredAssignments: assignments,
    submissions,
    filteredSubjects: subjects,
    divisions,
    semesters,
    selectedSemesterId,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    evaluateSubmission,
    currentUser,
  } = useApp();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(assignments[0]?.id || null);
  const [formSemesterId, setFormSemesterId] = useState(selectedSemesterId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [divisionId, setDivisionId] = useState("all");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [rubric, setRubric] = useState("Code Quality (40%), Documentation (30%), Correctness (30%)");
  const [saving, setSaving] = useState(false);

  const formSubjects = useMemo(
    () => subjects.filter(subject => subject.semesterId === formSemesterId),
    [subjects, formSemesterId]
  );
  const formDivisions = useMemo(
    () => divisions.filter(division => division.semesterId === formSemesterId),
    [divisions, formSemesterId]
  );

  useEffect(() => {
    if (assignments.length > 0 && (!selectedAssignmentId || !assignments.some(a => a.id === selectedAssignmentId))) {
      setSelectedAssignmentId(assignments[0]?.id || null);
    }
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    setFormSemesterId(selectedSemesterId);
  }, [selectedSemesterId]);

  useEffect(() => {
    if (!formSubjects.some(subject => subject.id === subjectId)) {
      setSubjectId(formSubjects[0]?.id || "");
    }
  }, [formSubjects, subjectId]);

  useEffect(() => {
    if (divisionId !== "all" && !formDivisions.some(division => division.id === divisionId)) {
      setDivisionId("all");
    }
  }, [formDivisions, divisionId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setNote("");
    setMaxScore(100);
    setRubric("Code Quality (40%), Documentation (30%), Correctness (30%)");
    setDueDate("");
    setDivisionId("all");
    setFormSemesterId(selectedSemesterId);
  };

  const openEditAssignment = (assignment: typeof assignments[number]) => {
    setEditingAssignmentId(assignment.id);
    setFormSemesterId(assignment.semesterId || selectedSemesterId);
    setSubjectId(assignment.subjectId);
    setDivisionId(assignment.divisionId || "all");
    setTitle(assignment.title);
    setDescription(assignment.description);
    setNote(assignment.note || "");
    setDueDate(assignment.dueDate || "");
    setMaxScore(assignment.maxScore);
    setRubric(assignment.rubric || "");
    setCreateModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !subjectId || !formSemesterId) {
      alert("Please select semester, subject, and add assignment details.");
      return;
    }

    const subjectObj = formSubjects.find(subject => subject.id === subjectId);
    setSaving(true);
    try {
      if (editingAssignmentId) {
        const result = await updateAssignment(editingAssignmentId, {
          subjectId,
          subjectName: subjectObj?.name || "Subject",
          divisionId,
          targetDivisionIds: divisionId === "all" ? formDivisions.map(division => division.id) : [divisionId],
          semesterId: formSemesterId,
          title: title.trim(),
          description: description.trim(),
          note: note.trim(),
          dueDate,
          maxScore,
          rubric: rubric.trim(),
        });
        if (!result.success) { alert(result.message); return; }
        setCreateModalOpen(false);
        resetForm();
        setEditingAssignmentId(null);
        alert("Assignment updated successfully.");
        return;
      }

      const result = await addAssignment({
        subjectId,
        subjectName: subjectObj?.name || "Subject",
        divisionId,
        targetDivisionIds: divisionId === "all" ? formDivisions.map(division => division.id) : [divisionId],
        semesterId: formSemesterId,
        title: title.trim(),
        description: description.trim(),
        note: note.trim(),
        dueDate,
        maxScore,
        rubric: rubric.trim(),
        createdBy: currentUser.uid,
      });
      if (!result.success) { alert(result.message); return; }
      const created = result.assignment;
      if (!created) { alert("Assignment was created, but the server did not return its ID."); return; }
      setSelectedAssignmentId(created.id);
      setCreateModalOpen(false);
      resetForm();
      alert("Assignment published successfully.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignment: typeof assignments[number]) => {
    const confirmed = window.confirm(`Delete assignment "${assignment.title}"? This will also remove its submissions.`);
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await deleteAssignment(assignment.id);
      if (!result.success) { alert(result.message); return; }
      if (selectedAssignmentId === assignment.id) setSelectedAssignmentId(null);
      alert(result.message);
    } finally {
      setSaving(false);
    }
  };


  const handleSaveEvaluation = async (subId: string, grade: number, feedback: string) => {
    const result = await evaluateSubmission(subId, grade, feedback);
    if (!result.success) alert(result.message);
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const currentSubmissions = submissions.filter(submission => submission.assignmentId === selectedAssignmentId);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Assignments & Evaluation Desk</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish semester-specific text assignments, add student notes, inspect submissions, and assign grades.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingAssignmentId(null); setCreateModalOpen(true); }}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" /><span>Create New Assignment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Published Tasks ({assignments.length})</h3>
          {assignments.map(asgn => {
            const isSelected = asgn.id === selectedAssignmentId;
            const subCount = submissions.filter(s => s.assignmentId === asgn.id).length;
            return (
              <div key={asgn.id} onClick={() => setSelectedAssignmentId(asgn.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600" : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"}`}>{asgn.subjectName || "Subject"}</span>
                  <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>Due: {asgn.dueDate || "—"}</span>
                </div>
                <h4 className={`text-sm font-bold mt-2 line-clamp-1 ${isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{asgn.title}</h4>
                <p className={`text-[11px] mt-1 ${isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>Semester: {asgn.semesterId || "Current"}</p>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className={isSelected ? "text-indigo-200" : "text-slate-400"}>Submissions: <strong>{subCount}</strong></span>
                  <span className={isSelected ? "text-indigo-200" : "text-slate-400"}>Max {asgn.maxScore} Pts</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedAssignment ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedAssignment.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{selectedAssignment.subjectName} • Semester {selectedAssignment.semesterId || "Current"} • Due {selectedAssignment.dueDate || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEditAssignment(selectedAssignment)} className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Edit</button>
                    <button onClick={() => handleDeleteAssignment(selectedAssignment)} disabled={saving} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold disabled:opacity-60">Delete</button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{selectedAssignment.description}</p>
                {selectedAssignment.note && <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><strong>Note for students:</strong> {selectedAssignment.note}</div>}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Student Submissions ({currentSubmissions.length})</h4>
                {currentSubmissions.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-400">No submissions received yet for this assignment.</div>
                ) : (
                  <div className="space-y-3">
                    {currentSubmissions.map(sub => (
                      <SubmissionEvaluation key={sub.id} submission={sub} maxScore={selectedAssignment.maxScore} onSave={handleSaveEvaluation} />
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

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingAssignmentId ? "Edit Assignment" : "Publish Assignment"}</h3><p className="text-[11px] text-slate-400 mt-1">Text assignment + note + semester-specific targeting</p></div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Assignment Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Graph Traversal Algorithms" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Semester</label><select value={formSemesterId} onChange={e => { setFormSemesterId(e.target.value); setSubjectId(""); setDivisionId("all"); }} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">{semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Subject</label><select required value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">{formSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Division</label><select value={divisionId} onChange={e => setDivisionId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"><option value="all">All Divisions</option>{formDivisions.map(division => <option key={division.id} value={division.id}>{division.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Maximum Marks</label><input type="number" min={1} max={1000} value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Assignment Text / Requirements</label><textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed assignment instructions for students..." className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Note for Students <span className="font-normal text-slate-400">(optional)</span></label><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Any extra instruction, reminder, submission rule, etc." className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs" /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Grading Rubric</label><input value={rubric} onChange={e => setRubric(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? (editingAssignmentId ? "Saving..." : "Publishing...") : (editingAssignmentId ? "Save Changes" : "Publish Assignment")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface SubmissionEvaluationProps {
  submission: { id: string; studentName: string; studentEnrollmentNo?: string; fileName: string; fileUrl: string; status: "pending" | "submitted" | "evaluated"; grade?: number; feedback?: string; submittedAt: string };
  maxScore: number;
  onSave: (id: string, grade: number, feedback: string) => Promise<void>;
}

const SubmissionEvaluation: React.FC<SubmissionEvaluationProps> = ({ submission, maxScore, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [grade, setGrade] = useState(submission.grade ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (grade < 0 || grade > maxScore) { alert(`Grade must be between 0 and ${maxScore}.`); return; }
    setSaving(true);
    try { await onSave(submission.id, grade, feedback); setEditing(false); } finally { setSaving(false); }
  };

  return <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div><div className="text-sm font-bold text-slate-900">{submission.studentName}</div><div className="text-[11px] text-slate-500">Enrollment: {submission.studentEnrollmentNo || "—"} • {submission.fileName}</div><div className="text-[10px] text-slate-400">Submitted: {submission.submittedAt}</div></div>
      {!editing && <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {submission.status === "evaluated" ? "Edit Grade" : "Evaluate"}</button>}
    </div>
    {submission.status === "evaluated" && !editing && <div className="mt-3 text-xs"><strong>Score:</strong> {submission.grade} / {maxScore} {submission.feedback && <span className="ml-3 text-slate-500">Feedback: {submission.feedback}</span>}</div>}
    {editing && <div className="mt-3 grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-2 items-end"><div><label className="text-[10px] font-bold text-slate-500">Score</label><input type="number" min={0} max={maxScore} value={grade} onChange={e => setGrade(Number(e.target.value))} className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs" /></div><div><label className="text-[10px] font-bold text-slate-500">Feedback</label><input value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs" /></div><button onClick={save} disabled={saving} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-60">{saving ? "Saving..." : "Save"}</button></div>}
  </div>;
};
