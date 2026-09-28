import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Baloo2_700Bold, Baloo2_800ExtraBold, useFonts } from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StashProvider } from './src/state/StashContext';
import { configureBilling } from './src/billing/purchases';
import { colors, isNight } from './src/theme/tokens';

/** Runs before the first render so billing is configured before the session calls logIn. */
configureBilling();

export default function App() {
  /** Baloo 2 is for display and labels, Nunito for body text. Fonts are loaded at runtime with useFonts. */
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} backgroundColor={colors.paper} />
        <StashProvider>
          <RootNavigator />
        </StashProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
