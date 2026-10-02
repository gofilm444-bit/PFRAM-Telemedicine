import { describe, it, expect } from "vitest";
import {
  videoConsultationApi,
  isValidMeetingUrl,
  formatMeetingDateTime,
} from "./consultation-api";
import { motherVideoConsultationKeys } from "./consultation-queries";

describe("Stage 10 — Mobile Video Consultation Unit Suite", () => {
  it("1. isValidMeetingUrl validates secure HTTPS URLs only", () => {
    expect(isValidMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isValidMeetingUrl("https://meet.jit.si/polsand-room-123")).toBe(true);
    expect(isValidMeetingUrl("https://teams.microsoft.com/l/meetup-join/19%3ameeting")).toBe(true);

    expect(isValidMeetingUrl("http://insecure.com/meet")).toBe(false);
    expect(isValidMeetingUrl("javascript:alert(1)")).toBe(false);
    expect(isValidMeetingUrl("data:text/html,bad")).toBe(false);
    expect(isValidMeetingUrl("not-a-url")).toBe(false);
    expect(isValidMeetingUrl("")).toBe(false);
  });

  it("2. formatMeetingDateTime formats date and time correctly", () => {
    const d = new Date(2026, 7, 15, 10, 30); // 15 Agustus 2026 10:30
    const formatted = formatMeetingDateTime(d.toISOString());
    expect(formatted).toMatch(/15 Ags 2026, 10:30/);
    expect(formatMeetingDateTime("invalid-date-string")).toBe("");
  });

  it("3. motherVideoConsultationKeys generates proper react-query keys", () => {
    expect(motherVideoConsultationKeys.all).toEqual([
      "mother",
      "video-consultation",
    ]);
    expect(motherVideoConsultationKeys.upcoming()).toEqual([
      "mother",
      "video-consultation",
      "upcoming",
    ]);
    expect(motherVideoConsultationKeys.list()).toEqual([
      "mother",
      "video-consultation",
      "list",
      "default",
    ]);
    expect(motherVideoConsultationKeys.list({ limit: 10 })).toEqual([
      "mother",
      "video-consultation",
      "list",
      { limit: 10 },
    ]);
  });

  it("4. videoConsultationApi methods are properly defined", () => {
    expect(videoConsultationApi.getUpcoming).toBeDefined();
    expect(videoConsultationApi.getAll).toBeDefined();
  });
});
