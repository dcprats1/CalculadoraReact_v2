import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { LoginContainer } from './components/auth/LoginContainer';
import TariffCalculator from './components/TariffCalculator';
import { PricingPage } from './components/pricing/PricingPage';
import { PaymentSuccess } from './components/PaymentSuccess';
import { PDFUploadGate } from './components/PDFUploadGate';
import { canAccessCalculator } from './utils/subscriptionHelpers';
import { useRequireActivation } from './hooks/useRequireActivation';
import { Loader2 } from 'lucide-react';

const ENABLE_AUTH = true;
const ENABLE_TARIFF_VALIDATION = true;

function MainContent() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const { isActivated, isLoading: isLoadingActivation } = useRequireActivation();
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

  if (isLoading || (ENABLE_TARIFF_VALIDATION && isLoadingActivation)) {
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
      return <PricingPage onBack={handleBackToLogin} userEmail={unregisteredEmail} />;
    }
    return <LoginContainer onShowPricing={handleShowPricing} />;
  }

  if (isAuthenticated && !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!canAccessCalculator(userData)) {
    return <PricingPage userEmail={userData?.email} />;
  }

  if (ENABLE_TARIFF_VALIDATION && !isActivated) {
    return <PDFUploadGate />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TariffCalculator />
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<MainContent />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/pricing" element={<PricingPage />} />
    </Routes>
  );
}

function App() {
  if (!ENABLE_AUTH) {
    return (
      <BrowserRouter
        basename="/area-privada2/calculadora"
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ViewModeProvider>
          <div className="App">
            <TariffCalculator />
          </div>
        </ViewModeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter
      basename="/area-privada2/calculadora"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <PreferencesProvider>
          <ViewModeProvider>
            <AppContent />
          </ViewModeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;