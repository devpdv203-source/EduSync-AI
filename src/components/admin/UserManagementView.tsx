import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { UserProfile, UserRole } from "../../types";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  UserX,
  History,
  Building,
  Mail,
  X
} from "lucide-react";

export const UserManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    role,
    changeUserRole,
    toggleUserStatus,
    addUser,
    auditLogs
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | UserRole | "suspended">("all");

  // Change Role Modal State
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [newRoleSelection, setNewRoleSelection] = useState<UserRole>("student");
  const [roleModalConfirming, setRoleModalConfirming] = useState(false);

  // Status Modal State
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserProfile | null>(null);

  // Add User Modal State
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("student");
  const [newUserDepartment, setNewUserDepartment] = useState("Computer Science & Engineering");
  const [newUserEnrollment, setNewUserEnrollment] = useState("");

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.enrollmentNo && u.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterRole === "suspended") {
      return matchesSearch && u.status === "Suspended";
    }

    if (filterRole !== "all") {
      return matchesSearch && u.role === filterRole && u.status !== "Suspended";
    }

    return matchesSearch;
  });

  const totalAdmins = users.filter(u => u.role === "admin").length;
  const totalTeachers = users.filter(u => u.role === "teacher").length;
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalSuspended = users.filter(u => u.status === "Suspended").length;

  const handleOpenRoleModal = (user: UserProfile) => {
    setSelectedUserForRole(user);
    setNewRoleSelection(user.role);
    setRoleModalConfirming(false);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRole) return;
    await changeUserRole(selectedUserForRole.uid, newRoleSelection);
    setSelectedUserForRole(null);
    setRoleModalConfirming(false);
  };

  const handleToggleStatusConfirm = async () => {
    if (!selectedUserForStatus) return;
    await toggleUserStatus(selectedUserForStatus.uid);
    setSelectedUserForStatus(null);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    await addUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      department: newUserDepartment,
      enrollmentNo: newUserRole === "student" ? newUserEnrollment || `EN2026-REG-${Math.floor(100 + Math.random() * 900)}` : undefined
    });

    setAddUserModalOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserEnrollment("");
  };

  if (role !== "admin") {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-900/50">
        <AlertTriangle className="w-12 h-12 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">
          403 - Access Restricted
        </h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto">
          User Management is restricted to System Administrators. Your active account role ({role.toUpperCase()}) does not possess elevated permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Admin User &amp; Role Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign user roles (Admin, Teacher, Student), manage account activation status, and audit permissions securely.
          </p>
        </div>

        <button
          onClick={() => setAddUserModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterRole("all")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterRole === "all"
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registered</span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">{users.length}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Accounts in System</span>
        </div>

        <div
          onClick={() => setFilterRole("admin")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterRole === "admin"
              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Administrators</span>
          <span className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">{totalAdmins}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Full System Access</span>
        </div>

        <div
          onClick={() => setFilterRole("teacher")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterRole === "teacher"
              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Faculty / Teachers</span>
          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">{totalTeachers}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Content Managers</span>
        </div>

        <div
          onClick={() => setFilterRole("student")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterRole === "student"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Enrolled Students</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{totalStudents}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">Scoped Access</span>
        </div>
      </div>

      {/* User Search & Filter Tabs */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search user name, email, enrollment..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Users" },
              { id: "admin", label: "Admins" },
              { id: "teacher", label: "Teachers" },
              { id: "student", label: "Students" },
              { id: "suspended", label: `Suspended (${totalSuspended})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterRole === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department / ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.map(u => {
                const isCurrentUser = u.uid === currentUser.uid;

                return (
                  <tr key={u.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                          alt={u.name}
                          className="w-8 h-8 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {u.name} {isCurrentUser && <span className="text-[10px] text-indigo-500 font-bold ml-1">(You)</span>}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300/40"
                            : u.role === "teacher"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300/40"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-700 dark:text-slate-300 block font-medium">
                        {u.department || "General"}
                      </span>
                      {u.enrollmentNo && (
                        <span className="text-[10px] text-slate-400 font-mono block">{u.enrollmentNo}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === "Suspended"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Suspended" ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <span>{u.status || "Active"}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {u.lastLogin || "Today"}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        disabled={isCurrentUser}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          isCurrentUser
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800/60"
                        }`}
                      >
                        Change Role
                      </button>

                      <button
                        onClick={() => setSelectedUserForStatus(u)}
                        disabled={isCurrentUser}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          isCurrentUser
                            ? "opacity-50 cursor-not-allowed text-slate-400"
                            : u.status === "Suspended"
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200/60"
                            : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200/60"
                        }`}
                      >
                        {u.status === "Suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold">RBAC &amp; Permission Audit Log</h3>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {auditLogs.map(log => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">{log.action}: {log.targetUser}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{log.details}</span>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-400">
                <span className="block font-medium">{log.performedBy}</span>
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Role Modal */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Lock className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Change User Role
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForRole(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Updating role permissions for <strong className="text-slate-900 dark:text-slate-100">{selectedUserForRole.name}</strong> ({selectedUserForRole.email}).
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Current Role: <span className="font-bold uppercase text-indigo-500">{selectedUserForRole.role}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Select New Role:</label>

              {[
                { roleId: "student", label: "Student", desc: "Access assigned coursework, submit assignments, view personal marks." },
                { roleId: "teacher", label: "Teacher / Faculty", desc: "Manage academic content, grade submissions, view student progress & reports." },
                { roleId: "admin", label: "Administrator", desc: "Full system administrative control, user role management & settings." }
              ].map(item => (
                <label
                  key={item.roleId}
                  className={`flex items-start space-x-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    newRoleSelection === item.roleId
                      ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="roleOption"
                    value={item.roleId}
                    checked={newRoleSelection === item.roleId}
                    onChange={() => setNewRoleSelection(item.roleId as UserRole)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {!roleModalConfirming ? (
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setRoleModalConfirming(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                >
                  Proceed to Confirm
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Confirm Role Change Action</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Are you sure you want to change <strong>{selectedUserForRole.name}</strong>'s role from <strong>{selectedUserForRole.role.toUpperCase()}</strong> to <strong>{newRoleSelection.toUpperCase()}</strong>?
                </p>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRoleModalConfirming(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRoleChange}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                  >
                    Yes, Confirm Change
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {selectedUserForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Account Status Toggle
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to {selectedUserForStatus.status === "Suspended" ? "reactivate" : "suspend"} the account for <strong className="text-slate-900 dark:text-slate-100">{selectedUserForStatus.name}</strong>?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedUserForStatus(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatusConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                  selectedUserForStatus.status === "Suspended" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {selectedUserForStatus.status === "Suspended" ? "Reactivate Account" : "Suspend Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New User Modal */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Provision New User Account
              </h3>
              <button onClick={() => setAddUserModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Eleanor Vance"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. eleanor.vance@edusync.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Role *</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="student">Student (Safest Default)</option>
                  <option value="teacher">Teacher / Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Department</label>
                <input
                  type="text"
                  value={newUserDepartment}
                  onChange={e => setNewUserDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {newUserRole === "student" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Enrollment Number</label>
                  <input
                    type="text"
                    value={newUserEnrollment}
                    onChange={e => setNewUserEnrollment(e.target.value)}
                    placeholder="e.g. EN2026-CS-088"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
