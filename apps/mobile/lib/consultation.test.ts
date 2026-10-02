import { describe, it, expect } from "vitest";
import {
  consultationApi,
  formatDuration,
  formatMessageTime,
} from "./consultation-api";
import { motherConsultationKeys } from "./consultation-queries";

describe("Stage 9 — Mobile Teleconsultation Unit Suite", () => {
  it("1. formatDuration formats null, undefined, 0, and seconds correctly", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(184)).toBe("3:04");
  });

  it("2. formatMessageTime extracts hours and minutes in HH:mm", () => {
    const d = new Date(2026, 7, 12, 14, 30);
    const result = formatMessageTime(d.toISOString());
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(formatMessageTime("invalid-date")).toBe("");
  });

  it("3. motherConsultationKeys structure is valid", () => {
    expect(motherConsultationKeys.all).toEqual(["mother", "consultation"]);
    expect(motherConsultationKeys.thread()).toEqual([
      "mother",
      "consultation",
      "thread",
    ]);
    expect(motherConsultationKeys.messages()).toEqual([
      "mother",
      "consultation",
      "messages",
      "default",
    ]);
    expect(motherConsultationKeys.messages({ limit: 20 })).toEqual([
      "mother",
      "consultation",
      "messages",
      { limit: 20 },
    ]);
  });

  it("4. consultationApi methods are defined", () => {
    expect(consultationApi.getThread).toBeDefined();
    expect(consultationApi.getMessages).toBeDefined();
    expect(consultationApi.sendMessage).toBeDefined();
    expect(consultationApi.markAsRead).toBeDefined();
  });
});
