import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

const FEATURES = [
  { icon: '🔥', title: 'Track Your Streak', desc: 'Count every clean day and build momentum' },
  { icon: '✅', title: 'Daily Check-ins', desc: 'Stay honest and accountable with yourself' },
  { icon: '📊', title: 'See Your Progress', desc: 'Visualize how far you\'ve come over time' },
];

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('habit_type')
        .eq('user_id', session.user.id)
        .single();

      if (data?.habit_type) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/habits');
      }
    } catch {
      setShowOnboarding(true);
      setLoading(false);
    }
  }

  if (loading && !showOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', marginTop: 56, marginBottom: 52 }}>
          <Text style={{ fontSize: 60, marginBottom: 14 }}>⛓️‍💥</Text>
          <Text style={{ fontSize: 38, fontWeight: '800', color: theme.text, letterSpacing: -1 }}>
            BreakFree
          </Text>
          <Text style={{
            fontSize: 16, color: theme.textMuted, marginTop: 12,
            textAlign: 'center', lineHeight: 26,
          }}>
            Quit compulsive habits.{'\n'}Reclaim your life.
          </Text>
        </View>

        {/* Features */}
        <View style={{ gap: 12, marginBottom: 52 }}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 28 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{f.title}</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              minHeight: 52,
              justifyContent: 'center',
            }}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              Get Started — Free
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              minHeight: 52,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
              Already have an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
