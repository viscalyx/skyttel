/** Console preparation for the disposable voice fixture, never a deployment. */
export const voiceControlsPreparationSource = `(() => {
  if (!window.skyttelVoiceFixture)
    throw new Error('Start scripts/manual-voice.ts before installing these controls.');
  if (window.skyttelVoicePreparation)
    throw new Error('Restore the existing controls before installing again.');
  const original = window.fetch;
  let selected;
  let held;
  window.fetch = async function(input, init) {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (request.method === 'POST' && selected && path.endsWith('/' + selected)) {
      const route = selected;
      selected = undefined;
      await new Promise(resolve => { held = { route, release: resolve }; });
      held = undefined;
    }
    return original.call(window, input, init);
  };
  window.skyttelVoicePreparation = {
    hold(route) {
      if (!['voice', 'text-assistant'].includes(route) || selected || held)
        throw new Error('Choose voice or text-assistant with no pending hold.');
      selected = route;
    },
    status() { return { armed: selected || null, held: held ? held.route : null }; },
    release() {
      if (!held) throw new Error('Wait for status().held before release.');
      held.release();
    },
    restore() {
      selected = undefined;
      if (held) held.release();
      window.fetch = original;
      delete window.skyttelVoicePreparation;
    }
  };
})()`;

/** Arm fictional tones before the human holds the native pointer. */
export const voiceTonePreparationSource = `(() => {
  if (!window.skyttelVoiceFixture || window.voiceToneCleanup)
    throw new Error('Use a fresh controlled page before installing tones.');
  const button = document.querySelector('.workspace-talk');
  if (!button) throw new Error('Wait for Prata med Skyttel.');
  let timer;
  const down = () => {
    timer = setInterval(() => {
      if (window.skyttelVoiceFixture.stats().microphoneTracks.some(track => track.enabled)) {
        window.skyttelVoiceFixture.setMicrophoneTone(440);
        clearInterval(timer);
      }
    }, 10);
  };
  const up = () => {
    clearInterval(timer);
    window.skyttelVoiceFixture.setMicrophoneTone(880);
  };
  button.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.voiceToneCleanup = () => {
    clearInterval(timer);
    button.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
    delete window.voiceToneCleanup;
  };
})()`;

declare global {
  interface Window {
    voiceToneCleanup?: () => void;
    skyttelVoicePreparation?: {
      hold: (route: 'voice' | 'text-assistant') => void;
      status: () => { armed: string | null; held: string | null };
      release: () => void;
      restore: () => void;
    };
  }
}
