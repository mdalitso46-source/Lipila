"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { api } from "@/components/api";
import { Shell } from "@/components/shell";

const AREAS = [
  { id: "signin", label: "Sign-in" },
  { id: "send", label: "Send" },
  { id: "claim", label: "Claim" },
  { id: "swap", label: "Swap" },
  { id: "cashout", label: "Cash out" },
  { id: "general", label: "General" },
] as const;

type Note = {
  id: string;
  rating: number;
  area: string;
  message: string;
  createdAt: string;
};

export default function FeedbackPage() {
  const [area, setArea] = useState<(typeof AREAS)[number]["id"]>("general");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ notes: Note[] }>("/api/feedback")
      .then((data) => setNotes(data.notes))
      .catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const note = await api<Note>("/api/feedback", { body: { area, rating, message } });
      setNotes((current) => [note, ...current]);
      setMessage("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main data-screen="feedback">
        <div className="subnav">
          <Link className="icon-btn" href="/" aria-label="Back">
            <ChevronLeft size={18} />
          </Link>
          <div className="page-title">Pilot feedback</div>
          <span className="nav-ghost" style={{ width: 36 }} />
        </div>
        <p className="note">
          Notes from this signed-in number are stored for the pilot. They are not payments, and nothing here moves real kwacha.
        </p>
        <form className="stack" onSubmit={submit} style={{ marginTop: 14 }}>
          <div className="chips" role="group" aria-label="Topic">
            {AREAS.map((item) => (
              <button key={item.id} type="button" aria-pressed={area === item.id} onClick={() => setArea(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="rating" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" aria-pressed={rating === value} onClick={() => setRating(value)}>
                {value}
              </button>
            ))}
          </div>
          <label className="field">
            <span>What should we change?</span>
            <textarea
              className="code-input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="A short note from this test"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {saved ? <p className="note">Saved in the pilot database.</p> : null}
          <button className="btn" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save feedback"}
          </button>
        </form>
        {notes.length ? (
          <>
            <div className="section-h">Your notes</div>
            {notes.map((note) => (
              <div className="tx" key={note.id}>
                <span className="tx-copy">
                  <strong>{note.area} · {note.rating}/5</strong>
                  <em>{note.message}</em>
                </span>
              </div>
            ))}
          </>
        ) : null}
      </main>
    </Shell>
  );
}
