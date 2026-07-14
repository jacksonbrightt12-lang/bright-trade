import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useAccountSummary, useWithdraw } from '../hooks/useApi';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import './pages.css';

const methods = [
  { id: 'bank', label: 'Simulated Bank Transfer', subtitle: 'No fees' },
  { id: 'card', label: 'Credit / Debit Card', subtitle: 'No fees' },
  { id: 'crypto', label: 'Crypto (USDT)', subtitle: 'No fees' },
  { id: 'perfect', label: 'Perfect Money', subtitle: 'No fees' },
  { id: 'neteller', label: 'Neteller', subtitle: 'No fees' },
];

export default function Withdraw() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('300');
  const [selected, setSelected] = useState('bank');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: summary, isLoading } = useAccountSummary();
  const withdraw = useWithdraw();

  const handleWithdraw = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await withdraw.mutateAsync({ amount: value, method: selected });
      setSuccess(`Withdrawal of ${formatCurrency(value)} submitted`);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(getErrorMessage(err, 'Withdrawal failed'));
    }
  };

  if (isLoading) return <PageLoader message="Loading account..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <h2>Withdraw Funds</h2>
          <p className="muted">Available: {formatCurrency(summary?.balance ?? 0)}</p>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="funds-grid">
          <div className="fund-card glass-card">
            <div className="method-list">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`method-item ${selected === m.id ? 'active' : ''}`}
                  onClick={() => setSelected(m.id)}
                >
                  <div>
                    <div className="method-label">{m.label}</div>
                    <div className="method-sub">{m.subtitle}</div>
                  </div>
                  <FiChevronRight />
                </button>
              ))}
            </div>

            <div className="amount-row">
              <label>Amount (USD)</label>
              <div className="amount-inputs">
                <div className="quick-btns">
                  {[50, 100, 300, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className={`quick ${String(v) === amount ? 'active' : ''}`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>

            <button
              type="button"
              className="btn-sell"
              onClick={() => void handleWithdraw()}
              disabled={withdraw.isPending}
            >
              {withdraw.isPending ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
