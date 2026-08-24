import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

export default function RelapseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ streak_days: string; grace_remaining: string }>();
  const streakDays = parseInt(params.streak_days ?? '0', 10);
  const graceRemaining = parseInt(params.grace_remaining ?? '0', 10);

  const [trigger, setTrigger] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [motivation, setMotivation] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadMotivation() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('motivation')
        .eq('user_id', session.user.id)
        .single();
      if (data) setMotivation((data as any).motivation ?? null);
    }
    loadMotivation();
  }, []);

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async function saveCheckIn(userId: string) {
    await supabase.from('check_ins').upsert(
      {
        user_id: userId,
        date: today,
        type: 'relapse',
        note: trigger.trim() || null,
        relapse_plan: plan.trim() || null,
      },
      { onConflict: 'user_id,date' }
    );
  }

  async function handleGraceDay() {
    setLoading(true);
    const session = await getSession();
    if (!session) { router.replace('/'); return; }

    await saveCheckIn(session.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('grace_days_used')
      .eq('user_id', session.user.id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ grace_days_used: profile.grace_days_used + 1 })
        .eq('user_id', session.user.id);
    }

    setLoading(false);
    Alert.alert(
      '🛡️ Grace Day Used',
      'Your streak is protected. Use this moment to reflect and come back stronger.',
      [{ text: 'Got it', onPress: () => router.replace('/(tabs)/home') }]
    );
  }

  async function handleReset() {
    setLoading(true);
    const session = await getSession();
    if (!session) { router.replace('/'); return; }

    await saveCheckIn(session.user.id);

    await supabase
      .from('profiles')
      .update({ streak_start_date: new Date().toISOString() })
      .eq('user_id', session.user.id);

    setLoading(false);
    Alert.alert(
      '🌱 Fresh Start',
      "Every expert was once a beginner. Your honesty is the first step back. Let's go again.",
      [{ text: "Let's go", onPress: () => router.replace('/(tabs)/home') }]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 20, marginBottom: 8, alignSelf: 'flex-end', padding: 12 }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '600' }}>✕ Cancel</Text>
          </TouchableOpacity>

          {/* Compassionate header */}
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: theme.borderLight,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💙</Text>
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: theme.text,
              textAlign: 'center',
              marginBottom: 10,
            }}>
              Setbacks are part of the journey
            </Text>
            <Text style={{
              fontSize: 15,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              Being honest with yourself takes real courage. You haven't failed — you're still in the fight.
            </Text>
          </View>

          {/* Streak at stake */}
          {streakDays > 0 && (
            <View style={{
              backgroundColor: theme.dangerBg,
              borderRadius: 14,
              padding: 18,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.danger,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}>
              <Text style={{ fontSize: 32 }}>🏅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  You made it
                </Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
                  {streakDays} {streakDays === 1 ? 'day' : 'days'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                  {graceRemaining > 0
                    ? 'A grace day can protect this streak.'
                    : 'Choosing reset clears the timer to zero.'}
                </Text>
              </View>
            </View>
          )}

          {/* Remember why you started */}
          {motivation ? (
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 16,
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
                marginBottom: 8,
              }}>
                Remember why you started
              </Text>
              <Text style={{
                color: theme.text,
                fontSize: 15,
                lineHeight: 22,
                fontStyle: 'italic',
              }}>
                "{motivation}"
              </Text>
            </View>
          ) : null}

          {/* Trigger */}
          <Text style={{
            color: theme.textSecondary, fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
          }}>
            What triggered this?
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              padding: 16,
              color: theme.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: theme.border,
              minHeight: 90,
              textAlignVertical: 'top',
              lineHeight: 22,
              marginBottom: 20,
            }}
            placeholder="Stress, boredom, a specific situation... be honest with yourself"
            placeholderTextColor={theme.textMuted}
            value={trigger}
            onChangeText={setTrigger}
            multiline
            keyboardAppearance="dark"
          />

          {/* Plan */}
          <Text style={{
            color: theme.textSecondary, fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
          }}>
            What will you do differently?
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              padding: 16,
              color: theme.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: theme.border,
              minHeight: 90,
              textAlignVertical: 'top',
              lineHeight: 22,
              marginBottom: 28,
            }}
            placeholder="A specific action, habit, or boundary you'll put in place..."
            placeholderTextColor={theme.textMuted}
            value={plan}
            onChangeText={setPlan}
            multiline
            keyboardAppearance="dark"
          />

          {/* Grace Day button */}
          {graceRemaining > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(124,58,237,0.12)',
                borderRadius: 14,
                padding: 18,
                alignItems: 'center',
                marginBottom: 12,
                borderWidth: 1.5,
                borderColor: theme.accent,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={handleGraceDay}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <>
                  <Text style={{ color: theme.accent, fontSize: 17, fontWeight: '800' }}>
                    🛡️ Use Grace Day ({graceRemaining} remaining)
                  </Text>
                  <Text style={{ color: theme.accentLight, fontSize: 13, marginTop: 4 }}>
                    Streak stays intact
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Reset button */}
          <TouchableOpacity
            style={{
              backgroundColor: graceRemaining > 0 ? theme.card : theme.danger,
              borderRadius: 14,
              padding: 18,
              alignItems: 'center',
              borderWidth: graceRemaining > 0 ? 1 : 0,
              borderColor: theme.border,
              opacity: loading ? 0.6 : 1,
            }}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{
                  color: graceRemaining > 0 ? theme.textSecondary : '#fff',
                  fontSize: 17,
                  fontWeight: '700',
                }}>
                  🔄 Reset & Start Again
                </Text>
                <Text style={{
                  color: graceRemaining > 0 ? theme.textMuted : 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  marginTop: 4,
                }}>
                  Day 1 begins now
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
