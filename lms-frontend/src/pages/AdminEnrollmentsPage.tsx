import { api } from "../api/client";
import { useAsync } from "../api/useAsync";
import { SkeletonRows } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { IconClipboard } from "../components/icons";

export function AdminEnrollmentsPage() {
  const { data, loading, error, reload } = useAsync(() => api.adminListEnrollments(), []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Enrollments</h1>
          <p>Every student enrollment on the platform.</p>
        </div>
      </div>

      <div className="card">
        {loading && <SkeletonRows count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data && data.length === 0 && (
          <EmptyState icon={<IconClipboard size={24} />} title="No enrollments found" />
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id}>
                    <td>{e.studentName}</td>
                    <td>{e.courseTitle}</td>
                    <td>{new Date(e.enrolledAt).toLocaleDateString()}</td>
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
