import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  BookOpen,
  UploadCloud,
  FileText,
  Video,
  Link2,
  Download,
  Plus,
  Tag,
  Trash2
} from "lucide-react";

export const StudyMaterialUpload: React.FC = () => {
  const { studyMaterials, filteredSubjects: subjects, addStudyMaterial, currentUser } = useApp();

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  // New Material Form
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "subj_1");
  const [unit, setUnit] = useState("Unit 1");
  const [type, setType] = useState<"pdf" | "ppt" | "video" | "link" | "notes">("pdf");
  const [fileUrl, setFileUrl] = useState("https://edusync.edu/storage/materials/sample_lecture.pdf");

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const subjectObj = subjects.find(s => s.id === subjectId);
    addStudyMaterial({
      subjectId,
      subjectName: subjectObj?.name || "Subject",
      title,
      unit,
      type,
      fileUrl,
      fileSize: "3.5 MB",
      uploadedBy: currentUser.name
    });

    setModalOpen(false);
    setTitle("");
    alert("Study material uploaded to Firebase Storage and made available to students!");
  };

  const filteredMaterials = studyMaterials.filter(
    m => selectedSubject === "all" || m.subjectId === selectedSubject
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Study Materials & Resources Repository
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distribute unit notes, PPT lecture slides, video tutorial links, and reference sheets.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Resource</span>
        </button>
      </div>

      {/* Subject Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Subject:</span>
        <button
          onClick={() => setSelectedSubject("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedSubject === "all"
              ? "bg-indigo-600 text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          All Subjects
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedSubject === s.id
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(mat => (
          <div
            key={mat.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                  {mat.unit}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{mat.createdAt}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 line-clamp-2">
                {mat.title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Subject: <span className="font-semibold">{mat.subjectName}</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Size: {mat.fileSize || "1.2 MB"}</span>
              <a
                href={mat.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Study Material</h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Unit 3: Normalization Lecture Notes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Unit Tag</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="Unit 1, Unit 2..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Resource Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="ppt">PPT Presentation</option>
                  <option value="notes">Lecture Handout Notes</option>
                  <option value="video">Video Tutorial Link</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">File or Video URL</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  Upload Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
