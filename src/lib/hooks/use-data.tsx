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
} from "@/lib/data-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { getConsecutiveMissedBefore } from "@/lib/calculations";
import { resolveMemberStatus, shouldDeactivateLogin, getPayingMembers } from "@/lib/member-status";
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
  editMember: (id: string, data: Partial<Member>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  restoreFromBin: (archiveId: string) => Promise<void>;
  recordPayment: (data: Omit<Payment, "id">) => Promise<Payment>;
  removePayment: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  postAnnouncement: (message: string, durationHours: number) => Promise<void>;
  sendChat: (memberId: string, message: string, fromAdmin: boolean) => Promise<void>;
  removeChat: (chatId: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const LOAD_TIMEOUT_MS = 5000;

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [bin, setBin] = useState<ArchivedMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);

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

  useEffect(() => {
    if (authLoading) return;

    let unsubMembers: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let unsubAnnouncements: (() => void) | undefined;
    let unsubChats: (() => void) | undefined;
    let unsubBin: (() => void) | undefined;

    const timeout = setTimeout(() => setLoading(false), LOAD_TIMEOUT_MS);

    const loadForLogin = () => {
      unsubMembers = subscribeMembers((data) => {
        setMembers(data);
        setLoading(false);
      });
    };

    const loadFull = () => {
      let membersLoaded = false;
      let paymentsLoaded = false;
      let settingsLoaded = false;
      let announcementsLoaded = false;
      let chatsLoaded = false;
      let binLoaded = false;

      const checkLoaded = () => {
        if (membersLoaded && paymentsLoaded && settingsLoaded && announcementsLoaded && chatsLoaded && binLoaded) {
          setLoading(false);
        }
      };

      unsubMembers = subscribeMembers((data) => {
        setMembers(data);
        membersLoaded = true;
        checkLoaded();
      });
      unsubPayments = subscribePayments((data) => {
        setPayments(data);
        paymentsLoaded = true;
        checkLoaded();
      });
      unsubSettings = subscribeSettings((data) => {
        setSettings(data);
        settingsLoaded = true;
        checkLoaded();
      });
      unsubAnnouncements = subscribeAnnouncements((data) => {
        setAnnouncements(data);
        announcementsLoaded = true;
        checkLoaded();
      });
      unsubChats = subscribeChats((data) => {
        setChats(data);
        chatsLoaded = true;
        checkLoaded();
      });
      unsubBin = subscribeBin((data) => {
        setBin(data);
        binLoaded = true;
        checkLoaded();
      });
    };

    setLoading(true);

    seedDefaultMembers()
      .then(() => {
        if (user) {
          loadFull();
        } else {
          loadForLogin();
        }
      })
      .catch((err) => {
        console.error("seed/load error:", err);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      unsubMembers?.();
      unsubPayments?.();
      unsubSettings?.();
      unsubAnnouncements?.();
      unsubChats?.();
      unsubBin?.();
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!loading && members.length > 0 && user) {
      syncMemberStatuses(members, payments, settings);
    }
  }, [members, payments, settings, loading, user, syncMemberStatuses]);

  const createMember = useCallback(async (data: Omit<Member, "id" | "createdAt">) => addMember(data), []);
  const editMember = useCallback(async (id: string, data: Partial<Member>) => updateMember(id, data), []);
  const removeMember = useCallback(async (id: string) => deleteMember(id), []);
  const restoreFromBin = useCallback(async (archiveId: string) => restoreMemberFromBin(archiveId), []);
  const recordPayment = useCallback(async (data: Omit<Payment, "id">) => addPayment(data), []);
  const removePayment = useCallback(async (id: string) => deletePayment(id), []);
  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, []);
  const postAnnouncement = useCallback(async (message: string, durationHours: number) => {
    await addAnnouncement(message, durationHours);
  }, []);
  const sendChat = useCallback(async (memberId: string, message: string, fromAdmin: boolean) => {
    await addChatMessage(memberId, message, fromAdmin);
  }, []);
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
        editMember,
        removeMember,
        restoreFromBin,
        recordPayment,
        removePayment,
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
