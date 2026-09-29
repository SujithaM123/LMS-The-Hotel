import { api } from "../api/client";
import { useAsync } from "../api/useAsync";
import { SkeletonRows } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { IconUsers } from "../components/icons";

export function AdminUsersPage() {
  const { data, loading, error, reload } = useAsync(() => api.adminListUsers(), []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Every account on the platform.</p>
        </div>
      </div>

      <div className="card">
        {loading && <SkeletonRows count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data && data.length === 0 && (
          <EmptyState icon={<IconUsers size={24} />} title="No users found" />
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="pill">{u.role}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
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
