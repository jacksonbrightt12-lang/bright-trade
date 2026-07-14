import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/ui/PageLoader';
import { useAdminStats } from '../hooks/useApi';
import { formatCurrency } from '../utils/format';
import TrendChart from '../components/ui/TrendChart';
import DonutChart from '../components/ui/DonutChart';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useAdminStats();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) return <PageLoader message="Loading admin dashboard..." />;
  if (isError || !data) {
    return <div className="page-shell"><p className="form-error">Unable to load admin stats</p></div>;
  }

  const stats = data.stats;
  const chartData = data.recentUsers.map((_u: any, i: number) => ({ value: 200 + i * 20 }));

  return (
    <div className="admin-dashboard-content">
      <section className="admin-section-overview glass-card">
        <div className="admin-card-title">Admin Dashboard</div>
        <p className="admin-section-description">
          Manage platform activity and review related data here.
        </p>
      </section>

      <section className="admin-stats-row stats-grid">
        <div className="admin-stat-card glass-card">
          <span className="admin-stat-label">Total Users</span>
          <span className="admin-stat-value">{stats.totalUsers}</span>
        </div>
        <div className="admin-stat-card glass-card">
          <span className="admin-stat-label">Active Accounts</span>
          <span className="admin-stat-value">{stats.activeAccounts ?? stats.totalUsers}</span>
        </div>
        <div className="admin-stat-card glass-card">
          <span className="admin-stat-label">Total Deposits</span>
          <span className="admin-stat-value">{formatCurrency(stats.totalDeposits)}</span>
        </div>
        <div className="admin-stat-card glass-card">
          <span className="admin-stat-label">Total Withdrawals</span>
          <span className="admin-stat-value">{formatCurrency(stats.totalWithdrawals)}</span>
        </div>
      </section>

      <section className="admin-dashboard-grid content-grid-2">
        <div className="admin-card chart-card glass-card">
          <div className="admin-card-title">User Registrations</div>
          <div className="admin-chart-wrapper">
            <TrendChart data={chartData.length ? chartData : [{ value: 0 }]} height={260} />
          </div>
          <div className="recent-users table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.isVerified ? 'Verified' : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card donut-card glass-card">
          <div className="admin-card-title">Accounts by Type</div>
          <div className="admin-donut-body">
            <div className="admin-donut-wrapper">
              <DonutChart
                values={[stats.demoAccounts ?? 40, stats.standardAccounts ?? 30, stats.ecnAccounts ?? 20, stats.vipAccounts ?? 10]}
                size={170}
              />
            </div>
            <div className="donut-legend">
              <div><span className="legend-dot green" /> Demo <strong>{stats.demoAccounts ?? 40}%</strong></div>
              <div><span className="legend-dot purple" /> Standard <strong>{stats.standardAccounts ?? 30}%</strong></div>
              <div><span className="legend-dot yellow" /> ECN <strong>{stats.ecnAccounts ?? 20}%</strong></div>
              <div><span className="legend-dot blue" /> VIP <strong>{stats.vipAccounts ?? 10}%</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
