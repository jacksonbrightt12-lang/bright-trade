import PageLoader from '../../components/ui/PageLoader';
import { useUsers, useDeleteUser, useCreateUser } from '../../hooks/useApi';
import './admin.css';

export default function AdminUsers() {
  const { data: users, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const data = {
      fullName: String(fd.get('fullName') ?? ''),
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      role: String(fd.get('role') ?? 'USER'),
    };
    createUser.mutate(data);
    form.reset();
  };

  if (isLoading) return <PageLoader message="Loading users..." />;

  return (
    <div className="admin-section-card glass-card">
      <div className="admin-card-title">Users</div>
      <div className="admin-card-description">Manage registered users and monitor their activity.</div>
      <form className="admin-create-form" onSubmit={handleCreate} style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
        <input name="fullName" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <input name="phone" placeholder="Phone" />
        <select name="role">
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit" className="admin-action-btn">Create</button>
      </form>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.isVerified ? 'Yes' : 'No'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="admin-action-btn delete"
                    onClick={() => {
                      if (window.confirm(`Delete user ${user.fullName}? This cannot be undone.`)) {
                        deleteUser.mutate(user.id);
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
