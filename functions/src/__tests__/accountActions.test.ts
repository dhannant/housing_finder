/**
 * Unit tests for accountActions.ts
 * Tests: toggleFavorite, deleteFavorite (auth guard + permission checks)
 */

import { makeChainableQuery, makeDocRef, makeDocSnap, makeQuerySnap } from "./helpers/firestoreMock";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockCollection = jest.fn();
const mockBatch = {
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: mockCollection,
    batch: () => mockBatch,
  }),
  FieldValue: { serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP") },
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({ deleteUser: jest.fn().mockResolvedValue(undefined) })),
}));

const MockHttpsError = class HttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "HttpsError";
  }
};

jest.mock("firebase-functions/v2/https", () => ({
  onCall: (fn: unknown) => fn,
  HttpsError: MockHttpsError,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const accountModule = require("../accountActions");

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(data: Record<string, unknown>, uid?: string) {
  return { data, auth: uid ? { uid } : undefined };
}

// Wire mockCollection so:
//   collection("users").doc(uid).get()    → returns userSnap
//   collection("clientRequests").where...  → returns emptyQuery (no assignment)
//   collection("clientFavorites").where... → returns favoriteQuery
function wireCollections(opts: {
  userSnap?: ReturnType<typeof makeDocSnap>;
  clientRequestsSnap?: ReturnType<typeof makeQuerySnap>;
  clientFavoritesSnap?: ReturnType<typeof makeQuerySnap>;
}) {
  const userRef = makeDocRef(opts.userSnap ?? makeDocSnap(false));
  const clientRequestsQuery = makeChainableQuery(opts.clientRequestsSnap ?? makeQuerySnap([]));
  const clientFavoritesQuery = makeChainableQuery(opts.clientFavoritesSnap ?? makeQuerySnap([]));

  // Stub clientFavorites doc().set for the "add" case
  const favoriteDocRef = makeDocRef(makeDocSnap(false));
  const mockDoc = jest.fn().mockReturnValue(favoriteDocRef);

  mockCollection.mockImplementation((name: string) => {
    if (name === "users") return { doc: () => userRef };
    if (name === "clientRequests") return clientRequestsQuery;
    if (name === "clientFavorites") return { ...clientFavoritesQuery, doc: mockDoc };
    return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue(makeQuerySnap([])) };
  });

  return { userRef, clientRequestsQuery, clientFavoritesQuery, favoriteDocRef, mockDoc };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("toggleFavorite — auth guard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws unauthenticated when no auth context", async () => {
    await expect(
      accountModule.toggleFavorite(makeRequest({ userId: "u1", propertyId: "p1" }))
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("toggleFavorite — missing required fields", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws invalid-argument when userId is missing", async () => {
    wireCollections({});
    await expect(
      accountModule.toggleFavorite(makeRequest({ propertyId: "p1" }, "uid-actor"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when propertyId is missing", async () => {
    wireCollections({});
    await expect(
      accountModule.toggleFavorite(makeRequest({ userId: "uid-actor" }, "uid-actor"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("toggleFavorite — adding a favorite", () => {
  beforeEach(() => jest.clearAllMocks());

  it("adds favorite and returns isFavorite:true when not already favorited", async () => {
    const { favoriteDocRef } = wireCollections({
      clientFavoritesSnap: makeQuerySnap([]), // no existing favorite
    });

    const result = await accountModule.toggleFavorite(
      makeRequest({ userId: "uid-actor", propertyId: "prop-123" }, "uid-actor")
    );

    expect(result.ok).toBe(true);
    expect(result.isFavorite).toBe(true);
    expect(result.favoriteDocId).toBeDefined();
    expect(favoriteDocRef.set).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("toggleFavorite — removing a favorite", () => {
  beforeEach(() => jest.clearAllMocks());

  it("removes favorite and returns isFavorite:false when already favorited", async () => {
    const existingDoc = { ref: { id: "existing-fav" } };
    const existingSnap = {
      ...makeQuerySnap([makeDocSnap(true, { userId: "uid-actor", propertyId: "prop-123" })]),
      docs: [existingDoc],
    };

    wireCollections({ clientFavoritesSnap: existingSnap as any });

    const result = await accountModule.toggleFavorite(
      makeRequest({ userId: "uid-actor", propertyId: "prop-123" }, "uid-actor")
    );

    expect(result.ok).toBe(true);
    expect(result.isFavorite).toBe(false);
    expect(mockBatch.commit).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("toggleFavorite — permission check", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws permission-denied when non-agent tries to toggle another user's favorite", async () => {
    wireCollections({
      userSnap: makeDocSnap(true, { role: "Client" }), // not agent/admin
      clientRequestsSnap: makeQuerySnap([]), // no assignment
    });

    await expect(
      accountModule.toggleFavorite(
        makeRequest({ userId: "uid-other-client", propertyId: "prop-123" }, "uid-actor")
      )
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});
