import PageLoader from '../../components/ui/PageLoader';
import { useAdminTrades } from '../../hooks/useApi';
import './admin.css';

export default function AdminTrades() {
  const { data, isLoading } = useAdminTrades();

  if (isLoading) return <PageLoader message="Loading trades..." />;

  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Trades</div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Position ID</th>
              <th>User</th>
              <th>Symbol</th>
              <th>Type</th>
              <th>Volume</th>
              <th>Open Price</th>
              <th>P/L</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((pos: any) => (
              <tr key={pos.id}>
                <td>{pos.id}</td>
                <td>{pos.user?.fullName ?? 'Unknown'}</td>
                <td>{pos.symbol}</td>
                <td>{pos.type}</td>
                <td>{pos.volume}</td>
                <td>${pos.openPrice.toFixed(2)}</td>
                <td>${pos.pnl.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
