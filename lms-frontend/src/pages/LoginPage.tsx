import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, friendlyMessage } from "../api/client";
import { IconBook, IconAlert, IconEye, IconEyeOff } from "../components/icons";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? friendlyMessage(err) : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <IconBook size={18} />
          </span>
          LMS Platform
        </div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Log in to continue to your courses.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="has-icon-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
