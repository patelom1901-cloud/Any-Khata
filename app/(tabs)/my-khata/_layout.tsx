import { Stack } from 'expo-router';

export default function MyKhataLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[businessId]" />
    </Stack>
  );
}
