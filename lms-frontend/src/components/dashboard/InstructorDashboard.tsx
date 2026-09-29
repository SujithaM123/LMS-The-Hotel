import { Link } from "react-router-dom";
import type { DashboardResponse } from "../../api/types";
import { KpiCard } from "../KpiCard";
import { CourseCard } from "../CourseCard";
import { EmptyState } from "../EmptyState";
import { IconLayers, IconUsers, IconBell, IconMail, IconBook, IconChevronRight } from "../icons";
import { useRealtime } from "../../context/RealtimeContext";

export function InstructorDashboard({ data, messageCount }: { data: DashboardResponse; messageCount: number }) {
  const { unreadCount } = useRealtime();
  const courses = data.createdCourses ?? [];

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="My courses" value={courses.length} icon={<IconLayers size={18} />} />
        <KpiCard label="Total students" value={data.totalEnrolledStudents ?? 0} icon={<IconUsers size={18} />} />
        <KpiCard label="Unread notifications" value={unreadCount} icon={<IconBell size={18} />} />
        <KpiCard label="Messages" value={messageCount} icon={<IconMail size={18} />} />
      </div>

      <div className="section-header">
        <h2>My courses</h2>
        <Link to="/courses/new" className="btn btn-sm">
          + Create course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconBook size={24} />}
            title="You haven't created any courses yet"
            description="Create your first course so students can find and enroll in it."
            action={
              <Link to="/courses/new" className="btn btn-sm">
                Create a course
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid">
          {courses.slice(0, 6).map((c) => (
            <CourseCard
              key={c.id}
              title={c.title}
              instructorName={c.instructorName}
              description={c.description}
              to={`/courses/${c.id}`}
            />
          ))}
        </div>
      )}
      {courses.length > 6 && (
        <p style={{ marginTop: "1rem" }}>
          <Link to="/my-courses" className="pill">
            View all {courses.length} courses <IconChevronRight size={14} />
          </Link>
        </p>
      )}
    </>
  );
}
