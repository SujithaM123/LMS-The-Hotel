import { Link } from "react-router-dom";
import type { DashboardResponse } from "../../api/types";
import { KpiCard } from "../KpiCard";
import { EmptyState } from "../EmptyState";
import { IconLayers, IconBell, IconMail, IconInbox, IconChevronRight } from "../icons";
import { useRealtime } from "../../context/RealtimeContext";

export function StudentDashboard({ data, messageCount }: { data: DashboardResponse; messageCount: number }) {
  const { unreadCount } = useRealtime();
  const enrollments = data.enrollments ?? [];

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="Enrolled courses" value={enrollments.length} icon={<IconLayers size={18} />} />
        <KpiCard label="Unread notifications" value={unreadCount} icon={<IconBell size={18} />} />
        <KpiCard label="Messages" value={messageCount} icon={<IconMail size={18} />} />
      </div>

      <div className="section-header">
        <h2>My courses</h2>
        {enrollments.length > 0 && (
          <Link to="/my-courses" className="pill">
            View all <IconChevronRight size={14} />
          </Link>
        )}
      </div>

      {enrollments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconInbox size={24} />}
            title="You haven't enrolled in any courses yet"
            description="Browse the catalog and enroll in a course to get started."
            action={
              <Link to="/courses" className="btn btn-sm">
                Browse courses
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Enrolled</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {enrollments.slice(0, 5).map((e) => (
                <tr key={e.id}>
                  <td>{e.courseTitle}</td>
                  <td>{new Date(e.enrolledAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/courses/${e.courseId}`} className="pill">
                      View <IconChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
