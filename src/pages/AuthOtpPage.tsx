import { useEffect, useState } from "react";
import { fetchContinuation } from "@/services/continuationService";

export default function AuthOtpPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    async function load() {
      try {
        if (!token) {
          window.location.href = "/login";
          return;
        }

        await fetchContinuation(token);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div>
        <h1>Authentication Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Enter OTP</h1>
      {/* existing OTP form stays here */}
    </div>
  );
}
