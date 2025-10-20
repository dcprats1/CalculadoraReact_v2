interface UserData {
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled';
  subscription_end_date: string;
  subscription_tier: number;
  max_devices: number;
}

export function isSubscriptionActive(userData: UserData | null): boolean {
  if (!userData) return false;

  const { subscription_status, subscription_end_date } = userData;

  if (subscription_status === 'cancelled') return false;

  if (subscription_status === 'active' || subscription_status === 'trial') {
    const endDate = new Date(subscription_end_date);
    const now = new Date();
    return endDate > now;
  }

  return false;
}

export function isSubscriptionExpired(endDate: string): boolean {
  const subscriptionEnd = new Date(endDate);
  const now = new Date();
  return subscriptionEnd <= now;
}

export function getSubscriptionStatusMessage(
  status: 'trial' | 'active' | 'past_due' | 'cancelled'
): string {
  const messages = {
    trial: 'Periodo de prueba',
    active: 'Suscripción activa',
    past_due: 'Pago pendiente',
    cancelled: 'Suscripción cancelada',
  };

  return messages[status] || 'Estado desconocido';
}

export function canAccessCalculator(userData: UserData | null): boolean {
  if (!userData) return false;

  const hasActiveSubscription = isSubscriptionActive(userData);
  const isNotExpired = !isSubscriptionExpired(userData.subscription_end_date);

  return hasActiveSubscription && isNotExpired;
}

export function getDaysUntilExpiration(endDate: string): number {
  const subscriptionEnd = new Date(endDate);
  const now = new Date();
  const diffTime = subscriptionEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function needsRenewal(userData: UserData | null): boolean {
  if (!userData) return true;

  if (userData.subscription_status === 'trial') {
    return getDaysUntilExpiration(userData.subscription_end_date) <= 3;
  }

  if (userData.subscription_status === 'cancelled' || userData.subscription_status === 'past_due') {
    return true;
  }

  return false;
}

export function formatSubscriptionEndDate(endDate: string): string {
  const date = new Date(endDate);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getSubscriptionStatusColor(
  status: 'trial' | 'active' | 'past_due' | 'cancelled'
): string {
  const colors = {
    trial: 'text-blue-600 bg-blue-50 border-blue-200',
    active: 'text-green-600 bg-green-50 border-green-200',
    past_due: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
  };

  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}
