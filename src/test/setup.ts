import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.post('/api/auth/otp/start', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/auth/otp/verify', async () => {
    return HttpResponse.json({
      user: { id: '1', role: 'Admin' },
    });
  }),

  http.get('/api/auth/me', async () => {
    return HttpResponse.json({
      user: { id: '1', role: 'Admin' },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
