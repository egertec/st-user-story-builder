import { useState, useEffect } from "react";
import { getAllAccessRequests, updateAccessStatus, toggleAdminRole, getUsageStats } from "@/utils/supabase";
import type { UserAccess, UsageStats } from "@/utils/supabase";
import { ArrowLeft, CheckCircle, XCircle, Shield, ShieldOff, RefreshCw, LogOut, Zap, Users, FileText, BarChart3 } from "lucide-react";

interface AdminPanelProps {
  onBack: () => void;
  onSignOut: () => void;
  currentUserEmail: string;
}

export function AdminPanel({ onBack, onSignOut, currentUserEmail }: AdminPanelProps) {
  const [requests, setRequests] = useState<UserAccess[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [tab, setTab] = useState<"access" | "usage">("access");

  const loadData = async () => {
    setLoading(true);
    try {
      const [accessData, statsData] = await Promise.all([
        getAllAccessRequests(),
        getUsageStats(),
      ]);
      setRequests(accessData);
      setUsageStats(statsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      await updateAccessStatus(id, status);
      await loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleToggle = async (id: string, currentRole: "admin" | "user") => {
    setActionLoading(id);
    try {
      await toggleAdminRole(id, currentRole === "admin" ? "user" : "admin");
      await loadData();
    } catch (err) {
      console.error("Failed to toggle role:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalFlows = usageStats.reduce((sum, s) => sum + s.flows_uploaded, 0);
  const totalStories = usageStats.reduce((sum, s) => sum + s.stories_generated, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to App
        </button>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-900">Admin Console</span>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Users size={12} />
              Total Users
            </div>
            <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
              <Shield size={12} />
              Pending
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
              <CheckCircle size={12} />
              Approved
            </div>
            <p className="text-2xl font-bold text-green-600">{requests.filter((r) => r.status === "approved").length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
              <FileText size={12} />
              Flows Uploaded
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalFlows}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-indigo-600 mb-1">
              <BarChart3 size={12} />
              Stories Generated
            </div>
            <p className="text-2xl font-bold text-indigo-600">{totalStories}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setTab("access")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === "access" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              Access Management
              {pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
              )}
            </button>
            <button
              onClick={() => setTab("usage")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === "usage" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              Usage Analytics
            </button>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Access Management Tab ── */}
        {tab === "access" && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-1 mb-4">
              {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                    filter === f
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:text-slate-700 bg-white border border-slate-200"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Request List */}
            <div className="space-y-2">
              {loading && filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                  Loading access requests...
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                  No {filter === "all" ? "" : filter} access requests found.
                </div>
              ) : (
                filtered.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      req.status === "approved" ? "bg-green-500" :
                      req.status === "pending" ? "bg-amber-400" :
                      "bg-red-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {req.display_name || req.email}
                        </p>
                        {req.role === "admin" && (
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0">Admin</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{req.email}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        Requested {new Date(req.requested_at).toLocaleDateString()}
                        {req.reviewed_at && ` · Reviewed ${new Date(req.reviewed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(req.id, "approved")}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={12} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(req.id, "rejected")}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === "approved" && req.email !== currentUserEmail && (
                        <button
                          onClick={() => handleRoleToggle(req.id, req.role)}
                          disabled={actionLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                          title={req.role === "admin" ? "Remove admin" : "Make admin"}
                        >
                          {req.role === "admin" ? <ShieldOff size={12} /> : <Shield size={12} />}
                          {req.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </button>
                      )}
                      {req.status === "rejected" && (
                        <button
                          onClick={() => handleStatusChange(req.id, "approved")}
                          disabled={actionLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={12} />
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Usage Analytics Tab ── */}
        {tab === "usage" && (
          <div>
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                Loading usage data...
              </div>
            ) : usageStats.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                No usage data yet. Stats will appear here as users upload flows and generate stories.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Email</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Flows Uploaded</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Stories Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageStats.map((stat) => (
                      <tr key={stat.user_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{stat.display_name || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-500">{stat.email}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                            <FileText size={12} />
                            {stat.flows_uploaded}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            <BarChart3 size={12} />
                            {stat.stories_generated}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={2} className="px-4 py-3 text-right">
                        <p className="text-xs font-bold text-slate-600 uppercase">Totals</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-blue-800">{totalFlows}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-indigo-800">{totalStories}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
