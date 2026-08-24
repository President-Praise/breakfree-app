import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
