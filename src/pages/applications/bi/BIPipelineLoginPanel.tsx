import { useState } from "react";
import { biPipelineApi } from "./bi.pipeline.api";

type BIPipelineLoginPanelProps = {
  onAuthenticated: () => void;
};

const BIPipelineLoginPanel = ({ onAuthenticated }: BIPipelineLoginPanelProps) => {
  const [mode, setMode] = useState<"otp" | "staff">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await biPipelineApi.requestOtp(email);
      setOtpRequestId(res.otp_request_id);
    } catch {
      setError("Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await biPipelineApi.verifyOtp(otpRequestId, otpCode);
      onAuthenticated();
    } catch {
      setError("Invalid code or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const staffLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await biPipelineApi.staffLogin(email, password);
      onAuthenticated();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline-page">
      <div className="application-drawer">
        <h2 className="application-drawer__title">BI Login</h2>
        <div className="tabs">
          <button type="button" className={`tab ${mode === "otp" ? "tab--active" : ""}`} onClick={() => setMode("otp")}>OTP</button>
          <button type="button" className={`tab ${mode === "staff" ? "tab--active" : ""}`} onClick={() => setMode("staff")}>Staff Login</button>
        </div>

        <div className="space-y-3 mt-4">
          <input className="input" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />

          {mode === "staff" ? (
            <>
              <input className="input" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="btn-primary" disabled={loading} onClick={staffLogin}>Sign in</button>
            </>
          ) : (
            <>
              <button type="button" className="btn" disabled={loading || !email} onClick={sendOtp}>Request OTP</button>
              {otpRequestId ? (
                <>
                  <input className="input" placeholder="OTP code" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
                  <button type="button" className="btn-primary" disabled={loading || !otpCode} onClick={verifyOtp}>Verify OTP</button>
                </>
              ) : null}
            </>
          )}

          {error ? <div className="text-red-600">{error}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default BIPipelineLoginPanel;
