import { Stack } from 'expo-router';

export default function CustomerDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-entry" />
      <Stack.Screen name="add-payment" />
    </Stack>
  );
}
