import { db } from '../firebaseConfig';

describe('firebaseConfig', () => {
  it('should export a Firestore db instance', () => {
    expect(db).toBeDefined();
    expect(typeof db).toBe('object');
  });
});
