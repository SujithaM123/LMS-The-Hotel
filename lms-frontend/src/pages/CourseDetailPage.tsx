import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, friendlyMessage } from "../api/client";
import type { CourseResponse, EnrollmentResponse } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ComposeMessageModal } from "../components/ComposeMessageModal";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonText } from "../components/Skeleton";
import { IconArrowLeft, IconUsers, IconMail, IconBook } from "../components/icons";

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [students, setStudents] = useState<EnrollmentResponse[] | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ id: number; name: string } | null>(null);

  const canSeeStudents =
    role === "ADMIN" || (role === "INSTRUCTOR" && course?.instructorId === user?.userId);

  function loadCourse() {
    setError(null);
    setCourse(null);
    api
      .getCourse(courseId)
      .then(setCourse)
      .catch((err) => setError(friendlyMessage(err)));
  }

  useEffect(loadCourse, [courseId]);

  useEffect(() => {
    if (role !== "STUDENT") return;
    api
      .myEnrollments()
      .then((list) => setEnrolled(list.some((e) => e.courseId === courseId)))
      .catch(() => {});
  }, [role, courseId]);

  useEffect(() => {
    if (!canSeeStudents) return;
    api
      .listCourseStudents(courseId)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [canSeeStudents, courseId]);

  async function onEnroll() {
    setEnrolling(true);
    try {
      await api.enroll(courseId);
      setEnrolled(true);
      showToast("You're enrolled!", "success");
    } catch (err) {
      showToast(friendlyMessage(err), "error");
    } finally {
      setEnrolling(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadCourse} />;

  if (!course) {
    return (
      <div className="stack">
        <SkeletonText width="40%" />
        <SkeletonText width="20%" />
        <SkeletonText width="90%" />
        <SkeletonText width="70%" />
      </div>
    );
  }

  return (
    <div>
      <Link to={role === "STUDENT" ? "/courses" : "/my-courses"} className="pill" style={{ marginBottom: "1rem", display: "inline-flex" }}>
        <IconArrowLeft size={14} /> Back
      </Link>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="course-card-eyebrow">
          <IconBook size={16} />
          Course
        </div>
        <h1 style={{ marginBottom: "0.35rem" }}>{course.title}</h1>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Taught by {course.instructorName} · Created {new Date(course.createdAt).toLocaleDateString()}
        </p>
        {course.description && <p>{course.description}</p>}

        {role === "STUDENT" && (
          <div style={{ marginTop: "1.25rem" }}>
            {enrolled ? (
              <span className="pill pill-success">You're enrolled in this course</span>
            ) : (
              <button className="btn" onClick={onEnroll} disabled={enrolling}>
                {enrolling ? "Enrolling…" : "Enroll in this course"}
              </button>
            )}
          </div>
        )}
      </div>

      {canSeeStudents && (
        <div className="card">
          <div className="section-header">
            <h2>
              <span className="row" style={{ gap: "0.5rem", justifyContent: "flex-start" }}>
                <IconUsers size={18} /> Enrolled students
              </span>
            </h2>
          </div>

          {students === null ? (
            <SkeletonText width="60%" />
          ) : students.length === 0 ? (
            <EmptyState icon={<IconUsers size={22} />} title="No students enrolled yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Enrolled</th>
                    {role === "INSTRUCTOR" && <th />}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.studentName}</td>
                      <td>{new Date(s.enrolledAt).toLocaleDateString()}</td>
                      {role === "INSTRUCTOR" && (
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setMessageTarget({ id: s.studentId, name: s.studentName })}
                          >
                            <IconMail size={14} /> Message
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {messageTarget && (
        <ComposeMessageModal
          courseId={courseId}
          studentId={messageTarget.id}
          studentName={messageTarget.name}
          onClose={() => setMessageTarget(null)}
          onSent={() => showToast(`Message sent to ${messageTarget.name}.`, "success")}
        />
      )}
    </div>
  );
}
