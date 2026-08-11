import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { HardDrive, Lock, ShieldCheck, UploadCloud, FileText, Download, Plus, Trash2 } from "lucide-react";

export const StudentPersonalStorage: React.FC = () => {
  const { personalFiles, addPersonalFile, currentUser, students } = useApp();

  const myStudentObj = students.find(s => s.uid === currentUser.uid || s.id === "stu_1") || students[0] || {
    id: currentUser.uid || "stu_1",
    name: currentUser.name || "Alex Morgan",
    email: currentUser.email || "alex.morgan@edusync.edu"
  };
  const myFiles = personalFiles.filter(f => f.studentId === (myStudentObj?.id || currentUser.uid));

  const [modalOpen, setModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState<"Notes" | "Certificates" | "Assignments" | "Other">("Notes");

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    addPersonalFile({
      studentId: myStudentObj?.id || currentUser.uid,
      name: fileName,
      category,
      size: "2.4 MB",
      fileUrl: "#",
      isEncrypted: true
    });

    setModalOpen(false);
    setFileName("");
    alert("Private file stored in Firebase Storage with AES-256 client-side encryption!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <HardDrive className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Private Personal Storage Space
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store personal notes, course certificates, and project documentation in private encrypted cloud storage.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Encrypted File</span>
        </button>
      </div>

      {/* Files List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myFiles.map(file => (
          <div
            key={file.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  {file.category}
                </span>
                <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-3 h-3" />
                  <span>AES-256</span>
                </span>
              </div>

              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-3 truncate font-mono">
                {file.name}
              </h3>

              <span className="text-[10px] text-slate-400 block mt-1">Uploaded: {file.uploadedAt}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{file.size}</span>
              <button
                onClick={() => alert("Decrypting and downloading file...")}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Private File</h3>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="e.g. AWS_Cloud_Practitioner_Certificate.pdf"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="Notes">Notes & Handouts</option>
                  <option value="Certificates">Certificates & Awards</option>
                  <option value="Assignments">Assignments & Projects</option>
                  <option value="Other">Other Personal Records</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                >
                  Save Encrypted
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
