const shouldRun = Boolean(process.env.VITE_API_URL);

(shouldRun ? test : test.skip)("backend reachable", async () => {
  const res = await fetch(`${process.env.VITE_API_URL}/health`);
  expect(res.status).toBe(200);
});
