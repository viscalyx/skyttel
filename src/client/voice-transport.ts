import { type ExchangeSdp, OpenAILiveWebRTC } from 'openai/live/webrtc';

export function createVoiceTransport(callbacks: {
  onReady: () => void;
  onClosed: () => void;
  onFailure: (reason: 'network' | 'audio' | 'microphone' | 'provider') => void;
  onPlaybackBlocked: (blocked: boolean) => void;
  onDisconnected: (disconnected: boolean) => void;
}) {
  const live = new OpenAILiveWebRTC();
  const audio = new Audio();
  audio.autoplay = true;
  const remoteTracks = new Set<MediaStreamTrack>();
  let microphone: MediaStream | undefined;
  let connected = false;
  let started = false;
  let stopped = false;
  let closed = false;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
  async function playAudio() {
    if (closed || stopped) return;
    try {
      await audio.play();
      if (!closed && !stopped) callbacks.onPlaybackBlocked(false);
    } catch {
      if (!closed && !stopped) callbacks.onPlaybackBlocked(true);
    }
  }
  const receiveTrack = (event: RTCTrackEvent) => {
    if (closed || stopped) {
      event.track.stop();
      return;
    }
    remoteTracks.add(event.track);
    audio.srcObject = new MediaStream([...remoteTracks]);
    void playAudio();
  };
  const audioFailed = () => {
    if (!closed && !stopped) callbacks.onFailure('audio');
  };
  const microphoneEnded = () => {
    if (!closed && !stopped) callbacks.onFailure('microphone');
  };
  live.peerConnection.addEventListener('track', receiveTrack);
  audio.addEventListener('error', audioFailed);
  function ready() {
    if (
      closed ||
      stopped ||
      !connected ||
      !started ||
      live.peerConnection.connectionState !== 'connected'
    )
      return;
    clearTimeout(startupTimer);
    for (const track of microphone?.getTracks() ?? []) track.enabled = true;
    callbacks.onReady();
  }
  const connectionChanged = () => {
    if (closed || stopped) return;
    if (live.peerConnection.connectionState === 'disconnected') {
      for (const track of microphone?.getTracks() ?? []) track.enabled = false;
      callbacks.onDisconnected(true);
      disconnectTimer ??= setTimeout(() => {
        if (!closed && !stopped) callbacks.onFailure('network');
      }, 3000);
    } else if (live.peerConnection.connectionState === 'connected') {
      clearTimeout(disconnectTimer);
      disconnectTimer = undefined;
      callbacks.onDisconnected(false);
      ready();
    }
  };
  live.peerConnection.addEventListener('connectionstatechange', connectionChanged);
  const subscriptions = [
    live.on('session.started', (event) => {
      if (typeof event.session?.id !== 'string' || !event.session.id) return;
      started = true;
      ready();
    }),
    live.on('session.closed', () => {
      if (!closed && !stopped) callbacks.onClosed();
    }),
    live.on('error', () => {
      if (!closed && !stopped) callbacks.onFailure('provider');
    }),
    live.onConnectionEvent((event) => {
      if (
        !closed &&
        !stopped &&
        (event.type === 'closed' || (event.type === 'error' && event.fatal))
      )
        callbacks.onFailure('network');
    }),
  ];
  function stopCapture() {
    stopped = true;
    clearTimeout(startupTimer);
    clearTimeout(disconnectTimer);
    for (const track of microphone?.getTracks() ?? []) {
      track.removeEventListener('ended', microphoneEnded);
      track.enabled = false;
      track.stop();
    }
    for (const track of remoteTracks) track.stop();
    audio.pause();
  }
  function close() {
    if (closed) return;
    closed = true;
    stopCapture();
    for (const unsubscribe of subscriptions) unsubscribe();
    live.peerConnection.removeEventListener('track', receiveTrack);
    live.peerConnection.removeEventListener('connectionstatechange', connectionChanged);
    audio.removeEventListener('error', audioFailed);
    audio.srcObject = null;
    remoteTracks.clear();
    live.close();
  }
  return {
    async connect(exchangeSdp: ExchangeSdp, signal: AbortSignal) {
      try {
        microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (closed || stopped || signal.aborted) {
          stopCapture();
          throw new DOMException('Voice setup cancelled', 'AbortError');
        }
        for (const track of microphone.getTracks()) {
          track.enabled = false;
          track.addEventListener('ended', microphoneEnded);
          live.peerConnection.addTrack(track, microphone);
        }
        startupTimer = setTimeout(() => {
          if (!closed && !stopped) callbacks.onFailure('network');
        }, 30_000);
        await live.connect({ exchangeSdp, signal, timeoutMs: 30_000 });
        connected = true;
        ready();
      } catch (error) {
        close();
        throw error;
      }
    },
    stopCapture,
    close,
    playAudio,
  };
}

export type VoiceTransport = ReturnType<typeof createVoiceTransport>;
