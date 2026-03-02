import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pottzddujyxakqllcowl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdHR6ZGR1anl4YWtxbGxjb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTUxOTYsImV4cCI6MjA4Nzk3MTE5Nn0.domSZvHSY8NxWmHiqkq1VzdIYd2XqJk5FdEiI64TK7Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface UserAccess {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: "admin" | "user";
  status: "approved" | "pending" | "rejected";
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

// Check if current user has approved access
export async function checkUserAccess(): Promise<UserAccess | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_access")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data as UserAccess | null;
}

// Request access (called after signup)
export async function requestAccess(displayName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  // Check if there's already a pre-seeded record for this email (e.g., admin)
  const { data: existing } = await supabase
    .from("user_access")
    .select("id, user_id")
    .eq("email", user.email)
    .single();

  if (existing && !existing.user_id) {
    // Link the pre-seeded record to this user
    await supabase
      .from("user_access")
      .update({ user_id: user.id, display_name: displayName })
      .eq("id", existing.id);
  } else if (!existing) {
    // Create new access request
    await supabase.from("user_access").insert({
      user_id: user.id,
      email: user.email,
      display_name: displayName,
      role: "user",
      status: "pending",
    });
  }
}

// Admin: Get all access requests
export async function getAllAccessRequests(): Promise<UserAccess[]> {
  const { data, error } = await supabase
    .from("user_access")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserAccess[];
}

// Admin: Approve or reject a request
export async function updateAccessStatus(
  requestId: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_access")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw error;
}

// ─── Usage Tracking ─────────────────────────────────────────────────────────

export interface UsageStats {
  user_id: string;
  email: string;
  display_name: string | null;
  flows_uploaded: number;
  stories_generated: number;
}

// Log a usage event (called from the app when flows are uploaded or stories generated)
export async function logUsageEvent(
  eventType: "flow_uploaded" | "stories_generated",
  count: number = 1,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("usage_events").insert({
    user_id: user.id,
    event_type: eventType,
    count,
    metadata,
  });
}

// Admin: Get aggregated usage stats per user
export async function getUsageStats(): Promise<UsageStats[]> {
  const { data, error } = await supabase
    .from("usage_events")
    .select("user_id, event_type, count");

  if (error) throw error;

  // Aggregate by user
  const byUser = new Map<string, { flows: number; stories: number }>();
  for (const row of data ?? []) {
    const existing = byUser.get(row.user_id) ?? { flows: 0, stories: 0 };
    if (row.event_type === "flow_uploaded") existing.flows += row.count;
    if (row.event_type === "stories_generated") existing.stories += row.count;
    byUser.set(row.user_id, existing);
  }

  // Merge with user_access to get emails/names
  const { data: users } = await supabase
    .from("user_access")
    .select("user_id, email, display_name");

  const userMap = new Map<string, { email: string; display_name: string | null }>();
  for (const u of users ?? []) {
    if (u.user_id) userMap.set(u.user_id, { email: u.email, display_name: u.display_name });
  }

  const stats: UsageStats[] = [];
  for (const [userId, counts] of byUser) {
    const info = userMap.get(userId);
    stats.push({
      user_id: userId,
      email: info?.email ?? "Unknown",
      display_name: info?.display_name ?? null,
      flows_uploaded: counts.flows,
      stories_generated: counts.stories,
    });
  }

  return stats.sort((a, b) => (b.flows_uploaded + b.stories_generated) - (a.flows_uploaded + a.stories_generated));
}

// Admin: Toggle admin role
export async function toggleAdminRole(
  requestId: string,
  newRole: "admin" | "user"
): Promise<void> {
  const { error } = await supabase
    .from("user_access")
    .update({ role: newRole })
    .eq("id", requestId);

  if (error) throw error;
}
