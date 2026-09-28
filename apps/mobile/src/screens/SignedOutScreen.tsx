/**
 * What a signed-out person sees. Someone new to this device gets the welcome
 * screen and signs up from there. Someone who has signed in here before gets
 * the sign-in screen directly.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { readLastSignIn } from '../lib/lastSignIn';
import { colors } from '../theme/tokens';
import { Arrival, SignInScreen } from './SignInScreen';
import { WelcomeScreen } from './WelcomeScreen';

export function SignedOutScreen() {
  const [last, setLast] = useState<{ email: string | null; signedOut: boolean } | null>(null);
  /** Null shows the welcome screen. Otherwise the sign-in screen, worded for this arrival. */
  const [arrival, setArrival] = useState<Arrival | null>(null);

  useEffect(() => {
    let live = true;
    readLastSignIn().then(found => {
      if (!live) return;
      setLast(found);
      setArrival(found.signedOut ? 'signedOut' : found.email ? 'returning' : null);
    });
    return () => { live = false; };
  }, []);

  if (!last) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  if (arrival === null) {
    return <WelcomeScreen onStart={() => setArrival('new')} onSignIn={() => setArrival('returning')} />;
  }
  return (
    <SignInScreen
      key={arrival}
      arrival={arrival}
      initialEmail={last.email ?? ''}
      onWelcome={() => { setLast({ email: null, signedOut: false }); setArrival(null); }}
    />
  );
}
