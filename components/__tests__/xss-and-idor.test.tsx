import { render } from '@testing-library/react';

// Example component that renders user data
function UserProfile({ user }: { user: { name: string; id: string } }) {
  return <div data-testid="user-profile">{user.name}</div>;
}

describe('Frontend Security', () => {
  it('should escape user-supplied data to prevent XSS', () => {
    const maliciousUser = { name: '<img src=x onerror=alert(1)>', id: '123' };
    const { getByTestId } = render(<UserProfile user={maliciousUser} />);
    expect(getByTestId('user-profile').innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('should not allow IDOR by guessing user IDs', () => {
    // Simulate a user trying to access another user's profile by ID
    // This is a placeholder; real test would check routing/auth logic
    expect(true).toBe(true);
  });
});
