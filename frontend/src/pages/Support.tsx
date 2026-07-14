import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useCreateTicket, useSupportTickets } from '../hooks/useApi';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import './pages.css';

export default function Support() {
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: tickets = [], isLoading } = useSupportTickets();
  const createTicket = useCreateTicket();

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(q.toLowerCase()) ||
      t.message.toLowerCase().includes(q.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required');
      return;
    }
    setError('');
    try {
      await createTicket.mutateAsync({ subject, message });
      setSuccess('Ticket submitted successfully');
      setSubject('');
      setMessage('');
      setShowForm(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create ticket'));
    }
  };

  if (isLoading) return <PageLoader message="Loading support..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <h2>How can we help you?</h2>
          <p>Search tickets or create a new support request</p>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="support-page-grid">
          <div className="support-panel glass-card">
            <div className="search-box">
              <FiSearch />
              <input
                placeholder="Search tickets..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="support-ctas">
              <button type="button" className="cta" onClick={() => setShowForm(!showForm)}>
                Create Ticket
                <div className="cta-sub">Submit a support request</div>
              </button>
            </div>

            {showForm && (
              <form className="ticket-form" onSubmit={(e) => void handleSubmit(e)}>
                <input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Describe your issue..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                />
                <button type="submit" className="trade-btn" disabled={createTicket.isPending}>
                  {createTicket.isPending ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </form>
            )}

            <div className="tickets">
              <h4>Your Tickets</h4>
              {filtered.length === 0 ? (
                <p className="empty-state">No tickets yet</p>
              ) : (
                <div className="tickets-table">
                  <div className="thead">
                    <div>Subject</div>
                    <div>Status</div>
                    <div>Date</div>
                  </div>
                  {filtered.map((t) => (
                    <div className="tr" key={t.id}>
                      <div className="td">{t.subject}</div>
                      <div className={`td status ${t.status.replace(' ', '-')}`}>{t.status}</div>
                      <div className="td">{formatDate(t.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
