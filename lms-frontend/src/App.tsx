import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CoursesPage } from "./pages/CoursesPage";
import { CreateCoursePage } from "./pages/CreateCoursePage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminCoursesPage } from "./pages/AdminCoursesPage";
import { AdminEnrollmentsPage } from "./pages/AdminEnrollmentsPage";

function Shell() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route
                  path="courses/new"
                  element={
                    <ProtectedRoute allow={["INSTRUCTOR"]}>
                      <CreateCoursePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="courses/:id" element={<CourseDetailPage />} />
                <Route
                  path="my-courses"
                  element={
                    <ProtectedRoute allow={["STUDENT", "INSTRUCTOR"]}>
                      <MyCoursesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="messages"
                  element={
                    <ProtectedRoute allow={["STUDENT", "INSTRUCTOR"]}>
                      <MessagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="admin" element={<Navigate to="/admin/users" replace />} />
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute allow={["ADMIN"]}>
                      <AdminUsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/courses"
                  element={
                    <ProtectedRoute allow={["ADMIN"]}>
                      <AdminCoursesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/enrollments"
                  element={
                    <ProtectedRoute allow={["ADMIN"]}>
                      <AdminEnrollmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RealtimeProvider>
          <Shell />
        </RealtimeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
