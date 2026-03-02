import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, checkUserAccess, requestAccess } from "@/utils/supabase";
import type { UserAccess } from "@/utils/supabase";
import { AdminPanel } from "@/components/AdminPanel";
import { Zap, LogOut, Shield, Clock, XCircle, Mail, Lock, User as UserIcon } from "lucide-react";

type AuthView = "login" | "signup" | "pending" | "rejected" | "approved" | "admin";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [accessRecord, setAccessRecord] = useState<UserAccess | null>(null);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) checkAccess(s.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) checkAccess(s.user);
      else {
        setAccessRecord(null);
        setAuthView("login");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAccess = async (_user: User) => {
    try {
      const access = await checkUserAccess();
      setAccessRecord(access);

      if (!access) {
        setAuthView("pending");
      } else if (access.status === "approved") {
        setAuthView("approved");
      } else if (access.status === "rejected") {
        setAuthView("rejected");
      } else {
        setAuthView("pending");
      }
    } catch {
      setAuthView("pending");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAccessRecord(null);
    setAuthView("login");
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading ST User Story Builder...</span>
        </div>
      </div>
    );
  }

  // Not logged in — show login/signup
  if (!session) {
    return authView === "signup"
      ? <SignupForm onSwitch={() => setAuthView("login")} onSuccess={() => {}} />
      : <LoginForm onSwitch={() => setAuthView("signup")} />;
  }

  // Logged in but pending approval
  if (authView === "pending" || (accessRecord && accessRecord.status === "pending")) {
    return <PendingScreen email={session.user.email ?? ""} onSignOut={handleSignOut} accessRecord={accessRecord} onRequestSent={(access) => setAccessRecord(access)} />;
  }

  // Rejected
  if (authView === "rejected" || (accessRecord && accessRecord.status === "rejected")) {
    return <RejectedScreen email={session.user.email ?? ""} onSignOut={handleSignOut} />;
  }

  // Approved — render admin panel or the app
  if (accessRecord?.role === "admin" && authView === "admin") {
    return (
      <AdminPanel
        onBack={() => setAuthView("approved")}
        onSignOut={handleSignOut}
        currentUserEmail={session.user.email ?? ""}
      />
    );
  }

  // Approved — render app with nav bar that includes admin link + sign out
  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader
        email={session.user.email ?? ""}
        displayName={accessRecord?.display_name ?? ""}
        isAdmin={accessRecord?.role === "admin"}
        onAdminClick={() => setAuthView("admin")}
        onSignOut={handleSignOut}
      />
      {children}
    </div>
  );
}

// ─── Auth Header Bar ─────────────────────────────────────────────────────────

function AuthHeader({ email, displayName, isAdmin, onAdminClick, onSignOut }: {
  email: string;
  displayName: string;
  isAdmin: boolean;
  onAdminClick: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-slate-500">
        <UserIcon size={12} />
        <span>{displayName || email}</span>
        {isAdmin && (
          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">Admin</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <button
            onClick={onAdminClick}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Shield size={12} />
            Manage Access
          </button>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith("@ey.com")) {
      setError("Only EY email addresses (@ey.com) are permitted.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Invalid email or password. If you're new, click 'Request Access' below.");
        } else {
          setError(authError.message);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={20} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900">ST User Story Builder</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in with your EY email</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ey.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Don't have an account?{" "}
          <button onClick={onSwitch} className="text-blue-600 hover:text-blue-800 font-medium">
            Request Access
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Signup / Request Access Form ────────────────────────────────────────────

function SignupForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith("@ey.com")) {
      setError("Only EY email addresses (@ey.com) are permitted.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Create access request
        await requestAccess(displayName || email.split("@")[0]);
        onSuccess();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={20} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900">ST User Story Builder</h1>
          <p className="text-xs text-slate-400 mt-1">Request access with your EY email</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">EY Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ey.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password (min 6 chars)"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? "Requesting access..." : "Request Access"}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            Your request will be sent to the ST User Story Builder admin for approval.
          </p>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already have an account?{" "}
          <button onClick={onSwitch} className="text-blue-600 hover:text-blue-800 font-medium">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Pending Approval Screen ────────────────────────────────────────────────

function PendingScreen({ email, onSignOut, accessRecord, onRequestSent }: {
  email: string;
  onSignOut: () => void;
  accessRecord: UserAccess | null;
  onRequestSent: (access: UserAccess) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  // If no access record exists yet, auto-submit the request
  useEffect(() => {
    if (!accessRecord) {
      setSubmitting(true);
      requestAccess(email.split("@")[0])
        .then(() => checkUserAccess())
        .then((access) => {
          if (access) onRequestSent(access);
        })
        .catch(() => {})
        .finally(() => setSubmitting(false));
    }
  }, [accessRecord]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Access Pending</h2>
          <p className="text-sm text-slate-500 mb-1">
            {submitting ? "Submitting your request..." : "Your access request has been submitted."}
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Signed in as <span className="font-medium text-slate-600">{email}</span>
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs text-blue-700">
              An admin will review your request. You'll be able to access ST User Story Builder once approved.
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 mx-auto transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rejected Screen ─────────────────────────────────────────────────────────

function RejectedScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={24} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-1">
            Your request for access was not approved.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Signed in as <span className="font-medium text-slate-600">{email}</span>
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs text-slate-500">
              Contact the ST User Story Builder admin if you believe this is an error.
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 mx-auto transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

