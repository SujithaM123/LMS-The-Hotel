import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError, friendlyMessage } from "../api/client";
import type { Role } from "../api/types";
import { IconBook, IconAlert, IconEye, IconEyeOff } from "../components/icons";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (password.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? friendlyMessage(err) : "Registration failed. Please try again.");
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
        <h1>Create your account</h1>
        <p className="auth-subtitle">Join as a student or an instructor.</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                className="has-icon-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-hint"
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
            <span className="form-hint" id="password-hint">
              At least 8 characters.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={fieldError ? "true" : undefined}
              aria-describedby={fieldError ? "confirm-error" : undefined}
            />
            {fieldError && (
              <span className="form-error" id="confirm-error">
                {fieldError}
              </span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="role">I am a</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
            </select>
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
