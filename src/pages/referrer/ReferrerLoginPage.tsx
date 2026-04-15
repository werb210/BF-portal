import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ReferrerLoginPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded border bg-white p-4 space-y-3">
        <h1 className="text-xl font-semibold">Sign In to Referral Portal</h1>
        <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
        <button className="ui-button ui-button--primary w-full" onClick={() => navigate("/referrer")}>Continue</button>
      </div>
    </div>
  );
};

export default ReferrerLoginPage;
