export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface AuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
}

export interface CourseResponse {
  id: number;
  title: string;
  description: string | null;
  instructorId: number;
  instructorName: string;
  createdAt: string;
}

export interface EnrollmentResponse {
  id: number;
  courseId: number;
  courseTitle: string;
  studentId: number;
  studentName: string;
  enrolledAt: string;
}

export interface NotificationResponse {
  id: number;
  content: string;
  type: "ENROLLMENT" | "MESSAGE" | "COURSE" | "GENERAL";
  read: boolean;
  createdAt: string;
}

export interface MessageResponse {
  id: number;
  senderId: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  courseId: number;
  courseTitle: string;
  content: string;
  sentAt: string;
}

export interface UserSummaryResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface DashboardResponse {
  role: Role;
  unreadNotificationCount: number;
  enrollments?: EnrollmentResponse[];
  createdCourses?: CourseResponse[];
  totalEnrolledStudents?: number;
  totalUsers?: number;
  totalCourses?: number;
  totalEnrollments?: number;
}

export interface WsErrorResponse {
  timestamp: string;
  destination: string;
  message: string;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details?: string[];
}
