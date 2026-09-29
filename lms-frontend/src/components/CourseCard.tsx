import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconBook, IconChevronRight } from "./icons";

export function CourseCard({
  title,
  instructorName,
  description,
  to,
  footer,
}: {
  title: string;
  instructorName: string;
  description?: string | null;
  to: string;
  footer?: ReactNode;
}) {
  return (
    <div className="course-card">
      <div className="course-card-eyebrow">
        <IconBook size={16} />
        Course
      </div>
      <h3>
        <Link to={to}>{title}</Link>
      </h3>
      <p className="course-card-instructor">by {instructorName}</p>
      {description ? (
        <p className="course-card-description">{description}</p>
      ) : (
        <p className="course-card-description muted">No description provided.</p>
      )}
      <div className="course-card-footer">
        {footer}
        <Link to={to} className="pill" style={{ marginLeft: "auto" }}>
          View <IconChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
