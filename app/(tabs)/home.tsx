import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share, View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

// Thresholds used for the in-app celebration modal (separate from push notification milestones)
const MILESTONE_THRESHOLDS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

type Profile = {
  habit_type: string;
  habit_name: string;
  streak_start_date: string;
  grace_days_used: number;
  grace_days_limit: number;
  daily_cost: number | null;
  last_milestone_notified: number;
  last_milestone_shown: number;
  notifications_enabled: boolean;
};

function formatNaira(amount: number): string {
  return '₦' + Math.floor(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const HABIT_ICONS: Record<string, string> = {
  social_media: '📱',
  pornography: '🔞',
  gambling: '🎰',
  gaming: '🎮',
  alcohol: '🍺',
  smoking: '🚬',
  shopping: '🛍️',
  doom_scrolling: '📰',
};

const QUOTES = [
  'Every day clean is a victory.',
  'Freedom is built one day at a time.',
  'You are stronger than your urges.',
  'Progress, not perfection.',
  "The hardest chains to break are the ones you can't see.",
  'Each day sober is proof of your strength.',
  'Your future self is thanking you right now.',
];

const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

function getElapsed(startDateStr: string): { days: number; hours: number; minutes: number; seconds: number } {
  const start = new Date(startDateStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalCleanDays, setTotalCleanDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const startTimer = useCallback((startDate: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(getElapsed(startDate));
    intervalRef.current = setInterval(() => {
      setElapsed(getElapsed(startDate));
    }, 1000);
  }, []);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    userIdRef.current = session.user.id;

    const { data } = await supabase
      .from('profiles')
      .select('habit_type, habit_name, streak_start_date, grace_days_used, grace_days_limit, daily_cost, last_milestone_notified, last_milestone_shown, notifications_enabled')
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      const profileData = data as Profile;

      const days = getElapsed(profileData.streak_start_date).days;

      // Reset grace days once streak reaches 30 days
      if (days >= 30 && profileData.grace_days_used > 0) {
        await supabase
          .from('profiles')
          .update({ grace_days_used: 0 })
          .eq('user_id', session.user.id);
        profileData.grace_days_used = 0;
      }

      // Check for a milestone to celebrate with the in-app modal
      const lastShown = profileData.last_milestone_shown ?? 0;
      const unshownMilestones = MILESTONE_THRESHOLDS.filter((m) => m <= days && m > lastShown);
      const milestoneToShow = unshownMilestones.length > 0
        ? unshownMilestones[unshownMilestones.length - 1]
        : null;

      setProfile(profileData);
      startTimer(profileData.streak_start_date);

      if (milestoneToShow !== null) {
        console.log('Milestone reached:', milestoneToShow, 'days');
        await supabase
          .from('profiles')
          .update({ last_milestone_shown: milestoneToShow })
          .eq('user_id', session.user.id);
        // Defer push by one tick so home screen renders first before modal slides up.
        // Without this, router.push called synchronously inside useFocusEffect can
        // be swallowed when the navigation stack isn't fully settled yet.
        setTimeout(() => {
          router.push({
            pathname: '/(modals)/milestone',
            params: {
              milestone: String(milestoneToShow),
              habit_name: profileData.habit_name,
              daily_cost: String(profileData.daily_cost ?? 0),
              streak_days: String(days),
            },
          });
        }, 300);
      }
    }

    // Fetch total all-time clean days (never resets)
    const { count } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('type', 'clean');

    setTotalCleanDays(count ?? 0);
    setLoading(false);
    setRefreshing(false);
  }, [startTimer]);

  useFocusEffect(
    useCallback(() => {
      load();
      AsyncStorage.getItem('breakfree_partner_name').then((val) => setPartnerName(val ?? null));
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [load])
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function handleRelapsed() {
    if (!profile) return;
    const days = getElapsed(profile.streak_start_date).days;
    const graceRemaining = Math.max(0, profile.grace_days_limit - profile.grace_days_used);
    router.push({
      pathname: '/(modals)/relapse',
      params: { streak_days: String(days), grace_remaining: String(graceRemaining) },
    });
  }

  function handleStillGoing() {
    Alert.alert('Keep Going!', "You're doing amazing. Stay strong 💪");
  }

  async function handleShareWithPartner() {
    if (!profile || !partnerName) return;
    let message = `Hey ${partnerName} 👋 Just checking in — I'm on Day ${days} without ${profile.habit_name}. Still going strong with BreakFree 💪`;
    if (profile.daily_cost != null && profile.daily_cost > 0) {
      message += ` I've also saved ${formatNaira(profile.daily_cost * days)} so far!`;
    }
    try {
      await Share.share({ message });
    } catch {
      // User cancelled — no action needed
    }
  }

  const days = elapsed.days;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const graceAvailable = profile
    ? profile.grace_days_used < profile.grace_days_limit
    : false;

  const statusLabel = days >= 30
    ? '🏆 Legendary'
    : days >= 7
    ? '🔥 On fire'
    : days >= 1
    ? '✨ Building'
    : '🌱 Starting';

  const statusColor = days >= 7 ? theme.accentLight : theme.textMuted;
  const statusBg = days >= 7 ? 'rgba(124,58,237,0.15)' : theme.card;
  const statusBorder = days >= 7 ? theme.accent : theme.border;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          marginBottom: 32,
        }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>BreakFree</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>
              {HABIT_ICONS[profile?.habit_type ?? ''] ?? '💪'}{' '}
              Quitting {profile?.habit_name ?? '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{
              backgroundColor: statusBg,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: statusBorder,
            }}>
              <Text style={{ color: statusColor, fontSize: 12, fontWeight: '700' }}>
                {statusLabel}
              </Text>
            </View>
            {graceAvailable && (
              <View style={{
                backgroundColor: 'rgba(124,58,237,0.1)',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: 'rgba(124,58,237,0.3)',
              }}>
                <Text style={{ color: theme.accentLight, fontSize: 11, fontWeight: '600' }}>
                  🛡️ Grace day available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Live Countdown Timer */}
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 24,
          paddingVertical: 36,
          paddingHorizontal: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: days > 0 ? theme.accent : theme.border,
          alignItems: 'center',
        }}>
          <Text style={{
            color: theme.textMuted,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 28,
          }}>
            Time Clean
          </Text>

          {/* Days */}
          <Text style={{
            fontSize: 88,
            fontWeight: '900',
            color: theme.text,
            fontVariant: ['tabular-nums'],
            lineHeight: 88,
          }}>
            {elapsed.days}
          </Text>
          <Text style={{
            fontSize: 13,
            color: theme.textMuted,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 24,
            marginTop: 4,
          }}>
            {elapsed.days === 1 ? 'Day' : 'Days'}
          </Text>

          {/* HH:MM:SS */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            backgroundColor: theme.bg,
            borderRadius: 14,
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}>
            <TimeUnit value={pad(elapsed.hours)} label="HRS" />
            <Text style={{ color: theme.textMuted, fontSize: 28, fontWeight: '700', marginBottom: 14, marginHorizontal: 4 }}>:</Text>
            <TimeUnit value={pad(elapsed.minutes)} label="MIN" />
            <Text style={{ color: theme.textMuted, fontSize: 28, fontWeight: '700', marginBottom: 14, marginHorizontal: 4 }}>:</Text>
            <TimeUnit value={pad(elapsed.seconds)} label="SEC" />
          </View>

          <Text style={{
            color: days > 0 ? theme.accentLight : theme.textMuted,
            fontSize: 14,
            marginTop: 20,
            fontWeight: '500',
            textAlign: 'center',
          }}>
            {days === 0
              ? "Today is day one. You've got this."
              : days < 7
              ? '🔥 Keep the streak alive!'
              : `🏆 ${days} days — incredible progress!`}
          </Text>
        </View>

        {/* Total clean days — all-time stat */}
        {totalCleanDays > 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: profile?.daily_cost ? 12 : 20,
            paddingVertical: 10,
          }}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>✅</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
              {totalCleanDays} total clean {totalCleanDays === 1 ? 'day' : 'days'} logged
            </Text>
          </View>
        )}

        {/* Money saved card */}
        {profile?.daily_cost != null && profile.daily_cost > 0 && (
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.borderLight,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}>
            <Text style={{ fontSize: 28 }}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.textMuted,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 4,
              }}>
                Money Saved
              </Text>
              <Text style={{
                color: theme.text,
                fontSize: 26,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
                lineHeight: 30,
              }}>
                {formatNaira(profile.daily_cost * days)}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 3 }}>
                since you quit {profile.habit_name}
              </Text>
            </View>
          </View>
        )}

        {/* SOS Button */}
        <TouchableOpacity
          style={{
            borderRadius: 14,
            paddingVertical: 16,
            paddingHorizontal: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: theme.borderLight,
            marginBottom: 12,
            flexDirection: 'row',
            gap: 8,
            minHeight: 52,
          }}
          onPress={() => router.push('/(modals)/sos')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16 }}>🆘</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>
            I'm Craving
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: theme.success,
              gap: 6,
            }}
            onPress={handleStillGoing}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 22 }}>✓</Text>
            <Text style={{ color: theme.success, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
              Still Going
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: theme.danger,
              gap: 6,
            }}
            onPress={handleRelapsed}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 22 }}>💔</Text>
            <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
              I Relapsed
            </Text>
            {graceAvailable && (
              <Text style={{ color: theme.accentLight, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                🛡️ grace day ready
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quote */}
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: theme.border,
          borderLeftWidth: 3,
          borderLeftColor: theme.accent,
          marginBottom: partnerName ? 12 : 0,
        }}>
          <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            Daily reminder
          </Text>
          <Text style={{ color: theme.text, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>
            "{quote}"
          </Text>
        </View>

        {/* Share with partner */}
        {partnerName && (
          <TouchableOpacity
            onPress={handleShareWithPartner}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: theme.accentLight, fontSize: 14, fontWeight: '600' }}>
              📤 Share with {partnerName}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 56 }}>
      <Text style={{
        fontSize: 34,
        fontWeight: '800',
        color: theme.text,
        fontVariant: ['tabular-nums'],
        lineHeight: 40,
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}
