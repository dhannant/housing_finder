import * as functions from '../index';

describe('Cloud Functions Entry', () => {
  it('should have REG_ATTEMPT_COLLECTION constant', () => {
    expect(functions).toHaveProperty('REG_ATTEMPT_COLLECTION');
  });
});
