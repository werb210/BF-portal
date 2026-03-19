import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

let isAuthenticated = false;
let adminRules = [
  { id: 'rule-1', name: 'Escalate billing issues', content: 'Escalate payment disputes to staff.', active: true, priority: 1 },
  { id: 'rule-2', name: 'Avoid policy hallucination', content: 'Never invent policy details.', active: true, priority: 2 }
];

const authStartMatcher = /\/((api\/)?auth\/otp\/start)$/;
const authVerifyMatcher = /\/((api\/)?auth\/otp\/verify)$/;
const authMeMatcher = /\/((api\/)?auth\/me)$/;
const adminRulesMatcher = /\/admin\/ai-rules$/;
const adminRulesItemMatcher = /\/admin\/ai-rules\/([^/]+)$/;

const authMeResponse = () => {
  if (!isAuthenticated) {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return HttpResponse.json({ user: { id: '1', role: 'Admin' } });
};

export const server = setupServer(
  http.options(/.*/, () => new HttpResponse(null, { status: 204 })),
  http.post(authStartMatcher, () => HttpResponse.json({ success: true })),
  http.post(authVerifyMatcher, () => {
    isAuthenticated = true;
    return HttpResponse.json({ user: { id: '1', role: 'Admin' } });
  }),
  http.get(authMeMatcher, authMeResponse),
  http.get(adminRulesMatcher, () => HttpResponse.json([...adminRules].sort((a, b) => a.priority - b.priority))),
  http.post(adminRulesMatcher, async ({ request }) => {
    const payload = await request.json() as { name: string; content: string; active: boolean; priority: number };
    const created = { ...payload, id: `rule-${Date.now()}` };
    adminRules = [...adminRules, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(adminRulesItemMatcher, async ({ request, params }) => {
    const payload = await request.json() as Partial<{ name: string; content: string; active: boolean; priority: number }>;
    const ruleId = String(params[0] ?? '');
    const existing = adminRules.find((rule) => rule.id === ruleId);
    if (!existing) {
      return HttpResponse.json({ message: 'Rule not found' }, { status: 404 });
    }

    const updated = { ...existing, ...payload };
    adminRules = adminRules.map((rule) => (rule.id === ruleId ? updated : rule));
    return HttpResponse.json(updated);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  isAuthenticated = false;
  adminRules = [
    { id: 'rule-1', name: 'Escalate billing issues', content: 'Escalate payment disputes to staff.', active: true, priority: 1 },
    { id: 'rule-2', name: 'Avoid policy hallucination', content: 'Never invent policy details.', active: true, priority: 2 }
  ];
  server.resetHandlers();
});
afterAll(() => server.close());
