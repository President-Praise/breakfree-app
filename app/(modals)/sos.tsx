import { useEffect, useRef, useState } from 'react';
import {
  Animated, View, Text, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { scheduleSOSReminder, cancelSOSReminder } from '@/lib/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTRACTION_TASKS = [
  'Do 10 push-ups',
  'Drink a full glass of water',
  'Text someone you love',
  'Step outside for 60 seconds',
  'Write 3 things you\'re grateful for',
  'Splash cold water on your face',
  'Do 5 deep breaths',
  'Eat a healthy snack',
  'Watch a funny video',
  'Call someone',
  'Go for a short walk',
  'Count backwards from 100',
];

const TOTAL_CYCLES = 3;
type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getElapsedDays(startDateStr: string): number {
  const diffMs = Math.max(0, Date.now() - new Date(startDateStr).getTime());
  return Math.floor(diffMs / 86400000);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type SOSProfile = {
  motivation: string | null;
  habit_name: string;
  streak_start_date: string;
  grace_days_used: number;
  grace_days_limit: number;
};

export default function SOSScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Profile
  const [profile, setProfile] = useState<SOSProfile | null>(null);

  // Breathing animation
  const breathAnim = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [cycleNum, setCycleNum] = useState(1);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Distraction tasks — picked once on mount
  const [tasks] = useState(() => pickRandom(DISTRACTION_TASKS, 3));
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProfile();
    scheduleSOSReminder();
    runCycle(TOTAL_CYCLES);

    return () => {
      isMounted.current = false;
      breathAnim.stopAnimation();
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !isMounted.current) return;

    const { data } = await supabase
      .from('profiles')
      .select('motivation, habit_name, streak_start_date, grace_days_used, grace_days_limit')
      .eq('user_id', session.user.id)
      .single();

    if (data && isMounted.current) {
      setProfile(data as SOSProfile);
    }
  }

  // ── Breathing animation ────────────────────────────────────────────────────

  function runCycle(remaining: number) {
    if (!isMounted.current) return;

    if (remaining <= 0) {
      if (isMounted.current) setPhase('done');
      return;
    }

    const currentCycle = TOTAL_CYCLES - remaining + 1;
    if (isMounted.current) {
      setCycleNum(currentCycle);
      setPhase('inhale');
    }

    // Inhale: 0 → 1 over 4 seconds
    Animated.timing(breathAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isMounted.current) return;
      setPhase('hold');

      // Hold: stay at 1 for 2 seconds
      holdTimerRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        setPhase('exhale');

        // Exhale: 1 → 0 over 4 seconds
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }).start(({ finished: f2 }) => {
          if (!f2 || !isMounted.current) return;
          runCycle(remaining - 1);
        });
      }, 2000);
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleResisted() {
    await cancelSOSReminder();
    router.back();
  }

  function handleStillRelapsed() {
    const days = profile ? getElapsedDays(profile.streak_start_date) : 0;
    const graceRemaining = profile
      ? Math.max(0, profile.grace_days_limit - profile.grace_days_used)
      : 0;
    router.replace({
      pathname: '/(modals)/relapse',
      params: {
        streak_days: String(days),
        grace_remaining: String(graceRemaining),
      },
    });
  }

  function toggleTask(index: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  // ── Derived animation values ───────────────────────────────────────────────

  const circleScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });
  const glowScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const circleOpacity = breathAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.55, 1, 0.85],
  });

  // ── Phase display ──────────────────────────────────────────────────────────

  const phaseLabel =
    phase === 'inhale' ? 'Inhale...' :
    phase === 'hold'   ? 'Hold...' :
    phase === 'exhale' ? 'Exhale...' :
    'Well done 🌿';

  const phaseColor =
    phase === 'inhale' ? theme.text :
    phase === 'hold'   ? theme.accentLight :
    phase === 'exhale' ? theme.textSecondary :
    theme.success;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          marginBottom: 28,
        }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text }}>
              🆘 Hold On
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 3 }}>
              This craving will pass. Breathe with me.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 12 }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Breathing animation ── */}
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 220, marginBottom: 8 }}>
          {/* Outer glow ring */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: 'rgba(124, 58, 237, 0.06)',
              borderWidth: 1,
              borderColor: 'rgba(124, 58, 237, 0.2)',
              transform: [{ scale: glowScale }],
            }}
          />
          {/* Main breathing circle */}
          <Animated.View
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              borderWidth: 2,
              borderColor: theme.accent,
              transform: [{ scale: circleScale }],
              opacity: circleOpacity,
            }}
          />
        </View>

        {/* Phase text */}
        <View style={{ alignItems: 'center', marginBottom: 6, minHeight: 36 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: phaseColor,
            letterSpacing: 0.5,
          }}>
            {phaseLabel}
          </Text>
        </View>

        {/* Cycle counter */}
        {phase !== 'done' && (
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
              Cycle {cycleNum} of {TOTAL_CYCLES}
            </Text>
          </View>
        )}
        {phase === 'done' && (
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Breathing complete — you're calmer now
            </Text>
          </View>
        )}

        {/* ── Motivation recall ── */}
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: theme.borderLight,
          borderLeftWidth: 3,
          borderLeftColor: theme.accentLight,
        }}>
          <Text style={{
            color: theme.textMuted,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
          }}>
            Remember why you started
          </Text>
          <Text style={{
            color: theme.text,
            fontSize: 16,
            lineHeight: 24,
            fontStyle: 'italic',
          }}>
            {profile?.motivation
              ? `"${profile.motivation}"`
              : profile?.habit_name
              ? `You chose to quit ${profile.habit_name} for a reason.`
              : 'You started this journey for a reason. Hold on to that.'}
          </Text>
        </View>

        {/* ── Distraction tasks ── */}
        <Text style={{
          color: theme.textSecondary,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 12,
        }}>
          Do one of these right now
        </Text>

        <View style={{ gap: 10, marginBottom: 24 }}>
          {tasks.map((task, i) => (
            <TouchableOpacity
              key={task}
              onPress={() => toggleTask(i)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: checked[i]
                  ? 'rgba(16, 185, 129, 0.08)'
                  : theme.card,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1.5,
                borderColor: checked[i] ? theme.success : theme.border,
              }}
            >
              {/* Checkbox */}
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: checked[i] ? theme.success : theme.textMuted,
                backgroundColor: checked[i] ? theme.success : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {checked[i] && (
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 14 }}>✓</Text>
                )}
              </View>
              <Text style={{
                flex: 1,
                fontSize: 15,
                color: checked[i] ? theme.textMuted : theme.text,
                textDecorationLine: checked[i] ? 'line-through' : 'none',
                fontWeight: '500',
              }}>
                {task}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Success button ── */}
        {allChecked && (
          <TouchableOpacity
            style={{
              backgroundColor: theme.success,
              borderRadius: 14,
              padding: 18,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={handleResisted}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
              I resisted ✓
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3 }}>
              Your streak is safe. Well done.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Emergency exit ── */}
        <TouchableOpacity
          onPress={handleStillRelapsed}
          activeOpacity={0.6}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>
            I still relapsed
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
