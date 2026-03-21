import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.get('/api' + '/{*path}', () => HttpResponse.json({ data: [] }, { status: 200 })),
  http.post('/api' + '/{*path}', () => HttpResponse.json({ success: true }, { status: 200 }))
)
