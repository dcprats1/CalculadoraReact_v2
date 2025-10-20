import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Gift, Users, Mail, Calendar, CreditCard, AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  subscription_status: string;
  subscription_tier: number;
  max_devices: number;
  subscription_end_date: string;
  payment_method: string;
  created_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  tier: number;
  duration_days: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'create-user' | 'promo-codes'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTier, setNewUserTier] = useState(1);
  const [newUserDays, setNewUserDays] = useState(30);

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDescription, setNewPromoDescription] = useState('');
  const [newPromoTier, setNewPromoTier] = useState(1);
  const [newPromoDays, setNewPromoDays] = useState(30);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'promo-codes') {
      loadPromoCodes();
    }
  }, [activeTab]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPromoCodes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotional_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    if (!newUserEmail || !newUserEmail.includes('@')) {
      showMessage('error', 'Email inválido');
      return;
    }

    setLoading(true);
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail.toLowerCase().trim(),
        email_confirm: true,
      });

      if (authError) throw authError;

      if (!authUser.user) {
        throw new Error('No se pudo crear el usuario en auth');
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + newUserDays);

      const maxDevices = [1, 3, 5, 8, 12][newUserTier - 1];

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authUser.user.id,
        email: newUserEmail.toLowerCase().trim(),
        subscription_status: 'active',
        subscription_tier: newUserTier,
        max_devices: maxDevices,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: endDate.toISOString(),
        payment_method: 'admin_grant',
      });

      if (profileError) throw profileError;

      showMessage('success', `Usuario ${newUserEmail} creado correctamente`);
      setNewUserEmail('');
      setNewUserTier(1);
      setNewUserDays(30);
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createPromoCode() {
    if (!newPromoCode || newPromoCode.length < 4) {
      showMessage('error', 'El código debe tener al menos 4 caracteres');
      return;
    }

    if (!newPromoDescription) {
      showMessage('error', 'La descripción es obligatoria');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No autenticado');

      const { error } = await supabase.from('promotional_codes').insert({
        code: newPromoCode.toUpperCase().trim(),
        description: newPromoDescription,
        tier: newPromoTier,
        duration_days: newPromoDays,
        max_uses: newPromoMaxUses,
        is_active: true,
        created_by: userData.user.id,
      });

      if (error) throw error;

      showMessage('success', `Código promocional ${newPromoCode} creado`);
      setNewPromoCode('');
      setNewPromoDescription('');
      setNewPromoTier(1);
      setNewPromoDays(30);
      setNewPromoMaxUses(null);
      loadPromoCodes();
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function togglePromoCodeStatus(id: string, currentStatus: boolean) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('promotional_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showMessage('success', `Código ${!currentStatus ? 'activado' : 'desactivado'}`);
      loadPromoCodes();
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  function getTierName(tier: number): string {
    const names = ['Básico', 'Pro', 'Business', 'Enterprise', 'Unlimited'];
    return names[tier - 1] || 'Desconocido';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {message && (
        <div className={`p-4 mb-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </div>
          </button>
          <button
            onClick={() => setActiveTab('create-user')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create-user'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Crear Usuario
            </div>
          </button>
          <button
            onClick={() => setActiveTab('promo-codes')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'promo-codes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Códigos Promo
            </div>
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Usuarios Registrados</h2>
            {loading ? (
              <p className="text-gray-500">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500">No hay usuarios registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispositivos</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{getTierName(user.subscription_tier)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.max_devices}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.subscription_status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : user.subscription_status === 'trial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.subscription_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(user.subscription_end_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.payment_method || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create-user' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Crear Usuario Manualmente</h2>
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@gls-spain.es"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="inline h-4 w-4 mr-1" />
                  Tier de Suscripción
                </label>
                <select
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Básico (1 dispositivo)</option>
                  <option value={2}>Pro (3 dispositivos)</option>
                  <option value={3}>Business (5 dispositivos)</option>
                  <option value={4}>Enterprise (8 dispositivos)</option>
                  <option value={5}>Unlimited (12 dispositivos)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Duración (días)
                </label>
                <input
                  type="number"
                  value={newUserDays}
                  onChange={(e) => setNewUserDays(parseInt(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={createUser}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'promo-codes' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-6">Crear Código Promocional</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <input
                    type="text"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="GLS2025FREE"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={newPromoDescription}
                    onChange={(e) => setNewPromoDescription(e.target.value)}
                    placeholder="Acceso gratuito 30 días"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                  <select
                    value={newPromoTier}
                    onChange={(e) => setNewPromoTier(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>Básico (1 dispositivo)</option>
                    <option value={2}>Pro (3 dispositivos)</option>
                    <option value={3}>Business (5 dispositivos)</option>
                    <option value={4}>Enterprise (8 dispositivos)</option>
                    <option value={5}>Unlimited (12 dispositivos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duración (días)</label>
                  <input
                    type="number"
                    value={newPromoDays}
                    onChange={(e) => setNewPromoDays(parseInt(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de usos (vacío = ilimitado)
                  </label>
                  <input
                    type="number"
                    value={newPromoMaxUses || ''}
                    onChange={(e) => setNewPromoMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                    min="1"
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={createPromoCode}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear Código Promocional'}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Códigos Promocionales Existentes</h2>
              {loading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : promoCodes.length === 0 ? (
                <p className="text-gray-500">No hay códigos promocionales</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {promoCodes.map((promo) => (
                        <tr key={promo.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{promo.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{promo.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{getTierName(promo.tier)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{promo.duration_days}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {promo.current_uses} / {promo.max_uses || '∞'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              promo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {promo.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => togglePromoCodeStatus(promo.id, promo.is_active)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {promo.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
