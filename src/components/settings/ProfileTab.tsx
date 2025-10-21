import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useUserStats } from '../../hooks/useUserStats';
import { Mail, Building, Calendar, MapPin, Save, Loader2, FileSpreadsheet, FileText, Calculator, TrendingUp } from 'lucide-react';

export function ProfileTab() {
  const { userData, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { stats, isLoading: statsLoading } = useUserStats();

  const [agencyData, setAgencyData] = useState({
    agency_name_number: preferences?.agency_name_number || '',
    agency_address: preferences?.agency_address || '',
    agency_postal_town: preferences?.agency_postal_town || '',
    agency_province: preferences?.agency_province || '',
    agency_email: preferences?.agency_email || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!userData) {
    return <div>Cargando...</div>;
  }

  const handleAgencyDataChange = (field: keyof typeof agencyData, value: string) => {
    setAgencyData(prev => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleSaveAgencyData = async () => {
    if (agencyData.agency_email && !validateEmail(agencyData.agency_email)) {
      setSaveMessage({ type: 'error', text: 'El email no es válido' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updatePreferences({
        agency_name_number: agencyData.agency_name_number || null,
        agency_address: agencyData.agency_address || null,
        agency_postal_town: agencyData.agency_postal_town || null,
        agency_province: agencyData.agency_province || null,
        agency_email: agencyData.agency_email || null,
      });

      if (success) {
        setSaveMessage({ type: 'success', text: 'Datos de agencia guardados correctamente' });
      } else {
        setSaveMessage({ type: 'error', text: 'Error al guardar los datos' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error al guardar los datos' });
    } finally {
      setIsSaving(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información del perfil
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {userData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{userData.full_name}</h4>
              <p className="text-sm text-gray-600">
                {userData.is_admin ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{userData.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm font-medium text-gray-900">
                  Tier {userData.subscription_tier} ({userData.max_devices} dispositivos)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Cuenta creada</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Datos de la Agencia
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Estos datos se utilizarán para autocompletar los formularios de SOP
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre y número de agencia
            </label>
            <input
              type="text"
              value={agencyData.agency_name_number}
              onChange={(e) => handleAgencyDataChange('agency_name_number', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Agencia Madrid 001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección (Calle y número)
            </label>
            <input
              type="text"
              value={agencyData.agency_address}
              onChange={(e) => handleAgencyDataChange('agency_address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Calle Principal 123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CP y Población
            </label>
            <input
              type="text"
              value={agencyData.agency_postal_town}
              onChange={(e) => handleAgencyDataChange('agency_postal_town', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 28540 Valdemoro (Madrid)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia
            </label>
            <input
              type="text"
              value={agencyData.agency_province}
              onChange={(e) => handleAgencyDataChange('agency_province', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Madrid"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de contacto agencia
            </label>
            <input
              type="email"
              value={agencyData.agency_email}
              onChange={(e) => handleAgencyDataChange('agency_email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: agencia@ejemplo.com"
            />
          </div>

          {saveMessage && (
            <div className={`rounded-lg p-3 text-sm ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAgencyData}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isSaving
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estadísticas de Uso
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Métricas de uso de la herramienta
        </p>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats?.total_sop || 0}</p>
              <p className="text-sm text-blue-700">SOP generados</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{stats?.total_minisop || 0}</p>
              <p className="text-sm text-green-700">Mini-SOP generados</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats?.total_calculations || 0}</p>
              <p className="text-sm text-purple-700">Cálculos realizados</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {stats?.average_calculations_per_day?.toFixed(1) || '0'}
              </p>
              <p className="text-sm text-orange-700">Promedio diario</p>
              <p className="text-xs text-orange-600 mt-1">
                {stats?.days_active || 0} días activos
              </p>
            </div>
          </div>
        )}

        {stats && (stats.total_sop > 0 || stats.total_calculations > 0) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Primera actividad:</strong>{' '}
              {stats.first_activity
                ? new Date(stats.first_activity).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Sin actividad registrada'}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Última actividad:</strong>{' '}
              {stats.last_activity
                ? new Date(stats.last_activity).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Sin actividad registrada'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
