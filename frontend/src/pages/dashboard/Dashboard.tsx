import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import TrendChart from '../../components/ui/TrendChart';
import PageLoader from '../../components/ui/PageLoader';
import { useAccount } from '../../context/AccountContext';
import { useAccountSummary, useMarkets } from '../../hooks/useApi';
import { formatCurrency, formatPrice } from '../../utils/format';
import './dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accountType } = useAccount();
  const { data: summary, isLoading } = useAccountSummary();
  const { markets } = useMarkets();

  if (isLoading) return <PageLoader message="Loading dashboard..." />;

  const positions = summary?.openPositions ?? [];
  const transactions = summary?.recentTransactions ?? [];
  const profitPct =
    summary && summary.balance > 0
      ? ((summary.profitToday / summary.balance) * 100).toFixed(2)
      : '0.00';

  return (
    <div className="dashboard-content page-shell">
      <section className="stats-section stats-grid">
        <div className="stat-card glass-card">
          <label>Balance</label>
          <div className="stat-value">{formatCurrency(summary?.balance ?? 0)}</div>
        </div>
        <div className="stat-card glass-card">
          <label>Equity</label>
          <div className="stat-value">{formatCurrency(summary?.equity ?? 0)}</div>
        </div>
        <div className="stat-card glass-card">
          <label>Unrealized P/L</label>
          <div className={`stat-value ${(summary?.unrealizedPnL ?? 0) >= 0 ? 'gain' : ''}`}>
            {(summary?.unrealizedPnL ?? 0) >= 0 ? '+' : ''}
            {formatCurrency(summary?.unrealizedPnL ?? 0)}
          </div>
        </div>
        <div className="stat-card glass-card">
          <label>Margin Used</label>
          <div className="stat-value">{formatCurrency(summary?.marginUsed ?? 0)}</div>
        </div>
      </section>

      <section className="positions-section">
        <div className="positions-card glass-card">
          <div className="card-header">
            <h2>Open Positions</h2>
            <button type="button" className="view-all" onClick={() => navigate('/positions')}>
              View All →
            </button>
          </div>

          <div className="table-wrapper table-responsive">
            {positions.length === 0 ? (
              <p className="empty-state">No open positions. Start trading from Markets.</p>
            ) : (
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Volume</th>
                    <th>Open Price</th>
                    <th>Current Price</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr key={pos.id}>
                      <td className="symbol">{pos.symbol}</td>
                      <td>
                        <span className={`type-badge ${pos.type.toLowerCase()}`}>{pos.type}</span>
                      </td>
                      <td>{pos.volume}</td>
                      <td>{formatPrice(pos.openPrice, pos.symbol)}</td>
                      <td>{formatPrice(pos.currentPrice, pos.symbol)}</td>
                      <td className={`pnl ${pos.pnl >= 0 ? 'green' : 'red'}`}>
                        {pos.pnl >= 0 ? '+' : ''}
                        {formatCurrency(pos.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="profit-card glass-card">
          <h3>Profit Today</h3>
          <div className="profit-value">
            {(summary?.profitToday ?? 0) >= 0 ? '+' : ''}
            {formatCurrency(summary?.profitToday ?? 0)}
          </div>
          <div className="profit-percent">
            {(summary?.profitToday ?? 0) >= 0 ? '+' : ''}
            {profitPct}%
          </div>

          <div className="account-info">
            <h4>Account Type</h4>
            <p className="account-type">{accountType === 'LIVE' ? 'Live Account' : 'Demo Account'}</p>
            <p className="account-balance">{formatCurrency(summary?.balance ?? 0)}</p>
            {accountType === 'DEMO' && (
              <button className="upgrade-btn" onClick={() => navigate('/deposit')}>
                Fund Account
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="market-overview">
        <h2>Market Overview</h2>
        <div className="market-grid">
          {markets.slice(0, 4).map((market) => (
            <div
              key={market.id}
              className="market-card glass-card"
              onClick={() => navigate(`/trading/${market.rawSymbol}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/trading/${market.rawSymbol}`)}
            >
              <div className="market-header">
                <span className="symbol">{market.symbol}</span>
                <span className={`change ${market.change.startsWith('+') ? 'positive' : 'negative'}`}>
                  {market.change}
                </span>
              </div>
              <div className="market-price">{formatPrice(market.price, market.symbol)}</div>
              <div className="market-chart">
                <TrendChart
                  data={[{ value: market.price * 0.998 }, { value: market.price }]}
                  height={42}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="action-section content-grid-3">
        <div className="action-card glass-card">
          <h3>Deposit Funds</h3>
          <p>Balance: {formatCurrency(summary?.balance ?? 0)}</p>
          <button className="choose-method-btn" onClick={() => navigate('/deposit')}>
            Choose Method
          </button>
        </div>

        <div className="action-card glass-card">
          <h3>Withdraw Funds</h3>
          <p>Available: {formatCurrency(summary?.freeMargin ?? summary?.balance ?? 0)}</p>
          <button className="choose-method-btn" onClick={() => navigate('/withdraw')}>
            Choose Method
          </button>
        </div>

        <div className="action-card history-card glass-card">
          <h3>Recent Activity</h3>
          <div className="history-list">
            {transactions.length === 0 ? (
              <p className="empty-state">No transactions yet</p>
            ) : (
              transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="tx-item">
                  <span>{tx.title}</span>
                  <span className={tx.amount >= 0 ? 'positive' : 'negative'}>
                    {tx.amount >= 0 ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
          <button className="view-all" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['transactions'] }); navigate('/history'); }}>
            View History →
          </button>
        </div>
      </section>
    </div>
  );
}
