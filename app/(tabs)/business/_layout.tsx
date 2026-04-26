import { Stack } from 'expo-router';

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}
