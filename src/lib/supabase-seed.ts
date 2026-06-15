import { hashPassword } from "@/lib/auth";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DEFAULT_MEMBER_PASSWORD,
  DEFAULT_MEMBER_PROFILES,
  DEFAULT_SETTINGS,
} from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  memberToRow,
  paymentToRow,
  announcementToRow,
  chatToRow,
  settingsToRow,
} from "@/lib/supabase-mappers";
import type { Announcement, AppSettings, ChatMessage, Member, Payment } from "@/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function isSupabaseEmpty(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

export async function seedSupabaseIfEmpty(): Promise<{ seeded: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { seeded: false, reason: "admin-missing" };

  const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { seeded: false };

  const now = new Date().toISOString();
  const members: ReturnType<typeof memberToRow>[] = [];

  for (const profile of DEFAULT_MEMBER_PROFILES) {
    const id = generateId();
    members.push(
      memberToRow({
        id,
        name: profile.name,
        email: profile.email,
        phone: "",
        password: hashPassword(DEFAULT_MEMBER_PASSWORD),
        joinDate: DEFAULT_SETTINGS.groupStartDate,
        monthlyFee: profile.monthlyFee,
        annualTarget: profile.annualTarget,
        loginActive: false,
        status: "active",
        createdAt: now,
      })
    );
  }

  members.push(
    memberToRow({
      id: generateId(),
      name: "Maamulaha",
      email: ADMIN_EMAIL,
      phone: "",
      password: hashPassword(ADMIN_PASSWORD),
      joinDate: DEFAULT_SETTINGS.groupStartDate,
      monthlyFee: 0,
      annualTarget: 0,
      loginActive: true,
      status: "active",
      createdAt: now,
    })
  );

  const { error: membersError } = await supabase.from("members").insert(members);
  if (membersError) throw membersError;

  const { error: settingsError } = await supabase
    .from("app_settings")
    .upsert(settingsToRow(DEFAULT_SETTINGS));
  if (settingsError) throw settingsError;

  return { seeded: true };
}

export interface LocalCloudPayload {
  members?: Member[];
  payments?: Payment[];
  settings?: AppSettings;
  announcements?: Announcement[];
  chats?: ChatMessage[];
}

export async function importLocalDataToSupabase(
  payload: LocalCloudPayload
): Promise<{ imported: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { imported: false, reason: "admin-missing" };

  const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { imported: false, reason: "already-has-data" };

  const members = payload.members ?? [];
  if (members.length === 0) return { imported: false, reason: "no-local-data" };

  const { error: mErr } = await supabase
    .from("members")
    .insert(members.map((m) => memberToRow({ ...m, id: m.id || generateId(), name: m.name })));
  if (mErr) throw mErr;

  if (payload.payments?.length) {
    const { error } = await supabase
      .from("payments")
      .insert(payload.payments.map((p) => paymentToRow({ ...p, id: p.id || generateId() })));
    if (error) throw error;
  }

  if (payload.settings) {
    const { error } = await supabase.from("app_settings").upsert(settingsToRow(payload.settings));
    if (error) throw error;
  }

  if (payload.announcements?.length) {
    const { error } = await supabase
      .from("announcements")
      .insert(payload.announcements.map((a) => announcementToRow({ ...a, id: a.id || generateId() })));
    if (error) throw error;
  }

  if (payload.chats?.length) {
    const { error } = await supabase
      .from("chats")
      .insert(payload.chats.map((c) => chatToRow({ ...c, id: c.id || generateId() })));
    if (error) throw error;
  }

  return { imported: true };
}
