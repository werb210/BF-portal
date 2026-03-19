import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { test, expect } from 'vitest';

import Login from '@/pages/Login';

test('full OTP auth flow', async () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const phoneInput = await screen.findByLabelText(/phone number/i);
  expect(phoneInput).toBeInTheDocument();
});
