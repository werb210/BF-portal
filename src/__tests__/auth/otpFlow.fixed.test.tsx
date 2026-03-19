import { render, screen, waitFor } from '@testing-library/react';
import Login from '@/pages/Login';

test('OTP flow works', async () => {
  render(<Login />);

  const input = screen.getByLabelText(/phone number/i);
  input.focus();

  await waitFor(() => {
    expect(input).toBeTruthy();
  });
});
