import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notification identifiers
const DAILY_CHECKIN_ID = 'daily-checkin';
const SOS_ID = 'sos-reminder';

// Streak milestones that trigger a notification
export const MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365] as const;
export type Milestone = typeof MILESTONES[number];

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the OS.
 * Returns true if granted, false if denied or if an error occurs.
 * Safe to call multiple times — OS will not re-prompt if already decided.
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BreakFree',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule a repeating daily check-in notification.
 * @param time - "HH:MM" in 24-hour format, e.g. "21:00" for 9 PM
 * Cancels any existing scheduled notification before scheduling the new one.
 */
export async function scheduleDailyCheckIn(time: string): Promise<void> {
  try {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Cancel existing before rescheduling
    await Notifications.cancelScheduledNotificationAsync(DAILY_CHECKIN_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_CHECKIN_ID,
      content: {
        title: 'BreakFree',
        body: "How's your day going? Log your check-in 📋",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {
    // Silently fail — permissions may not have been granted
  }
}

/**
 * Cancel the daily check-in notification.
 */
export async function cancelDailyCheckIn(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_CHECKIN_ID);
  } catch {}
}

/**
 * Fire an immediate milestone notification.
 * @param days - The milestone day count (e.g. 7, 30, 90)
 */
export async function fireMilestoneNotification(days: number): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Milestone reached!',
        body: `You hit ${days} days clean! Keep going.`,
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch {}
}

/**
 * Cancel a previously scheduled SOS reminder (call when user successfully resists).
 */
export async function cancelSOSReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(SOS_ID);
  } catch {}
}

/**
 * Schedule a single SOS reminder 10 minutes from now.
 * Call this from the SOS screen when the user is fighting a craving.
 * Cancels any existing SOS notification before scheduling a fresh one.
 */
export async function scheduleSOSReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(SOS_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: SOS_ID,
      content: {
        title: 'BreakFree',
        body: "Still holding on? You've got this 💪",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 600, // 10 minutes
        repeats: false,
      },
    });
  } catch {}
}

/**
 * Given the current streak in days and the last milestone the user was notified for,
 * returns the next milestone to notify for (or null if none).
 */
export function getNextMilestone(
  streakDays: number,
  lastNotified: number
): Milestone | null {
  // Find milestones the user has crossed that they haven't been notified about yet
  const crossed = MILESTONES.filter((m) => m <= streakDays && m > lastNotified);
  // Return the highest one (most impressive to celebrate)
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}
