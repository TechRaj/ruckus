/**
 * Loads the app after the entered flag has been read. The palette is fixed
 * when tokens is first imported, so App must not be imported before that.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { readEntered } from './src/theme/entered';

export default function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    readEntered().then(() => {
      setApp(() => (require('./App') as { default: ComponentType }).default);
    });
  }, []);

  return App ? <App /> : <View style={{ flex: 1, backgroundColor: '#FFF9E8' }} />;
}
