import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { FileText, UploadCloud, CheckCircle2, Send } from "lucide-react";

export const StudentAssignmentsView: React.FC = () => {
  const {
    filteredAssignments: assignments,
    submissions,
    submitAssignment,
    currentUser,
    students,
    selectedSemester,
    selectedSemesterId,
  } = useApp();

  const myStudentObj = students.find(student =>
    student.uid === currentUser.uid || student.id === currentUser.uid || student.email === currentUser.email
  );
  const ownStudentIds = useMemo(
    () => new Set([currentUser.uid, myStudentObj?.id || "", myStudentObj?.uid || "", myStudentObj?.enrollmentNo || ""]),
    [currentUser.uid, myStudentObj]
  );
  const [selectedAsgnId, setSelectedAsgnId] = useState<string | null>(assignments[0]?.id || null);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (assignments.length > 0 && (!selectedAsgnId || !assignments.some(a => a.id === selectedAsgnId))) setSelectedAsgnId(assignments[0]?.id || null);
    if (assignments.length === 0) setSelectedAsgnId(null);
  }, [assignments, selectedSemesterId, selectedAsgnId]);

  const selectedAsgn = assignments.find(a => a.id === selectedAsgnId);
  const mySubmission = submissions.find(s => s.assignmentId === selectedAsgnId && ownStudentIds.has(s.studentId));


  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsgnId || !selectedAsgn || !fileName.trim() || !fileUrl.trim()) {
      alert("Please provide the solution file name and file URL.");
      return;
    }
    const result = await submitAssignment({
      assignmentId: selectedAsgnId,
      assignmentTitle: selectedAsgn.title,
      studentId: myStudentObj?.id || currentUser.uid,
      studentName: myStudentObj?.name || currentUser.name,
      fileName: fileName.trim(),
      fileUrl: fileUrl.trim(),
      fileSize: "",
    });
    if (!result.success) alert(result.message);
    else alert(result.message);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400"><FileText className="w-5 h-5" /><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Coursework Assignments & Submissions</h2></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Semester {selectedSemester?.name || selectedSemesterId}: read assignment details, notes, submit solutions, and inspect evaluation.</p>
          {myStudentObj?.enrollmentNo && <p className="text-xs text-indigo-600 mt-2 font-semibold">Enrollment No.: {myStudentObj.enrollmentNo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Assigned Tasks ({assignments.length})</h3>
          {assignments.length === 0 && <div className="p-6 rounded-2xl bg-white border border-slate-200 text-sm text-slate-400">No assignments published for your current semester/division.</div>}
          {assignments.map(asgn => {
            const isSelected = asgn.id === selectedAsgnId;
            const sub = submissions.find(s => s.assignmentId === asgn.id && ownStudentIds.has(s.studentId));
            return <div key={asgn.id} onClick={() => setSelectedAsgnId(asgn.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-indigo-600 text-white shadow-md border-indigo-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300"}`}>
              <div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${isSelected ? "bg-white/20" : "bg-indigo-100 text-indigo-600"}`}>{asgn.subjectName || "Subject"}</span><span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>Due: {asgn.dueDate || "—"}</span></div>
              <h4 className={`text-sm font-bold mt-2 ${isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{asgn.title}</h4>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[11px]"><span className={isSelected ? "text-indigo-200" : "text-slate-400"}>{sub ? (sub.status === "evaluated" ? `Graded (${sub.grade})` : "Submitted") : "Pending Submission"}</span><span className={isSelected ? "text-indigo-200" : "text-slate-400"}>Max {asgn.maxScore}</span></div>
            </div>;
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedAsgn ? <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedAsgn.title}</h3><p className="text-xs text-slate-500 mt-1">{selectedAsgn.subjectName} • Semester {selectedAsgn.semesterId || selectedSemesterId} • Due {selectedAsgn.dueDate || "—"}</p></div>
              </div>
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap"><strong className="block mb-2 text-slate-900 dark:text-slate-100">Assignment Details</strong>{selectedAsgn.description}</div>
              {selectedAsgn.note && <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><strong>Teacher Note:</strong> {selectedAsgn.note}</div>}
              <div className="mt-3 text-[11px] text-slate-500">Maximum marks: <strong>{selectedAsgn.maxScore}</strong>{selectedAsgn.rubric ? ` • Rubric: ${selectedAsgn.rubric}` : ""}</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Your Solution Submission</h4>
              {mySubmission ? <div className="space-y-3"><div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200"><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><div><span className="text-xs font-bold block">{mySubmission.fileName}</span><span className="text-[10px] text-slate-400">Submitted: {mySubmission.submittedAt}</span></div></div><span className="text-xs font-bold">{mySubmission.status === "evaluated" ? `Score: ${mySubmission.grade} / ${selectedAsgn.maxScore}` : "Under Evaluation"}</span></div>{mySubmission.feedback && <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs"><strong>Teacher Feedback:</strong> {mySubmission.feedback}</div>}</div> : <form onSubmit={handleSubmitFile} className="space-y-3"><div className="flex items-center gap-2 text-xs text-slate-500"><UploadCloud className="w-5 h-5 text-indigo-500" /> Enter the solution file reference below.</div><input required value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Solution.pdf" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" /><input required value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="Secure file URL" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" /><button type="submit" className="w-full py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2"><Send className="w-4 h-4" />Submit Solution</button></form>}
            </div>
          </div> : <div className="p-12 text-center text-slate-400">No assignment selected.</div>}
        </div>
      </div>
    </div>
  );
};
