import React, { useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";

/**
 * LoginScreen
 *
 * New component — there was no login UI before this phase (the app previously
 * defaulted straight into an admin session with a role-switcher dropdown). This
 * screen is shown by App.tsx whenever there is no authenticated Firebase session.
 *
 * Styled to match the existing app's visual language (slate/indigo palette,
 * rounded-3xl cards, shadow-xl) rather than introducing a new design system.
 */
export const LoginScreen: React.FC = () => {
  const { login, authError } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.success) {
      setLocalError(result.message || "Sign-in failed. Please check your credentials.");
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">EduSync AI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to your Student, Teacher, or Admin account.
          </p>
        </div>

        {displayedError && (
          <div className="flex items-start space-x-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@edusync.edu"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-md"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
          Accounts are provisioned by your administrator. Contact them if you don't have credentials.
        </p>
      </div>
    </div>
  );
};

