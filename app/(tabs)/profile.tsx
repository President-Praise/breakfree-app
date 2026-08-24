import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckInRow = { date: string; type: string };

type Stats = {
  email: string;
  habitType: string;
  habitName: string;
  motivation: string | null;
  streakDays: number;
  totalClean: number;
  totalRelapses: number;
  longestStreak: number;
  memberSince: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysBetween(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function calcLongestStreak(checkIns: CheckInRow[]): number {
  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  for (const ci of sorted) {
    if (ci.type === 'clean') {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [profileRes, checkInsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('habit_type, habit_name, streak_start_date, motivation, created_at')
        .eq('user_id', session.user.id)
        .single(),
      supabase
        .from('check_ins')
        .select('date, type')
        .eq('user_id', session.user.id),
    ]);

    const profile = profileRes.data;
    const rows = checkInsRes.data ?? [];

    setCheckIns(rows);

    const totalClean = rows.filter((c) => c.type === 'clean').length;
    const totalRelapses = rows.filter((c) => c.type === 'relapse').length;
    const longestStreak = calcLongestStreak(rows);

    const memberSince = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '—';

    setStats({
      email: session.user.email ?? '',
      habitType: profile?.habit_type ?? '',
      habitName: profile?.habit_name ?? '—',
      motivation: (profile as any)?.motivation ?? null,
      streakDays: profile?.streak_start_date ? getDaysBetween(profile.streak_start_date) : 0,
      totalClean,
      totalRelapses,
      longestStreak,
      memberSince,
    });
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  function handleChangeHabit() {
    Alert.alert(
      'Change Habit',
      'This will reset your current streak. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change Habit', onPress: () => router.push('/(auth)/habits') },
      ]
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const completionRate = stats && stats.totalClean + stats.totalRelapses > 0
    ? Math.round((stats.totalClean / (stats.totalClean + stats.totalRelapses)) * 100)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text, marginTop: 24, marginBottom: 28 }}>
          Profile
        </Text>

        {/* Avatar + Info */}
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: 'rgba(124,58,237,0.2)',
            borderWidth: 2,
            borderColor: theme.accent,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ fontSize: 30 }}>
              {HABIT_ICONS[stats?.habitType ?? ''] ?? '💪'}
            </Text>
          </View>
          <Text selectable style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>
            {stats?.email}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>
            Quitting: {stats?.habitName}
          </Text>
          {stats?.motivation ? (
            <Text style={{
              color: theme.textMuted,
              fontSize: 13,
              marginTop: 8,
              fontStyle: 'italic',
              textAlign: 'center',
              paddingHorizontal: 8,
              lineHeight: 19,
            }}>
              "{stats.motivation}"
            </Text>
          ) : null}
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 8 }}>
            Member since {stats?.memberSince}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatCard label="Current Streak" value={String(stats?.streakDays ?? 0)} unit="days" accent />
          <StatCard label="Longest Streak" value={String(stats?.longestStreak ?? 0)} unit="days" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <StatCard label="Clean Days" value={String(stats?.totalClean ?? 0)} unit="total" />
          <StatCard label="Completion Rate" value={`${completionRate}%`} unit="of check-ins" />
        </View>

        {/* Activity Calendar */}
        <CheckInCalendar checkIns={checkIns} />

        {/* Settings */}
        <Text style={{
          color: theme.textSecondary, fontSize: 12, fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
        }}>
          Settings
        </Text>
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 17,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push('/(modals)/partner')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>🤝</Text>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Accountability Partner</Text>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 17,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={handleChangeHabit}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>🔄</Text>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Change Habit</Text>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: theme.dangerBg,
              borderRadius: 14,
              padding: 17,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.danger,
            }}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '700' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, accent }: {
  label: string; value: string; unit: string; accent?: boolean;
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: accent ? 'rgba(124,58,237,0.1)' : theme.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: accent ? theme.accent : theme.border,
    }}>
      <Text style={{
        color: accent ? theme.accentLight : theme.textMuted,
        fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </Text>
      <Text style={{
        fontSize: 28, fontWeight: '800',
        color: accent ? theme.accentLight : theme.text,
        marginTop: 6, fontVariant: ['tabular-nums'],
      }}>
        {value}
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{unit}</Text>
    </View>
  );
}

// ─── CheckInCalendar ──────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Square size and gap — tuned so 13 columns fit comfortably on any phone screen
const SQ = 10;   // square width/height in px
const GAP = 2;   // gap between squares in px
const CELL = SQ + GAP; // 12px per cell slot

type CellData = {
  dateStr: string;
  type: 'clean' | 'relapse' | 'none';
  isToday: boolean;
  isFuture: boolean;
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildGrid(checkInMap: Record<string, 'clean' | 'relapse'>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  // Sunday of the current week (anchor for the rightmost column)
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());

  const columns: CellData[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;

  for (let col = 0; col < 13; col++) {
    // Sunday of this column = currentSunday minus (12 - col) weeks
    const colSunday = new Date(currentSunday);
    colSunday.setDate(currentSunday.getDate() - (12 - col) * 7);

    // Emit a month label when the month changes (keyed to Sunday of each column)
    const month = colSunday.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ col, label: MONTHS[month] });
      lastMonth = month;
    }

    const cells: CellData[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(colSunday);
      d.setDate(colSunday.getDate() + row);

      const isFuture = d > today;
      const dateStr = toDateStr(d);
      const type = !isFuture ? (checkInMap[dateStr] ?? 'none') : 'none';

      cells.push({ dateStr, type, isToday: dateStr === todayStr, isFuture });
    }
    columns.push(cells);
  }

  // Width of the full grid: 13 columns × CELL − trailing gap
  const gridWidth = 13 * CELL - GAP;

  return { columns, monthLabels, gridWidth };
}

function CheckInCalendar({ checkIns }: { checkIns: CheckInRow[] }) {
  const [tapped, setTapped] = useState<CellData | null>(null);

  // Build date → type lookup
  const checkInMap = useMemo(() => {
    const map: Record<string, 'clean' | 'relapse'> = {};
    for (const ci of checkIns) {
      map[ci.date] = ci.type as 'clean' | 'relapse';
    }
    return map;
  }, [checkIns]);

  // Build the 13×7 grid structure
  const { columns, monthLabels, gridWidth } = useMemo(
    () => buildGrid(checkInMap),
    [checkInMap]
  );

  function cellColor(cell: CellData): string {
    if (cell.isFuture) return 'transparent';
    if (cell.type === 'clean') return theme.success;
    if (cell.type === 'relapse') return theme.danger;
    return theme.border;
  }

  function tooltipText(cell: CellData): string {
    const d = new Date(cell.dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (cell.type === 'clean') return `${label} — Clean ✓`;
    if (cell.type === 'relapse') return `${label} — Relapse`;
    return `${label} — Not logged`;
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{
        color: theme.textSecondary, fontSize: 12, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
      }}>
        Activity
      </Text>

      <View style={{
        backgroundColor: theme.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
        {/* Horizontal scroll in case the device is narrower than expected */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
          <View>

            {/* Month labels row — absolutely positioned so they align precisely */}
            <View style={{ position: 'relative', height: 14, width: gridWidth, marginBottom: 6 }}>
              {monthLabels.map((ml) => (
                <Text
                  key={ml.col}
                  style={{
                    position: 'absolute',
                    left: ml.col * CELL,
                    color: theme.textMuted,
                    fontSize: 9,
                    fontWeight: '600',
                    lineHeight: 14,
                  }}
                >
                  {ml.label}
                </Text>
              ))}
            </View>

            {/* Grid: columns left → right, rows Sun → Sat top → bottom */}
            <View style={{ flexDirection: 'row', gap: GAP }}>
              {columns.map((column, colIdx) => (
                <View key={colIdx} style={{ flexDirection: 'column', gap: GAP }}>
                  {column.map((cell, rowIdx) => (
                    <TouchableOpacity
                      key={rowIdx}
                      onPress={() => !cell.isFuture && setTapped(cell)}
                      activeOpacity={cell.isFuture ? 1 : 0.7}
                      style={{
                        width: SQ,
                        height: SQ,
                        borderRadius: 2,
                        backgroundColor: cellColor(cell),
                        // White 1px border marks today
                        borderWidth: cell.isToday ? 1 : 0,
                        borderColor: '#FFFFFF',
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>

            {/* Tap tooltip — always reserves height to avoid layout shift */}
            <View style={{ height: 22, marginTop: 10, justifyContent: 'center' }}>
              {tapped && (
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {tooltipText(tapped)}
                </Text>
              )}
            </View>

          </View>
        </ScrollView>

        {/* Legend */}
        <View style={{
          flexDirection: 'row',
          gap: 14,
          marginTop: 4,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          {([
            { color: theme.success, label: 'Clean' },
            { color: theme.danger,  label: 'Relapse' },
            { color: theme.border,  label: 'Not logged' },
          ] as const).map(({ color, label }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: SQ, height: SQ, borderRadius: 2, backgroundColor: color }} />
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
