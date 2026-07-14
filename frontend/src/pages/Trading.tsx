import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useMarket, useOpenTrade } from '../hooks/useApi';
import { formatChange, formatPrice, formatSymbol } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import './pages.css';

export default function Trading() {
  const { pair = 'EURUSD' } = useParams();
  const navigate = useNavigate();
  const { market, price, ask, changePct, isLoading } = useMarket(pair);
  const openTrade = useOpenTrade();

  const [volume, setVolume] = useState('0.10');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [useSl, setUseSl] = useState(false);
  const [useTp, setUseTp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const displayPair = formatSymbol(pair);
  const vol = parseFloat(volume) || 0;
  const marginRequired = vol * price * (pair.includes('JPY') ? 1000 : pair.startsWith('XAU') ? 100 : 1000);

  const adjustVolume = (delta: number) => {
    const next = Math.max(0.01, vol + delta);
    setVolume(next.toFixed(2));
  };

  const handleTrade = async (type: 'BUY' | 'SELL') => {
    setError('');
    setSuccess('');
    try {
      await openTrade.mutateAsync({
        symbol: pair,
        type,
        volume: vol,
        stopLoss: useSl && stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: useTp && takeProfit ? parseFloat(takeProfit) : undefined,
      });
      setSuccess(`${type === 'BUY' ? 'Buy' : 'Sell'} order placed successfully`);
      setTimeout(() => navigate('/positions'), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Trade failed'));
    }
  };

  if (isLoading) return <PageLoader message="Loading market..." />;

  return (
    <div className="trading-page page-shell">
      <div className="trading-card glass-card">
        <div className="trade-header">
          <button className="back-btn" onClick={() => navigate('/markets')}>
            <FiArrowLeft size={20} />
          </button>

          <div className="trade-pair-info">
            <h2>{displayPair}</h2>
            <p>{market?.name ?? 'Market'}</p>
          </div>

          <div className="trade-price-info">
            <span className="current-price">{formatPrice(price, pair)}</span>
            <span className={`price-change ${changePct >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(changePct)}
            </span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="order-panel">
          <div className="panel-row order-type-row">
            <span className="panel-label">Market Order</span>
          </div>

          <div className="volume-section">
            <label>Volume (Lots)</label>
            <div className="volume-input-row">
              <button type="button" className="vol-btn" onClick={() => adjustVolume(-0.01)}>−</button>
              <input type="text" value={volume} onChange={(e) => setVolume(e.target.value)} />
              <button type="button" className="vol-btn" onClick={() => adjustVolume(0.01)}>+</button>
            </div>
            <div className="volume-presets">
              {['0.01', '0.10', '0.50', '1.00'].map((value) => (
                <button key={value} type="button" className="preset-btn" onClick={() => setVolume(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="margin-row">
            <span>Margin Required</span>
            <span className="margin-value">${marginRequired.toFixed(2)}</span>
          </div>

          <div className="sl-tp-row">
            <div className="sl-tp-control">
              <label>Stop Loss</label>
              <div className="sl-tp-input-row">
                <input
                  type="text"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  disabled={!useSl}
                  placeholder={formatPrice(price * 0.99, pair)}
                />
              </div>
              <label className="toggle-label">
                <input type="checkbox" checked={useSl} onChange={(e) => setUseSl(e.target.checked)} />
                <span className="toggle-switch" />
              </label>
            </div>
            <div className="sl-tp-control">
              <label>Take Profit</label>
              <div className="sl-tp-input-row">
                <input
                  type="text"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  disabled={!useTp}
                  placeholder={formatPrice(price * 1.01, pair)}
                />
              </div>
              <label className="toggle-label">
                <input type="checkbox" checked={useTp} onChange={(e) => setUseTp(e.target.checked)} />
                <span className="toggle-switch" />
              </label>
            </div>
          </div>

          <div className="action-buttons">
            <button
              type="button"
              className="btn-buy"
              disabled={openTrade.isPending}
              onClick={() => void handleTrade('BUY')}
            >
              <span>Buy</span>
              <strong>{formatPrice(ask, pair)}</strong>
            </button>
            <button
              type="button"
              className="btn-sell"
              disabled={openTrade.isPending}
              onClick={() => void handleTrade('SELL')}
            >
              <span>Sell</span>
              <strong>{formatPrice(price, pair)}</strong>
            </button>
          </div>

          <button type="button" className="footer-btn" onClick={() => navigate(`/charts?symbol=${pair}`)}>
            View Charts
          </button>
        </div>
      </div>
    </div>
  );
}
