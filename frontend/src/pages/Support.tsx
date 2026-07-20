import { useEffect, useMemo, useState } from 'react';
import { FiSend, FiMessageCircle, FiSearch } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useCreateTicket, useSendSupportMessage, useSupportTickets } from '../hooks/useApi';
import { formatDateTime } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import './pages.css';

export default function Support() {
  const [q, setQ] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const { data: tickets = [], isLoading } = useSupportTickets();
  const createTicket = useCreateTicket();
  const sendMessage = useSendSupportMessage();

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return tickets;
    return tickets.filter((t) => `${t.subject} ${t.lastMessage ?? ''}`.toLowerCase().includes(search));
  }, [q, tickets]);

  useEffect(() => {
    if (!activeConversationId && filtered[0]?.id) {
      setActiveConversationId(filtered[0].id);
    }
  }, [activeConversationId, filtered]);

  const activeConversation = filtered.find((ticket) => ticket.id === activeConversationId) ?? filtered[0] ?? null;

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setError('Subject and message are required');
      return;
    }
    setError('');
    try {
      const result = await createTicket.mutateAsync({ subject: newSubject.trim(), message: newMessage.trim() });
      const createdId = result?.data?.conversation?.id ?? result?.data?.ticket?.id;
      if (createdId) {
        setActiveConversationId(createdId);
      }
      setSuccess('Conversation started successfully');
      setNewSubject('');
      setNewMessage('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create conversation'));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyMessage.trim()) return;
    setError('');
    try {
      await sendMessage.mutateAsync({ id: activeConversation.id, message: replyMessage.trim() });
      setReplyMessage('');
      setIsTyping(true);
      window.setTimeout(() => setIsTyping(false), 1400);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message'));
    }
  };

  const groupedMessages = useMemo(() => {
    const messages = activeConversation?.messages ?? [];
    const grouped: Array<{ label: string; messages: typeof messages }> = [];

    messages.forEach((message) => {
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

  if (isLoading) return <PageLoader message="Loading support..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <div>
            <h2>Support chat</h2>
            <p>Talk with our team in a WhatsApp-style conversation.</p>
          </div>
          <div className="education-pill education-pill-strong">
            <FiMessageCircle /> Live support
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="support-chat-shell glass-card">
          <aside className="support-sidebar">
            <div className="support-search-box">
              <FiSearch />
              <input placeholder="Search conversations..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <form className="support-start-card" onSubmit={(e) => void handleCreateConversation(e)}>
              <input
                placeholder="Subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                required
              />
              <textarea
                placeholder="Start a new conversation..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                required
              />
              <button type="submit" className="trade-btn" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Starting...' : 'New chat'}
              </button>
            </form>

            <div className="support-thread-list">
              {filtered.length === 0 ? (
                <div className="empty-state">No conversations yet</div>
              ) : (
                filtered.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`support-thread-item ${activeConversation?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setActiveConversationId(ticket.id)}
                  >
                    <div className="support-thread-top">
                      <strong>{ticket.subject}</strong>
                      {typeof ticket.unreadCount === 'number' && ticket.unreadCount > 0 ? (
                        <span className="support-badge">{ticket.unreadCount}</span>
                      ) : null}
                    </div>
                    <p>{ticket.lastMessage || 'Start the conversation'}</p>
                    <span>{formatDateTime(ticket.updatedAt ?? ticket.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="support-chat-panel">
            {activeConversation ? (
              <>
                <div className="support-chat-header">
                  <div>
                    <h3>{activeConversation.subject}</h3>
                    <p>Usually replies within a few minutes</p>
                  </div>
                  <div className="support-chat-status">Online</div>
                </div>

                <div className="support-chat-messages">
                  {groupedMessages.map((group) => (
                    <div key={group.label} className="support-day-group">
                      <div className="support-day-divider">{group.label}</div>
                      {group.messages.map((item) => {
                        const mine = item.sender === 'user' || item.sender === 'USER';
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
                        <p>Support is typing…</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <form className="support-chat-input" onSubmit={(e) => void handleSendMessage(e)}>
                  <textarea
                    placeholder="Type your message..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={2}
                  />
                  <button type="submit" className="trade-btn" disabled={sendMessage.isPending}>
                    <FiSend />
                  </button>
                </form>
              </>
            ) : (
              <div className="empty-state large">Begin a conversation with support.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
