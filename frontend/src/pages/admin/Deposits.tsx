import PageLoader from '../../components/ui/PageLoader';
import { useAdminTransactions } from '../../hooks/useApi';
import './admin.css';

export default function AdminDeposits() {
  const { data, isLoading } = useAdminTransactions('deposit');

  if (isLoading) return <PageLoader message="Loading deposits..." />;

  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Deposits</div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((tx: any) => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.user?.fullName ?? 'Unknown'}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>{tx.method ?? '-'}</td>
                <td>{tx.status}</td>
                <td>{new Date(tx.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
