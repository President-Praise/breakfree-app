import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, Share, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { theme } from '@/constants/theme';
import ShareCard from '@/components/ShareCard';

// ─── Badge definitions ─────────────────────────────────────────────────────

const BADGES: Record<number, { icon: string; label: string }> = {
  1:   { icon: '🌱', label: 'First Step' },
  3:   { icon: '✨', label: 'Momentum' },
  7:   { icon: '🔥', label: 'One Week Strong' },
  14:  { icon: '💪', label: 'Two Weeks' },
  30:  { icon: '🏆', label: 'One Month Legendary' },
  60:  { icon: '⚡', label: '60 Days Unstoppable' },
  90:  { icon: '🦁', label: '90 Days — New Identity' },
  180: { icon: '🌟', label: 'Half Year Free' },
  365: { icon: '👑', label: 'One Year Champion' },
};

// ─── Particle config ───────────────────────────────────────────────────────

const PARTICLE_COUNT = 12;
const PARTICLE_COLORS = [
  theme.accent,
  theme.accentLight,
  '#FFFFFF',
  '#C4B5FD',
  '#DDD6FE',
  theme.accent,
];

function formatNaira(amount: number): string {
  return '₦' + Math.floor(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function MilestoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    milestone: string;
    habit_name: string;
    daily_cost: string;
    streak_days: string;
  }>();

  const milestone = parseInt(params.milestone ?? '1', 10);
  const habitName = params.habit_name ?? '';
  const dailyCost = parseInt(params.daily_cost ?? '0', 10);
  const streakDays = parseInt(params.streak_days ?? '0', 10);

  const badge = BADGES[milestone] ?? { icon: '🏅', label: `${milestone} Days` };
  const moneySaved = dailyCost > 0 ? dailyCost * streakDays : null;

  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    AsyncStorage.getItem('breakfree_partner_name').then((val) => setPartnerName(val ?? null));
  }, []);

  // ── Particle animated values (created once) ──────────────────────────────

  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const baseAngle = (i * 360) / PARTICLE_COUNT;
      // ±20° jitter so particles don't look perfectly mechanical
      const angle = baseAngle + (Math.random() * 40 - 20);
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        angle,
        distance: 90 + Math.random() * 70,   // 90–160 px
        size: 7 + Math.floor(Math.random() * 7), // 7–13 px
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      };
    })
  ).current;

  // ── Badge scale-in ───────────────────────────────────────────────────────

  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    // Badge spring-in
    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 90,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Burst 1 immediately, burst 2 after 1.3s
    runBurst();
    burstTimerRef.current = setTimeout(() => {
      if (isMounted.current) runBurst();
    }, 1300);

    return () => {
      isMounted.current = false;
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  // ── Burst animation ──────────────────────────────────────────────────────

  function runBurst() {
    // Reset all particles to center
    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });

    const animations = particles.map((p) => {
      const rad = (p.angle * Math.PI) / 180;
      const tx = Math.cos(rad) * p.distance;
      const ty = Math.sin(rad) * p.distance;

      return Animated.parallel([
        // Move outward
        Animated.timing(p.x, {
          toValue: tx,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: ty,
          duration: 700,
          useNativeDriver: true,
        }),
        // Scale up then hold
        Animated.spring(p.scale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        // Fade in quickly, then fade out
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 580,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleShare() {
    setShareLoading(true);
    try {
      // Capture the ShareCard view as an image
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your milestone',
        });
      } else {
        // expo-sharing unavailable — fall back to plain text
        throw new Error('sharing_unavailable');
      }
    } catch {
      // captureRef failed or sharing unavailable — fall back to plain text
      try {
        const intro = partnerName ? `Hey ${partnerName}, ` : '';
        await Share.share({
          message: `${intro}I just hit ${milestone} ${milestone === 1 ? 'day' : 'days'} without ${habitName}! 🏆 Day ${streakDays} and going strong with BreakFree. 💪`,
        });
      } catch {
        // User cancelled — no action needed
      }
    } finally {
      setShareLoading(false);
    }
  }

  function handleContinue() {
    router.back();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Derive a simple habit icon from the habit name if none provided
  const habitIcon = '💪';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Off-screen share card — captured by react-native-view-shot */}
      <ShareCard
        ref={shareCardRef}
        days={streakDays}
        milestone={badge.label}
        milestoneEmoji={badge.icon}
        habitName={habitName}
        habitIcon={habitIcon}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <TouchableOpacity
          onPress={handleContinue}
          style={{ alignSelf: 'flex-end', marginTop: 20, marginBottom: 8, padding: 12 }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>

        {/* Confetti burst + badge — all within a fixed-size container */}
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 300, marginBottom: 8 }}>
          {/* Particles — absolutely positioned, origin at center */}
          {particles.map((p, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                ],
                opacity: p.opacity,
              }}
            />
          ))}

          {/* Badge */}
          <Animated.View
            style={{
              transform: [{ scale: badgeScale }],
              opacity: badgeOpacity,
              alignItems: 'center',
            }}
          >
            <View style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              borderWidth: 3,
              borderColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 64, lineHeight: 72 }}>{badge.icon}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Labels */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{
            color: theme.textMuted,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 8,
          }}>
            Milestone unlocked
          </Text>
          <Text style={{
            color: theme.text,
            fontSize: 28,
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: 6,
          }}>
            {badge.label}
          </Text>
          <Text style={{ color: theme.accentLight, fontSize: 16, fontWeight: '600' }}>
            {milestone} {milestone === 1 ? 'day' : 'days'} without {habitName}
          </Text>
        </View>

        {/* Stats recap */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 28,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: theme.card,
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.borderLight,
          }}>
            <Text style={{
              color: theme.textMuted,
              fontSize: 11,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 6,
            }}>
              Days clean
            </Text>
            <Text style={{
              color: theme.text,
              fontSize: 32,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}>
              {streakDays}
            </Text>
          </View>

          {moneySaved !== null && (
            <View style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.borderLight,
            }}>
              <Text style={{
                color: theme.textMuted,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 6,
              }}>
                Money saved
              </Text>
              <Text style={{
                color: theme.success,
                fontSize: 22,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
              }}>
                {formatNaira(moneySaved)}
              </Text>
            </View>
          )}
        </View>

        {/* Share */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            borderRadius: 14,
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.borderLight,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            minHeight: 52,
            opacity: shareLoading ? 0.6 : 1,
          }}
          onPress={handleShare}
          disabled={shareLoading}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>📤</Text>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
            {shareLoading ? 'Preparing card...' : 'Share this milestone'}
          </Text>
        </TouchableOpacity>

        {/* Continue */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.accent,
            borderRadius: 14,
            padding: 17,
            alignItems: 'center',
          }}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
            Keep Going 🚀
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
