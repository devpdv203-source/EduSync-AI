import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Megaphone, Plus, Bell, ShieldAlert, CheckCircle, X } from "lucide-react";

export const AnnouncementsView: React.FC = () => {
  const { announcements, postAnnouncement, role, currentUser, divisions } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetDivisionId, setTargetDivisionId] = useState("all");
  const [isImportant, setIsImportant] = useState(false);

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const divObj = divisions.find(d => d.id === targetDivisionId);
    postAnnouncement({
      title,
      message,
      targetDivisionId,
      targetDivisionName: targetDivisionId === "all" ? "All Divisions" : divObj?.name || "Division",
      postedBy: currentUser.name,
      postedRole: currentUser.role,
      isImportant
    });

    setModalOpen(false);
    setTitle("");
    setMessage("");
    alert("Broadcast announcement posted! FCM push notifications triggered to mobile devices.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <Megaphone className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Class Announcements & FCM Push Broadcasts
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish academic notices, exam schedules, and urgent division updates with real-time push alerts.
          </p>
        </div>

        {role !== "student" && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map(ann => (
          <div
            key={ann.id}
            className={`p-6 rounded-3xl border transition-all ${
              ann.isImportant
                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  {ann.targetDivisionName}
                </span>
                {ann.isImportant && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    High Priority Notice
                  </span>
                )}
              </div>

              <span className="text-[10px] text-slate-400">{ann.timestamp}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3">
              {ann.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {ann.message}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
              Posted By: <strong className="text-slate-700 dark:text-slate-300">{ann.postedBy}</strong> ({ann.postedRole.toUpperCase()})
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Post Announcement */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Broadcast Announcement</h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Semester Exam Schedule Released"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Target Division</label>
                <select
                  value={targetDivisionId}
                  onChange={e => setTargetDivisionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="all">All Divisions</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Announcement Message</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your broadcast message..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="important"
                  checked={isImportant}
                  onChange={e => setIsImportant(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="important" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mark as High Priority (Send Push Alert)
                </label>
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
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
