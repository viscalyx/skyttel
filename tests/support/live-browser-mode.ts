import { expect } from 'vitest';
import { liveBrowserFixtureSource } from './live-browser.js';

/** Check UI disposal before restoring the external media substitute. */
export async function assertBrowserVoiceDisposedAndRestore(restoreMedia?: () => void) {
  if (!restoreMedia) return;
  try {
    // HouseholdMap/useVoice and the real SDK must dispose the native resources.
    // No fixture-owned stop can satisfy these checks.
    await expect.poll(() => window.skyttelVoiceFixture.stats().openPeers).toBe(0);
    const resources = window.skyttelVoiceFixture.stats();
    expect(resources.microphoneTracks.length).toBeGreaterThan(0);
    expect(resources.remoteTracks.length).toBeGreaterThan(0);
    expect(
      resources.microphoneTracks.every((track) => !track.enabled && track.state === 'ended'),
    ).toBe(true);
    expect(resources.remoteTracks.every((track) => track.state === 'ended')).toBe(true);
    expect(resources.audioElements).toBe(0);
  } finally {
    restoreMedia();
  }
}

/** The same external media fixture as integration, restored after UI disposal. */
export function installBrowserVoiceFixture() {
  const peer = window.RTCPeerConnection;
  const microphone = Object.getOwnPropertyDescriptor(navigator.mediaDevices, 'getUserMedia');
  const play = HTMLMediaElement.prototype.play;
  const pause = HTMLMediaElement.prototype.pause;
  const fixture = Object.getOwnPropertyDescriptor(window, 'skyttelVoiceFixture');
  const script = document.createElement('script');
  script.textContent = liveBrowserFixtureSource;
  document.head.append(script);
  script.remove();
  return () => {
    window.RTCPeerConnection = peer;
    if (microphone) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', microphone);
    else Reflect.deleteProperty(navigator.mediaDevices, 'getUserMedia');
    HTMLMediaElement.prototype.play = play;
    HTMLMediaElement.prototype.pause = pause;
    if (fixture) Object.defineProperty(window, 'skyttelVoiceFixture', fixture);
    else Reflect.deleteProperty(window, 'skyttelVoiceFixture');
  };
}
