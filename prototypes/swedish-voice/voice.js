/* THROWAWAY real voice transport. No recordings, secrets, or browser storage. */
(() => {
  'use strict';
  const ui = window.VoiceUI;
  const $ = id => document.getElementById(id);
  let peer, channel, microphone, audioContext, audio = new Audio();
  let sessionId, connected = false, starting = false, stopping = false, finalized = false;
  let revision = Date.now(), history = [], inputChain = Promise.resolve();
  let acknowledgedInputRevision = 0;
  let lastEventCount = 0, lastRole = null, closeTimer, stopTimer;
  let currentSpeechAt = 0;
  let generation = 0, visiblePartial = null, activeUser = null, lastUser = null;
  let visibleUser = null, assistantResponseBoundary = false, assistantSpeechAt = 0;
  const TRANSCRIPT_TURN_GAP_MS = 2000;
  const handled = new Set();
  const displayedJobs = new Set();
  const displayedFailures = new Set();
  const waitingWork = new Map();
  let serverWork = null, workObservedAt = 0, workStatusUnknown = false;
  let displayedTimingSequence = -1;
  let transportState = null, transportKnown = false, transportSwitchPending = false;
  let transportEpoch = 0;
  let modelState = null, modelKnown = false, modelSwitchPending = false, modelEpoch = 0;
  let voiceModel = null;
  let lastUserDeltaReceivedAt = null, latestClientTiming = null, clientTimingToken = 0;
  const workText = {
    receive:'Tar emot ditt besked', queue:'Väntar på bearbetning',
    model:'Tolkar ditt besked', tool:'Kontrollerar kartan',
    verify:'Kontrollerar resultatet', complete:'Klart. Kartan är kontrollerad.',
    error:'Kontrollera felbeskedet innan du fortsätter.',
    superseded:'En ny rättelse ersatte det tidigare beskedet.'
  };
  audio.autoplay = true;
  audio.controls = true;
  audio.setAttribute('aria-label', 'Talassistentens ljud');
  $('stop-voice').parentElement.append(audio);

  async function request(path, body, clientTiming = null) {
    const observedTransportEpoch = transportEpoch;
    const observedModelEpoch = modelEpoch;
    const issuedAt = performance.now();
    if (currentClientTiming(clientTiming)) {
      clientTiming.request_issued_at = issuedAt;
      clientTiming.dispatch_wait_ms = issuedAt - clientTiming.delegation_received_at;
      publishClientTiming();
    }
    const response = await fetch(path, body === undefined ? {} : {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
    });
    const result = await response.json();
    if (currentClientTiming(clientTiming)) {
      clientTiming.request_ms = performance.now() - issuedAt;
      clientTiming.note = 'Komplett serversvar mottaget; renderingen återstår.';
      publishClientTiming();
    }
    update(result, observedTransportEpoch, observedModelEpoch);
    if (!response.ok) {
      const detail = result.failure?.message || (typeof result.error === 'string'
        ? result.error : result.error?.message || result.error?.text);
      const failure = new Error(detail || 'Anropet misslyckades.');
      failure.response = result;
      throw failure;
    }
    return result;
  }
  function validTransport(value) {
    return value && ['mcp','direct'].includes(value.mode) && typeof value.can_switch === 'boolean';
  }
  function transportCanChange() {
    return transportKnown && transportState?.can_switch && modelKnown && !modelSwitchPending && !transportSwitchPending &&
      !starting && !connected && !stopping && !peer && !waitingWork.size && !serverWork?.active;
  }
  function validModelSettings(value) {
    const choices = items => Array.isArray(items) && items.length > 0 &&
      items.every(item => item && typeof item.id === 'string' && item.id &&
        typeof item.label === 'string' && item.label) && new Set(items.map(item => item.id)).size === items.length;
    return value && Number.isSafeInteger(value.version) && value.version >= 0 &&
      typeof value.can_switch === 'boolean' && choices(value.models) && choices(value.reasoning_efforts) &&
      value.models.some(item => item.id === value.model) &&
      value.reasoning_efforts.some(item => item.id === value.reasoning_effort);
  }
  function modelCanChange() {
    return modelKnown && modelState?.can_switch && !modelSwitchPending && !transportSwitchPending &&
      !starting && !connected && !stopping && !peer && !waitingWork.size && !serverWork?.active;
  }
  function appliedModelLabel() {
    if (!modelState) return '';
    const model = modelState.models.find(item => item.id === modelState.model)?.label || modelState.model;
    const effort = modelState.reasoning_efforts.find(item => item.id === modelState.reasoning_effort)?.label || modelState.reasoning_effort;
    return `${model} · ${effort.toLocaleLowerCase('sv-SE')} resonemangsnivå`;
  }
  function renderModelOptions(id, items, value) {
    const select = $(id);
    const signature = JSON.stringify(items);
    if (select.dataset.choices !== signature) {
      select.replaceChildren(...items.map(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.label;
        return option;
      }));
      select.dataset.choices = signature;
    }
    select.value = value;
  }
  function renderTransport() {
    const checkbox = $('use-mcp');
    checkbox.checked = transportState ? transportState.mode === 'mcp' : true;
    checkbox.disabled = !transportCanChange();
    $('transport-status').textContent = transportSwitchPending ? 'Byter kartkoppling…'
      : !transportKnown ? 'Aktuellt läge behöver kontrolleras.'
      : `Aktuellt läge: ${transportState.mode === 'mcp' ? 'MCP' : 'direkt'}`;
    if (modelState) {
      renderModelOptions('backend-model', modelState.models, modelState.model);
      renderModelOptions('reasoning-effort', modelState.reasoning_efforts, modelState.reasoning_effort);
    }
    $('backend-model').disabled = !modelCanChange();
    $('reasoning-effort').disabled = !modelCanChange();
    $('model-status').textContent = modelSwitchPending ? 'Byter agentmodell…'
      : !modelKnown ? 'Aktuellt modellval behöver kontrolleras.'
      : `Aktuellt val: ${appliedModelLabel()}`;
    $('model-info').textContent = [voiceModel ? `Röst: ${voiceModel}` : '',
      modelState ? `Kartändringar: ${modelState.model} (${modelState.reasoning_effort})` : '']
      .filter(Boolean).join(' · ') + (!modelKnown && modelState ? ' · Modellvalet kontrolleras.' : '');
    const settingsUnavailable = transportSwitchPending || modelSwitchPending || !modelKnown;
    $('start-voice').disabled = Boolean(peer || starting || connected || stopping || settingsUnavailable);
    $('reconnect-voice').disabled = Boolean(peer || starting || connected || stopping || settingsUnavailable);
    const smoke = $('smoke-voice');
    if (smoke) smoke.disabled = Boolean(peer || starting || connected || stopping || settingsUnavailable);
    $('send-text').disabled = Boolean(settingsUnavailable);
  }
  function update(result, observedTransportEpoch = transportEpoch, observedModelEpoch = modelEpoch) {
    if (observedTransportEpoch === transportEpoch && Object.hasOwn(result, 'map_transport')) {
      transportKnown = Boolean(validTransport(result.map_transport));
      if (transportKnown) transportState = {...result.map_transport};
    }
    if (observedModelEpoch === modelEpoch && Object.hasOwn(result, 'model_settings')) {
      if (!validModelSettings(result.model_settings)) modelKnown = false;
      else if (!modelState || result.model_settings.version >= modelState.version) {
        modelState = {...result.model_settings};
        modelKnown = true;
      }
    }
    if (result.voice_model) voiceModel = result.voice_model;
    if (result.relation_labels) ui.setRelationLabels(result.relation_labels);
    if (result.view) ui.showView(result.view);
    if (result.budget) ui.showBudget(result.budget);
    if (result.events) {
      result.events.slice(lastEventCount).forEach(e => ui.log(e.text + (e.result ? ' ' + JSON.stringify(e.result) : '')));
      lastEventCount = result.events.length;
    }
    if (result.latency_ms && !result.work) ui.showLatency(result.latency_ms);
    if (Object.hasOwn(result, 'work')) acceptWork(result.work);
    renderTransport();
  }
  async function changeTransport() {
    const requested = $('use-mcp').checked ? 'mcp' : 'direct';
    if (!transportCanChange() || requested === transportState.mode) {renderTransport();return;}
    transportSwitchPending = true;
    ++transportEpoch;
    ++modelEpoch;
    renderTransport();
    try {
      const result = await request('/api/transport', {mode:requested});
      // Invalidate polls that started before the switch response. Their mode
      // snapshots may predate the server's atomic switch even if they arrive later.
      ++transportEpoch;
      ++modelEpoch;
      if (!validTransport(result.map_transport) || result.map_transport.mode !== requested) {
        const failure = new Error('Servern bekräftade inte det begärda läget.');
        failure.response = result;
        throw failure;
      }
      ui.setStatus(`Kartkoppling: ${requested === 'mcp' ? 'MCP' : 'direkt'}. Kartan och utkastet är kvar.`);
    } catch (failure) {
      ++transportEpoch;
      ++modelEpoch;
      const fallback = validTransport(failure.response?.map_transport) ? failure.response.map_transport : null;
      transportKnown = false;
      renderTransport();
      try {
        await request('/api/state');
      } catch {
        if (fallback) {transportState = {...fallback};transportKnown = true;}
      }
      const detail = failure.response?.failure?.message || failure.message || 'Serverns svar saknas.';
      error(new Error(`Lägesbytet kunde inte bekräftas: ${detail}`+
        (transportKnown ? '' : ' Aktuellt läge kunde inte kontrolleras.')));
    } finally {
      transportSwitchPending = false;
      renderTransport();
    }
  }
  async function changeModel() {
    const requested = {model:$('backend-model').value,reasoning_effort:$('reasoning-effort').value};
    if (!modelCanChange() || (requested.model === modelState.model &&
        requested.reasoning_effort === modelState.reasoning_effort)) {renderTransport();return;}
    const previousVersion = modelState.version;
    modelSwitchPending = true;
    ++modelEpoch;
    ++transportEpoch;
    renderTransport();
    try {
      const result = await request('/api/model', requested);
      // Polls already in flight may hold the previous model or unlocked state.
      ++modelEpoch;
      ++transportEpoch;
      if (!validModelSettings(result.model_settings) ||
          result.model_settings.model !== requested.model ||
          result.model_settings.reasoning_effort !== requested.reasoning_effort ||
          result.model_settings.version <= previousVersion ||
          result.model_settings.version !== modelState?.version) {
        const failure = new Error('Servern bekräftade inte det begärda modellvalet.');
        failure.response = result;
        throw failure;
      }
      ui.setStatus(`Agentmodell: ${appliedModelLabel()}.`);
    } catch (failure) {
      ++modelEpoch;
      ++transportEpoch;
      modelKnown = false;
      renderTransport();
      try {await request('/api/state');} catch { /* Keep controls locked until a verified snapshot arrives. */ }
      const detail = failure.response?.failure?.message || failure.message || 'Serverns svar saknas.';
      error(new Error(`Modellbytet kunde inte bekräftas: ${detail}` +
        (modelKnown ? '' : ' Aktuellt modellval kunde inte kontrolleras.')));
    } finally {
      modelSwitchPending = false;
      renderTransport();
    }
  }
  function renderWork() {
    const pending = [...waitingWork.values()].filter(item => {
      if (!serverWork) return true;
      if (serverWork.revision > item.revision) return false;
      // A poll can confirm completion while duplicate HTTP replies are still
      // travelling. Keep their bookkeeping without claiming work is ongoing.
      return serverWork.active || serverWork.revision !== item.revision ||
        serverWork.job_id !== item.job_id || !['request','uncertain'].includes(item.stage);
    }).sort((a,b) => b.revision-a.revision)[0];
    const confirmed = serverWork?.active && (!pending || serverWork.revision >= pending.revision);
    const active = Boolean(serverWork?.active || pending);
    const uncertain = active && (workStatusUnknown || (!confirmed && pending?.stage === 'uncertain'));
    const phase = uncertain ? 'uncertain' : confirmed ? serverWork.phase
      : pending ? pending.stage === 'receive' ? 'receive' : 'queue'
      : serverWork?.phase || 'idle';
    const elapsed = confirmed ? (serverWork.elapsed_ms || 0)+performance.now()-workObservedAt
      : pending ? performance.now()-pending.started : serverWork?.total_ms || 0;
    ui.showWork({active, uncertain, phase, elapsed_ms:elapsed,
      text:uncertain?'Kontakten är osäker. Kontrollerar serverstatus…'
        :workText[phase] || 'Berätta vad du vill göra.'});
    renderTransport();
  }
  function acceptWork(work) {
    // Every server phase has a monotonically increasing sequence, including
    // across server restarts. Old poll/delegation responses cannot undo it.
    if (work === null) {if (!serverWork) renderWork();return;}
    if (!work || !Number.isSafeInteger(work.sequence) ||
        (serverWork && work.sequence < serverWork.sequence)) return;
    const elapsed = serverWork?.sequence === work.sequence && serverWork.active
      ? Math.max(work.elapsed_ms || 0,(serverWork.elapsed_ms || 0)+performance.now()-workObservedAt)
      : work.elapsed_ms;
    serverWork = {...work,elapsed_ms:elapsed};
    workObservedAt = performance.now();
    workStatusUnknown = false;
    for (const [id,pending] of waitingWork) {
      if (pending.stage === 'uncertain' &&
          (work.revision > pending.revision ||
           (work.revision === pending.revision && !work.active))) waitingWork.delete(id);
    }
    if (!work.active && work.phase === 'complete' && work.sequence !== displayedTimingSequence) {
      displayedTimingSequence = work.sequence;
      ui.showLatency(work.total_ms,work);
    }
    renderWork();
  }
  function beginWork(id) {
    if (!waitingWork.has(id)) waitingWork.set(id,{revision,started:performance.now(),stage:'receive'});
    else Object.assign(waitingWork.get(id),{revision,stage:'receive'});
    renderWork();
  }
  function finishWork(id) {waitingWork.delete(id);renderWork();}
  function lostWorkStatus() {
    transportKnown = false;
    modelKnown = false;
    renderTransport();
    if (serverWork?.active || waitingWork.size) {workStatusUnknown=true;renderWork();}
  }
  function send(event) {
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(event));
      if (event.type === 'session.commentary.append' && currentClientTiming(latestClientTiming) &&
          latestClientTiming.delegation_id === event.delegation_id &&
          latestClientTiming.request_ms !== null && !latestClientTiming.pending_output) {
        latestClientTiming.commentary_sent_at = performance.now();
        latestClientTiming.pending_output = true;
        latestClientTiming.note = 'Inväntar nästa inkomna assistenttext.';
        publishClientTiming();
      }
    }
  }
  function currentClientTiming(timing) {
    return timing && timing === latestClientTiming && !timing.closed &&
      timing.token === clientTimingToken && timing.generation === generation;
  }
  function publishClientTiming() {
    ui.showClientTiming?.(latestClientTiming);
  }
  function interruptClientTiming(reason) {
    ++clientTimingToken;
    if (latestClientTiming && !latestClientTiming.closed) {
      latestClientTiming.closed = true;
      latestClientTiming.pending_output = false;
      latestClientTiming.note = reason;
      publishClientTiming();
    }
  }
  function beginClientTiming(delegationId) {
    const receivedAt = performance.now();
    interruptClientTiming('Mätningen avbröts av en ny delegering.');
    latestClientTiming = {delegation_id:delegationId,generation,token:clientTimingToken,
      delegation_received_at:receivedAt,
      input_to_delegation_ms:lastUserDeltaReceivedAt === null ? null : receivedAt-lastUserDeltaReceivedAt,
      dispatch_wait_ms:null,request_ms:null,append_to_output_ms:null,
      pending_output:false,closed:false,note:'Delegering mottagen; inväntar klientens avsändning.'};
    publishClientTiming();
    return latestClientTiming;
  }
  function observeOutputTiming() {
    if (!currentClientTiming(latestClientTiming) || !latestClientTiming.pending_output) return;
    latestClientTiming.append_to_output_ms = performance.now()-latestClientTiming.commentary_sent_at;
    latestClientTiming.pending_output = false;
    latestClientTiming.closed = true;
    latestClientTiming.note = 'Nästa textdelta observerad. Den är inte bevis på när ett svar hördes.';
    publishClientTiming();
  }
  function error(error) {
    ui.setStatus(error.message || String(error));
    ui.log(error.message || String(error));
  }
  function finishVisibleTranscript(role) {
    const row = role === 'user' ? visibleUser : visiblePartial;
    if (row) ui.addTranscript(role, row.text, {id:row.id,partial:false});
  }
  function audioTime(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }
  function showUserFragment(text, timing) {
    const now = performance.now();
    const gap = visibleUser && audioTime(timing.start_ms) && audioTime(visibleUser.end_ms)
      && timing.start_ms >= visibleUser.end_ms
      ? timing.start_ms - visibleUser.end_ms : visibleUser ? now - visibleUser.at : 0;
    finishVisibleTranscript('assistant');
    if (!visibleUser || (visibleUser.assistantSince && gap >= TRANSCRIPT_TURN_GAP_MS)) {
      finishVisibleTranscript('user');
      visibleUser = {id:'transcript-user-'+crypto.randomUUID(),text:''};
      // The next assistant reply belongs below this new human row.
      visiblePartial = null;
    }
    visibleUser.text += text;
    visibleUser.at = now;
    visibleUser.end_ms = audioTime(timing.end_ms)
      && (!audioTime(timing.start_ms) || timing.end_ms >= timing.start_ms) ? timing.end_ms : null;
    visibleUser.assistantSince = false;
    ui.addTranscript('user', visibleUser.text, {id:visibleUser.id,partial:true});
  }
  function showAssistantFragment(text) {
    const now = performance.now();
    if (visibleUser) visibleUser.assistantSince = true;
    finishVisibleTranscript('user');
    if (!visiblePartial || (assistantResponseBoundary && now-assistantSpeechAt >= TRANSCRIPT_TURN_GAP_MS)) {
      finishVisibleTranscript('assistant');
      visiblePartial = {id:'transcript-assistant-'+crypto.randomUUID(),role:'assistant',text:''};
    }
    visiblePartial.text += text;
    assistantResponseBoundary = false;
    assistantSpeechAt = now;
    ui.addTranscript('assistant', visiblePartial.text, {id:visiblePartial.id,partial:true});
  }
  function describeFailure(failure) {
    const response = failure.response;
    if (!response) return {
      code:'server_response_missing', outcome:'unknown',
      message:'Serverns svar saknas eller kunde inte läsas.',
      text:'Serverns svar saknas eller kunde inte läsas. Sparutfallet är okänt. '
        +'Kontrollera serverns aktuella karta och sparkvitto innan du upprepar sparandet.'
    };
    const detail = response.failure || {};
    const outcome = ['saved','unsaved','unknown'].includes(detail.outcome) ? detail.outcome : 'unknown';
    const message = detail.message || (typeof response.error === 'string'
      ? response.error : response.error?.message || response.error?.text)
      || failure.message || 'Anropet misslyckades.';
    const outcomeText = {
      saved:'Sparandet i provet är bekräftat.',
      unsaved:'Det aktuella uppdragets ändringar är inte sparade.',
      unknown:'Sparutfallet är okänt. Kontrollera serverns aktuella karta och sparkvitto innan du upprepar sparandet.'
    }[outcome];
    return {code:detail.code || 'server_error', outcome, message,
      text:typeof detail.text === 'string' && detail.text.trim()
        ? detail.text : `${message} ${outcomeText}`};
  }
  function reportDelegationFailure(failure, key, utterance, submittedRevision) {
    const detail = describeFailure(failure);
    const text = submittedRevision === revision ? detail.text
      : `Felbeskedet gäller ett tidigare besked, före din senaste rättelse. ${detail.text}`;
    const identity = key + ':' + detail.code + ':' + detail.text;
    if (!displayedFailures.has(identity)) {
      displayedFailures.add(identity);
      finishVisibleTranscript('assistant');
      assistantResponseBoundary = true;
      // A failed client request is also a boundary for the submitted utterance.
      // Keep its identity/history without attaching the next question to an old
      // save instruction. This makes no claim about whether server work stopped.
      if (submittedRevision === revision && activeUser?.id === utterance.id &&
          activeUser.text === utterance.text) {
        finishVisibleTranscript('user');
        activeUser = null;
      }
      ui.addTranscript('event', text);
      history.push({role:'backend',text:`Felbesked för det föregående uppdraget: ${detail.text}`});
      lastRole = 'backend';
      ui.log(text);
    }
    if (submittedRevision === revision) ui.setStatus(text);
    return text;
  }
  function appendTranscript(role, text, timing = {}) {
    if (!text) return;
    if (role === 'user') {
      lastUserDeltaReceivedAt = timing.type === 'session.input_transcript.delta' ? performance.now() : null;
      interruptClientTiming('Mätningen avbröts av ett nytt användarbesked.');
      if (!activeUser) {
        activeUser = {role:'user', id:crypto.randomUUID(), text:'', fragments:[]};
        history.push(activeUser);
      }
      activeUser.text += text;
      activeUser.fragments.push({text, start_ms:timing.start_ms, end_ms:timing.end_ms});
      lastUser = activeUser;
      lastRole = 'user';
      // Display turns follow conversational pauses; backend utterances still
      // collect the full request until the existing processing boundary.
      showUserFragment(text, timing);
      currentSpeechAt = performance.now();
      const inputRevision = ++revision;
      inputChain = inputChain.then(async () => {
        const result = await request('/api/input', {revision:inputRevision});
        if (!Number.isSafeInteger(result.revision) || result.revision < inputRevision) {
          throw new Error('Servern bekräftade inte textrevisionen.');
        }
        acknowledgedInputRevision = Math.max(acknowledgedInputRevision, result.revision);
      }).catch(error);
      return;
    }
    const boundary = lastRole !== role;
    if (!boundary && history.length) history.at(-1).text += text;
    else history.push({role, text});
    lastRole = role;
    showAssistantFragment(text);
  }
  async function delegate(id, epoch, waitingId = crypto.randomUUID(), clientTiming = null) {
    if (activeUser || lastUser) beginWork(waitingId);
    // This gap batches deliveries; it does not establish a physical turn end.
    // Keep accumulating user fragments across assistant speech and backend work.
    const wait = Math.max(0, 550 - (performance.now() - currentSpeechAt));
    if (wait) {setTimeout(() => delegate(id,epoch,waitingId,clientTiming), wait);return;}
    if (waitingWork.has(waitingId)) {waitingWork.get(waitingId).stage='queue';renderWork();}
    const acknowledgedInput = inputChain;
    await acknowledgedInput;
    // A new fragment can extend the chain while this await is pending. Re-enter
    // the existing settling gate and await that new chain before capturing a
    // revision, utterance and history together in the synchronous block below.
    if (acknowledgedInput !== inputChain) return delegate(id,epoch,waitingId,clientTiming);
    const submittedRevision = revision;
    const user = activeUser || lastUser;
    if (!user) {
      finishWork(waitingId);
      if (epoch === sessionId && connected) send({type:'session.commentary.append', delegation_id:id,
        content:'Berätta vad du vill veta eller ändra i kartan.'});
      return;
    }
    if (acknowledgedInputRevision < submittedRevision) {
      finishWork(waitingId);
      const text = 'Servern har inte bekräftat det senaste textbeskedet. Inget nytt kartuppdrag har skickats.';
      ui.setStatus(text);
      if (currentClientTiming(clientTiming)) {
        clientTiming.closed = true;
        clientTiming.note = text;
        publishClientTiming();
      }
      if (epoch === sessionId && connected) send({type:'session.commentary.append',delegation_id:id,content:text});
      return;
    }
    const deliveryKey = id + ':' + submittedRevision;
    if (handled.has(deliveryKey)) {finishWork(waitingId);return;}
    handled.add(deliveryKey);
    // Input can first arrive while awaiting the revision notification above.
    if (!waitingWork.has(waitingId)) waitingWork.set(waitingId,
      {revision:submittedRevision,started:performance.now(),stage:'queue'});
    const utterance = {id:user.id, text:user.text};
    const key = 'utterance:' + utterance.id + ':' + submittedRevision;
    Object.assign(waitingWork.get(waitingId),{revision:submittedRevision,stage:'request',
      job_id:'human-'+utterance.id+':'+submittedRevision});
    renderWork();
    const context = history.map(item => ({...item,
      ...(item.fragments ? {fragments:item.fragments.map(fragment => ({...fragment}))} : {})}));
    ui.setStatus('Tolkar samtalet och kontrollerar kartan…');
    try {
      const result = await request('/api/delegate', {job_id:key, current_utterance:utterance,
        history:context, revision:submittedRevision}, clientTiming);
      if (result.stale || submittedRevision !== revision) {
        if (currentClientTiming(clientTiming)) {
          clientTiming.closed = true;
          clientTiming.note = 'Servern markerade uppdraget som inaktuellt; inget resultat kopplas till följande text.';
          publishClientTiming();
        }
        ui.setStatus('En ny rättelse kom under arbetet. Läser det nya beskedet.');
        if (epoch === sessionId) send({type:'session.thinking.append', delegation_id:id,
          content:'Ny användartext tillkom under backendjobbet. Det gamla svaret får inte återges som aktuellt. Delegera den senaste rättelsen och kontrollera kartan på nytt.'});
        if (epoch === sessionId && connected) {
          Object.assign(waitingWork.get(waitingId),{revision,stage:'receive'});
          renderWork();
          setTimeout(() => delegate(id,epoch,waitingId,clientTiming), 600);
        } else finishWork(waitingId);
        return;
      }
      // This is a completed processing boundary, not a claim about VAD or silence.
      // A later input starts a fresh identity; server checks prevent reuse of save intent.
      let resultText = result.text;
      if (result.ui_action) {
        // UI effects belong to this current request, never to polling or a late
        // response from a different voice session. Only the rendered map can
        // acknowledge a selection; backend facts alone are not confirmation.
        if (epoch !== null && epoch !== sessionId) {finishWork(waitingId);return;}
        let selection;
        try {selection = ui.applyMapSelection?.(result.ui_action);} catch {}
        resultText = selection?.ok === true ? 'Markerad.'
          : selection?.text || 'Det gick inte att markera i kartan.';
      }
      if (activeUser?.id === utterance.id) {
        finishVisibleTranscript('user');
        activeUser = null;
      }
      if (!displayedJobs.has(key)) {
        displayedJobs.add(key);
        finishVisibleTranscript('assistant');
        assistantResponseBoundary = true;
        ui.addTranscript('backend', resultText);
        history.push({role:'backend',text:resultText});
        lastRole = 'backend';
      }
      if (epoch === sessionId && connected) send({type:'session.commentary.append', delegation_id:id, content:resultText});
      finishWork(waitingId);
      ui.setStatus(result.ui_action ? resultText : result.task_receipt && !result.view?.full_diff?.length
        ? 'Sparat i provet. Sparkvittot finns under ändringslistan.'
        : result.view?.full_diff?.length
          ? 'Osparade förslag finns i ändringslistan. Fortsätt prata eller säg spara ändringarna.'
          : 'Inga osparade ändringar finns kvar. Fortsätt när du vill.');
    } catch (failure) {
      if (currentClientTiming(clientTiming) && clientTiming.request_ms === null) {
        clientTiming.closed = true;
        clientTiming.note = 'Ett komplett serversvar saknas; efterföljande text tidskopplas inte till anropet.';
        publishClientTiming();
      }
      if (failure.response) finishWork(waitingId);
      else {
        // A broken response does not tell us whether server-side work stopped.
        // Keep it visible until a newer authoritative poll resolves the state.
        const resolved = serverWork && (serverWork.revision > submittedRevision ||
          (serverWork.revision === submittedRevision && !serverWork.active));
        if (resolved) finishWork(waitingId);
        else {
          const pending = waitingWork.get(waitingId) ||
            {revision:submittedRevision,started:performance.now()};
          pending.stage='uncertain';
          waitingWork.set(waitingId,pending);
          lostWorkStatus();
        }
      }
      const text = reportDelegationFailure(failure, key, utterance, submittedRevision);
      if (epoch === sessionId && connected) send({type:'session.commentary.append', delegation_id:id,
        content:text});
    }
  }
  async function onEvent(event, connectionGeneration) {
    if (connectionGeneration !== generation) return;
    if (event.type === 'session.started') {
      sessionId = event.session.id;
      connected = true;
      ui.setConnected(true);
      renderTransport();
      ui.setStatus('Ansluten. Berätta om Tonrum med din röst.');
      $('mic-status').textContent = microphone ? 'Mikrofonen skickar ljud till OpenAI' : 'Teknisk anslutning med tyst syntetiskt ljud';
      stopTimer = setTimeout(() => {if(connectionGeneration===generation)stop();}, 5 * 60 * 1000);
    } else if (event.type === 'session.input_transcript.delta') {
      appendTranscript('user', event.delta, event);
    } else if (event.type === 'session.output_transcript.delta') {
      if (event.delta) observeOutputTiming();
      appendTranscript('assistant', event.delta);
    } else if (event.type === 'session.delegation.created') {
      if (event.delegation?.target === 'client') {
        const clientTiming = beginClientTiming(event.delegation.id);
        delegate(event.delegation.id, sessionId, undefined, clientTiming);
      }
    } else if (event.type === 'session.closed') {
      finalized = true;
      await request('/api/closed', {session_id:sessionId, usage:event.usage}).catch(error);
      if (connectionGeneration !== generation) return;
      cleanup();
      ui.setStatus('Samtalet är avslutat. Utkast och lokala sparkvitton finns kvar.');
    } else if (event.type === 'error') {
      error(new Error('Tal-API: ' + (event.error?.message || event.error?.code || 'okänt fel')));
    }
  }
  function cleanup() {
    interruptClientTiming('Mätningen avbröts när talanslutningen avslutades.');
    lastUserDeltaReceivedAt = null;
    generation++;
    finishVisibleTranscript('assistant');
    finishVisibleTranscript('user');
    visiblePartial = null;
    visibleUser = null;
    clearTimeout(closeTimer); clearTimeout(stopTimer);
    connected = false; starting = false; stopping = false;
    microphone?.getTracks().forEach(track => track.stop());
    microphone = null;
    channel?.close(); peer?.close();
    channel = null; peer = null;
    audio.srcObject = null;
    audioContext?.close(); audioContext = null;
    ui.setConnected(false);
    renderTransport();
    $('mic-status').textContent = 'Mikrofonen är avstängd';
  }
  async function start(silent = false) {
    if (peer || starting || transportSwitchPending || modelSwitchPending || !modelKnown) return;
    starting = true;
    renderTransport();
    finalized = false; stopping = false;
    const connectionGeneration = ++generation;
    ui.setStatus(silent ? 'Kontrollerar anslutningen utan mikrofon…' : 'Begär mikrofonåtkomst…');
    $('start-voice').disabled = true;
    try {
      peer = new RTCPeerConnection();
      peer.addEventListener('track', event => {
        audio.srcObject = new MediaStream([event.track]);
        audio.play().catch(() => ui.setStatus('Tryck på ljudspelarens spela-knapp för att höra assistenten.'));
      });
      if (silent) {
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain(); gain.gain.value = 0;
        oscillator.connect(gain).connect(destination); oscillator.start();
        peer.addTrack(destination.stream.getAudioTracks()[0], destination.stream);
      } else {
        microphone = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
        for (const track of microphone.getAudioTracks()) peer.addTrack(track, microphone);
      }
      channel = peer.createDataChannel('oai-events');
      channel.addEventListener('message', message => onEvent(JSON.parse(message.data),connectionGeneration).catch(error));
      channel.addEventListener('close', () => {
        if (connectionGeneration === generation && !finalized && peer) {
          cleanup();
          ui.setStatus('Talanslutningen bröts. Utkastet finns kvar. Servern försöker avsluta sessionen; kostnaden behåller sin reservation tills slutbesked finns.');
        }
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (peer.iceGatheringState !== 'complete') await new Promise((resolve,reject) => {
        const timer = setTimeout(() => reject(new Error('ICE-anslutningen tog för lång tid.')), 10000);
        peer.addEventListener('icegatheringstatechange', () => {
          if (peer?.iceGatheringState === 'complete') {clearTimeout(timer);resolve();}
        });
      });
      const result = await request('/api/session', {sdp:peer.localDescription.sdp});
      sessionId = result.session.id;
      await peer.setRemoteDescription({type:'answer', sdp:result.transport.sdp});
      if (silent) setTimeout(() => {if(connectionGeneration===generation)stop();}, 10000);
    } catch (failure) { cleanup(); error(failure); }
    finally {starting=false;renderTransport();}
  }
  function stop() {
    if (stopping || !peer) return;
    stopping = true;
    renderTransport();
    const connectionGeneration = generation;
    microphone?.getAudioTracks().forEach(track => {track.enabled = false;});
    $('mic-status').textContent = 'Mikrofonen är tystad; inväntar slutbesked';
    ui.setStatus('Avslutar och hämtar slutlig förbrukning…');
    send({type:'session.close'});
    request('/api/stop', {session_id:sessionId}).catch(error);
    closeTimer = setTimeout(() => {
      if (connectionGeneration !== generation) return;
      cleanup();
      ui.setStatus('Slutbeskedet saknas. Servern bevakar sessionen och kostnadsreservationen ligger kvar.');
    }, 15000);
  }
  $('start-voice').onclick = () => start(false);
  $('use-mcp').onchange = changeTransport;
  $('backend-model').onchange = changeModel;
  $('reasoning-effort').onchange = changeModel;
  $('stop-voice').onclick = stop;
  $('mute-voice').onclick = () => {
    for (const track of microphone?.getAudioTracks() || []) track.enabled = !track.enabled;
    const enabled = microphone?.getAudioTracks()[0]?.enabled;
    ui.setMuted?.(!enabled);
    $('mic-status').textContent = enabled ? 'Mikrofonen skickar ljud till OpenAI' : 'Mikrofonen är tystad. Talsessionen fortsätter debitera.';
    $('mute-voice').textContent = enabled ? 'Tysta mikrofon' : 'Slå på mikrofon';
  };
  $('reconnect-voice').onclick = () => start(false);
  $('signal-disconnect').onclick = () => {
    // Interrupts the real connection; server-side monitor remains responsible
    // for finalization. A lost connection never implies an undone save.
    if (sessionId) request('/api/stop', {session_id:sessionId}).catch(error);
    cleanup();
    ui.setStatus('Anslutningen är avbruten. Utkastet finns kvar; kontrollera kvittot innan du upprepar spara.');
  };
  $('send-text').onclick = async () => {
    if (transportSwitchPending || modelSwitchPending || !modelKnown) return;
    const text = $('test-text').value.trim();
    if (!text) return;
    finishVisibleTranscript('assistant');
    finishVisibleTranscript('user');
    visiblePartial = null;
    visibleUser = null;
    activeUser = null;
    lastRole = null;
    appendTranscript('user', text);
    $('test-text').value = '';
    await delegate('text-' + crypto.randomUUID(), null);
  };
  // A visible technical control verifies WebRTC access without capturing sound.
  const smoke = document.createElement('button');
  smoke.textContent = 'Kontrollera talanslutningen utan mikrofon (10 sekunder)';
  smoke.id = 'smoke-voice';
  smoke.onclick = () => start(true);
  $('send-text').parentElement.append(smoke);
  window.addEventListener('pagehide', () => {
    if (sessionId) {
      send({type:'session.close'});
      navigator.sendBeacon('/api/stop', JSON.stringify({session_id:sessionId}));
    }
    microphone?.getTracks().forEach(track => track.stop());
  });
  setInterval(renderWork,1000);
  setInterval(() => request('/api/state').catch(lostWorkStatus), 1200);
  renderTransport();
  request('/api/state').catch(error);
})();
