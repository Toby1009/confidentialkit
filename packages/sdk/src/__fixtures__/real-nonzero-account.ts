/**
 * GOLDEN FIXTURE — a real Token-2022 confidential account with a NON-ZERO
 * balance, captured live from a surfpool fork after a full
 * deposit + apply-pending flow against a current Token-2022 (v11.0.0) deployed
 * onto the canonical program id. See docs/FORK-FINDINGS.md.
 *
 * The keys are throwaway local test keys (the surfpool payer derived them by
 * signing, exactly as spl-token-cli does), safe to commit as test vectors.
 *
 * Account: Gevte2GnGRnvJerbYzjFwCQnBJBMgaAWxzi2DDQzT6g
 * Available balance: 600000000000 base units (600 tokens @ 9 decimals)
 * Do not edit by hand — regenerate with scripts/repro-confidential-flow.sh.
 */
export const REAL_NONZERO_ACCOUNT_BASE64 =
  "bTjbQvDowoj2lI2rfpP1uLlLJz65LdYz+JaWDGwWyB/zJBJAGH+KxTwjPtQE0U9ZJwIOER5fOY6dNqxxn6679gCg2yFdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgcAAAAFACcBAeDooIJ/asGn06Sskbv/EEuATgKIL2N+Q8A+N6LmBl8+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuYGnglLfIqmyRsmKXLwAcaJzwGlKUGaQe2nXS5YuzdA78mrzrMtkU1iiGoBP1wlrmlnnJIIcb75Zu4/3E1uQ0aw9kunS3iH0R2CkHuDTo38j+pwl21TMqUKbQ93p1dhikElElAQEAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAABAAAAAAAAAA==";

/** AES key (hex) the owner derived by signing b"AeKey" — decrypts the available balance. */
export const REAL_NONZERO_AE_KEY_HEX = "2ca560f98294df264e3097bfff9a618d";

/** Decrypted available balance, base units. */
export const REAL_NONZERO_AVAILABLE = 600000000000n;
