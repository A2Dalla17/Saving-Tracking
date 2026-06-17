"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { GROUP_CHAT_ID } from "@/lib/constants";
import { t } from "@/lib/somali";

export function GroupAdminChat() {
  const { chats, sendChat, removeChat } = useData();
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const groupChats = chats
    .filter((c) => c.memberId === GROUP_CHAT_ID)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const isAdmin = user?.isAdmin ?? false;

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    await sendChat(
      GROUP_CHAT_ID,
      message.trim(),
      isAdmin,
      isAdmin ? "Maamulaha" : user.name
    );
    setMessage("");
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!isAdmin || !confirm(t.profile.confirmDeleteChat)) return;
    await removeChat(chatId);
  };

  return (
    <Card className="alert-box-chat animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-lg text-white">{t.profile.chat}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-56 overflow-y-auto space-y-2">
          {groupChats.length === 0 ? (
            <p className="text-sm text-white/75">{t.profile.noChat}</p>
          ) : (
            groupChats.map((c) => (
              <div
                key={c.id}
                className={`chat-bubble p-3 rounded-xl text-sm max-w-[90%] ${
                  c.fromAdmin ? "chat-bubble-admin ml-auto text-right" : ""
                }`}
              >
                {!c.fromAdmin && c.senderName && (
                  <p className="text-xs font-semibold text-white/90 mb-1">{c.senderName}</p>
                )}
                {c.fromAdmin && (
                  <p className="text-xs font-semibold text-white/90 mb-1">Maamulaha</p>
                )}
                <p>{c.message}</p>
                <div className={`flex items-center gap-2 mt-1 ${c.fromAdmin ? "justify-end" : ""}`}>
                  <p className="text-xs text-white/70">
                    {new Date(c.sentAt).toLocaleString("so-SO")}
                  </p>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="alert-box-dismiss h-7 w-7"
                      onClick={() => handleDeleteChat(c.id)}
                      title={t.profile.deleteChat}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t.profile.chatPlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button type="button" onClick={handleSend} size="icon" variant="gold" disabled={!user}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
