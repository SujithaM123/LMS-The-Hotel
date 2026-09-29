import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../api/useAsync";
import { SkeletonCardGrid } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { CourseCard } from "../components/CourseCard";
import { IconLayers, IconBook } from "../components/icons";

export function MyCoursesPage() {
  const { user, role } = useAuth();

  const enrollments = useAsync(() => api.myEnrollments(), []);
  const courses = useAsync(() => api.listCourses(), []);

  const loading = enrollments.loading || courses.loading;
  const error = enrollments.error ?? courses.error;

  function reload() {
    enrollments.reload();
    courses.reload();
  }

  const courseById = new Map((courses.data ?? []).map((c) => [c.id, c]));
  const myCourses = role === "INSTRUCTOR" ? (courses.data ?? []).filter((c) => c.instructorId === user?.userId) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My courses</h1>
          <p>{role === "STUDENT" ? "Courses you're enrolled in." : "Courses you created."}</p>
        </div>
        {role === "INSTRUCTOR" && (
          <Link to="/courses/new" className="btn btn-sm">
            + Create course
          </Link>
        )}
      </div>

      {loading && <SkeletonCardGrid />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && role === "STUDENT" && (
        (enrollments.data ?? []).length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<IconLayers size={24} />}
              title="You haven't enrolled in any courses yet"
              description="Browse the catalog to find something to learn."
              action={
                <Link to="/courses" className="btn btn-sm">
                  Browse courses
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid">
            {(enrollments.data ?? []).map((e) => (
              <CourseCard
                key={e.id}
                title={e.courseTitle}
                instructorName={courseById.get(e.courseId)?.instructorName ?? "Unknown instructor"}
                description={courseById.get(e.courseId)?.description}
                to={`/courses/${e.courseId}`}
                footer={<span className="pill pill-success">Enrolled</span>}
              />
            ))}
          </div>
        )
      )}

      {!loading && !error && role === "INSTRUCTOR" && (
        myCourses.length === 0 ? (
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
            {myCourses.map((c) => (
              <CourseCard
                key={c.id}
                title={c.title}
                instructorName={c.instructorName}
                description={c.description}
                to={`/courses/${c.id}`}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
