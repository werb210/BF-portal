import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { normalizePhone } from '@/utils/phone';
import { ApiError } from '@/api/http';

const OTP_EXPIRY_MS = 4 * 60 * 1000;

export default function Login() {
  const navigate = useNavigate();
  const { startOtp, loginWithOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);

  const otpExpired = useMemo(() => {
    if (!otpSentAt) return false;
    return Date.now() - otpSentAt > OTP_EXPIRY_MS;
  }, [otpSentAt, step, busy]);

  const handleStart = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setError('');
      const started = await startOtp({ phone: normalizePhone(phone) });
      if (started === false) {
        setError('Failed to send verification code');
        return;
      }
      setOtpSentAt(Date.now());
      setCode('');
      setStep('code');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (busy) return;

    if (otpExpired) {
      setError('Code expired. Please resend a new code.');
      setStep('phone');
      setCode('');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const normalizedPhone = normalizePhone(phone);
      const result = await loginWithOtp(normalizedPhone, code);
      if (result?.success === false) {
        setError(result.error || 'Invalid code');
        return;
      }
      navigate(result?.nextPath || '/portal');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.requestId ? `${err.message} (Request ID: ${err.requestId})` : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Invalid code');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {step === 'phone' && (
        <>
          <input
            aria-label="Phone number"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleStart} disabled={busy}>Send code</button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            placeholder="Enter code"
            aria-label="OTP digit 1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={handleVerify} disabled={busy || otpExpired}>Verify</button>
          <button onClick={handleStart} disabled={busy}>Resend code</button>
          {otpExpired && <div role="status">Code expired. Please resend.</div>}
        </>
      )}

      {error && <div role="alert" style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
