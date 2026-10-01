/**
 * Sign up or sign in with an emailed 6-digit code. Both are the same steps;
 * only the wording differs. Sign in with Apple needs the paid
 * Developer Program. Rascal stands beside the form and hops once when the
 * code is accepted.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, USE_MOCKS } from '../api/client';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { Field, Hint, keyboardDismissMode, Kicker } from '../components/Chrome';
import { Grain } from '../components/Grain';
import { Sprite } from '../components/Sprite';
import { forgetEmail, rememberEmail } from '../lib/lastSignIn';
import { lines } from '../theme/lines';
import { legalLinks, openLink } from '../lib/links';
import { useStash } from '../state/StashContext';
import { useReduceMotion } from '../theme/motion';
import { playFail } from '../theme/sound';
import { jump, jumpHop, jumpHopMs, jumpIdle } from '../theme/sprites';
import { colors, font, radius, space, type } from '../theme/tokens';

type Step = 'email' | 'code' | 'welcome';
/** Signing up from the welcome screen, signing back in, or straight after signing out. */
export type Arrival = 'new' | 'returning' | 'signedOut';

const DIGITS = 6;
/** Seconds before another code can be requested. Supabase limits how often it sends one. */
const RESEND_AFTER = 60;
const RASCAL = 112;

const HEADING: Record<Arrival, { kicker: string; title: string }> = {
  new: { kicker: 'Get started', title: 'Your email' },
  returning: { kicker: 'Sign in', title: 'Welcome back' },
  signedOut: { kicker: 'Signed out', title: 'See you soon' },
};

export function SignInScreen({
  arrival, initialEmail, onWelcome,
}: {
  arrival: Arrival;
  initialEmail: string;
  /** Back to the welcome screen. */
  onWelcome: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { refreshSession } = useStash();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(arrival === 'new' ? '' : initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True after a rejected code. The digits stay on screen until the next key press. */
  const [rejected, setRejected] = useState(false);
  const [wait, setWait] = useState(0);
  const [welcome, setWelcome] = useState<{ name: string | null; den: string } | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const enter = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (enter.current) clearTimeout(enter.current); }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboard(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendCode = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setError("that doesn't look like an email."); return; }
    setBusy(true); setError(null);
    try {
      await api.auth.sendCode(e);
      setCode(''); setRejected(false);
      setWait(RESEND_AFTER);
      setStep('code');
    } catch (err) {
      if ((err as { code?: string }).code === 'too_many_codes') {
        // Too soon for another email means one went out a moment ago, and it
        // still works. Go to the code boxes rather than leave them stuck here.
        setCode(''); setRejected(false);
        setWait(RESEND_AFTER);
        setStep('code');
        setError(lines.codeAlreadySent);
        return;
      }
      setError(messageOf(err));
      playFail();
    } finally {
      setBusy(false);
    }
  };

  const onCode = (value: string) => {
    const typed = value.replace(/\D/g, '');
    /** After a rejected code, a new digit starts a fresh code instead of being ignored as a seventh. */
    const next = (rejected && typed.length > code.length ? typed.slice(code.length) : typed).slice(0, DIGITS);
    setCode(next);
    if (rejected) { setRejected(false); setError(null); }
    // The number pad has no return key, so dismiss the keyboard at six digits
    // to make the Sign in button reachable.
    if (next.length === DIGITS) Keyboard.dismiss();
  };

  const verify = async () => {
    const e = email.trim();
    setBusy(true); setError(null);
    Keyboard.dismiss();
    try {
      const me = await api.auth.verifyCode(e, code);
      rememberEmail(e);
      const dens = await api.myDens().catch(() => []);
      /** Someone with no Den goes to onboarding, which has its own welcome. */
      if (dens.length === 0) { await refreshSession(); return; }
      setWelcome({
        name: dens[0].members.find(m => m.userId === me)?.displayName ?? null,
        den: dens[0].name,
      });
      setStep('welcome');
      enter.current = setTimeout(() => { refreshSession(); }, reduce ? 700 : jumpHopMs + 200);
    } catch (err) {
      setError(messageOf(err));
      playFail();
      setRejected(true);
      setBusy(false);
    }
  };

  const useAnotherEmail = () => {
    setEmail(''); setCode(''); setError(null); setRejected(false);
    setStep('email');
  };
  /** Forgets this device's email, so the app starts from the welcome screen. */
  const startOver = () => { forgetEmail(); onWelcome(); };

  if (step === 'welcome') {
    return (
      <View style={[styles.avoid, styles.welcome]}>
        <Grain opacity={0.035} />
        <Sprite
          sheet={jump} steps={jumpHop} loop={false} width={180}
          accessibilityLabel="Rascal hopping"
        />
        <Text style={styles.welcomeTitle}>
          {welcome?.name ? `Welcome back, ${welcome.name}` : 'Welcome back'}
        </Text>
        <Hint>{`opening ${(welcome?.den ?? 'your den').toLowerCase()}`}</Hint>
      </View>
    );
  }

  const heading = HEADING[arrival];

  return (
    <KeyboardAvoidingView style={styles.avoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/**
        * The insets are applied to an inner view. KeyboardAvoidingView overwrites
        * paddingBottom in its own style, so padding set on it directly is lost
        * and the button sits under the home indicator.
        */}
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <Grain opacity={0.035} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.hero, keyboard && styles.heroKeyboard]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      >
          <Sprite sheet={jump} steps={jumpIdle} width={RASCAL} style={[styles.rascal, keyboard && styles.rascalKeyboard]} accessibilityLabel="Rascal" />
          <Kicker>{step === 'email' ? heading.kicker : 'Sign in'}</Kicker>
          <Text style={styles.title}>{step === 'email' ? heading.title : 'Check your email'}</Text>
          <Text style={styles.sub}>
            {step === 'email'
              ? "We'll email you a six-digit code."
              : <>We sent six digits to <Text style={styles.strong}>{email.trim()}</Text>.</>}
          </Text>
          <View style={{ height: space.xl }} />
          {step === 'email' ? (
            <Field
              label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
              keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
              autoFocus={email.length === 0}
            />
          ) : (
            <View>
              <View style={styles.boxes}>
                {Array.from({ length: DIGITS }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      code[i] ? styles.boxFull : null,
                      !rejected && i === code.length ? styles.boxNext : null,
                      rejected ? styles.boxBad : null,
                    ]}
                  >
                    <Text style={styles.digit}>{code[i] ?? ''}</Text>
                  </View>
                ))}
              </View>
              {/* One invisible field over the boxes takes the typing, so autofill from Mail and paste still work. */}
              <TextInput
                value={code}
                onChangeText={onCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
                caretHidden
                accessibilityLabel="Six-digit code"
                style={styles.codeInput}
              />
            </View>
          )}
          {error ? <Hint style={styles.error}>{error}</Hint> : null}
          {step === 'code' && !error && wait > 0
            ? <Hint style={styles.note}>{`send again in 0:${String(wait).padStart(2, '0')}`}</Hint> : null}
          {step === 'email' && !keyboard ? <TermsNote /> : null}
          {USE_MOCKS ? <Hint style={styles.note}>mock mode: any email, any six digits</Hint> : null}
      </ScrollView>
      {step === 'email' ? (
        <>
          {keyboard ? <TermsNote aboveButton /> : null}
          <PrimaryButton label="Send a code" onPress={sendCode} loading={busy} disabled={busy} />
          {arrival === 'new'
            ? <TextButton label="Back" onPress={onWelcome} muted />
            : <TextButton label="New here? Get started" onPress={startOver} muted />}
        </>
      ) : (
        <>
          <PrimaryButton label="Sign in" onPress={verify} loading={busy} disabled={busy || rejected || code.length < DIGITS} />
          {wait > 0
            ? <TextButton label="Use a different email" onPress={useAnotherEmail} muted />
            : <TextButton label="Send a new code" onPress={sendCode} />}
        </>
      )}
      </View>
    </KeyboardAvoidingView>
  );
}

/** App Review wants the terms agreed to before anyone can post (guideline 1.2). */
function TermsNote({ aboveButton = false }: { aboveButton?: boolean }) {
  return (
    <Text style={[styles.terms, aboveButton && styles.termsAboveButton]}>
      by continuing you agree to the{' '}
      <Text style={styles.link} accessibilityRole="link" onPress={() => openLink(legalLinks.terms)}>terms</Text>
      {' '}and{' '}
      <Text style={styles.link} accessibilityRole="link" onPress={() => openLink(legalLinks.privacy)}>privacy policy</Text>.
      {' '}no bullying or hateful posts.
    </Text>
  );
}

const messageOf = (err: unknown) =>
  (err instanceof Error && err.message) ? err.message.toLowerCase() : 'something went wrong. try again.';

const styles = StyleSheet.create({
  avoid: { flex: 1, backgroundColor: colors.paper },
  root: { flex: 1, paddingHorizontal: space.xl },
  scroll: { flex: 1 },
  hero: { flexGrow: 1, justifyContent: 'center' },
  heroKeyboard: { justifyContent: 'flex-start' },
  /**
   * The frame has empty room above his head for the hop, so it is pulled up
   * to close the gap. No negative side margin: the scroll view clips anything
   * outside its own width.
   */
  rascal: { marginTop: -40, marginBottom: space.xs },
  rascalKeyboard: { marginTop: 0 },
  title: { ...type.display, color: colors.ink, marginTop: 6 },
  sub: { ...type.body, color: colors.inkMuted, marginTop: 10, maxWidth: 300 },
  strong: { fontFamily: font.bold, color: colors.ink },
  boxes: { flexDirection: 'row', gap: space.sm },
  box: {
    flex: 1, height: 60, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFull: { backgroundColor: colors.paperSunk },
  boxNext: { borderColor: colors.flareDeep, borderWidth: 2.5 },
  boxBad: { borderColor: colors.warn, backgroundColor: colors.paper },
  digit: { fontFamily: font.display, fontSize: 26, lineHeight: 34, color: colors.ink, fontVariant: ['tabular-nums'] },
  /** Covers the boxes and is invisible. Opacity above zero keeps it tappable. */
  codeInput: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.02, color: 'transparent',
  },
  error: { color: colors.warn, marginTop: space.md },
  note: { marginTop: space.md },
  terms: { ...type.hint, color: colors.inkMuted, marginTop: space.md },
  termsAboveButton: { marginBottom: space.md },
  link: { textDecorationLine: 'underline' },
  welcome: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.xs },
  welcomeTitle: { ...type.display, color: colors.ink, textAlign: 'center', marginTop: space.sm },
});
