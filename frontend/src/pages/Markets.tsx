import { useMemo, useState } from 'react';
import { FiSearch, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../components/ui/PageLoader';
import { useMarkets } from '../hooks/useApi';
import { formatPrice } from '../utils/format';
import './pages.css';

export default function Markets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const { markets, isLoading, connected } = useMarkets();

  const filteredMarkets = useMemo(
    () =>
      markets
        .filter((market) => activeTab === 'all' || activeTab === 'favorites' || market.type === activeTab)
        .filter(
          (market) =>
            market.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            market.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [markets, activeTab, searchTerm]
  );

  if (isLoading) return <PageLoader message="Loading markets..." />;

  return (
    <div className="market-watch-page page-shell">
      <div className="market-watch-card glass-card">
        <div className="market-watch-header">
          <div>
            <h2>Markets</h2>
            <p>
              Track forex, commodities, and indices
              <span className={`live-dot ${connected ? 'online' : ''}`}>
                {connected ? ' · Live' : ' · Connecting...'}
              </span>
            </p>
          </div>
        </div>

        <div className="market-watch-tabs">
          {['all', 'forex', 'commodities', 'indices'].map((tab) => (
            <button
              key={tab}
              className={`market-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-box">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="market-watch-list">
          {filteredMarkets.length === 0 ? (
            <p className="empty-state">No markets found</p>
          ) : (
            filteredMarkets.map((market) => (
              <button
                key={market.id}
                className="market-row"
                onClick={() => navigate(`/trading/${market.rawSymbol}`)}
              >
                <div className="market-row-left">
                  <div className={`symbol-badge ${market.type}`} />
                  <div className="symbol-text">
                    <span className="market-symbol">{market.symbol}</span>
                    <span className="market-name">{market.name}</span>
                  </div>
                </div>
                <div className="market-row-right">
                  <span className="market-price">{formatPrice(market.price, market.symbol)}</span>
                  <span className={`market-change ${market.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {market.change.startsWith('+') ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                    {market.change}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
