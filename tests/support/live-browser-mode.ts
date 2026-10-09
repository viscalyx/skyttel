import { liveBrowserFixtureSource } from './live-browser.js';

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
