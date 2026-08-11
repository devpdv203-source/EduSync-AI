import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Fingerprint, ShieldCheck, Lock, Key, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const BiometricMfaModal: React.FC = () => {
  const { mfaModalOpen, mfaActionTitle, closeMfaModal, confirmMfaModal } = useApp();
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  if (!mfaModalOpen) return null;

  const handleTouchAuth = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        setPin("");
        confirmMfaModal();
      }, 700);
    }, 1200);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        setPin("");
        confirmMfaModal();
      }, 700);
    }, 800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Security Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Multi-Factor & Biometric Authorization
                </p>
              </div>
            </div>
            <button
              onClick={closeMfaModal}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Description */}
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Action Request:</span> {mfaActionTitle || "Confirm sensitive system operation"}
          </div>

          {/* Biometric Touch Trigger */}
          <div className="my-6 text-center">
            {authSuccess ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center justify-center py-6 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-16 h-16 mb-2 animate-bounce" />
                <span className="text-base font-bold">Identity Confirmed</span>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleTouchAuth}
                  disabled={verifying}
                  className={`relative p-5 rounded-full border-2 transition-all duration-300 ${
                    verifying
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 animate-pulse"
                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg"
                  }`}
                >
                  <Fingerprint className="w-12 h-12" />
                </button>
                <span className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {verifying ? "Scanning fingerprint / Touch ID..." : "Tap fingerprint icon or enter PIN below"}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="absolute bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or Enter 4-Digit Security PIN
            </span>
          </div>

          {/* PIN Form */}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-digit PIN (e.g. 1234)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={closeMfaModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pin.length < 4 || verifying}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                {verifying ? "Verifying..." : "Authorize Action"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
