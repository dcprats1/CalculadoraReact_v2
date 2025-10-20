import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Building, Shield, Calendar } from 'lucide-react';

export function ProfileTab() {
  const { userData, user } = useAuth();

  if (!userData) {
    return <div>Cargando...</div>;
  }

  const roleLabels = {
    owner: 'Propietario',
    admin: 'Administrador',
    user: 'Usuario',
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
              <p className="text-sm text-gray-600">{roleLabels[userData.role]}</p>
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
                <p className="text-xs text-gray-500">ID de Cliente</p>
                <p className="text-sm font-mono font-medium text-gray-900">{userData.client_id.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Rol</p>
                <p className="text-sm font-medium text-gray-900">{roleLabels[userData.role]}</p>
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Para modificar tu información de perfil, contacta con el administrador de tu cuenta.
        </p>
      </div>
    </div>
  );
}
