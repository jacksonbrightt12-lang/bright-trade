import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import {
  MdDashboard,
  MdShowChart,
  MdTrendingUp,
  MdAssignment,
  MdHistory,
  MdDownload,
  MdUpload,
  MdSchool,
  MdHeadsetMic,
  MdShare,
  MdSettings as MdSettingsIcon,
} from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import './layout.css';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, route: '/dashboard' },
  { id: 'markets', label: 'Markets', icon: MdShowChart, route: '/markets' },
  { id: 'trade', label: 'Trade', icon: MdTrendingUp, route: '/trade' },
  { id: 'positions', label: 'Positions', icon: MdAssignment, route: '/positions' },
  { id: 'history', label: 'History', icon: MdHistory, route: '/history' },
  { id: 'deposit', label: 'Deposit', icon: MdDownload, route: '/deposit' },
  { id: 'withdraw', label: 'Withdraw', icon: MdUpload, route: '/withdraw' },
  { id: 'education', label: 'Education', icon: MdSchool, route: '/education' },
  { id: 'affiliate', label: 'Refer & Earn', icon: MdShare, route: '/affiliate' },
  { id: 'support', label: 'Support', icon: MdHeadsetMic, route: '/support' },
  { id: 'settings', label: 'Settings', icon: MdSettingsIcon, route: '/dashboard' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { accountType, setAccountType } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeId =
    sidebarItems.find((item) => location.pathname.startsWith(item.route))?.id ?? 'dashboard';

  const handleNav = (route: string) => {
    navigate(route);
    if (window.innerWidth <= 1024) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="app-layout">
      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${sidebarOpen ? 'expanded' : 'collapsed'} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">📊</div>
          {(sidebarOpen || mobileMenuOpen) && (
            <div>
              <span className="brand-name">BrightTrade</span>
              <p className="brand-tagline">Trade. Learn. Grow.</p>
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`menu-item ${activeId === item.id ? 'active' : ''}`}
                onClick={() => handleNav(item.route)}
                title={item.label}
              >
                <Icon size={20} />
                {(sidebarOpen || mobileMenuOpen) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <button className="menu-item logout" onClick={() => { logout(); navigate('/login'); }}>
          <FiLogOut size={20} />
          {(sidebarOpen || mobileMenuOpen) && <span>Log Out</span>}
        </button>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-left">
            <button
              className="icon-btn"
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              aria-label="Toggle sidebar"
            >
              {mobileMenuOpen || sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
            <div className="header-greeting">
              <h1>Hello, {user?.fullName?.split(' ')[0] ?? 'Trader'} 👋</h1>
              <p>Welcome back! Ready to trade?</p>
            </div>
          </div>
          <div className="header-right">
            <select
              className="account-select"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as 'DEMO' | 'LIVE')}
            >
              <option value="DEMO">Demo Account</option>
              <option value="LIVE">Live Account</option>
            </select>
            <button className="icon-btn" aria-label="Notifications">
              <FiBell size={20} />
            </button>
            <div className="avatar">{user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}</div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
