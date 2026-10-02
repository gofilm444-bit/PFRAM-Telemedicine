import { describe, it, expect } from "vitest";
import {
  formatHomeVisitDate,
  homeVisitApi,
  getMotherHomeVisits,
} from "./home-visit-api";
import { motherHomeVisitKeys } from "./home-visit-queries";

describe("Stage 11 — Mobile Home Visit Unit Suite", () => {
  it("1. formatHomeVisitDate formats ISO string to Indonesian date string with WIT", () => {
    const formatted = formatHomeVisitDate("2026-10-15T14:00:00Z");
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/Oktober/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/WIT/);
  });

  it("2. formatHomeVisitDate handles invalid date strings gracefully", () => {
    expect(formatHomeVisitDate("invalid-date")).toBe("");
  });

  it("3. motherHomeVisitKeys generates query keys properly", () => {
    expect(motherHomeVisitKeys.all).toEqual(["mother", "home-visits"]);
    expect(motherHomeVisitKeys.upcoming()).toEqual([
      "mother",
      "home-visits",
      "upcoming",
    ]);
    expect(motherHomeVisitKeys.list()).toEqual([
      "mother",
      "home-visits",
      "list",
      "default",
    ]);
  });

  it("4. homeVisitApi methods are properly defined", () => {
    expect(homeVisitApi.getHomeVisits).toBeDefined();
    expect(typeof homeVisitApi.getHomeVisits).toBe("function");
  });

  it("5. getMotherHomeVisits helper function is defined and callable", () => {
    expect(getMotherHomeVisits).toBeDefined();
    expect(typeof getMotherHomeVisits).toBe("function");
  });
});
