import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  FileText,
  CalendarCheck,
  ShieldAlert,
  Megaphone,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const { notifications, markNotificationRead, clearAllNotifications } = useApp();

  if (!isOpen) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case "risk_alert":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "assignment":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "attendance":
        return <CalendarCheck className="w-4 h-4 text-emerald-500" />;
      case "security":
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case "announcement":
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Notifications & Alerts
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time push events & system alerts
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification List */}
              <div className="p-4 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No active notifications</p>
                    <p className="text-xs mt-1">System status updates will appear here.</p>
                  </div>
                ) : (
                  notifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        markNotificationRead(item.id);
                        if (item.linkTab) {
                          onNavigateTab(item.linkTab);
                          onClose();
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        item.read
                          ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800"
                          : "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/50 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                          {getIconForType(item.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Action */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
                <span className="text-xs text-slate-400">
                  {notifications.filter(n => !n.read).length} unread
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
