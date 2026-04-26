import { Stack } from 'expo-router';

export default function AdSubmitLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pay" />
    </Stack>
  );
}
