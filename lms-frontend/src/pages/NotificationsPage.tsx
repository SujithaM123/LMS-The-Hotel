import { useMemo, useState } from "react";
import { useRealtime } from "../context/RealtimeContext";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { IconBell, IconLayers, IconMail, IconCheck } from "../components/icons";
import type { NotificationResponse } from "../api/types";

function iconFor(type: NotificationResponse["type"]) {
  switch (type) {
    case "ENROLLMENT":
      return <IconLayers size={18} />;
    case "MESSAGE":
      return <IconMail size={18} />;
    default:
      return <IconBell size={18} />;
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsPage() {
  const { notifications, notificationsLoading, unreadCount, markNotificationRead } = useRealtime();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter],
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay on top of enrollments and messages.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter notifications">
        <button
          className={`tab-btn ${filter === "all" ? "active" : ""}`}
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`tab-btn ${filter === "unread" ? "active" : ""}`}
          role="tab"
          aria-selected={filter === "unread"}
          onClick={() => setFilter("unread")}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      <div className="card">
        {notificationsLoading && <SkeletonRows count={5} />}

        {!notificationsLoading && visible.length === 0 && (
          <EmptyState
            icon={filter === "unread" ? <IconCheck size={24} /> : <IconBell size={24} />}
            title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            description={
              filter === "unread"
                ? "New notifications will show up here as they arrive."
                : "You'll see enrollment and message updates here."
            }
          />
        )}

        {!notificationsLoading &&
          visible.map((n) => (
            <div className={`notification-item item-enter ${n.read ? "" : "unread"}`} key={n.id}>
              <span className="notification-icon">{iconFor(n.type)}</span>
              <div className="notification-body">
                <div className="notification-content">{n.content}</div>
                <div className="notification-meta">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read ? (
                <button className="btn btn-secondary btn-sm" onClick={() => markNotificationRead(n.id)}>
                  Mark read
                </button>
              ) : (
                <span className="pill" aria-hidden="true">
                  Read
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
