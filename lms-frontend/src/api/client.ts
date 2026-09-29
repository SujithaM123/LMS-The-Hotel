import type {
  ApiErrorBody,
  AuthResponse,
  CourseResponse,
  DashboardResponse,
  EnrollmentResponse,
  MessageResponse,
  NotificationResponse,
  Role,
  UserSummaryResponse,
} from "./types";

const AUTH_KEY = "lms.auth";

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(body: ApiErrorBody, status: number) {
    super(body.message || "Request failed");
    this.status = status;
    this.details = body.details;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

/**
 * Maps a caught error to copy a user should actually see - never a raw exception message from
 * the network layer, and only the server's own message for cases (400/409) where the backend
 * writes text specifically meant for end users.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return err.details?.length ? err.details.join(" ") : err.message || "Please check your input and try again.";
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "We couldn't find that.";
      case 409:
        return err.message || "That already exists.";
      default:
        return err.status >= 500
          ? "Something went wrong on our end. Please try again."
          : err.message || "Something went wrong.";
    }
  }
  return "Unable to connect. Please check your connection and try again.";
}

export function getStoredAuth(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthResponse) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && unauthorizedHandler) {
    unauthorizedHandler();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(data as ApiErrorBody, res.status);
  }

  return data as T;
}

export const api = {
  register: (input: { name: string; email: string; password: string; role: Role }) =>
    request<AuthResponse>("POST", "/api/auth/register", input),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("POST", "/api/auth/login", input),

  logout: () => request<void>("POST", "/api/auth/logout"),

  getDashboard: () => request<DashboardResponse>("GET", "/api/dashboard"),

  listCourses: () => request<CourseResponse[]>("GET", "/api/courses"),

  getCourse: (id: number) => request<CourseResponse>("GET", `/api/courses/${id}`),

  createCourse: (input: { title: string; description?: string }) =>
    request<CourseResponse>("POST", "/api/courses", input),

  enroll: (courseId: number) =>
    request<EnrollmentResponse>("POST", `/api/courses/${courseId}/enroll`),

  listCourseStudents: (courseId: number) =>
    request<EnrollmentResponse[]>("GET", `/api/courses/${courseId}/students`),

  myEnrollments: () => request<EnrollmentResponse[]>("GET", "/api/enrollments/my"),

  listNotifications: () => request<NotificationResponse[]>("GET", "/api/notifications"),

  markNotificationRead: (id: number) =>
    request<NotificationResponse>("PUT", `/api/notifications/${id}/read`),

  sendMessage: (input: { studentId: number; courseId: number; content: string }) =>
    request<MessageResponse>("POST", "/api/messages", input),

  listMessages: () => request<MessageResponse[]>("GET", "/api/messages"),

  getMessage: (id: number) => request<MessageResponse>("GET", `/api/messages/${id}`),

  adminListUsers: () => request<UserSummaryResponse[]>("GET", "/api/admin/users"),

  adminListCourses: () => request<CourseResponse[]>("GET", "/api/admin/courses"),

  adminListEnrollments: () => request<EnrollmentResponse[]>("GET", "/api/admin/enrollments"),
};
