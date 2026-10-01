/**
 * Root navigation: session gate, then three tabs (Home, Places, People).
 * The tab bar is React Navigation's own. The track is `tabBarBackground` and
 * the active pill is the active item's background.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconHome, IconPeople, IconPin } from '../components/Icons';
import { IncomingShares } from './IncomingShares';
import { OverlayHost } from './OverlayHost';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { OfflineScreen } from '../screens/OfflineScreen';
import { SignedOutScreen } from '../screens/SignedOutScreen';
import { useStash } from '../state/StashContext';
import { USE_MOCKS } from '../api/client';
import { devEmit } from '../lib/devBus';
import { setInside } from '../theme/sound';
import { switchMode, useFollowTheClock } from '../theme/clock';
import { colors, isNight, layout, radius, space, type } from '../theme/tokens';

const Tab = createBottomTabNavigator();

function tabItem(label: string, Icon: (p: { size?: number; color?: string }) => React.ReactElement) {
  return {
    tabBarLabel: ({ focused }: { focused: boolean }) => (
      <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
    ),
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <Icon size={22} color={focused ? colors.onFlare : colors.inkMuted} />
    ),
  };
}

const navigation = createNavigationContainerRef();

export function RootNavigator() {
  const { session, overlay, openPro, openOverlay, stash } = useStash();
  useFollowTheClock(
    session === 'loading' ? null : session === 'ready',
    overlay.kind === 'none',
    !USE_MOCKS,
  );
  const insets = useSafeAreaInsets();

  /**
   * Development only, for driving the app with `xcrun simctl openurl <device>`:
   * `ruckus://dev/pro` opens the paywall, `dev/reload` reloads the way the
   * theme switch does, `dev/tab/<Home|Places|People>` switches tab,
   * `dev/sheet/<detail|caper|add|none>` opens or closes a sheet, and `dev/scroll-end` sends
   * every scroll view on screen to its end.
   */
  useEffect(() => {
    if (!__DEV__ || session !== 'ready') return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url === 'ruckus://dev/pro') openPro();
      if (url === 'ruckus://dev/reload') switchMode(isNight ? 'night' : 'day');
      if (url === 'ruckus://dev/scroll-end') devEmit('scroll-end');
      const tab = url.match(/^ruckus:\/\/dev\/tab\/(Home|Places|People)$/)?.[1];
      if (tab && navigation.isReady()) navigation.navigate(tab as never);
      const sheet = url.match(/^ruckus:\/\/dev\/sheet\/(detail|caper|add|none)$/)?.[1];
      if (sheet === 'none') openOverlay({ kind: 'none' });
      const last = stash[stash.length - 1];
      if (sheet === 'add') openOverlay({ kind: 'add' });
      if ((sheet === 'detail' || sheet === 'caper') && last) openOverlay({ kind: sheet, id: last.id });
    });
    return () => sub.remove();
  }, [session, openPro, openOverlay, stash]);

  /** The music plays in the tabs only. */
  useEffect(() => { setInside(session === 'ready'); }, [session]);

  /** Signed out shows the welcome screen or sign in. Signed in with no Den shows onboarding. Otherwise the tabs. */
  if (session === 'loading') {
    return <View style={styles.splash}><ActivityIndicator color={colors.inkMuted} /></View>;
  }
  if (session === 'signedOut') return <SignedOutScreen />;
  if (session === 'offline') return <OfflineScreen />;
  if (session === 'noDen') return <OnboardingScreen />;

  return (
    <NavigationContainer ref={navigation}>
      <Tab.Navigator
        initialRouteName="Places"
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.bar,
            { height: layout.tabBar + insets.bottom, paddingBottom: insets.bottom },
          ],
          tabBarItemStyle: styles.item,
          tabBarLabelPosition: 'beside-icon',
          tabBarActiveBackgroundColor: colors.flare,
          tabBarActiveTintColor: colors.onFlare,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarBackground: () => <View style={styles.track} />,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={tabItem('Home', IconHome)} />
        <Tab.Screen name="Places" component={PlacesScreen} options={tabItem('Places', IconPin)} />
        <Tab.Screen name="People" component={PeopleScreen} options={tabItem('People', IconPeople)} />
      </Tab.Navigator>
      <OverlayHost />
      <IncomingShares />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  bar: {
    backgroundColor: colors.paper,
    borderTopWidth: 0, elevation: 0, shadowOpacity: 0,
    paddingTop: 10, paddingHorizontal: space.lg + 6,
  },
  /** Background pill behind the three tabs. 60 tall inside the 72 bar. */
  track: {
    position: 'absolute', top: 4, left: space.lg, right: space.lg, height: 60,
    borderRadius: radius.pill, backgroundColor: colors.paperSunk,
    borderWidth: 1.5, borderColor: colors.hairline,
  },
  item: { height: 48, borderRadius: radius.pill, overflow: 'hidden' },
  label: { ...type.tab, color: colors.inkMuted, marginLeft: 6 },
  labelOn: { color: colors.onFlare },
});
