import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useAccountSummary, useDeposit } from '../hooks/useApi';
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

export default function Deposit() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('500');
  const [selected, setSelected] = useState('bank');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: summary, isLoading } = useAccountSummary();
  const deposit = useDeposit();

  const handleDeposit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await deposit.mutateAsync({ amount: value, method: selected });
      setSuccess(`Successfully deposited ${formatCurrency(value)}`);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(getErrorMessage(err, 'Deposit failed'));
    }
  };

  if (isLoading) return <PageLoader message="Loading account..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <h2>Deposit Funds</h2>
          <p className="muted">Balance: {formatCurrency(summary?.balance ?? 0)}</p>
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
              className="trade-btn"
              onClick={() => void handleDeposit()}
              disabled={deposit.isPending}
            >
              {deposit.isPending ? 'Processing...' : `Deposit $${amount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
