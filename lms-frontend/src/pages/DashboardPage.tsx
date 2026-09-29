import { useEffect, useState } from "react";
import { api, friendlyMessage } from "../api/client";
import type { DashboardResponse } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { SkeletonKpiRow, SkeletonCardGrid, SkeletonText } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { StudentDashboard } from "../components/dashboard/StudentDashboard";
import { InstructorDashboard } from "../components/dashboard/InstructorDashboard";
import { AdminDashboard } from "../components/dashboard/AdminDashboard";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user, role } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    const needsMessages = role === "STUDENT" || role === "INSTRUCTOR";
    Promise.all([api.getDashboard(), needsMessages ? api.listMessages() : Promise.resolve([])])
      .then(([dashboard, messages]) => {
        setData(dashboard);
        setMessageCount(messages.length);
      })
      .catch((err) => setError(friendlyMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [role]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {greeting()}, {user?.name}
          </h1>
          <p>Here's what's happening with your {role === "STUDENT" ? "learning" : role === "INSTRUCTOR" ? "courses" : "platform"}.</p>
        </div>
      </div>

      {loading && (
        <>
          <SkeletonKpiRow count={role === "ADMIN" ? 4 : role === "INSTRUCTOR" ? 4 : 3} />
          <SkeletonText width="140px" />
          <div style={{ height: "0.75rem" }} />
          <SkeletonCardGrid count={3} />
        </>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && role === "STUDENT" && (
        <StudentDashboard data={data} messageCount={messageCount} />
      )}
      {!loading && !error && data && role === "INSTRUCTOR" && (
        <InstructorDashboard data={data} messageCount={messageCount} />
      )}
      {!loading && !error && data && role === "ADMIN" && <AdminDashboard data={data} />}
    </div>
  );
}
