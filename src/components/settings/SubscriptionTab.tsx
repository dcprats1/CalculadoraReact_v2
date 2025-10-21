import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Loader2, Smartphone, Shield, Users, Eye } from 'lucide-react';
import { getPlanByTier, TIER_TO_DEVICES } from '../../data/plans.data';
import { PlanViewModal } from '../pricing/PlanViewModal';

interface ActiveSession {
  id: string;
  device_info: string | null;
  last_activity: string;
}

export function SubscriptionTab() {
  const { userData } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (userData?.id) {
      loadActiveSessions();
    }
  }, [userData]);

  async function loadActiveSessions() {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, device_info, last_activity')
        .eq('user_id', userData!.id)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Activa', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
    trial: { label: 'Periodo de prueba', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
    past_due: { label: 'Pago pendiente', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertCircle },
    cancelled: { label: 'Cancelada', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
  };

  const paymentMethodLabels: Record<string, string> = {
    stripe: 'Pago con tarjeta',
    manual: 'Transferencia bancaria',
    promo: 'Código promocional',
    trial: 'Periodo de prueba gratuito',
    admin_grant: 'Acceso administrativo',
  };

  const plan = getPlanByTier(userData.subscription_tier);
  const isAdmin = userData.is_admin || userData.email === 'dcprats@gmail.com';
  const status = statusLabels[userData.subscription_status] || statusLabels.active;
  const StatusIcon = status.icon;

  const subscriptionEndDate = userData.subscription_end_date
    ? new Date(userData.subscription_end_date)
    : null;
  const daysUntilExpiration = subscriptionEndDate
    ? Math.ceil((subscriptionEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const deviceUsagePercentage = userData.max_devices > 0
    ? (activeSessions.length / userData.max_devices) * 100
    : 0;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-bold">Cuenta Administrador</h3>
              <p className="text-blue-100 text-sm">Acceso completo al sistema</p>
            </div>
          </div>
        </div>
      )}

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
                  {isAdmin ? 'Plan Administrador' : (plan?.name || `Tier ${userData.subscription_tier}`)}
                </p>
                {plan && !isAdmin && (
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.monthlyPrice}€/mes · {plan.annualPrice}€/año
                  </p>
                )}
                {isAdmin && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    Sin coste · Acceso permanente
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Dispositivos</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userData.max_devices} {userData.max_devices === 1 ? 'dispositivo' : 'dispositivos'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Tier {userData.subscription_tier}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Método de pago</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {paymentMethodLabels[userData.payment_method] || userData.payment_method}
                </p>
              </div>
            </div>

            {subscriptionEndDate && !isAdmin && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">
                    {daysUntilExpiration && daysUntilExpiration > 0 ? 'Próxima renovación' : 'Fecha de expiración'}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscriptionEndDate.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {daysUntilExpiration !== null && daysUntilExpiration > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {daysUntilExpiration} {daysUntilExpiration === 1 ? 'día' : 'días'} restantes
                    </p>
                  )}
                  {daysUntilExpiration !== null && daysUntilExpiration <= 0 && (
                    <p className="text-sm text-red-600 mt-1 font-medium">
                      Suscripción expirada
                    </p>
                  )}
                  {daysUntilExpiration !== null && daysUntilExpiration > 0 && daysUntilExpiration <= 7 && (
                    <p className="text-sm text-yellow-600 mt-1 font-medium">
                      Renovación próxima
                    </p>
                  )}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Validez</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Permanente
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Sin fecha de expiración
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Dispositivos conectados
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {activeSessions.length} de {userData.max_devices} en uso
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {Math.round(deviceUsagePercentage)}% capacidad
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                deviceUsagePercentage >= 90
                  ? 'bg-red-600'
                  : deviceUsagePercentage >= 70
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(deviceUsagePercentage, 100)}%` }}
            />
          </div>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : activeSessions.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-gray-500 uppercase font-medium">Sesiones activas</p>
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.device_info || 'Dispositivo desconocido'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Última actividad: {new Date(session.last_activity).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">No hay dispositivos conectados actualmente</p>
            </div>
          )}

          {deviceUsagePercentage >= 90 && !isAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Cerca del límite:</strong> Estás usando casi todos tus dispositivos disponibles.
                Considera actualizar tu plan si necesitas más dispositivos simultáneos.
              </p>
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                <strong>Gestión de facturación:</strong> Para modificar tu plan, actualizar métodos de pago o consultar facturas, contacta con el departamento comercial.
              </p>
            </div>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Eye className="h-4 w-4" />
              Ver planes
            </button>
          </div>
        </div>
      )}

      <PlanViewModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentTier={userData?.subscription_tier}
      />

      {!isAdmin && plan && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Detalles del plan
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Precio mensual</p>
              <p className="font-semibold text-gray-900">{plan.monthlyPrice}€/mes</p>
            </div>
            <div>
              <p className="text-gray-500">Precio anual</p>
              <p className="font-semibold text-gray-900">{plan.annualPrice}€/año</p>
            </div>
            <div>
              <p className="text-gray-500">Ahorro anual</p>
              <p className="font-semibold text-green-600">
                {plan.monthlyPrice * 12 - plan.annualPrice}€
              </p>
            </div>
            <div>
              <p className="text-gray-500">Precio por dispositivo</p>
              <p className="font-semibold text-gray-900">
                {Math.round(plan.pricePerDevicePerYear)}€/año
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
