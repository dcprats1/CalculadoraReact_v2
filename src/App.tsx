import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import TariffCalculator from './components/TariffCalculator';
import { Loader2 } from 'lucide-react';

const ENABLE_AUTH = false;

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TariffCalculator />
    </div>
  );
}

function App() {
  if (!ENABLE_AUTH) {
    return (
      <ViewModeProvider>
        <div className="App">
          <TariffCalculator />
        </div>
      </ViewModeProvider>
    );
  }

  return (
    <AuthProvider>
      <PreferencesProvider>
        <ViewModeProvider>
          <AppContent />
        </ViewModeProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;