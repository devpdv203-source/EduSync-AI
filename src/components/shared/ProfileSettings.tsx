import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { User, ShieldCheck, Fingerprint, Lock, Moon, Sun, Save, CheckCircle } from "lucide-react";

export const ProfileSettings: React.FC = () => {
  const { currentUser, updateProfile, theme, toggleTheme, triggerBiometricVerification } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || "+1 (555) 234-5678");
  const [biometricEnabled, setBiometricEnabled] = useState(currentUser.biometricEnabled ?? true);
  const [mfaEnabled, setMfaEnabled] = useState(currentUser.mfaEnabled ?? true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerBiometricVerification("Save Profile & Security Settings", () => {
      updateProfile({
        name,
        email,
        phone,
        biometricEnabled,
        mfaEnabled
      });
      alert("Profile and security preferences updated successfully!");
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <User className="w-5 h-5" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Account Profile & Security Preferences
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile, biometric authentication, multi-factor verification, and theme mode.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <img
            src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
            alt={currentUser.name}
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/20"
          />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</h3>
            <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
              {currentUser.role} Role | {currentUser.department || "Computer Science"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Institutional Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Theme Display</label>
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold flex items-center justify-between"
              >
                <span>Current Mode: {theme.toUpperCase()}</span>
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Security & MFA Settings */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Security & Multi-Factor Verification
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Biometric Fingerprint / Touch ID MFA
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Require biometric authorization before modifying grades or exporting rosters.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={e => setBiometricEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Cloud Firestore Security Rules & Access Control
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Enforce document-level Firebase Auth security scopes.
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                Active
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
