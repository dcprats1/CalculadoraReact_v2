import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { LoginContainer } from './components/auth/LoginContainer';
import { Header } from './components/Header';
import TariffCalculator from './components/TariffCalculator';
import { AdminPanel } from './components/admin/AdminPanel';
import { PricingPage } from './components/pricing/PricingPage';
import { canAccessCalculator } from './utils/subscriptionHelpers';
import { Loader2, Settings } from 'lucide-react';

const ENABLE_AUTH = true;

function AppContent() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
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

  const isAdmin = userData?.is_admin || false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {isAdmin && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              {showAdmin ? 'Ocultar Panel Admin' : 'Mostrar Panel Admin'}
            </button>
          </div>
        </div>
      )}

      {isAdmin && showAdmin && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AdminPanel />
        </div>
      )}

      <TariffCalculator />
    </div>
  );
}

function App() {
  if (!ENABLE_AUTH) {
    return (
      <div className="App">
        <TariffCalculator />
      </div>
    );
  }

  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppContent />
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;