import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { api, friendlyMessage } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";
import type { MessageResponse, NotificationResponse } from "../api/types";

interface RealtimeContextValue {
  connected: boolean;
  notifications: NotificationResponse[];
  notificationsLoading: boolean;
  unreadCount: number;
  markNotificationRead: (id: number) => Promise<void>;
  lastMessage: MessageResponse | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  notifications: [],
  notificationsLoading: true,
  unreadCount: 0,
  markNotificationRead: async () => {},
  lastMessage: null,
});

const MAX_TOAST_LEN = 80;

/** Owns the WebSocket connection and the notification list centrally, so the unread badge in
 * the topbar and the Notifications page always agree - one source of truth, per the "numbers
 * that should agree" rule for dashboards. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [lastMessage, setLastMessage] = useState<MessageResponse | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }
    setNotificationsLoading(true);
    api
      .listNotifications()
      .then(setNotifications)
      .catch(() => showToast("Couldn't load notifications.", "error"))
      .finally(() => setNotificationsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    connectSocket(user.token, {
      onNotification: (payload) => {
        setNotifications((prev) => (prev.some((n) => n.id === payload.id) ? prev : [payload, ...prev]));
        const preview =
          payload.content.length > MAX_TOAST_LEN ? payload.content.slice(0, MAX_TOAST_LEN) + "…" : payload.content;
        showToast(preview, "info");
      },
      onMessage: setLastMessage,
      onError: (payload) => showToast(payload.message, "error"),
      onConnectionChange: setConnected,
    });

    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  async function markNotificationRead(id: number) {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      setNotifications(previous);
      showToast(friendlyMessage(err), "error");
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RealtimeContext.Provider
      value={{ connected, notifications, notificationsLoading, unreadCount, markNotificationRead, lastMessage }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
