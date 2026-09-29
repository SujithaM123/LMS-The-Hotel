import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconDashboard,
  IconBook,
  IconLayers,
  IconPlus,
  IconMail,
  IconBell,
  IconUser,
  IconUsers,
  IconClipboard,
  IconLogout,
} from "./icons";

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { role, logout } = useAuth();

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true">
          <IconBook size={16} />
        </span>
        LMS Platform
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
          <IconDashboard size={20} />
          Dashboard
        </NavLink>

        {role === "STUDENT" && (
          <>
            <NavLink to="/courses" end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconBook size={20} />
              Browse Courses
            </NavLink>
            <NavLink to="/my-courses" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconLayers size={20} />
              My Courses
            </NavLink>
          </>
        )}

        {role === "INSTRUCTOR" && (
          <>
            <NavLink to="/my-courses" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconLayers size={20} />
              My Courses
            </NavLink>
            <NavLink to="/courses/new" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconPlus size={20} />
              Create Course
            </NavLink>
          </>
        )}

        {role === "ADMIN" && (
          <>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconUsers size={20} />
              Users
            </NavLink>
            <NavLink to="/admin/courses" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconBook size={20} />
              Courses
            </NavLink>
            <NavLink to="/admin/enrollments" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
              <IconClipboard size={20} />
              Enrollments
            </NavLink>
          </>
        )}

        {role !== "ADMIN" && (
          <NavLink to="/messages" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
            <IconMail size={20} />
            Messages
          </NavLink>
        )}

        <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
          <IconBell size={20} />
          Notifications
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
          <IconUser size={20} />
          Profile
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link" style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer" }} onClick={logout}>
          <IconLogout size={20} />
          Log out
        </button>
      </div>
    </aside>
  );
}
