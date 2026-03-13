export async function fetchContinuation(token: string) {
  if (!token) {
    throw new Error("Missing continuation token");
  }

  const res = await fetch(`/api/continuation/${token}`, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error("Continuation request failed");
  }

  return res.json();
}
