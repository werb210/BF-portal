import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Verify() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const phone = sessionStorage.getItem("otp_phone");

  useEffect(() => {
    if (code.length !== 6) return;

    const verifyOtp = async () => {
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });

        if (!res.ok) throw new Error("Invalid code");

        const data = await res.json();
        localStorage.setItem("token", data.token);

        navigate("/");
      } catch (err) {
        console.error("OTP verify failed", err);
        setCode("");
      }
    };

    void verifyOtp();
  }, [code, navigate, phone]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <input
        type="text"
        placeholder="Enter code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
        className="border border-gray-300 rounded-md px-4 py-3 text-lg w-48 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
