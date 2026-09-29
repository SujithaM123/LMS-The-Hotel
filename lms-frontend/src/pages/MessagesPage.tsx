import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, friendlyMessage } from "../api/client";
import type { MessageResponse } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { SkeletonRows } from "../components/Skeleton";
import { IconInbox, IconSend } from "../components/icons";

interface Conversation {
  counterpartId: number;
  counterpartName: string;
  courseTitle: string;
  courseId: number;
  lastMessage: MessageResponse;
  messages: MessageResponse[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MessagesPage() {
  const { user, role } = useAuth();
  const { lastMessage } = useRealtime();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<MessageResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .listMessages()
      .then(setMessages)
      .catch((err) => setError(friendlyMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!lastMessage) return;
    setMessages((prev) => {
      if (!prev) return prev;
      if (prev.some((m) => m.id === lastMessage.id)) return prev;
      return [lastMessage, ...prev];
    });
  }, [lastMessage]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!messages || !user) return [];
    const byCounterpart = new Map<number, MessageResponse[]>();
    for (const m of messages) {
      const counterpartId = m.senderId === user.userId ? m.recipientId : m.senderId;
      const list = byCounterpart.get(counterpartId) ?? [];
      list.push(m);
      byCounterpart.set(counterpartId, list);
    }
    const result: Conversation[] = [];
    for (const [counterpartId, list] of byCounterpart) {
      const sorted = [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      const last = sorted[sorted.length - 1];
      const counterpartName = last.senderId === counterpartId ? last.senderName : last.recipientName;
      result.push({
        counterpartId,
        counterpartName,
        courseTitle: last.courseTitle,
        courseId: last.courseId,
        lastMessage: last,
        messages: sorted,
      });
    }
    return result.sort(
      (a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime(),
    );
  }, [messages, user]);

  const selected = conversations.find((c) => c.counterpartId === selectedId) ?? conversations[0] ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    // Re-scroll on every conversation switch AND on new messages within the open one -
    // message count alone misses switching to a different thread of the same length.
  }, [selected?.counterpartId, selected?.messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await api.sendMessage({ studentId: selected.counterpartId, courseId: selected.courseId, content: draft.trim() });
      setDraft("");
    } catch (err) {
      showToast(friendlyMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Messages</h1>
          <p>
            {role === "INSTRUCTOR"
              ? "Conversations with students enrolled in your courses."
              : "Conversations with your instructors."}
          </p>
        </div>
      </div>

      {loading && <SkeletonRows count={6} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && conversations.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<IconInbox size={24} />}
            title="No conversations yet"
            description={
              role === "INSTRUCTOR"
                ? "Message a student from one of your course rosters to start a conversation."
                : "Your instructors will appear here once they message you."
            }
          />
        </div>
      )}

      {!loading && !error && conversations.length > 0 && (
        <div className="messages-layout">
          <div className="conversation-list" role="listbox" aria-label="Conversations">
            <div className="conversation-list-header">
              <strong>Conversations</strong>
            </div>
            {conversations.map((c) => (
              <button
                key={c.counterpartId}
                className={`conversation-row ${selected?.counterpartId === c.counterpartId ? "active" : ""}`}
                role="option"
                aria-selected={selected?.counterpartId === c.counterpartId}
                onClick={() => setSelectedId(c.counterpartId)}
              >
                <span className="conversation-avatar" aria-hidden="true">
                  {initials(c.counterpartName)}
                </span>
                <span className="conversation-row-text">
                  <span className="conversation-row-name">{c.counterpartName}</span>
                  <span className="conversation-row-preview">{c.lastMessage.content}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="thread-panel">
            {selected && (
              <>
                <div className="thread-header">
                  <div>
                    <strong>{selected.counterpartName}</strong>
                    <div className="muted">{selected.courseTitle}</div>
                  </div>
                </div>
                <div className="thread-scroll" ref={scrollRef}>
                  {selected.messages.map((m) => {
                    const mine = m.senderId === user?.userId;
                    return (
                      <div className={`bubble-row ${mine ? "mine" : ""}`} key={m.id}>
                        <div>
                          <div className="bubble">{m.content}</div>
                          <div className="bubble-time">{new Date(m.sentAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {role === "INSTRUCTOR" && (
                  <form className="composer" onSubmit={onSend}>
                    <textarea
                      rows={1}
                      placeholder="Write a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      aria-label={`Message ${selected.counterpartName}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          onSend(e);
                        }
                      }}
                    />
                    <button type="submit" className="btn btn-icon" disabled={sending || !draft.trim()} aria-label="Send message">
                      <IconSend size={18} />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
