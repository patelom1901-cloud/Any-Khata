import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role-select" />
      <Stack.Screen name="register-business" />
      <Stack.Screen name="pay-subscription" />
    </Stack>
  );
}
