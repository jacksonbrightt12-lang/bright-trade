import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AccountType = 'DEMO' | 'LIVE';

interface AccountContextValue {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountTypeState] = useState<AccountType>(() => {
    const stored = localStorage.getItem('bt_account_type');
    return stored === 'LIVE' ? 'LIVE' : 'DEMO';
  });

  const setAccountType = useCallback((type: AccountType) => {
    localStorage.setItem('bt_account_type', type);
    setAccountTypeState(type);
  }, []);

  const value = useMemo(
    () => ({ accountType, setAccountType }),
    [accountType, setAccountType]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
