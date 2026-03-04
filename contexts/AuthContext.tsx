import { auth, db } from '@/components/firebaseConfig';
import { fetchUserData, saveUserPushToken } from '@/utils/functions';
import { UserData } from '@/utils/interfaces';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser?.email || 'No user');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              is_active: true,
            },
            { merge: true }
          );

          const data = await fetchUserData(firebaseUser.uid);
          setUserData(data);
          console.log('[AuthContext] User data loaded:', data?.role);

          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
              await saveUserPushToken(firebaseUser.uid, pushToken);
            }
          } catch (pushError) {
            console.error('[AuthContext] Push token registration failed:', pushError);
          }
        } catch (error) {
          console.error('[AuthContext] Failed to fetch user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('[AuthContext] User logged out');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
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
