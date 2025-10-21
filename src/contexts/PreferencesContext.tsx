import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface UserPreferences {
  id: string;
  user_id: string;
  uses_custom_cost_table: boolean;
  fixed_spc: number | null;
  fixed_linear_discount: number | null;
  default_service_packages: any[];
  ui_theme: 'light' | 'dark';
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
    } else {
      setPreferences(null);
    }
  }, [isAuthenticated, user]);

  async function loadPreferences() {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data);
      } else {
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            uses_custom_cost_table: false,
            fixed_spc: null,
            fixed_linear_discount: null,
            default_service_packages: [],
            ui_theme: 'light',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updatePreferences(updates: Partial<UserPreferences>): Promise<boolean> {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPreferences(data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  async function refreshPreferences() {
    await loadPreferences();
  }

  const value = {
    preferences,
    isLoading,
    updatePreferences,
    refreshPreferences,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
