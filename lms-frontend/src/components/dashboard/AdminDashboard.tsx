import { Link } from "react-router-dom";
import type { DashboardResponse } from "../../api/types";
import { KpiCard } from "../KpiCard";
import { IconUsers, IconBook, IconClipboard, IconBell } from "../icons";
import { useRealtime } from "../../context/RealtimeContext";

export function AdminDashboard({ data }: { data: DashboardResponse }) {
  const { unreadCount } = useRealtime();

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="Total users" value={data.totalUsers ?? 0} icon={<IconUsers size={18} />} />
        <KpiCard label="Total courses" value={data.totalCourses ?? 0} icon={<IconBook size={18} />} />
        <KpiCard label="Total enrollments" value={data.totalEnrollments ?? 0} icon={<IconClipboard size={18} />} />
        <KpiCard label="Unread notifications" value={unreadCount} icon={<IconBell size={18} />} />
      </div>

      <div className="grid">
        <Link to="/admin/users" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2>Users</h2>
          <p className="muted">View every account and their role.</p>
        </Link>
        <Link to="/admin/courses" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2>Courses</h2>
          <p className="muted">View every course and its instructor.</p>
        </Link>
        <Link to="/admin/enrollments" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h2>Enrollments</h2>
          <p className="muted">View every student-course enrollment.</p>
        </Link>
      </div>
    </>
  );
}
