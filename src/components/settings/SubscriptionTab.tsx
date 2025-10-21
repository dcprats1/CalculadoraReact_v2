import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Subscription {
  plan_name: string;
  price_eur: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

export function SubscriptionTab() {
  const { userData } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userData?.client_id) {
      loadSubscription();
    }
  }, [userData]);

  async function loadSubscription() {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_name, price_eur, status, current_period_start, current_period_end')
        .eq('client_id', userData!.client_id)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const planLabels = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual',
  };

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Activa', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
    trialing: { label: 'Periodo de prueba', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
    past_due: { label: 'Pago pendiente', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertCircle },
    canceled: { label: 'Cancelada', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No se encontró información de suscripción</p>
      </div>
    );
  }

  const status = statusLabels[subscription.status] || statusLabels.active;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información de suscripción
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${status.color}`}>
            <StatusIcon className="h-5 w-5" />
            <span className="font-medium">{status.label}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Plan contratado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {planLabels[subscription.plan_name as keyof typeof planLabels] || subscription.plan_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {subscription.price_eur}€ / mes
                </p>
              </div>
            </div>

            {subscription.current_period_end && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Próxima renovación</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(subscription.current_period_end).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Gestión de facturación:</strong> Para modificar tu plan, actualizar métodos de pago o consultar facturas, contacta con el departamento comercial.
        </p>
      </div>
    </div>
  );
}
