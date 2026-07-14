import { useState } from 'react';
import { FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import PageLoader from '../../components/ui/PageLoader';
import { useAdminSupport, useDeleteSupportTicket, useUpdateTicketStatus } from '../../hooks/useApi';
import './admin.css';

const STATUS_ACTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function AdminSupportTickets() {
  const { data, isLoading } = useAdminSupport();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteSupportTicket();
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const handleStatusUpdate = (id: string, status: string) => {
    setActionMessage('');
    setActionError('');
    updateStatus.mutate({ id, status }, {
      onSuccess: () => {
        setActionMessage(`Ticket status updated to ${status}.`);
      },
      onError: () => {
        setActionError('Unable to update ticket status.');
      },
    });
  };

  const handleDeleteTicket = (id: string) => {
    setActionMessage('');
    setActionError('');
    deleteTicket.mutate(id, {
      onSuccess: () => {
        setActionMessage('Support ticket deleted successfully.');
      },
      onError: () => {
        setActionError('Unable to delete support ticket.');
      },
    });
  };

  if (isLoading) return <PageLoader message="Loading support tickets..." />;

  return (
    <div className="admin-section-card glass-card">
      {actionError && <div className="error-text">{actionError}</div>}
      {actionMessage && <div className="success-text">{actionMessage}</div>}
      <div className="admin-card-title">Support Tickets</div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((ticket: any) => (
              <tr key={ticket.id}>
                <td>{ticket.id}</td>
                <td>{ticket.user?.fullName ?? 'Unknown'}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.status}</td>
                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="admin-action-group">
                    {STATUS_ACTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="admin-action-btn"
                        disabled={updateStatus.isPending}
                        onClick={() => handleStatusUpdate(ticket.id, status)}
                      >
                        {status === 'Resolved' ? <FiCheckCircle /> : status}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="admin-action-btn delete"
                      disabled={deleteTicket.isPending}
                      onClick={() => handleDeleteTicket(ticket.id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
