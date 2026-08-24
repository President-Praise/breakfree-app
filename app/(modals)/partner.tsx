import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';

const STORAGE_KEY = 'breakfree_partner_name';

export default function PartnerScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setName(val);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const trimmed = name.trim();
    if (trimmed) {
      await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    setSaving(false);
    router.back();
  }

  async function handleRemove() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setName('');
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
              Accountability Partner
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{ padding: 12 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Intro */}
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 14,
            padding: 18,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: theme.borderLight,
            borderLeftWidth: 3,
            borderLeftColor: theme.accent,
          }}>
            <Text style={{ fontSize: 22, marginBottom: 10 }}>🤝</Text>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
              Stay accountable together
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20 }}>
              Add someone who's cheering you on. We'll use your phone's share sheet to send them updates — no account needed.
            </Text>
          </View>

          {/* Name input */}
          <Text style={{
            color: theme.textSecondary, fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
          }}>
            Partner's name
          </Text>
          <TextInput
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
              marginBottom: 8,
            }}
            placeholder="e.g. Alex, Mum, Coach David..."
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            keyboardAppearance="dark"
          />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 32, lineHeight: 18 }}>
            We'll use your phone's share sheet to send them updates
          </Text>

          {/* Save */}
          <TouchableOpacity
            style={{
              backgroundColor: name.trim() ? theme.accent : theme.border,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 12,
              minHeight: 52,
              justifyContent: 'center',
            }}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save</Text>
            }
          </TouchableOpacity>

          {/* Remove (only if a name was previously saved) */}
          {name.trim().length > 0 && (
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 14 }}
              onPress={handleRemove}
              activeOpacity={0.6}
            >
              <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '600' }}>Remove partner</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
