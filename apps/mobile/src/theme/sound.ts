/**
 * The app's sounds, next to the haptics in motion.ts. Three short clips, each
 * tied to one kind of moment, so a sound always means the same thing:
 *
 *   tap      pressing anything: a button, a row, a pin, a critter
 *   confirm  a save or a Caper landing
 *   fail     something that did not work
 *
 * plus the music, which loops quietly while the user is inside the app.
 *
 * Each clip keeps two players wound back to the start, and a tap plays
 * whichever is ready: seeking on the tap itself lands late or not at all. The
 * audio session stays open between sounds for the same reason. Everything
 * mixes with other apps' audio and respects the silent switch. The sounds
 * choice on the People screen is read at boot. The music is on every time
 * the user comes into the app; the speaker on the map mutes it until then.
 *
 * The day/night switch reloads the whole app, which would start the music
 * over. Its position is saved every few seconds and right before a reload,
 * and the next run picks up from there.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const clips = {
  tap: { file: require('../../assets/sounds/tap.wav'), volume: 0.4 },
  confirm: { file: require('../../assets/sounds/confirm.wav'), volume: 0.25 },
  fail: { file: require('../../assets/sounds/fail.wav'), volume: 0.4 },
};
type Clip = keyof typeof clips;
const music = { file: require('../../assets/sounds/ruckus_bgm.mp3'), volume: 0.18 };

/** Three per clip: enough for quick repeated taps while the first winds back. */
const VOICES = 3;
const SOUND = 'ruckus.sound';
const MUSIC_AT = 'ruckus.musicAt';
/** How often the music position is saved, for the reloads nothing announces. */
const SAVE_EVERY_MS = 4000;

let sounds = true;
let musicChoice = true;
type Voice = { player: AudioPlayer; ready: boolean };
const voices: Partial<Record<Clip, Voice[]>> = {};
let band: AudioPlayer | null = null;

/**
 * Players outlive this module when the bundler reloads it in development.
 * Without this the old music keeps playing and the button reaches only the
 * new one.
 */
const held = globalThis as { __ruckusPlayers?: AudioPlayer[] };
for (const p of held.__ruckusPlayers ?? []) { try { p.remove(); } catch { /* already gone */ } }
held.__ruckusPlayers = [];
const hold = (p: AudioPlayer) => { held.__ruckusPlayers?.push(p); return p; };
/** True while the user is inside the app, where the music belongs. */
let inside = false;
let session = false;
/** Where the music was when the app last ran, in seconds. */
let musicAt = 0;

export const soundOn = () => sounds;
export const musicOn = () => musicChoice;

/** The speaker on the map and the switch on People both show the music choice, so each hears the other's change. */
const musicListeners = new Set<(on: boolean) => void>();
const announceMusic = () => { for (const cb of musicListeners) cb(musicChoice); };

export function useMusicOn() {
  const [on, setOn] = useState(musicChoice);
  useEffect(() => {
    musicListeners.add(setOn);
    return () => { musicListeners.delete(setOn); };
  }, []);
  return on;
}

export async function readSoundChoice() {
  try {
    const [[, s], [, at]] = await AsyncStorage.multiGet([SOUND, MUSIC_AT]);
    sounds = s !== 'off';
    musicAt = Number(at) || 0;
  } catch {
    sounds = true;
    musicAt = 0;
  }
}

/** Saves where the music is. Call before a reload; it also runs on a timer while playing. */
export async function saveMusicPosition() {
  if (!band?.playing) return;
  try { await AsyncStorage.setItem(MUSIC_AT, String(band.currentTime)); } catch { /* it starts over next time */ }
}

export async function chooseSound(next: boolean) {
  sounds = next;
  try { await AsyncStorage.setItem(SOUND, next ? 'on' : 'off'); } catch { /* the choice lasts until the app closes */ }
}

export function chooseMusic(next: boolean) {
  musicChoice = next;
  announceMusic();
  playMusicIfWanted();
}

/** Opens the audio session and winds every voice to the start, so the first sound is on time. Safe to call again. */
export async function prepareSounds() {
  if (session) return;
  session = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false, interruptionMode: 'mixWithOthers', allowsRecording: false, shouldPlayInBackground: false,
    });
    for (const name of Object.keys(clips) as Clip[]) {
      voices[name] = Array.from({ length: VOICES }, () => wind(name));
    }
  } catch { /* no sound on this device */ }
  AppState.addEventListener('change', state => {
    if (state === 'active') playMusicIfWanted();
    else { saveMusicPosition(); band?.pause(); }
  });
  setInterval(saveMusicPosition, SAVE_EVERY_MS);
}

function wind(name: Clip): Voice {
  const player = hold(createAudioPlayer(clips[name].file, { keepAudioSessionActive: true }));
  player.volume = clips[name].volume;
  const voice: Voice = { player, ready: true };
  player.addListener('playbackStatusUpdate', status => {
    if (!status.didJustFinish) return;
    player.seekTo(0).then(() => { voice.ready = true; }).catch(() => {});
  });
  return voice;
}

function play(name: Clip) {
  if (!sounds) return;
  try {
    const pool = voices[name] ?? (voices[name] = []);
    let voice = pool.find(v => v.ready);
    /** Every voice still winding back: add one. It starts a little late this once and joins the pool. */
    if (!voice) { voice = wind(name); pool.push(voice); }
    voice.ready = false;
    voice.player.play();
  } catch { /* a missed sound is not worth an error */ }
}

export const playTap = () => play('tap');
export const playConfirm = () => play('confirm');
export const playFail = () => play('fail');

/** The tabs call this with true, sign-in and onboarding with false. Coming in turns the music back on. */
export function setInside(next: boolean) {
  if (next && !inside) { musicChoice = true; announceMusic(); }
  inside = next;
  playMusicIfWanted();
}

function playMusicIfWanted() {
  try {
    if (!inside || !musicChoice) { band?.pause(); return; }
    if (!band) {
      band = hold(createAudioPlayer(music.file, { keepAudioSessionActive: true }));
      band.loop = true;
      band.volume = music.volume;
      if (musicAt > 0) {
        const b = band;
        b.seekTo(musicAt).then(() => { if (inside && musicChoice && !b.playing) b.play(); }).catch(() => b.play());
        return;
      }
    }
    if (!band.playing) band.play();
  } catch { /* no music on this device */ }
}
