import { useEffect, useMemo, useState } from "react";
import { api, friendlyMessage } from "../api/client";
import type { CourseResponse } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SkeletonCardGrid } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { CourseCard } from "../components/CourseCard";
import { IconSearch, IconBook } from "../components/icons";

export function CoursesPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<CourseResponse[] | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([api.listCourses(), role === "STUDENT" ? api.myEnrollments() : Promise.resolve([])])
      .then(([courseList, mine]) => {
        setCourses(courseList);
        setEnrolledCourseIds(new Set(mine.map((e) => e.courseId)));
      })
      .catch((err) => setError(friendlyMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [role]);

  async function onEnroll(courseId: number) {
    setEnrollingId(courseId);
    try {
      await api.enroll(courseId);
      setEnrolledCourseIds((prev) => new Set(prev).add(courseId));
      showToast("Enrolled! Find it under My Courses.", "success");
    } catch (err) {
      showToast(friendlyMessage(err), "error");
    } finally {
      setEnrollingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.instructorName.toLowerCase().includes(q),
    );
  }, [courses, query]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Explore courses</h1>
          <p>Browse every course on the platform.</p>
        </div>
      </div>

      <div className="form-field" style={{ maxWidth: 360 }}>
        <div className="input-wrap">
          <input
            type="search"
            placeholder="Search courses…"
            aria-label="Search courses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
          />
          <IconSearch size={16} style={{ position: "absolute", left: "0.75rem", color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {loading && <SkeletonCardGrid />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && courses && (
        <>
          {courses.length === 0 ? (
            <div className="card">
              <EmptyState icon={<IconBook size={24} />} title="No courses yet" description="Check back soon." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<IconSearch size={24} />}
                title="No courses match your search"
                description={`Nothing found for "${query}". Try a different term.`}
              />
            </div>
          ) : (
            <div className="grid">
              {filtered.map((c) => {
                const isEnrolled = enrolledCourseIds.has(c.id);
                return (
                  <CourseCard
                    key={c.id}
                    title={c.title}
                    instructorName={c.instructorName}
                    description={c.description}
                    to={`/courses/${c.id}`}
                    footer={
                      role === "STUDENT" ? (
                        isEnrolled ? (
                          <span className="pill pill-success">Enrolled</span>
                        ) : (
                          <button
                            className="btn btn-sm"
                            disabled={enrollingId === c.id}
                            onClick={() => onEnroll(c.id)}
                          >
                            {enrollingId === c.id ? "Enrolling…" : "Enroll"}
                          </button>
                        )
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
