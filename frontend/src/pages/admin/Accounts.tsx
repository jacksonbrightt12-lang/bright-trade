import PageLoader from '../../components/ui/PageLoader';
import { useAdminAccounts, useDeleteAccount, useCreateAccount } from '../../hooks/useApi';
import './admin.css';

export default function AdminAccounts() {
  const { data: accounts, isLoading } = useAdminAccounts();
  const deleteAccount = useDeleteAccount();
  const createAccount = useCreateAccount();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const data = {
      userId: String(fd.get('userId') ?? ''),
      type: String(fd.get('type') ?? 'DEMO'),
      balance: Number(fd.get('balance') ?? 0),
      currency: String(fd.get('currency') ?? 'USD'),
    };
    createAccount.mutate(data);
    form.reset();
  };

  if (isLoading) return <PageLoader message="Loading accounts..." />;

  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Accounts</div>
      <div className="table-responsive">
        <form onSubmit={handleCreate} style={{ margin: '12px 0 8px', display: 'flex', gap: 8 }}>
          <input name="userId" placeholder="User ID" required />
          <select name="type">
            <option value="DEMO">DEMO</option>
            <option value="LIVE">LIVE</option>
          </select>
          <input name="balance" type="number" step="0.01" placeholder="Balance" />
          <input name="currency" placeholder="Currency" defaultValue="USD" />
          <button type="submit" className="admin-action-btn">Create</button>
        </form>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Currency</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((account: any) => (
              <tr key={account.id}>
                <td>{account.id}</td>
                <td>{account.user.fullName}</td>
                <td>{account.type}</td>
                <td>${account.balance.toFixed(2)}</td>
                <td>{account.currency}</td>
                <td>
                  <button
                    className="admin-action-btn delete"
                    onClick={() => {
                      if (window.confirm(`Delete account ${account.id}? This will remove its balance.`)) {
                        deleteAccount.mutate(account.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
