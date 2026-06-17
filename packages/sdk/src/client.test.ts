import { describe, expect, it } from "vitest";
import { ConfidentialKit } from "./client.js";
import { InvalidInputError } from "./errors.js";

describe("ConfidentialKit", () => {
  it("rejects an unknown cluster at runtime", () => {
    expect(
      () => new ConfidentialKit({ cluster: "bogus" as never }),
    ).toThrow(InvalidInputError);
  });

  it("rejects an inherited Object property masquerading as a cluster", () => {
    expect(
      () => new ConfidentialKit({ cluster: "toString" as never }),
    ).toThrow(InvalidInputError);
  });

  it("accepts a known cluster and resolves its default RPC URL", () => {
    expect(new ConfidentialKit({ cluster: "devnet" }).rpcUrl).toContain("devnet");
  });
});
