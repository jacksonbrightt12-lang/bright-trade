import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import {
  useCancelOrder,
  useClosePosition,
  useOrders,
  usePositions,
} from '../hooks/useApi';
import { formatCurrency, formatDateTime, formatPrice } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import type { Position } from '../api/types';
import './pages.css';

export default function Positions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'open' | 'pending'>('open');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [error, setError] = useState('');

  const { data: positions = [], isLoading: loadingPositions } = usePositions('OPEN');
  const { data: orders = [], isLoading: loadingOrders } = useOrders();
  const closePosition = useClosePosition();
  const cancelOrder = useCancelOrder();

  const handleClose = async () => {
    if (!selectedPosition) return;
    setError('');
    try {
      await closePosition.mutateAsync(selectedPosition.id);
      setSelectedPosition(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to close position'));
    }
  };

  const handleCancel = async (id: string) => {
    setError('');
    try {
      await cancelOrder.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel order'));
    }
  };

  if (loadingPositions || loadingOrders) {
    return <PageLoader message="Loading positions..." />;
  }

  return (
    <div className="page-container positions-container page-shell">
      <div className="positions-content">
        <div className="content-header">
          <h2>Positions Management</h2>
          <p>Manage your open positions and pending orders</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="positions-tabs">
          <button
            className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
            onClick={() => setActiveTab('open')}
          >
            Open Positions ({positions.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Orders ({orders.length})
          </button>
        </div>

        {activeTab === 'open' && (
          <div className="positions-list">
            {positions.length === 0 ? (
              <p className="empty-state">No open positions. Go to Markets to start trading.</p>
            ) : (
              positions.map((pos) => (
                <div key={pos.id} className="position-card glass-card">
                  <div className="position-header">
                    <div className="position-symbol">
                      <h4>{pos.symbol}</h4>
                      <p>{formatDateTime(pos.openTime)}</p>
                    </div>
                    <div className={`position-type ${pos.type.toLowerCase()}`}>{pos.type}</div>
                  </div>

                  <div className="position-details">
                    <div className="detail-row">
                      <span className="label">Volume</span>
                      <span className="value">{pos.volume} lots</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Entry Price</span>
                      <span className="value">{formatPrice(pos.openPrice, pos.symbol)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Current Price</span>
                      <span className="value">{formatPrice(pos.currentPrice, pos.symbol)}</span>
                    </div>
                    <div className="detail-row highlight">
                      <span className="label">P&L</span>
                      <span className={`value ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                        {pos.pnl >= 0 ? '+' : ''}
                        {formatCurrency(pos.pnl)}
                      </span>
                    </div>
                  </div>

                  <div className="position-actions">
                    <button
                      type="button"
                      className="action-btn close-btn"
                      onClick={() => setSelectedPosition(pos)}
                    >
                      Close Position
                    </button>
                    <button
                      type="button"
                      className="action-btn modify-btn"
                      onClick={() => navigate(`/trading/${pos.rawSymbol ?? pos.symbol.replace('/', '')}`)}
                    >
                      Trade More
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="positions-list">
            {orders.length === 0 ? (
              <p className="empty-state">No pending orders</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="position-card pending glass-card">
                  <div className="position-header">
                    <div className="position-symbol">
                      <h4>{order.symbol}</h4>
                      <p>{formatDateTime(order.createdTime)}</p>
                    </div>
                    <div className={`position-type ${order.type.toLowerCase()}`}>{order.type}</div>
                  </div>

                  <div className="position-details">
                    <div className="detail-row">
                      <span className="label">Volume</span>
                      <span className="value">{order.volume} lots</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Order Price</span>
                      <span className="value">{formatPrice(order.price, order.symbol)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status</span>
                      <span className="value status-pending">{order.status}</span>
                    </div>
                  </div>

                  <div className="position-actions">
                    <button
                      type="button"
                      className="action-btn cancel-btn"
                      onClick={() => void handleCancel(order.id)}
                      disabled={cancelOrder.isPending}
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedPosition && (
        <div className="modal-overlay" onClick={() => setSelectedPosition(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Close Position</h3>
              <button type="button" onClick={() => setSelectedPosition(null)}>
                <FiX size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to close this position?</p>
              <div className="position-summary">
                <div className="summary-row">
                  <span>{selectedPosition.symbol}</span>
                  <span>{selectedPosition.volume} lots</span>
                </div>
                <div className="summary-row profit">
                  <span>Expected P&L</span>
                  <span className={selectedPosition.pnl >= 0 ? 'positive' : 'negative'}>
                    {selectedPosition.pnl >= 0 ? '+' : ''}
                    {formatCurrency(selectedPosition.pnl)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setSelectedPosition(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void handleClose()}
                disabled={closePosition.isPending}
              >
                {closePosition.isPending ? 'Closing...' : 'Close Position'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
