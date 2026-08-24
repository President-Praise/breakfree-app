import { forwardRef, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
      return;
    }

    // Check if profile exists to route appropriately
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 8, paddingBottom: 32 }}>
            <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 30, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
            Welcome back
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 15, marginBottom: 40, lineHeight: 22 }}>
            Sign in to continue your journey
          </Text>

          <View style={{ gap: 20 }}>
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <InputField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: loading ? theme.border : theme.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 36,
              minHeight: 52,
              justifyContent: 'center',
            }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
            onPress={() => router.replace('/(auth)/signup')}
          >
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>
              Don't have an account?{' '}
              <Text style={{ color: theme.accent, fontWeight: '600' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InputField = forwardRef<TextInput, {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  returnKeyType?: 'default' | 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
}>(function InputField(
  { label, value, onChangeText, placeholder, keyboardType = 'default',
    secureTextEntry = false, returnKeyType, onSubmitEditing },
  ref,
) {
  return (
    <View>
      <Text style={{
        color: theme.textSecondary, fontSize: 12, fontWeight: '600',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
      }}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        style={{
          backgroundColor: theme.card,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: theme.text,
          fontSize: 16,
          borderWidth: 1,
          borderColor: theme.border,
          minHeight: 52,
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        keyboardType={keyboardType}
        keyboardAppearance="dark"
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
      />
    </View>
  );
});
