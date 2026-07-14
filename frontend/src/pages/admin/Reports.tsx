import './admin.css';

export default function AdminReports() {
  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Reports</div>
      <div className="admin-card-description">View aggregated platform reports and analytics.</div>
      <div className="admin-empty-state">Reports will be available once tracking data is enabled.</div>
    </div>
  );
}
