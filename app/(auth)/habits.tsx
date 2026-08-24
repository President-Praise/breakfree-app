import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { requestPermissions, scheduleDailyCheckIn } from '@/lib/notifications';

const HABITS = [
  { id: 'social_media', label: 'Social Media', icon: '📱', desc: 'Instagram, TikTok, X, etc.' },
  { id: 'pornography', label: 'Pornography', icon: '🔞', desc: 'Adult content' },
  { id: 'gambling', label: 'Gambling', icon: '🎰', desc: 'Betting, casino, sports apps' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', desc: 'Excessive video games' },
  { id: 'alcohol', label: 'Alcohol', icon: '🍺', desc: 'Drinking' },
  { id: 'smoking', label: 'Smoking / Vaping', icon: '🚬', desc: 'Nicotine in any form' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', desc: 'Compulsive buying' },
  { id: 'doom_scrolling', label: 'Doom Scrolling', icon: '📰', desc: 'News, Reddit, endless feeds' },
] as const;

type HabitId = typeof HABITS[number]['id'];

// Simplified quick-pick times — most users pick evening
const QUICK_TIMES = [
  { label: '6 PM', value: '18:00' },
  { label: '8 PM', value: '20:00' },
  { label: '9 PM', value: '21:00' },
  { label: '10 PM', value: '22:00' },
];

const DEFAULT_CHECKIN_TIME = '21:00';
const MOTIVATION_MAX = 200;

export default function HabitsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<HabitId | null>(null);
  const [motivation, setMotivation] = useState('');
  const [motivationSkipped, setMotivationSkipped] = useState(false);
  const [dailyCost, setDailyCost] = useState('');
  const [checkInTime, setCheckInTime] = useState(DEFAULT_CHECKIN_TIME);
  const [loading, setLoading] = useState(false);

  const selectedHabit = HABITS.find((h) => h.id === selected) ?? null;
  const showExpanded = selectedHabit !== null;

  // Reset skipped state whenever the habit changes so the card
  // re-appears if the user switches their selection
  function handleHabitPress(id: HabitId) {
    if (id !== selected) setMotivationSkipped(false);
    setSelected(id);
  }

  async function handleContinue() {
    if (!selected) {
      Alert.alert('Select a habit', 'Choose what you want to break free from.');
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/');
      return;
    }

    const notificationsEnabled = await requestPermissions();

    const habit = HABITS.find((h) => h.id === selected)!;
    const today = new Date().toISOString().split('T')[0];
    const parsedCost = dailyCost.trim() ? parseInt(dailyCost.trim(), 10) : null;
    const trimmedMotivation = motivation.trim() || null;

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: session.user.id,
        habit_type: habit.id,
        habit_name: habit.label,
        streak_start_date: today,
        motivation: trimmedMotivation,
        daily_cost: Number.isFinite(parsedCost as number) ? parsedCost : null,
        checkin_notification_time: notificationsEnabled ? checkInTime : null,
        notifications_enabled: notificationsEnabled,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    if (notificationsEnabled) {
      await scheduleDailyCheckIn(checkInTime);
    }

    setLoading(false);
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: 24, marginBottom: 32 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
              What do you want to quit?
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>
              Pick the habit you're committed to breaking
            </Text>
          </View>

          {/* Habit list */}
          <View style={{ gap: 10 }}>
            {HABITS.map((habit) => {
              const isSelected = selected === habit.id;
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={{
                    backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.12)' : theme.card,
                    borderRadius: 14,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                  onPress={() => handleHabitPress(habit.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26 }}>{habit.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      {habit.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
                      {habit.desc}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: theme.accent,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {showExpanded && (
            <>
              {/* Motivation */}
              {!motivationSkipped ? (
                <View style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 18,
                  marginTop: 24,
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                    Why are you doing this?
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 14 }}>
                    Your reason becomes your lifeline when cravings hit
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.card2,
                      borderRadius: 10,
                      padding: 14,
                      color: theme.text,
                      fontSize: 15,
                      borderWidth: 1,
                      borderColor: theme.border,
                      minHeight: 96,
                      textAlignVertical: 'top',
                      lineHeight: 22,
                    }}
                    placeholder="e.g. I want to be present for my family, I want to save money, I want to feel in control again..."
                    placeholderTextColor={theme.textMuted}
                    value={motivation}
                    onChangeText={(v) => setMotivation(v.slice(0, MOTIVATION_MAX))}
                    multiline
                    keyboardAppearance="dark"
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                  />
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 10,
                  }}>
                    <TouchableOpacity onPress={() => setMotivationSkipped(true)} activeOpacity={0.6}>
                      <Text style={{ color: theme.textMuted, fontSize: 13 }}>Skip for now</Text>
                    </TouchableOpacity>
                    <Text style={{
                      color: motivation.length >= MOTIVATION_MAX ? theme.danger : theme.textMuted,
                      fontSize: 12,
                    }}>
                      {motivation.length}/{MOTIVATION_MAX}
                    </Text>
                  </View>
                </View>
              ) : (
                // Collapsed state — let user re-open if they change their mind
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 20,
                    paddingVertical: 4,
                  }}
                  onPress={() => setMotivationSkipped(false)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                    + Add your why
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>(optional)</Text>
                </TouchableOpacity>
              )}

              {/* Daily cost */}
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 18,
                marginTop: 16,
                borderWidth: 1,
                borderColor: theme.borderLight,
              }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                  How much do you spend on {selectedHabit!.label} per day?
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 14 }}>
                  Optional — we'll track how much you're saving
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: theme.card2,
                    borderWidth: 1,
                    borderRightWidth: 0,
                    borderColor: theme.border,
                    borderTopLeftRadius: 10,
                    borderBottomLeftRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                  }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 17, fontWeight: '700' }}>₦</Text>
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: theme.card2,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderTopRightRadius: 10,
                      borderBottomRightRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      color: theme.text,
                      fontSize: 17,
                      fontVariant: ['tabular-nums'],
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={dailyCost}
                    onChangeText={(v) => setDailyCost(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    keyboardAppearance="dark"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Check-in reminder */}
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 14,
                padding: 18,
                marginTop: 16,
                borderWidth: 1,
                borderColor: theme.borderLight,
              }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                  Set your daily check-in reminder
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
                  We'll send a notification to log your progress
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK_TIMES.map((slot) => {
                    const isActive = checkInTime === slot.value;
                    return (
                      <TouchableOpacity
                        key={slot.value}
                        onPress={() => setCheckInTime(slot.value)}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: isActive ? theme.accent : theme.card2,
                          borderWidth: 1,
                          borderColor: isActive ? theme.accent : theme.border,
                          alignItems: 'center',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{
                          color: isActive ? '#fff' : theme.textSecondary,
                          fontSize: 13,
                          fontWeight: isActive ? '700' : '500',
                        }}>
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: loading || !selected ? theme.border : theme.accent,
              borderRadius: 14,
              padding: 17,
              alignItems: 'center',
              marginTop: 28,
            }}
            onPress={handleContinue}
            disabled={loading || !selected}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              {loading ? 'Setting up...' : 'Start My Journey'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
