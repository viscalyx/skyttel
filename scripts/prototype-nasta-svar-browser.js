// Två verkliga yttranden, ett inkommande WebRTC-spår. Ljudet kommer bara från GPT-Live.
window.measureLive = async function (input) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  await ctx.resume();
  const clips = await Promise.all(
    input.map((x) => ctx.decodeAudioData(Uint8Array.from(atob(x), (c) => c.charCodeAt(0)).buffer)),
  );
  const mic = ctx.createMediaStreamDestination();
  const silence = ctx.createConstantSource();
  silence.offset.value = 0;
  silence.connect(mic);
  silence.start();
  const peer = new RTCPeerConnection();
  peer.addTrack(mic.stream.getAudioTracks()[0], mic.stream);
  const channel = peer.createDataChannel('oai-events');
  const speaker = new Audio();
  // En tystad mediaspelare håller mottagaren igång. Enda hörbara vägen går via ljudnoden nedan.
  speaker.muted = true;
  let processor,
    trackCount = 0,
    frames = 0,
    cut = null,
    opened = null,
    started = false;
  let inputAfter = '',
    output = '',
    lastSound = -Infinity,
    currentPeak = 0;
  const trace = [],
    raw = [],
    played = [];
  let polling,
    busy = false,
    micEnd = 0,
    previousReply;
  const stamp = () => Math.round((frames * 1000) / ctx.sampleRate);
  function mark(kind, text) {
    trace.push({ ms: stamp(), kind, text });
  }
  peer.ontrack = ({ track }) => {
    trackCount++;
    speaker.srcObject = new MediaStream([track]);
    void speaker.play();
    const src = ctx.createMediaStreamSource(speaker.srcObject);
    processor = ctx.createScriptProcessor(512, 1, 1);
    src.connect(processor);
    processor.connect(ctx.destination);
    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      const dest = e.outputBuffer.getChannelData(0);
      currentPeak = data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
      if (currentPeak > 0.015) lastSound = stamp();
      // Endast händelser som finns i klienten. Ingen jämförelse med förväntade ord i regeln som öppnar.
      if (cut !== null && opened === null && inputAfter.trim() && stamp() - lastSound >= 200) {
        opened = frames;
        mark('högtalaren öppnar');
      }
      if (cut === null || opened !== null) dest.set(data);
      else dest.fill(0);
      raw.push(data.slice());
      played.push(dest.slice());
      frames += data.length;
    };
  };
  channel.onmessage = ({ data }) => {
    const e = JSON.parse(data);
    if (e.type === 'session.started') started = true;
    if (e.type === 'session.output_transcript.delta') output += e.delta;
    if (e.type === 'session.input_transcript.delta' && cut !== null) inputAfter += e.delta;
    mark(e.type, e.delta ?? undefined);
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function until(f, limit) {
    const end = performance.now() + limit;
    while (!f() && performance.now() < end) await sleep(12);
    return f();
  }
  function say(clip) {
    micEnd = ctx.currentTime + clip.duration;
    const src = ctx.createBufferSource();
    src.buffer = clip;
    src.connect(mic);
    src.start();
  }
  function wav(chunks, skip) {
    const length = frames - skip;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    function tag(i, s) {
      [...s].forEach((c, n) => view.setUint8(i + n, c.charCodeAt(0)));
    }
    tag(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, ctx.sampleRate, true);
    view.setUint32(28, ctx.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    tag(36, 'data');
    view.setUint32(40, length * 2, true);
    let n = 0;
    for (const chunk of chunks)
      for (const x of chunk) {
        if (n >= skip)
          view.setInt16(
            44 + (n - skip) * 2,
            Math.round(Math.max(-1, Math.min(x, 1)) * 32767),
            true,
          );
        n++;
      }
    const bytes = new Uint8Array(buffer);
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192)
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(text);
  }
  try {
    await peer.setLocalDescription(await peer.createOffer());
    const sdp = await window.exchangeOffer(peer.localDescription.sdp);
    await peer.setRemoteDescription({ type: 'answer', sdp });
    if (!(await until(() => started && peer.connectionState === 'connected' && frames > 0, 18000)))
      throw Error('WebRTC öppnades inte: ' + peer.connectionState);
    polling = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const result = await window.pollVoice(
          ctx.currentTime < micEnd,
          currentPeak > 0.015 && (cut === null || opened !== null),
        );
        if (result?.text && typeof result.text === 'string' && result.text !== previousReply) {
          previousReply = result.text;
          mark('serverns svar', result.text);
        }
      } catch (error) {
        mark('pollfel', String(error));
      } finally {
        busy = false;
      }
    }, 500);
    mark('fråga');
    say(clips[0]);
    // Avbryt under saksvaret om Spotify, efter ett eventuellt mellanbesked.
    const interrupted = await until(
      () => /spotify|premium|179|hundra/i.test(output) && currentPeak > 0.025,
      40000,
    );
    if (interrupted) {
      cut = frames;
      mark('Avbryt och starta rättelsen');
      say(clips[1]);
      await window.stopSpeech();
      const untilEnd = performance.now() + 35000;
      let lastWordCount = output.length,
        lastChange = performance.now();
      while (performance.now() < untilEnd) {
        await sleep(100);
        if (output.length !== lastWordCount) {
          lastChange = performance.now();
          lastWordCount = output.length;
        }
        if (
          /199|nittionio/i.test(output) &&
          performance.now() - lastChange > 2600 &&
          stamp() - lastSound > 1000
        )
          break;
      }
    }
    processor.disconnect();
    processor.onaudioprocess = null;
    const audio = { 'hela-ljudsparet': wav(raw, 0) };
    if (cut !== null) audio['efter-avbryt'] = wav(played, cut);
    return {
      trackCount,
      sampleRate: ctx.sampleRate,
      interrupted,
      clickMs: cut === null ? null : Math.round((cut / ctx.sampleRate) * 1000),
      openMs: opened === null ? null : Math.round((opened / ctx.sampleRate) * 1000),
      inputAfter,
      trace,
      audio,
    };
  } finally {
    clearInterval(polling);
    peer.close();
    speaker.pause();
    speaker.srcObject = null;
    mic.stream.getTracks().forEach((t) => t.stop());
    await ctx.close();
  }
};
