import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const normalizePhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 10) digits = "1" + digits;
    if (!digits.startsWith("1")) return null;
    if (digits.length !== 11) return null;
    return "+" + digits;
  };

  useEffect(() => {
    const normalized = normalizePhone(phone);
    if (!normalized) return;

    const sendOtp = async () => {
      try {
        await fetch("/api/auth/otp/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalized }),
        });

        sessionStorage.setItem("otp_phone", normalized);
        navigate("/verify");
      } catch (err) {
        console.error("OTP start failed", err);
      }
    };

    void sendOtp();
  }, [phone, navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Boreal Group of Companies Staff Portal
        </h1>

        <input
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-3 text-lg w-72 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
