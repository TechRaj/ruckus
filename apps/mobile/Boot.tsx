/**
 * Loads the app after the entered flag has been read. The palette is fixed
 * when tokens is first imported, so App must not be imported before that.
 *
 * Also the last line of defence: in a release build an error thrown while
 * loading or rendering closes the app (build 1 did exactly that, on a bad
 * Supabase URL). Here it shows a screen saying so instead.
 */
import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import { readEntered } from './src/theme/entered';
import { prepareSounds, readSoundChoice } from './src/theme/sound';

export default function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    Promise.all([readEntered(), readSoundChoice()]).then(() => {
      let Loaded: ComponentType;
      try {
        Loaded = (require('./App') as { default: ComponentType }).default;
      } catch (err) {
        console.error('[boot] the app failed to load', err);
        Loaded = Broken;
      }
      setApp(() => Loaded);
      prepareSounds();
    });
  }, []);

  return App
    ? <Guard><App /></Guard>
    : <View style={{ flex: 1, backgroundColor: PAPER }} />;
}

class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('[boot] render failed', err); }
  render() { return this.state.failed ? <Broken /> : this.props.children; }
}

/** Plain styles on purpose: tokens may be the thing that failed to load. */
const PAPER = '#FFF9E8';
const INK = '#5B4636';
const SUPPORT = 'support.ruckus@gmail.com';

function Broken() {
  return (
    <View style={{ flex: 1, backgroundColor: PAPER, justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: INK }}>Something went wrong</Text>
      <Text style={{ fontSize: 17, lineHeight: 24, color: INK, marginTop: 10 }}>
        Close Ruckus and open it again. If this keeps happening, email{' '}
        <Text style={{ textDecorationLine: 'underline' }} onPress={() => { Linking.openURL(`mailto:${SUPPORT}`).catch(() => {}); }}>
          {SUPPORT}
        </Text>.
      </Text>
    </View>
  );
}
