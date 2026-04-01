if (!process.env.VITE_API_URL) {
  test.skip("integration disabled (no backend)", () => {});
} else {
  test("backend reachable", async () => {
    const res = await fetch(`${process.env.VITE_API_URL}/health`);
    expect(res.status).toBe(200);
  });
}
