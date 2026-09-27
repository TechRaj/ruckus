/**
 * Sign in — an emailed 6-digit code, not Sign in with Apple (which needs the
 * paid Developer Program). Two steps on one screen: email, then the code.
 * On success the session refreshes and the navigator moves on by itself.
 */
import { useState } from 'react';
import {
  Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, USE_MOCKS } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Field, Hint, keyboardDismissMode, Kicker } from '../components/Chrome';
import { Grain } from '../components/Grain';
import { RASCAL_ASPECT, rascal } from '../theme/critters';
import { useStash } from '../state/StashContext';
import { colors, space, type } from '../theme/tokens';

type Step = 'email' | 'code';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { refreshSession } = useStash();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setError("that doesn't look like an email."); return; }
    setBusy(true); setError(null);
    try {
      await api.auth.sendCode(e);
      setStep('code');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const onCode = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    // The number pad has no return key, so six digits is the "done" the email
    // keyboard gets from its own. Dismiss so Sign in is reachable.
    if (next.length === 6) Keyboard.dismiss();
  };

  const verify = async () => {
    setBusy(true); setError(null);
    Keyboard.dismiss();
    try {
      await api.auth.verifyCode(email.trim(), code.trim());
      await refreshSession();
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Grain opacity={0.035} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.hero}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      >
          <Image source={rascal} style={styles.rascal} resizeMode="contain" />
          <Kicker>Sign in</Kicker>
          <Text style={styles.title}>{step === 'email' ? 'Your email' : 'The code we sent'}</Text>
          <Text style={styles.sub}>
            {step === 'email'
              ? "We'll email you a six-digit code. No password."
              : `Sent to ${email.trim()}. It's six digits.`}
          </Text>
          <View style={{ height: space.xl }} />
          {step === 'email' ? (
            <Field
              label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
              keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" autoFocus
            />
          ) : (
            <Field
              label="Code" value={code} onChangeText={onCode} placeholder="123456"
              keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus
            />
          )}
          {error ? <Hint style={styles.error}>{error}</Hint> : null}
          {USE_MOCKS ? <Hint style={styles.mock}>mock mode: any email, any six digits</Hint> : null}
      </ScrollView>
      {step === 'email' ? (
        <PrimaryButton label="Send a code" onPress={sendCode} loading={busy} disabled={busy} />
      ) : (
        <>
          <PrimaryButton label="Sign in" onPress={verify} loading={busy} disabled={busy || code.trim().length < 6} />
          <TextButton label="Use a different email" onPress={() => { setStep('email'); setCode(''); setError(null); }} muted />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const messageOf = (err: unknown) =>
  (err instanceof Error && err.message) ? err.message.toLowerCase() : 'something went wrong. try again.';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.xl },
  scroll: { flex: 1 },
  hero: { flexGrow: 1, justifyContent: 'center' },
  rascal: { width: 120, height: 120 / RASCAL_ASPECT, marginBottom: space.lg, marginLeft: -6 },
  title: { ...type.display, color: colors.ink, marginTop: 6 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 10, maxWidth: 300 },
  error: { color: colors.flare, marginTop: space.md },
  mock: { marginTop: space.md },
});
