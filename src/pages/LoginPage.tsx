import { useState } from "react";
import { sendOtp, verifyOtp } from "../api/auth";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "verify">("start");

  const handleStart = async () => {
    await sendOtp(phone);
    setStep("verify");
  };

  const handleVerify = async () => {
    const res = await verifyOtp(phone, code);
    localStorage.setItem("bf_jwt_token", res.token);
    window.location.href = "/";
  };

  return (
    <div>
      {step === "start" ? (
        <>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
          <button onClick={handleStart}>Send OTP</button>
        </>
      ) : (
        <>
          <input value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={handleVerify}>Verify</button>
        </>
      )}
    </div>
  );
}
