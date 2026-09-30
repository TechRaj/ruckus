/**
 * Loads the app after the entered flag has been read. The palette is fixed
 * when tokens is first imported, so App must not be imported before that.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { readEntered } from './src/theme/entered';
import { prepareSounds, readSoundChoice } from './src/theme/sound';

export default function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    Promise.all([readEntered(), readSoundChoice()]).then(() => {
      setApp(() => (require('./App') as { default: ComponentType }).default);
      prepareSounds();
    });
  }, []);

  return App ? <App /> : <View style={{ flex: 1, backgroundColor: '#FFF9E8' }} />;
}
