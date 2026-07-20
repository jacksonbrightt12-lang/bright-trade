import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiSend, FiTrash2 } from 'react-icons/fi';
import PageLoader from '../../components/ui/PageLoader';
import { useAdminSendSupportMessage, useAdminSupport, useDeleteSupportTicket, useUpdateTicketStatus } from '../../hooks/useApi';
import { formatDateTime } from '../../utils/format';
import './admin.css';

const STATUS_ACTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function AdminSupportTickets() {
  const { data, isLoading } = useAdminSupport();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteSupportTicket();
  const adminSendMessage = useAdminSendSupportMessage();
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const conversations = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (!activeConversationId && conversations[0]?.id) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  const activeConversation = conversations.find((ticket: any) => ticket.id === activeConversationId) ?? conversations[0] ?? null;

  const groupedMessages = useMemo(() => {
    const messages = activeConversation?.messages ?? [];
    const grouped: Array<{ label: string; messages: typeof messages }> = [];

    messages.forEach((message: any) => {
      const dayLabel = new Date(message.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const lastGroup = grouped[grouped.length - 1];
      if (!lastGroup || lastGroup.label !== dayLabel) {
        grouped.push({ label: dayLabel, messages: [message] });
      } else {
        lastGroup.messages.push(message);
      }
    });

    return grouped;
  }, [activeConversation]);

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !reply.trim()) return;
    setActionError('');
    try {
      await adminSendMessage.mutateAsync({ id: activeConversation.id, message: reply.trim() });
      setReply('');
      setIsTyping(true);
      window.setTimeout(() => setIsTyping(false), 1400);
      setActionMessage('Reply sent successfully.');
    } catch {
      setActionError('Unable to send reply.');
    }
  };

  if (isLoading) return <PageLoader message="Loading support tickets..." />;

  return (
    <div className="admin-section-card glass-card admin-support-shell">
      {actionError && <div className="error-text">{actionError}</div>}
      {actionMessage && <div className="success-text">{actionMessage}</div>}
      <div className="admin-card-title">Support Conversations</div>

      <div className="admin-support-layout">
        <aside className="admin-support-list">
          {conversations.map((ticket: any) => (
            <button
              key={ticket.id}
              type="button"
              className={`admin-support-thread ${activeConversation?.id === ticket.id ? 'active' : ''}`}
              onClick={() => setActiveConversationId(ticket.id)}
            >
              <div className="admin-support-thread-top">
                <div className="admin-support-user">
                  <div className="admin-support-avatar">{(ticket.user?.fullName ?? 'Unknown user').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{ticket.user?.fullName ?? 'Unknown user'}</strong>
                    <span className="admin-support-status">Online</span>
                  </div>
                </div>
                {ticket.unreadCount > 0 ? <span className="support-badge">{ticket.unreadCount}</span> : null}
              </div>
              <p>{ticket.subject}</p>
              <span>{ticket.lastMessage || 'No messages yet'}</span>
            </button>
          ))}
        </aside>

        <section className="admin-support-chat">
          {activeConversation ? (
            <>
              <div className="admin-support-chat-header">
                <div className="admin-support-user">
                  <div className="admin-support-avatar large">{(activeConversation.user?.fullName ?? 'User').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h3>{activeConversation.subject}</h3>
                    <p>{activeConversation.user?.fullName ?? 'User'} • Online</p>
                  </div>
                </div>
                <div className="admin-support-actions">
                  {STATUS_ACTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="admin-action-btn"
                      disabled={updateStatus.isPending}
                      onClick={() => handleStatusUpdate(activeConversation.id, status)}
                    >
                      {status === 'Resolved' ? <FiCheckCircle /> : status}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="admin-action-btn delete"
                    disabled={deleteTicket.isPending}
                    onClick={() => handleDeleteTicket(activeConversation.id)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>

              <div className="support-chat-messages">
                {groupedMessages.map((group) => (
                  <div key={group.label} className="support-day-group">
                    <div className="support-day-divider">{group.label}</div>
                    {group.messages.map((item: any) => {
                      const mine = item.sender === 'admin';
                      return (
                        <div key={item.id} className={`support-message-row ${mine ? 'mine' : 'their'}`}>
                          <div className={`support-bubble ${mine ? 'mine' : 'their'}`}>
                            <p>{item.content}</p>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {isTyping ? (
                  <div className="support-message-row their">
                    <div className="support-bubble their support-typing">
                      <p>User is typing…</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <form className="support-chat-input" onSubmit={(e) => void handleSendReply(e)}>
                <textarea
                  placeholder="Reply to the user..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                />
                <button type="submit" className="trade-btn" disabled={adminSendMessage.isPending}>
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state large">Select a conversation to reply.</div>
          )}
        </section>
      </div>
    </div>
  );
}
