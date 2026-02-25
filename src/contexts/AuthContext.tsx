import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAllowedEmail, INVALID_EMAIL_ERROR } from '../config/allowedEmails';
import { fetchUserProfile } from '../lib/authenticatedFetch';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled';
  subscription_tier: number;
  max_devices: number;
  subscription_end_date: string;
  subscription_interval: 'monthly' | 'annual' | 'trial';
  payment_method: 'stripe' | 'manual' | 'promo' | 'trial';
  is_admin: boolean;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  userData: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sendLoginCode: (email: string) => Promise<{ success: boolean; error?: string; errorCode?: string; email?: string; autoLogin?: boolean }>;
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  sessionExpiredMessage: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initializeAuth() {
      try {
        const sessionData = localStorage.getItem('user_session');
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);

            if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
              localStorage.removeItem('user_session');
              setSessionExpiredMessage('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
              return;
            }

            setUser({ id: parsed.id, email: parsed.email });
            await loadUserProfile(parsed.id);
          } catch (error) {
            localStorage.removeItem('user_session');
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;

    if (user) {
      intervalId = window.setInterval(() => {
        const sessionData = localStorage.getItem('user_session');
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
              localStorage.removeItem('user_session');
              setUser(null);
              setUserData(null);
              setSessionExpiredMessage('Tu sesión ha expirado después de 24 horas. Por favor, inicia sesión nuevamente.');
            }
          } catch (error) {
            console.error('Error checking session expiry:', error);
          }
        }
      }, 60000);
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  async function loadUserProfile(userId: string) {
    try {
      const data = await fetchUserProfile(userId);

      if (data) {
        const fullName = data.email.split('@')[0]
          .split('.')
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

        setUserData({
          id: data.id,
          email: data.email,
          full_name: fullName,
          subscription_status: data.subscription_status,
          subscription_tier: data.subscription_tier,
          max_devices: data.max_devices,
          subscription_end_date: data.subscription_end_date,
          subscription_interval: data.subscription_interval || 'monthly',
          payment_method: data.payment_method,
          is_admin: data.email === 'dcprats@gmail.com',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

 async function sendLoginCode(email: string) {
  try {
    if (!isAllowedEmail(email)) {
      return { success: false, error: INVALID_EMAIL_ERROR };
    }

    // PASO 1: Verificar si hay sesión activa antes de enviar OTP
    const deviceFingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}`;

    const sessionCheckResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-active-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          deviceFingerprint
        }),
      }
    );

    const sessionData = await sessionCheckResponse.json();

    // Si tiene sesión activa, hacer AUTO-LOGIN
    if (sessionData.hasActiveSession) {
      const sessionInfo = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        sessionToken: sessionData.sessionToken,
        expiresAt: sessionData.user.expiresAt,
      };

      localStorage.setItem('user_session', JSON.stringify(sessionInfo));
      setUser({ id: sessionData.user.id, email: sessionData.user.email });
      await loadUserProfile(sessionData.user.id);

      return { success: true, autoLogin: true };
    }

    // PASO 2: NO hay sesión activa, enviar código OTP normal
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-login-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al enviar código',
        errorCode: data.errorCode,
        email: data.email
      };
    }

    // En desarrollo, mostrar código en consola
    if (data.code) {
      console.log(`Código de inicio de sesión para ${email}: ${data.code}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending code:', error);
    return { success: false, error: 'Error de conexión' };
  }
}


 async function verifyCode(email: string, code: string) {
  try {
    // Generar device fingerprint simple
    const deviceFingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}`;
    const deviceName = `${navigator.platform} - ${navigator.userAgent.substring(0, 50)}`;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-login-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code,
          deviceFingerprint,
          deviceName,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Código incorrecto' };
    }

    const sessionData = {
      id: data.user.id,
      email: data.user.email,
      sessionToken: data.sessionToken,
      expiresAt: data.user.expiresAt,
    };

    localStorage.setItem('user_session', JSON.stringify(sessionData));
    setUser({ id: data.user.id, email: data.user.email });
    setSessionExpiredMessage(null);

    // Cargar perfil completo
    await loadUserProfile(data.user.id);

    return { success: true };
  } catch (error) {
    console.error('Error verifying code:', error);
    return { success: false, error: 'Error de conexión' };
  }
}


  async function signOut() {
    localStorage.removeItem('user_session');
    setUser(null);
    setUserData(null);
    setSessionExpiredMessage(null);
  }

  const value = {
    user,
    userData,
    isAuthenticated: !!user,
    isLoading,
    sendLoginCode,
    verifyCode,
    signOut,
    sessionExpiredMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
