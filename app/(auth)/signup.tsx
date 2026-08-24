import { forwardRef, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleSignup() {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    router.replace('/(auth)/habits');
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
            Create account
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 15, marginBottom: 40, lineHeight: 22 }}>
            Start your journey to freedom today
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
              placeholder="At least 6 characters"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <InputField
              ref={confirmRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSignup}
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
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>
              Have an account?{' '}
              <Text style={{ color: theme.accent, fontWeight: '600' }}>Sign in</Text>
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
