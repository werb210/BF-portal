import { useEffect, useState } from "react";
import { getMe } from "@/api/auth";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        await getMe();
        if (mounted) {
          setAllowed(true);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401) {
          window.location.href = "/login";
          return;
        }
        if (mounted) {
          setAllowed(false);
        }
      }
    };

    void verifySession();

    return () => {
      mounted = false;
    };
  }, []);

  if (allowed === null) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return children;
}
