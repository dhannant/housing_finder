import { render } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    // Mock authentication context/provider as needed
    const { getByText } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(getByText('Protected Content')).toBeInTheDocument();
  });
});
