type ActivityType = 'calculation' | 'sop_download' | 'minisop_download';

interface PendingActivity {
  userId: string;
  type: ActivityType;
  timestamp: number;
}

const DEBOUNCE_DELAY = 60000;

const pendingActivities = new Map<string, PendingActivity>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

async function sendActivityToServer(userId: string, activityType: ActivityType): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-activity`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          activity_type: activityType,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('[Tracking] Error al registrar actividad:', errorData);
    }
  } catch (error) {
    console.warn('[Tracking] Error de red al registrar actividad:', error);
  }
}

export function trackActivity(userId: string | undefined, activityType: ActivityType): void {
  if (!userId) {
    return;
  }

  const key = `${userId}-${activityType}`;

  if (activityType === 'calculation') {
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    pendingActivities.set(key, {
      userId,
      type: activityType,
      timestamp: Date.now(),
    });

    const newTimer = setTimeout(() => {
      const pending = pendingActivities.get(key);
      if (pending) {
        sendActivityToServer(pending.userId, pending.type);
        pendingActivities.delete(key);
        debounceTimers.delete(key);
      }
    }, DEBOUNCE_DELAY);

    debounceTimers.set(key, newTimer);
  } else {
    sendActivityToServer(userId, activityType);
  }
}

export function trackPackageCalculation(userId: string | undefined): void {
  trackActivity(userId, 'calculation');
}

export function trackSOPDownload(userId: string | undefined): void {
  trackActivity(userId, 'sop_download');
}

export function trackMiniSOPDownload(userId: string | undefined): void {
  trackActivity(userId, 'minisop_download');
}
