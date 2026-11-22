// Laddas av det begränsade provet i Chromium.
window.provaAvbrott = async function (mode, encoded, spoken, prompt, inspectTranscription) {
  const realtime = mode === 'realtime';
  const ctx = new AudioContext();
  await ctx.resume();
  const fixture = await ctx.decodeAudioData(
    Uint8Array.from(atob(encoded), (x) => x.charCodeAt(0)).buffer,
  );
  const mic = ctx.createMediaStreamDestination();
  const silence = ctx.createConstantSource();
  silence.offset.value = 0;
  silence.connect(mic);
  if (inspectTranscription) silence.start();
  const [track] = mic.stream.getAudioTracks();
  let peer, channel, meter, speaker;
  let click, ready, cleared, lastAudible, firstText;
  let text = '';
  let echo = '';
  let speechStarted;
  let committed = false;
  const events = [];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function until(check, label, limit = 12000) {
    const end = performance.now() + limit;
    while (!check()) {
      if (performance.now() >= end)
        throw Error(label + ' (' + peer.connectionState + ', ' + events.slice(-8).join(', ') + ')');
      await sleep(10);
    }
  }
  async function open() {
    let started = false;
    track.enabled = false;
    peer = new RTCPeerConnection();
    peer.addTrack(track, mic.stream);
    channel = peer.createDataChannel('oai-events');
    channel.onmessage = ({ data }) => {
      const event = JSON.parse(data);
      events.push(event.type === 'error' ? 'error/' + JSON.stringify(event.error) : event.type);
      if (event.type === (realtime ? 'session.created' : 'session.started')) started = true;
      if (event.type === 'output_audio_buffer.cleared') {
        cleared = performance.now();
        speaker.muted = false;
      }
      if (!click) return;
      if (event.type === 'input_audio_buffer.speech_started') speechStarted = performance.now();
      if (event.type === 'input_audio_buffer.committed') committed = true;
      if (event.type === 'response.output_text.done') echo = event.text;
      if (
        event.type === 'session.input_transcript.delta' ||
        event.type === 'conversation.item.input_audio_transcription.delta'
      ) {
        if (!firstText && event.delta?.trim()) firstText = performance.now();
        text += event.delta;
      }
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        if (!firstText && event.transcript?.trim()) firstText = performance.now();
        text = event.transcript ?? text;
      }
    };
    peer.ontrack = (e) => {
      const stream = new MediaStream([e.track]);
      speaker = new Audio();
      speaker.srcObject = stream;
      void speaker.play();
      const source = ctx.createMediaStreamSource(stream);
      meter = ctx.createAnalyser();
      meter.fftSize = 512;
      source.connect(meter);
    };
    await peer.setLocalDescription(await peer.createOffer());
    const answer = await window.exchangeOffer(peer.localDescription.sdp);
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    await until(
      () => started && channel.readyState === 'open' && peer.connectionState === 'connected',
      'Anslutningen öppnades inte',
      18000,
    );
    track.enabled = true;
    if (click) ready = performance.now();
  }
  function peak() {
    if (!meter) return 0;
    const values = new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(values);
    return values.reduce((n, v) => Math.max(n, Math.abs(v)), 0);
  }
  const monitor = setInterval(() => {
    if (click && peak() > 0.025) lastAudible = performance.now();
  }, 10);
  try {
    await open();
    if (realtime) {
      channel.send(
        JSON.stringify({
          type: 'response.create',
          response: { instructions: 'Läs upp på svenska: ' + spoken },
        }),
      );
    } else {
      const question = ctx.createBufferSource();
      question.buffer = await ctx.decodeAudioData(
        Uint8Array.from(atob(prompt), (c) => c.charCodeAt(0)).buffer,
      );
      question.connect(mic);
      question.start();
    }
    await until(() => peak() > 0.025, 'Inget uppläst ljud nådde ljudmätaren');
    // Samma inspelning börjar exakt när provet avbryter den pågående uppläsningen.
    click = performance.now();
    const source = ctx.createBufferSource();
    source.buffer = fixture;
    source.connect(mic);
    source.start();
    speaker.muted = true;
    if (mode === 'renew') {
      track.enabled = false;
      peer.close();
      meter = null;
      await window.retireVoice();
      await open();
    } else {
      ready = performance.now();
      if (realtime) {
        channel.send(JSON.stringify({ type: 'response.cancel' }));
        channel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }));
      } else await window.stopSpeech();
    }
    // Lämna tid för både inspelningen och den sista textdelen. Ett uteblivet
    // eller ofullständigt yttrande är också ett resultat.
    await sleep(Math.max(0, click + fixture.duration * 1000 + 3100 - performance.now()));
    if (inspectTranscription && realtime && !text) {
      if (!committed) channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      await sleep(1500);
      if (committed && !text) {
        channel.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              output_modalities: ['text'],
              instructions:
                'Återge ordagrant det senaste som användaren sade. Lägg inte till något.',
            },
          }),
        );
        await sleep(5500);
      }
    }
    return {
      mode,
      echo,
      speechStartedMs: speechStarted ? Math.round(speechStarted - click) : null,
      observedEvents: [...new Set(events)],
      micReadyMs: Math.round(ready - click),
      firstTranscriptMs: firstText ? Math.round(firstText - click) : null,
      queueClearedMs: cleared ? Math.round(cleared - click) : null,
      transcript: text.trim(),
      lastRemoteSoundMs: lastAudible ? Math.round(lastAudible - click) : null,
      errors: events.filter((e) => e.startsWith('error/')),
    };
  } finally {
    clearInterval(monitor);
    peer?.close();
    if (speaker) speaker.srcObject = null;
    if (inspectTranscription) silence.stop();
    track.stop();
    await ctx.close();
  }
};
