"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  IndianRupee,
  Shield,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joiningDate: string;
  salary?: number | null;
  status: string;
  emergencyContact?: string | null;
  user?: {
    id: string;
    username: string;
    status: string;
    role: { id: string; name: string; description?: string };
  } | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add Employee Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: "Real Estate Agent",
    department: "Sales & Marketing",
    joiningDate: new Date().toISOString().split("T")[0],
    salary: "",
    emergencyContact: "",
    createLoginAccount: true,
    username: "",
    password: "",
    roleName: "AGENT",
  });

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserRole(data.user?.role || "");
      }
    } catch {}
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (deptFilter) params.set("department", deptFilter);

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {
      console.error("Error fetching employees:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, deptFilter]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        designation: formData.designation,
        department: formData.department,
        joiningDate: formData.joiningDate,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
      };

      if (formData.createLoginAccount) {
        payload.createLoginAccount = true;
        payload.username = formData.username.trim() || formData.email.split("@")[0];
        payload.password = formData.password || "ShreeNiwas@2025";
        payload.roleName = formData.roleName;
      }

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Employee successfully added to directory!" });
        setShowAddModal(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          designation: "Real Estate Agent",
          department: "Sales & Marketing",
          joiningDate: new Date().toISOString().split("T")[0],
          salary: "",
          emergencyContact: "",
          createLoginAccount: true,
          username: "",
          password: "",
          roleName: "AGENT",
        });
        fetchEmployees();
      } else {
        setMsg({ type: "error", text: resData.error || "Failed to create employee" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error occurred while saving employee" });
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/employees/${editingEmp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editingEmp.firstName,
          lastName: editingEmp.lastName,
          email: editingEmp.email,
          phone: editingEmp.phone,
          designation: editingEmp.designation,
          department: editingEmp.department,
          status: editingEmp.status,
          emergencyContact: editingEmp.emergencyContact,
          salary: editingEmp.salary !== undefined ? Number(editingEmp.salary) : undefined,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Employee record updated successfully!" });
        setEditingEmp(null);
        fetchEmployees();
      } else {
        setMsg({ type: "error", text: resData.error || "Failed to update employee" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error updating employee" });
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive employee ${name}? This preserves all attendance and audit history but marks them inactive.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg({ type: "success", text: `${name} has been archived successfully.` });
        fetchEmployees();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Failed to archive employee" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error archiving employee" });
    }
  };

  const canManage =
    currentUserRole === "SUPER_ADMIN" || currentUserRole === "OFFICE_MANAGER";
  const canViewSalary =
    currentUserRole === "SUPER_ADMIN" ||
    currentUserRole === "OFFICE_MANAGER" ||
    currentUserRole === "ACCOUNTANT";

  // Summary counts
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeaveCount = employees.filter((e) => e.status === "On_Leave").length;
  const inactiveCount = employees.filter((e) => e.status === "Inactive" || e.status === "Archived").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            Employees & Agent Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage company personnel, property agents, site staff, roles and contact profiles.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Notifications Alert */}
      {msg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalEmployees}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Staff</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">On Leave</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{onLeaveCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived / Inactive</div>
          <div className="text-2xl font-bold text-slate-600 mt-1">{inactiveCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name, code, designation, email, phone..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="">All Departments</option>
            <option value="Sales & Marketing">Sales & Marketing</option>
            <option value="Site Operations">Site Operations</option>
            <option value="Accounts & Finance">Accounts & Finance</option>
            <option value="Management">Management</option>
            <option value="Administration">Administration</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On_Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading staff directory...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800">No employees found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search criteria or add a new team member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">System User</th>
                  {canViewSalary && <th className="py-3.5 px-4">Base Salary</th>}
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const roleName = emp.user?.role?.name || "No User Account";
                  const isAgent = roleName === "AGENT";
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                            {emp.firstName[0]}
                            {emp.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {emp.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{emp.designation}</div>
                        <div className="text-xs text-slate-500">{emp.department}</div>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {emp.user ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Shield className="w-3 h-3" />
                              {roleName}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">@{emp.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Portal Login</span>
                        )}
                      </td>

                      {canViewSalary && (
                        <td className="py-3.5 px-4">
                          {emp.salary !== undefined && emp.salary !== null ? (
                            <span className="font-mono font-medium text-slate-800">
                              ₹{Number(emp.salary).toLocaleString("en-IN")}
                              <span className="text-xs text-slate-400">/mo</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not Specified</span>
                          )}
                        </td>
                      )}

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            emp.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : emp.status === "On_Leave"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {emp.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => setEditingEmp(emp)}
                                title="Edit Details"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {emp.status !== "Archived" && (
                                <button
                                  onClick={() =>
                                    handleArchive(emp.id, `${emp.firstName} ${emp.lastName}`)
                                  }
                                  title="Archive / Soft Delete"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Register New Employee / Real Estate Agent
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="agent@shreeniwas.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Site Operations">Site Operations</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                    <option value="Management">Management</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. Senior Real Estate Agent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Salary (₹ / month)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="e.g. 35000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact (Name & Phone)
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  placeholder="e.g. Brother: 9811223344"
                />
              </div>

              {/* System Account Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.createLoginAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, createLoginAccount: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Create Portal Login Account for Employee
                  </span>
                </label>

                {formData.createLoginAccount && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Leave blank for email prefix"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Default: ShreeNiwas@2025"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        value={formData.roleName}
                        onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="AGENT">Agent (Field / Sales)</option>
                        <option value="OFFICE_MANAGER">Office Manager</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="STAFF">General Staff</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-600/30"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Employee: {editingEmp.firstName} {editingEmp.lastName} ({editingEmp.employeeCode})
              </h2>
              <button
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmp.firstName}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmp.lastName}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editingEmp.email}
                    onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editingEmp.phone}
                    onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editingEmp.department}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Site Operations">Site Operations</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                    <option value="Management">Management</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmp.designation}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, designation: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingEmp.status}
                    onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="On_Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                {canViewSalary && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Base Salary (₹ / month)
                    </label>
                    <input
                      type="number"
                      value={editingEmp.salary || ""}
                      onChange={(e) =>
                        setEditingEmp({
                          ...editingEmp,
                          salary: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
