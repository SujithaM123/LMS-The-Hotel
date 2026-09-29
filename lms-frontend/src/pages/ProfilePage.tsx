import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";

export function ProfilePage() {
  const { user, role } = useAuth();
  const { connected } = useRealtime();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your account information.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="row" style={{ justifyContent: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <h2 style={{ marginBottom: "0.15rem" }}>{user.name}</h2>
            <span className="pill pill-accent">{role}</span>
          </div>
        </div>

        <dl>
          <div className="profile-field">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="profile-field">
            <dt>Role</dt>
            <dd>{role}</dd>
          </div>
          <div className="profile-field">
            <dt>Live updates</dt>
            <dd>
              <span className="row" style={{ justifyContent: "flex-end", gap: "0.4rem" }}>
                <span
                  className="status-dot"
                  style={{ background: connected ? "var(--success)" : "var(--text-tertiary)" }}
                />
                {connected ? "Connected" : "Reconnecting…"}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
