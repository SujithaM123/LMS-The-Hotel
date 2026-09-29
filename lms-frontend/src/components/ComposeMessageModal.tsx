import { useState, type FormEvent } from "react";
import { api, ApiError, friendlyMessage } from "../api/client";
import { Modal } from "./Modal";

export function ComposeMessageModal({
  courseId,
  studentId,
  studentName,
  onClose,
  onSent,
}: {
  courseId: number;
  studentId: number;
  studentName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.sendMessage({ studentId, courseId, content });
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? friendlyMessage(err) : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title={`Message ${studentName}`} onClose={onClose}>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="content">Message</label>
          <textarea
            id="content"
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={sending || !content.trim()}>
            {sending ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
