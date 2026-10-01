/*
 * PROTOTYPE - throwaway code, not production code. No tests, no server, no persistence.
 *
 * Parts for VoiceModePrototype.tsx (viscalyx/skyttel#191): the mobile variants, the waveforms, the
 * microphone level, the conversation notices and the variant switcher.
 */
import { useEffect, useRef } from 'react';

/** The parts of the voice mode. The decision of viscalyx/skyttel#179 chose one value for each. */
export type Parts = {
  vag: 'staplar' | 'linje' | 'puls';
  notis: 'kort' | 'fast' | 'rad';
  symbol: 'situation' | 'slag';
  markering: 'prick' | 'tecken' | 'ram';
  stang: 'knapp' | 'utanfor' | 'tid';
  knapp: 'stopp' | 'mikrofon';
};
export const chosen: Parts = {
  vag: 'staplar',
  notis: 'kort',
  symbol: 'situation',
  markering: 'tecken',
  stang: 'knapp',
  knapp: 'mikrofon',
};

/** The parts that the mobile variants disagree about. Each one can also be set alone in the URL. */
export const options = {
  plats: {
    under: 'Under verktygsraden',
    rad: 'I verktygsraden',
    nere: 'Vid nederkanten',
  },
  kort: {
    rullar: 'Allt står kvar och rullar',
    kompakt: 'Rubrik och utkastknapp på en rad',
    fokus: 'Bara samtalstext och fält medan man skriver',
  },
} as const;
export type Axis = keyof typeof options;
export type MobileParts = { [K in Axis]: keyof (typeof options)[K] };
export const axisNames: Record<Axis, string> = {
  plats: 'Röstrutans och notisens plats på smal skärm',
  kort: 'Textvyn i ett kort fönster',
};

export const variants = {
  // The design that the decision of viscalyx/skyttel#191 chose: the place of C, the text view of B.
  V: { name: 'Vald utformning', plats: 'nere', kort: 'kompakt' },
  A: { name: 'Under verktygsraden', plats: 'under', kort: 'rullar' },
  B: { name: 'I verktygsraden', plats: 'rad', kort: 'kompakt' },
  C: { name: 'Vid nederkanten', plats: 'nere', kort: 'fokus' },
} as const satisfies Record<string, { name: string } & MobileParts>;
export type VariantKey = keyof typeof variants;
export const variantKeys = Object.keys(variants) as VariantKey[];

/** The variant gives every part its value; a part named in the URL replaces that value. */
export function readParts(params: URLSearchParams): { variant: VariantKey; mobile: MobileParts } {
  const asked = params.get('variant')?.toUpperCase() ?? 'V';
  const variant = variantKeys.includes(asked as VariantKey) ? (asked as VariantKey) : 'V';
  const mobile: Record<string, string> = { ...variants[variant] };
  for (const axis of Object.keys(options) as Axis[]) {
    const value = params.get(axis);
    if (value && value in options[axis]) mobile[axis] = value;
  }
  return { variant, mobile: mobile as MobileParts };
}

/**
 * The screens of the phone frame, in CSS pixels, with the height that an on-screen keyboard takes.
 * The keyboard heights are rough values for an iPhone and an iPad, not measured ones.
 */
export const screens = {
  telefon: { label: 'Telefon, stående (390 × 844)', width: 390, height: 844, keyboard: 336 },
  liten: { label: 'Liten telefon, stående (375 × 667)', width: 375, height: 667, keyboard: 260 },
  liggande: { label: 'Telefon, liggande (844 × 390)', width: 844, height: 390, keyboard: 200 },
  ipad: { label: 'iPad, stående (820 × 1180)', width: 820, height: 1180, keyboard: 330 },
  'ipad-liggande': {
    label: 'iPad, liggande (1180 × 820)',
    width: 1180,
    height: 820,
    keyboard: 400,
  },
} as const;
export type ScreenKey = keyof typeof screens;

/* The microphone level ------------------------------------------------------------------------- */

export type NoticeId =
  | 'unclear-checking'
  | 'unclear-failed'
  | 'offline'
  | 'offline-idle'
  | 'unavailable'
  | 'context-full'
  | 'mic-denied'
  | 'mic-missing'
  | 'mic-busy'
  | 'no-support'
  | 'start-failed'
  | 'voice-dropped'
  | 'admin'
  | 'task-failed'
  | 'audio-stopped';

let stream: MediaStream | null = null;
let audio: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let samples = new Uint8Array(0);

/** Opens the real microphone. The result is the notice to show if the browser refuses. */
export async function openMicrophone(): Promise<NoticeId | null> {
  if (!navigator.mediaDevices?.getUserMedia) return 'no-support';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError') return 'mic-denied';
    if (name === 'NotFoundError') return 'mic-missing';
    if (name === 'NotReadableError') return 'mic-busy';
    return 'start-failed';
  }
  audio = new AudioContext();
  analyser = audio.createAnalyser();
  analyser.fftSize = 256;
  audio.createMediaStreamSource(stream).connect(analyser);
  samples = new Uint8Array(analyser.fftSize);
  return null;
}

export function closeMicrophone() {
  for (const track of stream?.getTracks() ?? []) track.stop();
  void audio?.close();
  stream = null;
  audio = null;
  analyser = null;
}

/** How loud the real microphone is, from 0 to 1. Null when the real microphone is not open. */
export function microphoneLevel(): number | null {
  if (!analyser) return null;
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 6);
}

/** An invented level that rises and falls like speech, for the runs without a real microphone. */
function pretendLevel(t: number) {
  const syllable = Math.abs(Math.sin(t * 7.3)) * (0.6 + 0.4 * Math.sin(t * 2.1 + 1));
  return Math.sin(t * 0.9) > -0.8 ? 0.3 + 0.7 * syllable : 0.08;
}

/* The waveforms -------------------------------------------------------------------------------- */

/** still: nothing is heard. user: the user talks. skyttel: Skyttel talks. dimmed: not ready. */
export type WaveState = 'still' | 'user' | 'skyttel' | 'dimmed';

const barWeights = [0.45, 0.7, 0.9, 1, 0.85, 0.65, 0.4];
const lineWidth = 44;

function drawBars(wave: HTMLElement, state: WaveState, level: number, t: number) {
  [...wave.children].forEach((bar, i) => {
    const height =
      state === 'user'
        ? 4 + level * 20 * barWeights[i] * (0.65 + 0.35 * Math.sin(t * 11 + i * 1.9))
        : state === 'skyttel'
          ? 4 + 16 * (0.5 + 0.5 * Math.sin(t * 5 - i * 0.8))
          : 4;
    (bar as HTMLElement).style.height = `${height.toFixed(1)}px`;
  });
}

function drawLine(wave: HTMLElement, state: WaveState, level: number, t: number) {
  const path = wave.querySelector('path');
  if (!path) return;
  if (state !== 'user' && state !== 'skyttel') {
    path.setAttribute('d', `M0 12H${lineWidth}`);
    return;
  }
  let d = '';
  for (let x = 0; x <= lineWidth; x += 2) {
    const edge = Math.sin((Math.PI * x) / lineWidth);
    const y =
      state === 'user'
        ? 12 +
          (1 + level * 10) *
            edge *
            Math.sin(x * 0.5 + t * 9) *
            (0.7 + 0.3 * Math.sin(x * 1.3 + t * 4))
        : 12 + 7 * edge * Math.sin(x * 0.32 - t * 4);
    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
  }
  path.setAttribute('d', d);
}

function drawPulse(wave: HTMLElement, state: WaveState, level: number, t: number) {
  const ring = state === 'user' ? 1 + level * 1.5 : state === 'skyttel' ? 1.9 : 1;
  const dot = state === 'skyttel' ? 0.8 + 0.5 * (0.5 + 0.5 * Math.sin(t * 5)) : 1;
  wave.style.setProperty('--vp-ring', ring.toFixed(2));
  wave.style.setProperty('--vp-dot', dot.toFixed(2));
}

const draw = { staplar: drawBars, linje: drawLine, puls: drawPulse };

/**
 * The small waveform in the voice box. It moves only while somebody talks: with the level of the
 * real microphone when that is open, otherwise with an invented level. With reduced motion it
 * shows one fixed shape in place of the movement.
 */
export function Wave({
  kind,
  state,
  reduced,
  saved,
}: {
  kind: Parts['vag'];
  state: WaveState;
  reduced: boolean;
  saved: boolean;
}) {
  const wave = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = wave.current;
    if (!element) return;
    const paint = draw[kind];
    if (state !== 'user' && state !== 'skyttel') {
      paint(element, state, 0, 0);
      return;
    }
    if (reduced) {
      paint(element, state, 0.7, 1.3);
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const t = now / 1000;
      paint(element, state, state === 'user' ? (microphoneLevel() ?? pretendLevel(t)) : 0, t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [kind, state, reduced]);
  return (
    <span
      ref={wave}
      aria-hidden="true"
      className={`vp-wave ${kind} ${state}${saved ? ' saved' : ''}`}
    >
      {kind === 'staplar' && barWeights.map((weight) => <i key={weight} />)}
      {kind === 'linje' && (
        <svg className="vp-line" viewBox={`0 0 ${lineWidth} 24`} aria-hidden="true">
          <path d={`M0 12H${lineWidth}`} />
        </svg>
      )}
      {kind === 'puls' && (
        <>
          <b />
          <i />
        </>
      )}
    </span>
  );
}

/* Icons ---------------------------------------------------------------------------------------- */

const micPath =
  'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8';
const iconPaths = {
  mic: micPath,
  micOff: `${micPath}M3 3l18 18`,
  speakerOff: 'M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6',
  offline: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18',
  question:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01',
  context: 'M4 18a9 9 0 1 1 16 0M12 13l4-5',
  warning: 'M12 3 2 20h20zM12 10v5M12 17.5h.01',
  blocked: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M5 5l14 14',
  event: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 7v6M12 17h.01',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 5 5 9-10',
};

export function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

/* Conversation notices ------------------------------------------------------------------------- */

type NoticeDefinition = {
  /** The name of the situation in the prototype controls. */
  label: string;
  text: string;
  action?: string;
  /** hinder: stays while the obstacle exists. handelse: has a close button. */
  kind: 'hinder' | 'handelse';
  symbol: keyof typeof iconPaths;
};

/** The texts are the ones in the decision of viscalyx/skyttel#182, in its order of precedence. */
export const notices: Record<NoticeId, NoticeDefinition> = {
  'unclear-checking': {
    label: 'Oklart sparande, Skyttel kontrollerar',
    text: 'Det är oklart om utkastet sparades. Skyttel kontrollerar det.',
    kind: 'hinder',
    symbol: 'question',
  },
  'unclear-failed': {
    label: 'Oklart sparande, kontrollen misslyckades',
    text: 'Skyttel kunde inte kontrollera om utkastet sparades.',
    action: 'Kontrollera om utkastet sparades',
    kind: 'hinder',
    symbol: 'question',
  },
  offline: {
    label: 'Kontakten är bruten',
    text: 'Ingen kontakt med Skyttel. Mikrofonen är av. Slå på den igen när kontakten är tillbaka.',
    kind: 'hinder',
    symbol: 'offline',
  },
  // With no conversation in progress the microphone was never on, so the text does not name it.
  'offline-idle': {
    label: 'Kontakten är bruten, utan pågående samtal',
    text: 'Ingen kontakt med Skyttel. Försök igen när kontakten är tillbaka.',
    kind: 'hinder',
    symbol: 'offline',
  },
  unavailable: {
    label: 'Samtalet är inte tillgängligt',
    text: 'Samtal med Skyttel är inte tillgängligt just nu. Kontakta administratören om det fortsätter.',
    kind: 'hinder',
    symbol: 'blocked',
  },
  'context-full': {
    label: 'Kontexten är full',
    text: 'Kontexten är full, och Skyttel kunde inte sammanfatta samtalet. Inget har gått förlorat, och utkastet ligger kvar.',
    action: 'Nytt samtal',
    kind: 'hinder',
    symbol: 'context',
  },
  'mic-denied': {
    label: 'Webbläsaren nekar mikrofonen',
    text: 'Webbläsaren tillåter inte mikrofonen. Tillåt den i webbläsarens inställningar och tryck på mikrofonknappen igen.',
    kind: 'handelse',
    symbol: 'micOff',
  },
  'mic-missing': {
    label: 'Ingen mikrofon finns',
    text: 'Ingen mikrofon hittades. Anslut en mikrofon och tryck på mikrofonknappen igen.',
    kind: 'handelse',
    symbol: 'micOff',
  },
  'mic-busy': {
    label: 'Mikrofonen är upptagen',
    text: 'Mikrofonen kunde inte öppnas. Kontrollera om en annan app använder den.',
    kind: 'handelse',
    symbol: 'micOff',
  },
  'no-support': {
    label: 'Webbläsaren saknar stöd för röst',
    text: 'Webbläsaren har inte stöd för röst. Du kan skriva till Skyttel.',
    kind: 'handelse',
    symbol: 'micOff',
  },
  'start-failed': {
    label: 'Tillfälligt fel när rösten startar',
    text: 'Rösten kunde inte starta just nu. Försök igen om en stund.',
    kind: 'handelse',
    symbol: 'warning',
  },
  'voice-dropped': {
    label: 'Rösten bryts under samtalet',
    text: 'Rösten avbröts. Tryck på mikrofonknappen för att fortsätta.',
    kind: 'handelse',
    symbol: 'micOff',
  },
  admin: {
    label: 'Fel som kräver administratören',
    text: 'Rösten fungerar inte. Kontakta administratören. Felreferens: R-4821.',
    kind: 'handelse',
    symbol: 'warning',
  },
  'task-failed': {
    label: 'Skyttel kunde inte slutföra uppdraget',
    text: 'Skyttel kunde inte slutföra uppdraget. Försök igen.',
    kind: 'handelse',
    symbol: 'warning',
  },
  'audio-stopped': {
    label: 'Ljudet är stoppat',
    text: 'Webbläsaren stoppade ljudet.',
    action: 'Starta ljudet',
    kind: 'hinder',
    symbol: 'speakerOff',
  },
};

/**
 * One conversation notice: a symbol, one or two sentences and at most one button. The look decides
 * where it stands and what shape it has; "textvy" is the notice inside the text view.
 */
export function ConversationNotice({
  id,
  look,
  symbols,
  closable,
  onClose,
  onAction,
}: {
  id: NoticeId;
  look: Parts['notis'] | 'textvy';
  symbols: Parts['symbol'];
  closable: boolean;
  onClose: () => void;
  onAction: () => void;
}) {
  const notice = notices[id];
  const symbol =
    symbols === 'situation' ? notice.symbol : notice.kind === 'hinder' ? 'blocked' : 'event';
  return (
    <div className={`vp-notice ${look} ${notice.kind}`} role="alert">
      <span className="vp-notice-symbol">
        <Icon name={symbol} />
      </span>
      <p>{notice.text}</p>
      {notice.action && (
        <button type="button" className="vp-notice-action" onClick={onAction}>
          {notice.action}
        </button>
      )}
      {closable && (
        <button
          type="button"
          className="vp-notice-close"
          aria-label="Stäng notisen"
          title="Stäng notisen"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

/* The variant switcher ------------------------------------------------------------------------- */

/** The floating bar that changes the variant. It is not a part of the design under review. */
export function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: VariantKey;
  onChange: (variant: VariantKey) => void;
}) {
  const step = (by: number) =>
    onChange(
      variantKeys[(variantKeys.indexOf(current) + by + variantKeys.length) % variantKeys.length],
    );
  const latest = useRef(step);
  latest.current = step;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable], [role="separator"]')) return;
      latest.current(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of two buttons, not a form
    <div className="vp-switcher" role="group" aria-label="Byt variant (hör inte till utformningen)">
      <button type="button" aria-label="Föregående variant" onClick={() => step(-1)}>
        ←
      </button>
      <span>
        Variant {current} · {variants[current].name}
      </span>
      <button type="button" aria-label="Nästa variant" onClick={() => step(1)}>
        →
      </button>
    </div>
  );
}
