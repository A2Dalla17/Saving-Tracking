"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  subscribeMembers,
  subscribePayments,
  subscribeSettings,
  subscribeAnnouncements,
  subscribeChats,
  subscribeBin,
  addMember,
  addMemberWithAuth,
  updateMember,
  deleteMember,
  archiveMemberToBin,
  restoreMemberFromBin,
  addPayment,
  deletePayment,
  saveSettings,
  addAnnouncement,
  addChatMessage,
  deleteChatMessage,
  seedDefaultMembers,
  setMemberPaid,
  fetchMembersFromServerApi,
  syncMembersFromServerApi,
} from "@/lib/data-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { getConsecutiveMissedBefore } from "@/lib/calculations";
import { resolveMemberStatus, shouldDeactivateLogin, getPayingMembers } from "@/lib/member-status";
import { ensureAdminFirebaseSession } from "@/lib/admin-firebase-auth";
import { ensureFirestoreOnline } from "@/lib/firebase";
import type { Member, Payment, AppSettings, Announcement, ChatMessage, ArchivedMemberRecord } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";

interface DataContextValue {
  members: Member[];
  payments: Payment[];
  settings: AppSettings;
  announcements: Announcement[];
  chats: ChatMessage[];
  bin: ArchivedMemberRecord[];
  loading: boolean;
  createMember: (data: Omit<Member, "id" | "createdAt">) => Promise<Member>;
  createMemberWithAuth: (data: {
    name: string;
    loginId: string;
    password: string;
    contribution: number;
  }) => Promise<Member>;
  editMember: (id: string, data: Partial<Member>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  restoreFromBin: (archiveId: string) => Promise<void>;
  recordPayment: (data: Omit<Payment, "id">) => Promise<Payment>;
  removePayment: (id: string, member?: Member) => Promise<void>;
  markMemberPaid: (memberId: string, paid: boolean) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  postAnnouncement: (message: string, durationHours: number) => Promise<void>;
  sendChat: (memberId: string, message: string, fromAdmin: boolean, senderName?: string) => Promise<void>;
  removeChat: (chatId: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function mergeMemberLists(client: Member[], server: Member[]): Member[] {
  const byId = new Map<string, Member>();
  for (const m of server) byId.set(m.id, m);
  for (const m of client) {
    const prev = byId.get(m.id);
    byId.set(m.id, prev ? { ...prev, ...m } : m);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { user, loading: authLoading, reconcileWithMembers, logout } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [bin, setBin] = useState<ArchivedMemberRecord[]>([]);
  const [membersReady, setMembersReady] = useState(false);
  const syncingRef = useRef(false);
  const clientMembersRef = useRef<Member[]>([]);
  const serverMembersRef = useRef<Member[]>([]);

  const publishMembers = useCallback(() => {
    setMembers(mergeMemberLists(clientMembersRef.current, serverMembersRef.current));
    setMembersReady(true);
  }, []);

  const refreshMembersFromServer = useCallback(async () => {
    try {
      const server = await syncMembersFromServerApi().catch(() => fetchMembersFromServerApi());
      serverMembersRef.current = server;
      publishMembers();
      console.log("Admin members loaded (Auth + Firestore):", server.length);
    } catch (err) {
      console.error("Server members fetch failed:", err);
    }
  }, [publishMembers]);

  const loading = !hydrated || authLoading;

  const syncMemberStatuses = useCallback(
    async (memberList: Member[], paymentList: Payment[], appSettings: AppSettings) => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        for (const member of getPayingMembers(memberList)) {
          const missed = getConsecutiveMissedBefore(member, paymentList, appSettings);
          const newStatus = resolveMemberStatus(missed);
          const updates: Partial<Member> = {};

          if (member.status !== newStatus) updates.status = newStatus;
          if (shouldDeactivateLogin(newStatus) && member.loginActive) updates.loginActive = false;

          if (newStatus === "removed" && member.status !== "removed") {
            await archiveMemberToBin(member.id, "auto_removed");
          } else if (Object.keys(updates).length > 0) {
            await updateMember(member.id, updates);
          }
        }
      } finally {
        syncingRef.current = false;
      }
    },
    []
  );

  // Firestore onSnapshot — requires Firebase Auth (rules: request.auth != null).
  useEffect(() => {
    if (!hydrated || !user) {
      setMembersReady(false);
      return;
    }
    setMembersReady(true);

    let cancelled = false;

    async function startSubscriptions() {
      // Firestore auth/network — background; do not block UI.
      void ensureFirestoreOnline().catch((err) => {
        console.error("Firestore network setup failed:", err);
      });
      if (user?.isAdmin) {
        void ensureAdminFirebaseSession().then((adminSession) => {
          if (!adminSession.success) {
            console.error("Admin Firestore session failed:", adminSession.error);
          }
        });
      }

      if (cancelled) return;

      const unsubMembers = subscribeMembers((data) => {
        clientMembersRef.current = data;
        publishMembers();
      });
      const unsubPayments = subscribePayments(setPayments);
      const unsubSettings = subscribeSettings(setSettings);
      const unsubAnnouncements = subscribeAnnouncements(setAnnouncements);
      const unsubChats = subscribeChats(setChats);
      const unsubBin = subscribeBin(setBin);

      return () => {
        unsubMembers();
        unsubPayments();
        unsubSettings();
        unsubAnnouncements();
        unsubChats();
        unsubBin();
      };
    }

    let cleanup: (() => void) | undefined;
    void startSubscriptions().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [hydrated, user, publishMembers]);

  // Admin: always load full member list from server (Admin SDK) so added users always appear.
  useEffect(() => {
    if (!hydrated || !user?.isAdmin) return;
    void refreshMembersFromServer();
  }, [hydrated, user, refreshMembersFromServer]);

  // Seed empty Firestore in background — only when admin is logged in.
  useEffect(() => {
    if (!hydrated || !user?.isAdmin) return;
    seedDefaultMembers().catch((err) => {
      console.error("seed error:", err);
    });
  }, [hydrated, user]);

  useEffect(() => {
    if (!membersReady || members.length === 0 || !user?.isAdmin) return;
    const timer = window.setTimeout(() => {
      void syncMemberStatuses(members, payments, settings);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [members, payments, settings, membersReady, user, syncMemberStatuses]);

  useEffect(() => {
    if (!user || user.isAdmin || bin.length === 0) return;
    const archived = bin.some(
      (record) =>
        record.member.id === user.memberId ||
        record.member.uid === user.memberId ||
        (user.email &&
          record.member.email?.toLowerCase() === user.email.toLowerCase())
    );
    if (archived) {
      void logout();
    }
  }, [bin, user, logout]);

  useEffect(() => {
    if (members.length === 0 || !user) return;
    reconcileWithMembers(members);
  }, [members, user, reconcileWithMembers]);

  const createMember = useCallback(async (data: Omit<Member, "id" | "createdAt">) => addMember(data), []);
  const createMemberWithAuth = useCallback(
    async (data: { name: string; loginId: string; password: string; contribution: number }) => {
      const member = await addMemberWithAuth(data);
      serverMembersRef.current = mergeMemberLists(serverMembersRef.current, [member]);
      publishMembers();
      void refreshMembersFromServer();
      return member;
    },
    [publishMembers, refreshMembersFromServer]
  );
  const editMember = useCallback(async (id: string, data: Partial<Member>) => updateMember(id, data), []);
  const removeMember = useCallback(async (id: string) => deleteMember(id), []);
  const restoreFromBin = useCallback(async (archiveId: string) => restoreMemberFromBin(archiveId), []);
  const recordPayment = useCallback(async (data: Omit<Payment, "id">) => addPayment(data), []);
  const removePayment = useCallback(
    async (id: string, member?: Member) => deletePayment(id, member),
    []
  );
  const markMemberPaid = useCallback(
    async (memberId: string, paid: boolean) => setMemberPaid(memberId, paid),
    []
  );
  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
  }, []);
  const postAnnouncement = useCallback(async (message: string, durationHours: number) => {
    await addAnnouncement(message, durationHours);
  }, []);
  const sendChat = useCallback(
    async (memberId: string, message: string, fromAdmin: boolean, senderName?: string) => {
      await addChatMessage(memberId, message, fromAdmin, senderName);
    },
    []
  );
  const removeChat = useCallback(async (chatId: string) => deleteChatMessage(chatId), []);

  return (
    <DataContext.Provider
      value={{
        members,
        payments,
        settings,
        announcements,
        chats,
        bin,
        loading,
        createMember,
        createMemberWithAuth,
        editMember,
        removeMember,
        restoreFromBin,
        recordPayment,
        removePayment,
        markMemberPaid,
        updateSettings,
        postAnnouncement,
        sendChat,
        removeChat,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
}
