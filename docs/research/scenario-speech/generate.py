"""Generate planning WAVs locally; never call a provider or install dependencies."""
import argparse
import hashlib
import json
import platform
import sys
import wave
from importlib.metadata import version
from pathlib import Path

from piper import PiperVoice, SynthesisConfig


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--texts', '--input', dest='input', required=True, type=Path)
    parser.add_argument('--controls', required=True, type=Path)
    parser.add_argument('--model', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    voice = PiperVoice.load(args.model)
    settings = SynthesisConfig(noise_scale=0, noise_w_scale=0, length_scale=1)
    piper_root = Path(sys.modules['piper'].__file__).parent
    onnx_root = Path(sys.modules['onnxruntime'].__file__).parent
    binaries = [Path(sys.executable).resolve(), *piper_root.glob('*.so'),
                *onnx_root.glob('capi/*so*')]
    manifest = {
        'input': {'file': args.input.name, 'sha256': digest(args.input)},
        'controlsInput': {'file': args.controls.name, 'sha256': digest(args.controls)},
        'generator': {'file': Path(__file__).name, 'sha256': digest(__file__)},
        'model': {'file': args.model.name, 'sha256': digest(args.model),
                  'configSha256': digest(str(args.model) + '.json')},
        'runtime': {'architecture': platform.machine(), 'python': platform.python_version(),
                    'versions': {p: version(p) for p in ['piper-tts', 'onnxruntime', 'numpy']},
                    'binaryHashes': {p.name: digest(p) for p in binaries},
                    'voiceModuleSha256': digest(piper_root / 'voice.py')},
        'settings': {'noise_scale': 0, 'noise_w_scale': 0, 'length_scale': 1,
                     'normalize_audio': True, 'volume': 1, 'speaker_id': None,
                     'use_cuda': False, 'addedBoundarySilenceMs': [500, 1500],
                     'addedLeadingTrailingSilenceMs': [0, 0]},
        'license': {
            'speech': 'Synthetic speech; all utterances contain fictional household data.',
            'voice': 'sv_SE-nst-medium',
            'voiceRepositoryLicense': 'MIT',
            'trainingDataLicense': 'CC0',
            'software': 'piper-tts GPL-3.0; software license distinguished from generated output.',
            'evidence': 'Research decision: Hur skapas reproducerbart syntetiskt svenskt tal för talscenarierna?',
            'researchCheckedAt': '2026-09-30',
            'researchUrl': 'https://github.com/viscalyx/skyttel/blob/9c50d39f3f1d72b3347c105fe8fb4f577feb75e7/docs/research/synthetic-swedish-speech.md',
            'modelCardUrl': 'https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/sv/sv_SE/nst/medium/MODEL_CARD',
            'dataLicenseUrl': 'https://www.nb.no/sprakbanken/en/resource-catalogue/page/37/'
        },
        'scenarios': {}, 'controls': {}
    }

    def synthesize(path, text):
        with wave.open(str(path), 'wb') as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(voice.config.sample_rate)
            voice.synthesize_wav(text, out, syn_config=settings)

    def describe(path):
        with wave.open(str(path), 'rb') as source:
            frames, rate = source.getnframes(), source.getframerate()
            return {'file': path.name, 'frames': frames, 'sampleRate': rate,
                    'channels': source.getnchannels(), 'sampleWidth': source.getsampwidth(),
                    'durationSeconds': frames / rate, 'durationExact': f'{frames}/{rate}',
                    'sha256': digest(path), 'bytes': path.stat().st_size}

    def flush():
        (args.output / 'manifest.json').write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

    for category, source in [('scenarios', args.input), ('controls', args.controls)]:
        for name, text in json.loads(source.read_text()).items():
            plain = args.output / f'{name}.wav'
            synthesize(plain, text)
            info = {'text': text, 'characters': len(text),
                    'wordsWhitespace': len(text.split()), 'plain': describe(plain)}
            if category == 'scenarios':
                boundaries = [
                    'Spotify Premium Family ska betalas från bankkontot.',
                    'Det är två olika adresser med olika roller.',
                ] if name == 'tva-oklarheter' else [
                    'så ändra inte den uppgiften.',
                    'du ska inte byta namnet på tjänstekontot.',
                ]
                first = text.index(boundaries[0]) + len(boundaries[0])
                second = text.index(boundaries[1], first) + len(boundaries[1])
                segments = [text[:first].strip(), text[first:second].strip(), text[second:].strip()]
                parts = []
                for i, segment in enumerate(segments):
                    path = args.output / f'{name}-segment-{i+1}.wav'
                    synthesize(path, segment)
                    parts.append(path)
                paused = args.output / f'{name}-pauses.wav'
                with wave.open(str(paused), 'wb') as out:
                    for i, path in enumerate(parts):
                        with wave.open(str(path), 'rb') as src:
                            if not i:
                                out.setnchannels(src.getnchannels())
                                out.setsampwidth(src.getsampwidth())
                                out.setframerate(src.getframerate())
                            out.writeframes(src.readframes(src.getnframes()))
                            if i < 2:
                                count = src.getframerate() * [500, 1500][i] // 1000
                                out.writeframes(b'\0' * count * src.getsampwidth() * src.getnchannels())
                info.update(paused=describe(paused), segments=[
                    {'text': t, **describe(p)} for t, p in zip(segments, parts)])
                def pcm(path):
                    with wave.open(str(path), 'rb') as source:
                        return source.readframes(source.getnframes())
                segment_pcm = b''.join(pcm(p) for p in parts)
                counts = [describe(p)['frames'] for p in parts]
                info['plainEqualsConcatenatedSegmentPcm'] = pcm(plain) == segment_pcm
                info['pauseBoundaries'] = [
                    {'afterText': boundaries[0], 'afterFrame': counts[0], 'silenceFrames': 11025},
                    {'afterText': boundaries[1], 'afterFrame': counts[0] + counts[1], 'silenceFrames': 33075},
                ]
            manifest[category][name] = info
            flush()
            print(json.dumps({'name': name, **{k: v for k, v in info.items()
                              if k not in ['text', 'segments']}}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
