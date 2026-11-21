import { createId } from "../crypto";
import { HttpError } from "../errors";
import { getStore } from "../store";
import type { FeedbackArea } from "../store/types";
import { requireUser } from "./session";

const AREAS = new Set<FeedbackArea>(["signin", "send", "claim", "swap", "cashout", "general"]);

export async function submitFeedback(input: { rating?: number; area?: string; message?: string }) {
  const user = await requireUser();
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError("Choose a rating from 1 to 5.");
  }
  if (!AREAS.has(input.area as FeedbackArea)) throw new HttpError("Choose what the note is about.");
  const message = (input.message || "").trim().replace(/\s+/g, " ");
  if (message.length < 8 || message.length > 1000) {
    throw new HttpError("Write a short note, between 8 and 1000 characters.");
  }
  const store = await getStore();
  const note = await store.insertFeedback({
    id: createId(),
    phone: user.phone,
    rating,
    area: input.area as FeedbackArea,
    message,
    createdAt: new Date().toISOString(),
  });
  return {
    id: note.id,
    rating: note.rating,
    area: note.area,
    message: note.message,
    createdAt: note.createdAt,
  };
}

export async function listMyFeedback() {
  const user = await requireUser();
  const store = await getStore();
  const notes = await store.listFeedback(user.phone);
  return {
    notes: notes.map((note) => ({
      id: note.id,
      rating: note.rating,
      area: note.area,
      message: note.message,
      createdAt: note.createdAt,
    })),
  };
}
