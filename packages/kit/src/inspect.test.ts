import { describe, expect, it } from "vitest";
import { inspectConfidentialAccount, type InspectRpc } from "./inspect.js";

/** A minimal mock of `@solana/kit`'s getAccountInfo rpc. */
function mockRpc(value: unknown): InspectRpc {
  return {
    getAccountInfo: () => ({ send: async () => ({ value }) }),
  } as unknown as InspectRpc;
}

const ACCOUNT = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

describe("inspectConfidentialAccount", () => {
  it("throws when the account does not exist", async () => {
    await expect(inspectConfidentialAccount(mockRpc(null), ACCOUNT)).rejects.toThrow(/not found/);
  });

  it("throws on an unexpected (non-base64) response shape", async () => {
    await expect(
      inspectConfidentialAccount(mockRpc({ data: "not-a-tuple" }), ACCOUNT),
    ).rejects.toThrow(/Unexpected/);
  });
  it("decodes a real account returned by the rpc", async () => {
    // A real configured confidential account (captured from spl-token-2022).
    const base64 =
      "TFO8JSP1USa5EVQIZbe41paQrKuzByPpRD2S2CzSfSzzJBJAGH+KxTwjPtQE0U9ZJwIOER5fOY6dNqxxn6679gAQpdToAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgcAAAAFACcBAeDooIJ/asGn06Sskbv/EEuATgKIL2N+Q8A+N6LmBl8+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0XcB2BQxpV1uRn3LIipZpxnG++ZsB42NAUdl1e3h8lPmaLw7AQEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    const result = await inspectConfidentialAccount(mockRpc({ data: [base64, "base64"] }), ACCOUNT);
    expect(result.state.mint).toBe("68x3Mhj8NYSqmhFjA9DmY5oRMXGJ9b6QQRXeKfeZTUy1");
  });
});
