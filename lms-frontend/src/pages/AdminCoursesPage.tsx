import { api } from "../api/client";
import { useAsync } from "../api/useAsync";
import { SkeletonRows } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { IconBook } from "../components/icons";

export function AdminCoursesPage() {
  const { data, loading, error, reload } = useAsync(() => api.adminListCourses(), []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          <p>Every course on the platform.</p>
        </div>
      </div>

      <div className="card">
        {loading && <SkeletonRows count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data && data.length === 0 && (
          <EmptyState icon={<IconBook size={24} />} title="No courses found" />
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Instructor</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.instructorName}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
