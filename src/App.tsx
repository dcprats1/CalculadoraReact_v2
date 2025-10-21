import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { LoginContainer } from './components/auth/LoginContainer';
import TariffCalculator from './components/TariffCalculator';
import { PricingPage } from './components/pricing/PricingPage';
import { canAccessCalculator } from './utils/subscriptionHelpers';
import { Loader2 } from 'lucide-react';

const ENABLE_AUTH = true;

function AppContent() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const [showPricingForUnregistered, setShowPricingForUnregistered] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string>('');

  const handleShowPricing = (email: string) => {
    setUnregisteredEmail(email);
    setShowPricingForUnregistered(true);
  };

  const handleBackToLogin = () => {
    setShowPricingForUnregistered(false);
    setUnregisteredEmail('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showPricingForUnregistered) {
      return <PricingPage onBack={handleBackToLogin} />;
    }
    return <LoginContainer onShowPricing={handleShowPricing} />;
  }

  if (!canAccessCalculator(userData)) {
    return <PricingPage />;
  }

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