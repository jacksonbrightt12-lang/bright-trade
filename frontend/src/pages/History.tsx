import { useState } from 'react';
import PageLoader from '../components/ui/PageLoader';
import { useTransactions } from '../hooks/useApi';
import { formatCurrency, formatDate } from '../utils/format';
import './pages.css';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'trade', label: 'Trades' },
] as const;

export default function History() {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('all');
  const { data: transactions = [], isLoading } = useTransactions(tab);

  if (isLoading) return <PageLoader message="Loading history..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <h2>Transaction History</h2>
          <p>All your deposits, withdrawals and trade profits</p>
        </div>

        <div className="history-card glass-card">
          <div className="history-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="history-list">
            {transactions.length === 0 ? (
              <p className="empty-state">No transactions yet</p>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="tx-item">
                  <div>
                    <div className="tx-title">{t.title}</div>
                    <div className="tx-desc">
                      {t.description ?? t.method ?? '—'} · {formatDate(t.date)}
                    </div>
                  </div>
                  <div className={`tx-amount ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                    {t.amount >= 0 ? '+' : ''}
                    {formatCurrency(Math.abs(t.amount))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
