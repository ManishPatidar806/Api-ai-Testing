import { createContext, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const storedUser = localStorage.getItem('authUser');
  const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null);

  const [loading, setLoading] = useState(false);

  const saveSession = (googleToken, profile) => {
    localStorage.setItem('authToken', googleToken);
    localStorage.setItem('authUser', JSON.stringify(profile));
    setUser(profile);
    return profile;
  };

  const signInWithGoogle = async (googleToken) => {
    setLoading(true);
    try {
      if (!googleToken) {
        throw new Error('Google token not found');
      }

      const authResponse = await authService.googleLogin(googleToken);
      if (!authResponse.authenticated) {
        throw new Error('Authentication failed');
      }

      const profile = {
        id: authResponse.userId,
        email: authResponse.email,
        name: authResponse.name,
        role: authResponse.role,
        provider: authResponse.authProvider,
      };

      return saveSession(googleToken, profile);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
