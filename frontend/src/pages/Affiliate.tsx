import { useState } from 'react';
import { FiCopy } from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useAffiliateStats } from '../hooks/useApi';
import { formatCurrency } from '../utils/format';
import './pages.css';

export default function Affiliate() {
  const [copied, setCopied] = useState('');
  const { data: stats, isLoading } = useAffiliateStats();

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('failed');
    }
  };

  if (isLoading) return <PageLoader message="Loading referral stats..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <h2>Refer & Earn</h2>
          <p>Invite friends and earn {stats?.commissionRate ?? '25%'} commission</p>
        </div>

        <div className="affiliate-card glass-card">
          <div className="ref-row">
            <div className="ref-box">
              <label>Your Referral Link</label>
              <div className="ref-input">
                <input readOnly value={stats?.referralLink ?? ''} />
                <button type="button" className="copy-btn" onClick={() => void copy(stats?.referralLink ?? '', 'link')}>
                  <FiCopy />
                </button>
              </div>
              {copied === 'link' && <span className="copy-hint">Copied!</span>}
            </div>

            <div className="ref-box">
              <label>Your Referral Code</label>
              <div className="ref-input">
                <input readOnly value={stats?.referralCode ?? ''} />
                <button type="button" className="copy-btn" onClick={() => void copy(stats?.referralCode ?? '', 'code')}>
                  <FiCopy />
                </button>
              </div>
              {copied === 'code' && <span className="copy-hint">Copied!</span>}
            </div>
          </div>

          <div className="ref-stats">
            <div className="stat-box">
              <div className="stat-label">Total Referrals</div>
              <div className="stat-value">{stats?.totalReferrals ?? 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Active Referrals</div>
              <div className="stat-value">{stats?.activeReferrals ?? 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Earned</div>
              <div className="stat-value">{formatCurrency(stats?.totalEarnings ?? 0)}</div>
            </div>
          </div>

          <div className="how-works">
            {[
              { n: 1, title: 'Invite your friends', sub: 'Share your link or code' },
              { n: 2, title: 'They sign up', sub: 'Your friend creates an account' },
              { n: 3, title: 'You earn rewards', sub: 'Earn commission per referral' },
            ].map((step) => (
              <div className="step" key={step.n}>
                <div className="step-num">{step.n}</div>
                <div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-sub">{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
