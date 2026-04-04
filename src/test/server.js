import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
export const server = setupServer(http.get('/{*path}', () => HttpResponse.json({ data: [] }, { status: 200 })), http.post('/{*path}', () => HttpResponse.json({ success: true }, { status: 200 })));
