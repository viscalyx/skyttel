import type { PlaybackRecording } from '../../scripts/model-evaluation/playback.js';

/** Controlled external recognizer: inspect only the rendered WAV, with no
 * expected response words or server/transcript hints. */
export function renderedToneWindows(recording: PlaybackRecording, frequency: number) {
  const pcm = recording.wav.subarray(44);
  const windowFrames = Math.round(recording.sampleRate / 10);
  let matching = 0;
  for (let start = 0; start + windowFrames < recording.frames; start += windowFrames) {
    let crossings = 0;
    let peak = 0;
    for (let frame = start + 1; frame < start + windowFrames; frame++) {
      const value = pcm.readInt16LE(frame * 2);
      peak = Math.max(peak, Math.abs(value));
      if (value > 0 && pcm.readInt16LE((frame - 1) * 2) <= 0) crossings++;
    }
    if (peak > 100 && Math.abs(crossings - frequency / 10) < 5) matching++;
  }
  return matching;
}
