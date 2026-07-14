import PageLoader from '../../components/ui/PageLoader';
import { useAdminTransactions } from '../../hooks/useApi';
import './admin.css';

export default function AdminTransactions() {
  const { data, isLoading } = useAdminTransactions('all');

  if (isLoading) return <PageLoader message="Loading transactions..." />;

  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Transactions</div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((tx: any) => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.user?.fullName ?? 'Unknown'}</td>
                <td>{tx.type}</td>
                <td>{tx.title}</td>
                <td>${tx.amount.toFixed(2)}</td>
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
