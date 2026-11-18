import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { onAuthStateChanged, logoutUser } from '../services/authService';
import { setupPresenceSystem } from '../services/userService';
import { database } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Tự động đảm bảo tài khoản có hồ sơ trong nhánh /users của Realtime Database
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        get(userRef)
          .then(snap => {
            if (!snap.exists() || !snap.val()?.name) {
              set(userRef, {
                uid: firebaseUser.uid,
                name:
                  firebaseUser.displayName ||
                  firebaseUser.email?.split('@')[0] ||
                  'Người dùng',
                email: firebaseUser.email || '',
                avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
                isOnline: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp(),
              }).catch(setErr => {
                console.warn('Set user profile error:', setErr);
              });
            }
          })
          .catch(err => {
            console.warn('Sync user profile error:', err);
          });

        presenceCleanup = setupPresenceSystem(firebaseUser.uid);
      } else if (presenceCleanup) {
        presenceCleanup();
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (presenceCleanup) {
        presenceCleanup();
      }
    };
  }, []);

  const logout = async () => {
    await logoutUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

