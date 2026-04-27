import { auth } from '@/components/firebaseConfig';
import { fetchUserData, saveUserPushToken, upsertUserSessionState } from '@/utils/functions';
import type { UserData } from '@/utils/interfaces';
import { registerForPushNotificationsDetailedAsync } from '@/utils/pushNotifications';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  role: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // [REMOVED LOG]
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await upsertUserSessionState({});

          const data = await fetchUserData(firebaseUser.uid);
          setUserData(data);
          setRole(data?.role ?? null);
          // [REMOVED LOG]

          try {
            const pushResult = await registerForPushNotificationsDetailedAsync();
            if (pushResult.token) {
              await saveUserPushToken(firebaseUser.uid, pushResult.token);
            }
            await upsertUserSessionState({
              pushTokenStatus: pushResult.reason,
              pushTokenStatusDetails: pushResult.details ?? null,
              pushTokenAppOwnership: pushResult.appOwnership ?? null,
            });
            // [REMOVED LOG]
          } catch (pushError) {
            console.error('[AuthContext] Push token registration failed:', pushError);
          }
        } catch (error) {
          console.error('[AuthContext] Failed to fetch user data:', error);
          setUserData(null);
          setRole(null);
        }
      } else {
        setUserData(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // [REMOVED LOG]
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
