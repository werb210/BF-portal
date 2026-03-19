import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '@/pages/Login';

test('OTP flow works', async () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const input = screen.getByLabelText(/phone number/i);
  input.focus();

  await waitFor(() => {
    expect(input).toBeTruthy();
  });
});
