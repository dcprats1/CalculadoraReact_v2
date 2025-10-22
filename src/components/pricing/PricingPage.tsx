import React, { useState } from 'react';
import { Calculator, ArrowLeft, Shield } from 'lucide-react';
import { pricingPlans } from '../../data/plans.data';
import { PricingToggle } from './PricingToggle';
import { PlanCard } from './PlanCard';
import { useAuth } from '../../contexts/AuthContext';

interface PricingPageProps {
  onBack?: () => void;
  userEmail?: string;
}

export function PricingPage({ onBack, userEmail }: PricingPageProps) {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveEmail = userEmail || user?.email;

  const handleSelectPlan = async (tier: number, paymentType: 'monthly' | 'annual') => {
    if (!effectiveEmail) {
      alert('Email requerido. Por favor, inicia sesión o introduce tu email.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            tier,
            paymentType,
            userId: user?.id,
            email: effectiveEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear sesión de pago');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Error al procesar el pago. Por favor, inténtalo de nuevo.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </button>
        )}

        {userEmail && !user && (
          <div className="max-w-3xl mx-auto mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 text-center">
              <span className="font-semibold">Comprando como:</span> {userEmail}
              <br />
              <span className="text-blue-700 text-xs">
                Recibirás un código de acceso por email tras completar el pago
              </span>
            </p>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6 shadow-lg">
            <Calculator className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Elige tu plan ideal</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-2">
            Pago flexible: mensual o anual con hasta 2 meses gratis
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Herramienta especializada para empresarios GLS con ROI en días
          </p>
        </div>

        <PricingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {pricingPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              onSelect={handleSelectPlan}
              isLoading={isLoading}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ¿Por qué elegir nuestra calculadora?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Precisión Total</h3>
              <p className="text-sm text-gray-600">
                Cálculos exactos incluyendo costes ocultos e incrementos que otras herramientas
                ignoran
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ahorro Inmediato</h3>
              <p className="text-sm text-gray-600">
                Recupera tu inversión en días con un solo uso diario en mostrador
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
                <Calculator className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Comparativa Competitiva</h3>
              <p className="text-sm text-gray-600">
                Genera propuestas profesionales y comparativas con la competencia en minutos
              </p>
            </div>
          </div>
        </div>

        {isAnnual && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-6 mb-8">
            <p className="text-center text-gray-800">
              <span className="font-bold text-green-700">Plan Corporativo:</span> Hasta 58% más
              barato por dispositivo que planes individuales
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Precios sin IVA.</span> Pago seguro procesado por
            Stripe. Cancela en cualquier momento.
          </p>
          <p className="text-sm text-blue-800 mt-2 font-medium">
            Solo usuarios @gls-spain.es • Soporte técnico incluido • Actualizaciones automáticas
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Lógica Logística. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
