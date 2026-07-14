import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiMail } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import bullLogo from '../../images/back.png';
import './auth.css';

export default function VerifyEmail() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const state = location.state as { email?: string; devCode?: string } | null;
  const email = state?.email ?? '';

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (state?.devCode && state.devCode.length === 6) {
      setCode(state.devCode.split(''));
    }
  }, [state?.devCode]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await verifyEmail(email, verificationCode);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Verification failed'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background" style={{ backgroundImage: `url(${bullLogo})` }} />

      <div className="auth-content">
        <div className="auth-card verify-card">
          <div className="verify-icon">
            <FiCheckCircle size={64} />
          </div>

          <h2>Verify Your Email</h2>
          <p className="subtitle">
            We&apos;ve sent a verification code to<br />
            <strong>{email}</strong>
          </p>

          {state?.devCode && (
            <p className="dev-hint">Dev code: {state.devCode}</p>
          )}

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <label>Enter 6-digit Code</label>
              <div className="code-input-group">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="code-input"
                    placeholder="0"
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <button type="button" className="btn-secondary" onClick={() => window.open('https://mail.google.com', '_blank')}>
            <FiMail size={18} />
            Open Email App
          </button>

          <div className="resend-section">
            <p>Didn&apos;t receive the code?</p>
            <button
              type="button"
              className="resend-btn"
              onClick={() => setResendCountdown(60)}
              disabled={resendCountdown > 0}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Email'}
            </button>
          </div>

          <p className="auth-footer">
            <Link to="/login" className="link">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
