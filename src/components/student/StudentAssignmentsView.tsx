import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { FileText, UploadCloud, CheckCircle2, Clock, Download, Award, Send } from "lucide-react";

export const StudentAssignmentsView: React.FC = () => {
  const {
    filteredAssignments: assignments,
    submissions,
    submitAssignment,
    currentUser,
    students,
    selectedSemester,
    selectedSemesterId
  } = useApp();

  const myStudentObj = students.find(s => s.uid === currentUser.uid || s.id === currentUser.uid || s.email === currentUser.email) || students[0] || {
    id: currentUser.uid || "stu_1",
    name: currentUser.name || "Alex Morgan",
    email: currentUser.email || "alex.morgan@edusync.edu"
  };

  const [selectedAsgnId, setSelectedAsgnId] = useState<string | null>(assignments[0]?.id || null);

  React.useEffect(() => {
    if (assignments.length > 0 && (!selectedAsgnId || !assignments.some(a => a.id === selectedAsgnId))) {
      setSelectedAsgnId(assignments[0]?.id || null);
    } else if (assignments.length === 0) {
      setSelectedAsgnId(null);
    }
  }, [assignments, selectedSemesterId]);
  const [fileName, setFileName] = useState("AlexMorgan_GraphAlgorithms_Solution.zip");
  const [fileUrl, setFileUrl] = useState("https://edusync.edu/storage/submissions/alex_morgan_graph_asgn.zip");

  const handleSubmitFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsgnId) return;

    const asgn = assignments.find(a => a.id === selectedAsgnId);
    submitAssignment({
      assignmentId: selectedAsgnId,
      assignmentTitle: asgn?.title || "Assignment",
      studentId: myStudentObj?.id || currentUser.uid,
      studentName: myStudentObj?.name || currentUser.name,
      fileName,
      fileUrl,
      fileSize: "2.1 MB"
    });

    alert("Assignment solution uploaded successfully to Firebase Storage!");
  };

  const selectedAsgn = assignments.find(a => a.id === selectedAsgnId);
  const mySubmission = submissions.find(
    s => s.assignmentId === selectedAsgnId && s.studentId === myStudentObj.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Coursework Assignments & Submissions
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Download task sheets, submit solution files before deadline, and inspect teacher evaluation scores.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tasks List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Assigned Tasks ({assignments.length})
          </h3>

          {assignments.map(asgn => {
            const isSelected = asgn.id === selectedAsgnId;
            const sub = submissions.find(s => s.assignmentId === asgn.id && s.studentId === myStudentObj.id);

            return (
              <div
                key={asgn.id}
                onClick={() => setSelectedAsgnId(asgn.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                    }`}
                  >
                    {asgn.subjectName ? asgn.subjectName.split(" ")[0] : "Subject"}
                  </span>
                  <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                    Due: {asgn.dueDate}
                  </span>
                </div>

                <h4 className={`text-sm font-bold mt-2 ${isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                  {asgn.title}
                </h4>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      sub
                        ? isSelected
                          ? "bg-emerald-500/30 text-white"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : isSelected
                        ? "bg-amber-500/30 text-white"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    }`}
                  >
                    {sub ? (sub.status === "evaluated" ? `Graded (${sub.grade} pts)` : "Submitted") : "Pending Submission"}
                  </span>
                  <span className={isSelected ? "text-indigo-200" : "text-slate-400"}>Max {asgn.maxScore} Pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Submission Form / Evaluation */}
        <div className="lg:col-span-2">
          {selectedAsgn ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedAsgn.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Subject: {selectedAsgn.subjectName} | Posted By: {selectedAsgn.createdBy}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  {selectedAsgn.description}
                </p>
              </div>

              {/* Submission Area */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Your Solution Submission
                </h4>

                {mySubmission ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            {mySubmission.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">Uploaded: {mySubmission.submittedAt}</span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          mySubmission.status === "evaluated"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        }`}
                      >
                        {mySubmission.status === "evaluated" ? `Score: ${mySubmission.grade} / ${selectedAsgn.maxScore}` : "Under Evaluation"}
                      </span>
                    </div>

                    {mySubmission.feedback && (
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                        <span className="font-bold block mb-0.5">Teacher Feedback:</span>
                        <p className="italic">"{mySubmission.feedback}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFile} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors">
                      <UploadCloud className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Upload Solution Zip / PDF
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Max file size: 25MB (Firebase Storage Encrypted)
                      </span>
                      <input
                        type="text"
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        className="mt-3 w-full max-w-xs mx-auto text-center px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Upload Solution File</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select an assignment to view task details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
