import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PageLoader from './components/ui/PageLoader';
import './App.css';
import './styles/responsive.css';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Markets = lazy(() => import('./pages/Markets'));
const Trading = lazy(() => import('./pages/Trading'));
const Charts = lazy(() => import('./pages/Charts'));
const Positions = lazy(() => import('./pages/Positions'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Withdraw = lazy(() => import('./pages/Withdraw'));
const History = lazy(() => import('./pages/History'));
const Education = lazy(() => import('./pages/Education'));
const Support = lazy(() => import('./pages/Support'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAccounts = lazy(() => import('./pages/admin/Accounts'));
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'));
const AdminDeposits = lazy(() => import('./pages/admin/Deposits'));
const AdminWithdrawals = lazy(() => import('./pages/admin/Withdrawals'));
const AdminTrades = lazy(() => import('./pages/admin/Trades'));
const AdminSupportTickets = lazy(() => import('./pages/admin/SupportTickets'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/trading/:pair" element={<Trading />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/positions" element={<Positions />} />
                <Route path="/history" element={<History />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/education" element={<Education />} />
                <Route path="/support" element={<Support />} />
                <Route path="/affiliate" element={<Affiliate />} />
              </Route>

              <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="accounts" element={<AdminAccounts />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="deposits" element={<AdminDeposits />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="trades" element={<AdminTrades />} />
                <Route path="support" element={<AdminSupportTickets />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="/trade" element={<Navigate to="/trading/EURUSD" replace />} />
              <Route path="/orders" element={<Navigate to="/positions" replace />} />
              <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
              <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </AccountProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
