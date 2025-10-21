import React, { useState } from 'react';
import { X, User, Settings as SettingsIcon, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PreferencesTab } from './PreferencesTab';
import { ProfileTab } from './ProfileTab';
import { SubscriptionTab } from './SubscriptionTab';
import { CustomTariffsEditor } from './CustomTariffsEditor';

interface UserSettingsPanelProps {
  onClose: () => void;
}

type Tab = 'profile' | 'preferences' | 'subscription';

export function UserSettingsPanel({ onClose }: UserSettingsPanelProps) {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('preferences');

  const [showCustomTariffsEditor, setShowCustomTariffsEditor] = useState(false);

  const tabs = [
    { id: 'preferences' as Tab, label: 'Preferencias', icon: SettingsIcon },
    { id: 'profile' as Tab, label: 'Perfil', icon: User },
    { id: 'subscription' as Tab, label: 'Suscripción', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
            <p className="text-sm text-gray-600 mt-1">
              {userData?.full_name} • {userData?.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {!showCustomTariffsEditor && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 border-r border-gray-200 p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setShowCustomTariffsEditor(true)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SettingsIcon className="h-5 w-5" />
                <span className="font-medium">Tabla de Costes Personalizada</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'preferences' && <PreferencesTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'subscription' && <SubscriptionTab />}
            </div>
          </div>
        )}

        {showCustomTariffsEditor && (
          <CustomTariffsEditor onClose={() => setShowCustomTariffsEditor(false)} />
        )}
      </div>
    </div>
  );
}
