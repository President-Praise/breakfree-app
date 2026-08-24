import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

type CheckInType = 'clean' | 'relapse';

export default function CheckInScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<CheckInType | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingCheckIn, setExistingCheckIn] = useState<CheckInType | null>(null);
  const [checking, setChecking] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    async function checkExisting() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('check_ins')
        .select('type, note')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();

      if (data) {
        setExistingCheckIn(data.type as CheckInType);
        setSelected(data.type as CheckInType);
        setNote(data.note ?? '');
      }
      setChecking(false);
    }
    checkExisting();
  }, [today]);

  async function handleSubmit() {
    if (!selected) {
      Alert.alert('Select status', 'Were you clean today or did you have a slip?');
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/');
      return;
    }

    const { error: checkInError } = await supabase.from('check_ins').upsert(
      {
        user_id: session.user.id,
        date: today,
        type: selected,
        note: note.trim() || null,
      },
      { onConflict: 'user_id,date' }
    );

    if (checkInError) {
      setLoading(false);
      Alert.alert('Error', checkInError.message);
      return;
    }

    // Reset streak if relapse
    if (selected === 'relapse') {
      await supabase
        .from('profiles')
        .update({ streak_start_date: today })
        .eq('user_id', session.user.id);
    }

    setLoading(false);
    setExistingCheckIn(selected);

    Alert.alert(
      selected === 'clean' ? '✅ Logged!' : '💔 Logged',
      selected === 'clean'
        ? 'Great work staying clean today. Keep building that streak!'
        : 'Thanks for being honest. Every honest day counts. Tomorrow is a fresh start.',
      [{ text: 'OK', onPress: () => router.push('/(tabs)/home') }]
    );
  }

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const isUpdate = existingCheckIn !== null;

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
          <View style={{ marginTop: 24, marginBottom: 32 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: theme.text, marginBottom: 6 }}>
              Daily Check-in
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>{todayFormatted}</Text>
            {isUpdate && (
              <Text style={{ color: theme.accentLight, fontSize: 13, marginTop: 6 }}>
                Already checked in today — update below if needed
              </Text>
            )}
          </View>

          {/* Status selector */}
          <Text style={{
            color: theme.textSecondary, fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
          }}>
            How was today?
          </Text>

          <View style={{ gap: 12, marginBottom: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: selected === 'clean' ? theme.successBg : theme.card,
                borderRadius: 14,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderWidth: 1.5,
                borderColor: selected === 'clean' ? theme.success : theme.border,
              }}
              onPress={() => setSelected('clean')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                  Stayed Clean
                </Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>
                  I resisted the urge today
                </Text>
              </View>
              {selected === 'clean' && (
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: theme.success,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: selected === 'relapse' ? theme.dangerBg : theme.card,
                borderRadius: 14,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderWidth: 1.5,
                borderColor: selected === 'relapse' ? theme.danger : theme.border,
              }}
              onPress={() => setSelected('relapse')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>💔</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                  Had a Slip
                </Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>
                  I relapsed — being honest with myself
                </Text>
              </View>
              {selected === 'relapse' && (
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: theme.danger,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Note input */}
          <Text style={{
            color: theme.textSecondary, fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
          }}>
            Notes (optional)
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
              minHeight: 100,
              textAlignVertical: 'top',
              lineHeight: 22,
            }}
            placeholder="What triggered you? What helped? Anything you want to remember..."
            placeholderTextColor={theme.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            keyboardAppearance="dark"
          />

          <TouchableOpacity
            style={{
              backgroundColor: loading || !selected ? theme.border : theme.accent,
              borderRadius: 14,
              padding: 17,
              alignItems: 'center',
              marginTop: 24,
            }}
            onPress={handleSubmit}
            disabled={loading || !selected}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              {loading ? 'Saving...' : isUpdate ? 'Update Check-in' : 'Submit Check-in'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
