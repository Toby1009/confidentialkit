import { describe, expect, it, vi } from "vitest";
import { fetchAccountData } from "./rpc.js";
import { ConfidentialKitError } from "./errors.js";

function mockFetch(payload: unknown, ok = true, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("fetchAccountData", () => {
  it("returns decoded bytes for an existing account", async () => {
    const data = new Uint8Array([0, 1, 2, 3]);
    const base64 = Buffer.from(data).toString("base64");
    const fetchImpl = mockFetch({
      jsonrpc: "2.0",
      id: 1,
      result: { value: { data: [base64, "base64"], owner: "x", lamports: 1 } },
    });
    expect(await fetchAccountData("http://rpc", "addr", fetchImpl)).toEqual(data);
  });

  it("returns null for a missing account", async () => {
    const fetchImpl = mockFetch({ jsonrpc: "2.0", id: 1, result: { value: null } });
    expect(await fetchAccountData("http://rpc", "addr", fetchImpl)).toBeNull();
  });

  it("throws on an RPC error payload", async () => {
    const fetchImpl = mockFetch({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32602, message: "bad params" },
    });
    await expect(fetchAccountData("http://rpc", "addr", fetchImpl)).rejects.toBeInstanceOf(
      ConfidentialKitError,
    );
  });

  it("throws on a non-OK HTTP response", async () => {
    const fetchImpl = mockFetch({}, false, 500);
    await expect(fetchAccountData("http://rpc", "addr", fetchImpl)).rejects.toBeInstanceOf(
      ConfidentialKitError,
    );
  });
});
