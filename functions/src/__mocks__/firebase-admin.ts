// Mock for firebase-admin in backend tests
export const firestore = () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    add: jest.fn(),
    get: jest.fn(),
  })),
});
export const auth = () => ({
  verifyIdToken: jest.fn(),
});
