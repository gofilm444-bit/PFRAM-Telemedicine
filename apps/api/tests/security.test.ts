import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "../src/shared/security";
describe("audit metadata", () => {
  it("menghapus data sensitif termasuk pada objek bertingkat", () => {
    expect(
      sanitizeAuditMetadata({
        count: 1,
        phoneNumber: "628111111111",
        nested: { address: "rahasia", token: "rahasia", safe: true },
      }),
    ).toEqual({ count: 1, nested: { safe: true } });
  });
});
