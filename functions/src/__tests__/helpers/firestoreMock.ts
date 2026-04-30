/**
 * Shared mock factory for firebase-admin/firestore.
 * Call makeFirestoreMock() at the top of each test file, then
 * wire individual doc stubs per test.
 */

export type DocSnapStub = {
  exists: boolean;
  data: () => Record<string, unknown>;
};

export type DocRefStub = {
  get: jest.Mock;
  set: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

export type QueryStub = {
  where: jest.Mock;
  limit: jest.Mock;
  get: jest.Mock;
};

export function makeDocSnap(exists: boolean, data: Record<string, unknown> = {}): DocSnapStub {
  return { exists, data: () => data };
}

export function makeDocRef(snap: DocSnapStub): DocRefStub {
  const ref: DocRefStub = {
    get: jest.fn().mockResolvedValue(snap),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  return ref;
}

export function makeQuerySnap(docs: DocSnapStub[] = []): { docs: DocSnapStub[]; empty: boolean } {
  return { docs, empty: docs.length === 0 };
}

export function makeChainableQuery(snap: ReturnType<typeof makeQuerySnap>): QueryStub {
  const q: QueryStub = {
    where: jest.fn(),
    limit: jest.fn(),
    get: jest.fn().mockResolvedValue(snap),
  };
  q.where.mockReturnValue(q);
  q.limit.mockReturnValue(q);
  return q;
}
