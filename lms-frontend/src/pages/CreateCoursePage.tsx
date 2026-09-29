import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, friendlyMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { IconAlert } from "../components/icons";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

export function CreateCoursePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const course = await api.createCourse({ title: title.trim(), description: description.trim() || undefined });
      showToast(`"${course.title}" was created.`, "success");
      navigate(`/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? friendlyMessage(err) : "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Create a course</h1>
          <p>You'll be listed as the instructor automatically.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {error && (
          <div className="alert alert-danger" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="title">Course title</label>
            <input
              id="title"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Data Structures"
            />
            <span className="form-hint">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={5}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn in this course?"
            />
            <span className="form-hint">
              {description.length}/{DESCRIPTION_MAX} · optional
            </span>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={creating || !title.trim()}>
              {creating ? "Creating…" : "Create course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
