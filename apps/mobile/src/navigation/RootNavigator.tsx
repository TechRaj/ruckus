/**
 * Three destinations — brief §25, corrected in §13.6.
 *
 * The third tab is People, not Den: a Den is an object a person can hold
 * several of, so it can't be the destination. Profile lives under People
 * rather than taking a tab.
 *
 * The active tab is tangerine. That reverses an earlier call to reserve the
 * colour strictly for "tappable" — on a three-item bar the discipline bought
 * nothing and cost the bar its life.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconHome, IconPeople, IconPin } from '../components/Icons';
import { OverlayHost } from './OverlayHost';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { useStash } from '../state/StashContext';
import { colors, layout, type } from '../theme/tokens';

const Tab = createBottomTabNavigator();

function tabItem(label: string, Icon: (p: { size?: number; color?: string }) => React.ReactElement) {
  return {
    tabBarLabel: ({ focused }: { focused: boolean }) => (
      <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
    ),
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <Icon size={24} color={focused ? colors.flare : colors.inkMuted} />
    ),
  };
}

export function RootNavigator() {
  const { session } = useStash();
  const insets = useSafeAreaInsets();

  /** Signed out → sign in. Signed in with no Den → onboarding. Otherwise the app. */
  if (session === 'loading') {
    return <View style={styles.splash}><ActivityIndicator color={colors.inkMuted} /></View>;
  }
  if (session === 'signedOut') return <SignInScreen />;
  if (session === 'noDen') return <OnboardingScreen />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Places"
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.bar,
            { height: layout.tabBar + insets.bottom, paddingBottom: insets.bottom },
          ],
          tabBarItemStyle: styles.item,
          tabBarActiveTintColor: colors.flare,
          tabBarInactiveTintColor: colors.inkMuted,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={tabItem('Home', IconHome)} />
        <Tab.Screen name="Places" component={PlacesScreen} options={tabItem('Places', IconPin)} />
        <Tab.Screen name="People" component={PeopleScreen} options={tabItem('People', IconPeople)} />
      </Tab.Navigator>
      <OverlayHost />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  bar: {
    backgroundColor: colors.paper,
    borderTopColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
  },
  item: { paddingTop: 0 },
  label: { ...type.tab, color: colors.inkMuted, marginTop: 2 },
  labelOn: { color: colors.flare, fontFamily: type.button.fontFamily },
});
