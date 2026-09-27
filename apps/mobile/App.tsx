import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fredoka_600SemiBold, useFonts } from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StashProvider } from './src/state/StashContext';
import { configureBilling } from './src/billing/purchases';
import { colors } from './src/theme/tokens';

/** Before the first render, so the session's logIn never races it. */
configureBilling();

export default function App() {
  /**
   * Fredoka carries display, Nunito body, and Plex Mono is the third voice —
   * kickers, hints, and everything Rascal says (the tank pass, 16 Sep).
   * Loading at runtime rather than through the config plugin keeps this
   * running in Expo Go, which is the whole point until the share extension
   * forces a development build (§11.3).
   */
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <StashProvider>
          <RootNavigator />
        </StashProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
