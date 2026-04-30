/**
 * Unit tests for auth.ts
 * Tests: verifyRegistrationAllowed, recordRegistrationAttempt,
 *        verifyLoginAllowed, recordLoginAttempt, getRoleFromEmail (via createRegistrationProfile)
 *
 * All Firestore calls are mocked — no Firebase project needed.
 */

import { makeDocRef, makeDocSnap } from "./helpers/firestoreMock";

// ── Mock firebase-admin before importing the module under test ──────────────
const mockCollection = jest.fn();
const mockGetFirestore = jest.fn(() => ({ collection: mockCollection }));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockGetFirestore(),
  FieldValue: { serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP") },
}));

jest.mock("firebase-functions/v2/https", () => ({
  onCall: (fn: unknown) => fn,
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

// Import after mocks are registered
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authModule = require("../auth");

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(data: Record<string, unknown>, uid?: string) {
  return { data, auth: uid ? { uid } : undefined };
}

function wireDoc(snap: ReturnType<typeof makeDocSnap>) {
  const ref = makeDocRef(snap);
  const mockDoc = jest.fn().mockReturnValue(ref);
  mockCollection.mockReturnValue({ doc: mockDoc });
  return { ref, mockDoc };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("verifyRegistrationAllowed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns allowed:false when email is missing", async () => {
    const result = await authModule.verifyRegistrationAllowed(makeRequest({}));
    expect(result).toEqual({ allowed: false, reason: "Missing email" });
  });

  it("returns allowed:false when email is blank", async () => {
    const result = await authModule.verifyRegistrationAllowed(makeRequest({ email: "   " }));
    expect(result).toEqual({ allowed: false, reason: "Missing email" });
  });

  it("returns allowed:true when no rate-limit doc exists", async () => {
    wireDoc(makeDocSnap(false));
    const result = await authModule.verifyRegistrationAllowed(makeRequest({ email: "new@example.com" }));
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:true when lockoutUntil is in the past", async () => {
    wireDoc(makeDocSnap(true, { attemptCount: 3, lockoutUntil: Date.now() - 1000 }));
    const result = await authModule.verifyRegistrationAllowed(makeRequest({ email: "user@example.com" }));
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:false and lockout info when locked out", async () => {
    const lockoutUntil = Date.now() + 60_000;
    wireDoc(makeDocSnap(true, { attemptCount: 3, lockoutUntil }));
    const result = await authModule.verifyRegistrationAllowed(makeRequest({ email: "locked@example.com" }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("locked_out");
    expect(result.lockoutUntil).toBe(lockoutUntil);
  });

  it("normalizes email to lowercase before checking", async () => {
    const { mockDoc } = wireDoc(makeDocSnap(false));
    await authModule.verifyRegistrationAllowed(makeRequest({ email: "User@Example.COM" }));
    expect(mockDoc).toHaveBeenCalledWith("user@example.com");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("recordRegistrationAttempt", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns ok:false when email is missing", async () => {
    const result = await authModule.recordRegistrationAttempt(makeRequest({ success: false }));
    expect(result).toEqual({ ok: false, reason: "Missing email" });
  });

  it("resets counters on success", async () => {
    const { ref } = wireDoc(makeDocSnap(false));
    const result = await authModule.recordRegistrationAttempt(makeRequest({ email: "user@example.com", success: true }));
    expect(result).toEqual({ ok: true, reset: true });
    expect(ref.set).toHaveBeenCalledWith({ attemptCount: 0, lockoutUntil: 0 }, { merge: true });
  });

  it("increments attemptCount on first failure", async () => {
    const { ref } = wireDoc(makeDocSnap(false));
    const result = await authModule.recordRegistrationAttempt(makeRequest({ email: "user@example.com", success: false }));
    expect(result.ok).toBe(true);
    expect(result.attemptCount).toBe(1);
    expect(result.lockoutUntil).toBe(0);
    expect(ref.set).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 1, lockoutUntil: 0 }),
      { merge: true }
    );
  });

  it("increments from existing attemptCount", async () => {
    wireDoc(makeDocSnap(true, { attemptCount: 1, lockoutUntil: 0 }));
    const result = await authModule.recordRegistrationAttempt(makeRequest({ email: "user@example.com", success: false }));
    expect(result.attemptCount).toBe(2);
  });

  it("sets lockoutUntil when attempt count reaches MAX (3)", async () => {
    wireDoc(makeDocSnap(true, { attemptCount: 2, lockoutUntil: 0 }));
    const before = Date.now();
    const result = await authModule.recordRegistrationAttempt(makeRequest({ email: "user@example.com", success: false }));
    const after = Date.now();
    expect(result.attemptCount).toBe(3);
    // lockoutUntil should be ~24h from now
    const expectedMin = before + 24 * 60 * 60 * 1000 - 100;
    const expectedMax = after + 24 * 60 * 60 * 1000 + 100;
    expect(result.lockoutUntil).toBeGreaterThanOrEqual(expectedMin);
    expect(result.lockoutUntil).toBeLessThanOrEqual(expectedMax);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("verifyLoginAllowed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns allowed:false for missing email", async () => {
    const result = await authModule.verifyLoginAllowed(makeRequest({}));
    expect(result).toEqual({ allowed: false, reason: "Missing email" });
  });

  it("returns allowed:true when no doc exists", async () => {
    wireDoc(makeDocSnap(false));
    const result = await authModule.verifyLoginAllowed(makeRequest({ email: "agent@leadingedge.com" }));
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:false with lockout info when locked", async () => {
    const lockoutUntil = Date.now() + 3_600_000;
    wireDoc(makeDocSnap(true, { failedCount: 3, lockoutUntil }));
    const result = await authModule.verifyLoginAllowed(makeRequest({ email: "agent@leadingedge.com" }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("locked_out");
    expect(result.lockoutUntil).toBe(lockoutUntil);
    expect(result.failedCount).toBe(3);
  });
});
