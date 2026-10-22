import { fields, projectKeys, img2imgNodeTypes, defaults, patchGraph, compileWorkflow, historyResult, randomSeed } from './workflow.mjs';

const $ = id => document.getElementById(id);
const form = $('settings');
const ROOT = new URL('../', document.baseURI).pathname.replace(/\/$/, '');
const apiPath = path => ROOT + path;
const STORE = 'moss-studio.settings.v1';
const JOB = 'moss-studio.job.v1';
let graph, original, schema = {}, state = {}, ready = false, busy = false, uploading = false, active = null, result = null;
let socket, pollTimer, tickTimer, monitoring = false, missed = 0, absent = 0;
const clientId = crypto.randomUUID();
const expectedModels = ['moss_image_sft_int8_convrot.safetensors', 'moss_image_sft_bf16.safetensors', 'moss_image_base_int8_convrot.safetensors', 'moss_image_base_bf16.safetensors'];

function stored(storage, key) { try { return JSON.parse(storage.getItem(key)); } catch { return null; } }
function persist(storage, key, value) { try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function showError(error) { $('error').textContent = error.message || String(error); $('error').hidden = false; }
function clearError() { $('error').hidden = true; $('error').textContent = ''; }
function errorMessage(body) {
  const lines = [typeof body.error === 'string' ? body.error : body.error?.message || body.error?.details || 'ComfyUI rejected this request.'];
  for (const [id, node] of Object.entries(body.node_errors || {}))
    for (const problem of node.errors || []) lines.push(`Node ${id} (${node.class_type || 'workflow'}): ${problem.message || ''} ${problem.details || ''}`);
  return lines.join('\n');
}
async function request(path, options = {}) {
  const response = await fetch(apiPath(path), {cache:'no-store', signal:AbortSignal.timeout(20000), ...options});
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = {error: text.slice(0, 500)}; }
  if (!response.ok) throw new Error(`${errorMessage(data)} (HTTP ${response.status})`);
  return data;
}
const post = (path, body) => request(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
function setConnection(ok, label) {
  $('connection').className = `pill ${ok ? 'connected' : 'disconnected'}`;
  $('connection').replaceChildren(Object.assign(document.createElement('i'), {ariaHidden:'true'}), document.createTextNode(label));
}
function notice(text, warn = false) { $('notice').textContent = text; $('notice').className = 'notice' + (warn ? ' warn' : ''); }
function updateGenerate() { $('generate').disabled = !ready || busy || uploading; }
function getSpec(key) {
  const [id, name] = fields[key];
  const type = graph.nodes.find(n => n.id === id).type;
  return schema[type]?.input?.required?.[name] || schema[type]?.input?.optional?.[name];
}
function choices(key) { const spec = getSpec(key); return Array.isArray(spec?.[0]) ? spec[0] : []; }
function modelLabel(name) {
  const file = name.split(/[\\/]/).pop();
  const type = /_sft_/i.test(file) ? 'SFT' : 'Base';
  return `${type} · ${/int8/i.test(file) ? 'INT8' : 'BF16'} — ${name}`;
}
function fillSelect(key, available, expected = [], label = value => value) {
  const select = $(key), selected = state[key];
  select.replaceChildren();
  for (const value of available) select.add(new Option(label(value), value));
  for (const value of [...new Set([...expected, selected])]) {
    if (value == null || available.includes(value)) continue;
    // A nested installed model represents the same canonical missing-file entry.
    if (value !== selected && available.some(v => v.split(/[\\/]/).pop() === value)) continue;
    const option = new Option(`${label(value)} · unavailable`, value);
    option.disabled = true; select.add(option);
  }
  select.value = selected;
}
function readForm() {
  for (const key of projectKeys) {
    const element = $(key);
    if (!element) continue;
    state[key] = typeof original[key] === 'number' ? element.valueAsNumber : element.value;
  }
  return {...state};
}
function applyState(value) {
  state = {...original, ...Object.fromEntries(projectKeys.filter(k => Object.hasOwn(value, k)).map(k => [k, value[k]]))};
  // Keep unsupported/absent combo values visible until a fresh installation check.
  for (const key of projectKeys) {
    const element = $(key);
    if (!element) continue;
    if (element.tagName === 'SELECT' && !Array.from(element.options).some(o => o.value === String(state[key]))) {
      element.add(new Option(String(state[key]) + ' · not checked', state[key]));
    }
    element.value = state[key];
  }
  updateSize();
  updateMode();
}
function updateMode() {
  const experimental = $('mode').value === 'img2img';
  $('source-panel').hidden = !experimental; $('denoise').disabled = experimental;
  $('denoise-help').hidden = !experimental;
  $('strength-value').textContent = Number($('img2img_denoise').value).toFixed(2);
  $('source-ratio').disabled = !state.source_width || !state.source_height;
  const source = $('source_image').value;
  $('source-preview-frame').hidden = !source;
  if (source) {
    const parts = source.split('/'); const filename=parts.pop();
    const src=imageURL({filename,subfolder:parts.join('/'),type:'input'});
    if ($('source-preview').getAttribute('src') !== src) $('source-preview').src=src;
  } else $('source-preview').removeAttribute('src');
  $('source-preview-frame').style.aspectRatio = `${$('width').value || 768} / ${$('height').value || 768}`;
  $('source-preview').style.objectFit = $('crop').value === 'disabled' ? 'fill' : 'cover';
}
function readyNotice() {
  if ($('mode').value === 'img2img') notice('Experimental image-to-image is ready to test. Character identity, fine details and precise edits may change.',true);
  else notice('Ready to create. Keep ComfyUI running. A 768 × 768 test is a good place to start.');
}
function updateSize() {
  const w = Number($('width').value), h = Number($('height').value);
  const preset = `${w},${h}`;
  $('size').value = Array.from($('size').options).some(o => o.value === preset) ? preset : 'custom';
  $('size-summary').textContent = `${w || '—'} × ${h || '—'}`;
  $('size-help').textContent = w * h > 1024 * 1024 ? 'Large canvas: test a smaller size first if memory use is uncertain.' : 'Start with a quick test. Larger images need more memory.';
}
function saveLocal() {
  readForm();
  $('autosave').textContent = persist(localStorage, STORE, {settings:state, randomize:$('randomize').checked}) ? 'Saved in this browser' : 'Browser storage unavailable';
}
function addCheck(ok, label) {
  const row = document.createElement('div'); row.className = 'check-row ' + (ok ? 'ok' : 'bad');
  row.textContent = `${ok ? '✓' : '!'} ${label}`; $('checks').append(row);
}
async function checkConnection() {
  if (!graph) return;
  ready = false; updateGenerate(); $('recheck').disabled = true;
  $('checks').replaceChildren();
  try {
    const types = [...new Set(graph.nodes.filter(n => n.type !== 'Note').map(n => n.type))];
    const nodes = await Promise.all([...new Set([...types,...img2imgNodeTypes])].map(type => request('/object_info/' + encodeURIComponent(type))));
    schema = Object.assign({}, ...nodes);
    let missing = false;
    for (const type of types) { addCheck(Boolean(schema[type]), type); if (!schema[type]) missing = true; }
    for (const type of img2imgNodeTypes) addCheck(Boolean(schema[type]), `Experimental image-to-image: ${type}`);
    readForm();
    fillSelect('model', choices('model').filter(n => /moss[_-]image/i.test(n)), expectedModels, modelLabel);
    fillSelect('encoder', choices('encoder').filter(n => /qwen3[._]5/i.test(n)));
    fillSelect('vae', choices('vae').filter(n => /flux2/i.test(n)));
    for (const key of ['weight_dtype','encoder_device','sampler','scheduler','sampling']) {
      const spec = getSpec(key);
      fillSelect(key, choices(key));
      $(key).disabled = !spec;
    }
    for (const key of Object.keys(fields)) {
      const el = $(key), spec = getSpec(key);
      if (el?.type === 'number' && spec) {
        for (const property of ['min','max']) if (spec[1]?.[property] !== undefined)
          el[property] = Math.min(spec[1][property], Number.MAX_SAFE_INTEGER);
      }
    }
    for (const key of ['model','encoder','vae']) addCheck(choices(key).includes(state[key]), `${key}: ${state[key]}`);
    setConnection(true, 'ComfyUI connected');
    if (missing) throw new Error('Required workflow nodes are missing. Update ComfyUI core, restart it, then click Check again.');
    compileWorkflow(graph, readForm(), schema);
    ready = true;
    readyNotice();
  } catch (error) {
    ready = false;
    if (!Object.keys(schema).length) setConnection(false, 'Connection unavailable');
    notice(error.message, true);
    $('diagnostics').open = true;
  } finally { $('recheck').disabled = false; updateGenerate(); }
}
function revalidate() {
  if (!Object.keys(schema).length) return;
  try {
    compileWorkflow(graph, readForm(), schema); ready = true;
    readyNotice();
  } catch (error) { ready = false; notice(error.message, true); }
  updateGenerate();
}
function downloadJSON(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function project(settings, run = null) {
  return {format:'moss-studio-project', version:1, studio_version:'1.1.0', workflow_id:graph.id,
    saved_at:new Date().toISOString(), settings, randomize:run ? false : $('randomize').checked,
    result:run ? {prompt_id:run.prompt_id, images:result?.images || [], started_at:run.startedAt} : undefined};
}
function imageURL(image) {
  return apiPath('/view?') + new URLSearchParams({filename:image.filename, subfolder:image.subfolder || '', type:image.type || 'output'});
}
function selectImage(index) {
  const image = result.images[index], url = imageURL(image);
  $('result-image').src = url; $('result-image').alt = `MOSS image ${index + 1}: ${result.run.settings.prompt.slice(0, 180)}`;
  $('result-image').hidden = false; $('empty').hidden = true; $('expand').hidden = false;
  $('download-image').href = url; $('download-image').download = image.filename;
  for (const [i, button] of Array.from($('thumbnails').children).entries()) button.setAttribute('aria-pressed', String(i === index));
  $('large-image').src = url;
}
function showResult(outcome, run) {
  result = {...outcome, run};
  $('thumbnails').replaceChildren();
  if (outcome.images.length > 1) outcome.images.forEach((image, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.ariaLabel = `View image ${index + 1}`;
    const img = document.createElement('img'); img.src = imageURL(image); img.alt = `Image ${index + 1}`;
    button.append(img); button.onclick = () => selectImage(index); $('thumbnails').append(button);
  });
  selectImage(0); $('result-actions').hidden = false;
  $('output-count').textContent = `${outcome.images.length} image${outcome.images.length === 1 ? '' : 's'}`;
  const s = run.settings;
  const method=s.mode==='img2img' ? `Experimental image-to-image · Strength ${s.img2img_denoise} · ` : '';
  $('result-meta').textContent = `${method}${s.width} × ${s.height} · ${s.steps} steps · Seed ${s.seed} · ${s.model} · Saved in ComfyUI/output/${s.prefix}`;
}
function connectSocket() {
  if (socket) { socket.onclose = null; socket.close(); }
  const url = new URL(apiPath('/ws'), location.origin); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('clientId', clientId);
  socket = new WebSocket(url);
  socket.onmessage = event => {
    if (typeof event.data !== 'string' || !active) return;
    let message; try { message = JSON.parse(event.data); } catch { return; }
    const d = message.data || {};
    if (d.prompt_id !== active.prompt_id) return;
    if (message.type === 'progress' && d.max > 0) {
      $('progress').max = d.max; $('progress').value = d.value;
      $('job-state').textContent = 'Generating your image';
      $('job-detail').textContent = `Sampling step ${d.value} of ${d.max}`;
    } else if (message.type === 'executing' && d.node) {
      $('progress').removeAttribute('value');
      const node = (active.workflow || graph).nodes.find(n => String(n.id) === String(d.node));
      $('job-state').textContent = 'Generating your image'; $('job-detail').textContent = node?.title || `Running node ${d.node}`;
    }
  };
  // HTTP polling continues even when live progress is unavailable.
  socket.onerror = () => {};
}
function endJob(label) {
  busy = false; active = null; clearTimeout(pollTimer); clearInterval(tickTimer);
  $('job-state').textContent = label; $('cancel').hidden = true;
  $('progress').max = 1; $('progress').value = label === 'Image complete' ? 1 : 0;
  updateGenerate();
}
async function monitor() {
  if (!active || monitoring) return;
  monitoring = true;
  const run = active;
  try {
    const history = await request('/history/' + encodeURIComponent(run.prompt_id));
    if (active !== run) return;
    missed = 0; setConnection(true, 'ComfyUI connected');
    const outcome = historyResult(history, run.prompt_id);
    if (outcome && ['complete','error','cancelled'].includes(outcome.state)) {
      if (outcome.state === 'complete') {
        showResult(outcome, run); persist(sessionStorage, JOB, {...run, completed:true});
        endJob('Image complete'); $('job-detail').textContent = 'Saved by ComfyUI. Your image is ready below.';
      } else {
        persist(sessionStorage, JOB, null); endJob(outcome.state === 'cancelled' ? 'Job cancelled' : 'Generation failed');
        showError(outcome.message); $('job-detail').textContent = 'Check the message above or open ComfyUI for details.';
      }
      return;
    }
    const queue = await request('/queue');
    if (active !== run) return;
    const running = (queue.queue_running || []).some(row => row[1] === run.prompt_id);
    const position = (queue.queue_pending || []).findIndex(row => row[1] === run.prompt_id);
    if (running || position >= 0) absent = 0; else absent++;
    if (running) {
      if ($('job-state').textContent !== 'Generating your image') $('job-state').textContent = 'Generating your image';
      if (!$('progress').hasAttribute('value')) $('job-detail').textContent = 'Loading models or executing the workflow. This can take several minutes.';
    } else if (position >= 0) {
      $('job-state').textContent = 'Queued'; $('job-detail').textContent = `Waiting in ComfyUI · ${position} job${position === 1 ? '' : 's'} ahead`;
    } else if (absent >= 3) {
      persist(sessionStorage, JOB, null); endJob('Job no longer in queue');
      $('job-detail').textContent = 'It may have been removed or ComfyUI restarted. Check ComfyUI before trying again.';
      return;
    }
  } catch (error) {
    missed++; setConnection(false, 'Reconnecting');
    $('job-detail').textContent = `Connection interrupted. Tracking job ${run.prompt_id}; do not submit another copy.`;
    if (missed === 3) showError('Could not contact ComfyUI. Keep it running; this page will retry. A job already accepted by ComfyUI may still be generating.');
  } finally {
    monitoring = false;
    if (active) pollTimer = setTimeout(monitor, missed ? 5000 : 1800);
  }
}
function track(run) {
  active = run; busy = true; missed = 0; absent = 0; updateGenerate();
  $('job-panel').hidden = false; $('cancel').hidden = false; $('cancel').disabled = false;
  $('job-state').textContent = 'Queued'; $('job-detail').textContent = `Job ${run.prompt_id}`; $('progress').removeAttribute('value');
  clearInterval(tickTimer);
  const tick = () => { const sec = Math.floor((Date.now()-run.startedAt)/1000); $('elapsed').textContent = `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} elapsed`; };
  tick(); tickTimer = setInterval(tick,1000); monitor();
}

form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy || uploading || !ready || !form.reportValidity()) return;
  clearError(); busy = true; updateGenerate();
  try {
    if ($('randomize').checked) $('seed').value = randomSeed();
    const settings = readForm(); saveLocal();
    const compiled = compileWorkflow(graph, settings, schema);
    const run = {settings:{...settings}, startedAt:Date.now(), workflow:compiled.workflow, prompt:compiled.prompt};
    $('job-panel').hidden = false; $('job-state').textContent = 'Submitting'; $('job-detail').textContent = 'Sending your image to ComfyUI…';
    $('progress').removeAttribute('value'); $('cancel').hidden = true;
    // No automatic retries: a failed response may still mean the job was accepted.
    const response = await post('/prompt', {prompt:compiled.prompt, client_id:clientId,
      extra_data:{extra_pnginfo:{workflow:compiled.workflow}, moss_studio:{version:'1.1.0', settings}}});
    if (!response.prompt_id) throw new Error('ComfyUI returned no job ID. Check its queue before submitting again.');
    run.prompt_id = response.prompt_id; persist(sessionStorage, JOB, run); track(run);
  } catch (error) {
    busy = false; updateGenerate();
    $('job-state').textContent = 'Submission not confirmed';
    $('job-detail').textContent = 'Open ComfyUI and check its queue before trying again.';
    showError(error);
  }
});
$('cancel').onclick = async () => {
  if (!active) return;
  $('cancel').disabled = true;
  try { await post('/moss-studio/cancel', {prompt_id:active.prompt_id}); $('job-detail').textContent = 'Cancel requested. Waiting for ComfyUI to confirm…'; }
  catch (error) { showError(error); }
  finally { $('cancel').disabled = false; }
};
form.addEventListener('input', event => { if (['size','source-file'].includes(event.target.id)) return; updateSize(); saveLocal(); updateMode(); revalidate(); });
form.addEventListener('change', event => { if (['size','source-file'].includes(event.target.id)) return; updateSize(); saveLocal(); updateMode(); revalidate(); });
$('size').addEventListener('change', () => {
  if ($('size').value !== 'custom') {
    const [w,h] = $('size').value.split(','); $('width').value = w; $('height').value = h;
    updateSize(); saveLocal(); updateMode(); revalidate();
  }
});
$('new-seed').onclick = () => { $('seed').value = randomSeed(); saveLocal(); revalidate(); };
$('original-prompt').onclick = () => { $('prompt').value = original.prompt; saveLocal(); revalidate(); };
$('restore').onclick = () => {
  applyState(original); $('randomize').checked = false; saveLocal(); checkConnection();
};
$('save-project').onclick = () => downloadJSON('MOSS-Studio-Project.json', project(readForm()));
$('load-project').onclick = () => $('project-file').click();
$('project-file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Project file is too large. Choose a MOSS Studio project JSON.');
    const data = JSON.parse(await file.text());
    if (data.format !== 'moss-studio-project' || data.version !== 1 || data.workflow_id !== graph.id || !data.settings || typeof data.settings !== 'object')
      throw new Error('Choose a version 1 MOSS Studio project saved from this workflow.');
    for (const [key,value] of Object.entries(data.settings)) {
      if (!projectKeys.includes(key)) continue;
      const numeric = typeof original[key] === 'number';
      if ((numeric && (typeof value !== 'number' || !Number.isFinite(value))) || (!numeric && typeof value !== 'string')) throw new Error(`Invalid project setting: ${key}`);
    }
    applyState(data.settings); $('randomize').checked = Boolean(data.randomize); saveLocal(); clearError(); await checkConnection();
  } catch (error) { showError(error); }
  finally { event.target.value = ''; }
};
$('save-result-project').onclick = () => downloadJSON('MOSS-Studio-Result-Project.json', project(result.run.settings, result.run));
$('export-workflow').onclick = () => downloadJSON('MOSS-Studio-Result-Workflow.json', result.run.workflow || patchGraph(graph,result.run.settings));
$('export-details').onclick = () => downloadJSON('MOSS-Studio-Technical-Details.json', {
  version:1, prompt_id:result.run.prompt_id, settings:result.run.settings,
  api_prompt:result.run.prompt, history:result.item
});
$('recheck').onclick = checkConnection;
$('source-file').onchange = async event => {
  const file=event.target.files[0]; if(!file || uploading) return;
  uploading=true; updateGenerate(); $('source-file').disabled=true; $('remove-source').disabled=true;
  $('upload-status').textContent='Uploading to your ComfyUI server…';
  try {
    const extension=({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp' })[file.type];
    if(!extension) throw new Error('Choose a PNG, JPG or WebP image.');
    if(file.size>32*1024*1024) throw new Error('Choose an image smaller than 32 MB.');
    // Decode first so a corrupt/non-image file does not become the active source.
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    const sourceWidth=bitmap.width,sourceHeight=bitmap.height; bitmap.close();
    const data=new FormData(); data.append('image',file,`moss-studio-${crypto.randomUUID()}.${extension}`);
    data.append('type','input'); data.append('overwrite','false');
    const uploaded=await request('/upload/image',{method:'POST',body:data,signal:AbortSignal.timeout(120000)});
    if(!uploaded.name || typeof uploaded.name!=='string') throw new Error('ComfyUI did not return an uploaded image filename.');
    state.source_image=uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
    state.source_width=sourceWidth; state.source_height=sourceHeight;
    $('source_image').value=state.source_image;
    // LoadImage's combo list is dynamic: refresh it after the upload.
    Object.assign(schema,await request('/object_info/LoadImage'));
    $('upload-status').textContent=`Uploaded · ${sourceWidth} × ${sourceHeight}. Preview shows the selected crop/stretch.`;
    saveLocal(); updateMode(); clearError(); revalidate();
  } catch(error) { $('upload-status').textContent='Could not finish uploading. Choose the image again to retry.'; showError(error); }
  finally { uploading=false; $('source-file').disabled=false; $('remove-source').disabled=false; event.target.value=''; updateGenerate(); }
};
$('remove-source').onclick=()=>{
  state.source_image='';state.source_width=0;state.source_height=0;$('source_image').value='';
  $('upload-status').textContent='Source removed from this project. The uploaded file remains in ComfyUI/input.';
  saveLocal();updateMode();revalidate();
};
$('source-ratio').onclick=()=>{
  if(!state.source_width || !state.source_height) return;
  const area=Number($('width').value)*Number($('height').value) || 768*768;
  const scale=Math.sqrt(area/(state.source_width*state.source_height));
  $('width').value=Math.max(16,Math.round(state.source_width*scale/16)*16);
  $('height').value=Math.max(16,Math.round(state.source_height*scale/16)*16);
  updateSize();saveLocal();updateMode();revalidate();
};
$('source-preview').onerror=()=>{
  if($('source_image').value) showError('The uploaded source image could not be loaded. It may be missing from ComfyUI/input. Choose the source file again before generating.');
};
$('expand').onclick = () => $('lightbox').showModal();
$('close-lightbox').onclick = () => $('lightbox').close();
$('lightbox').onclick = event => { if (event.target === $('lightbox')) $('lightbox').close(); };
$('result-image').onerror = () => showError('The saved image could not be loaded. It may have been moved or deleted from ComfyUI/output.');
$('comfy-link').href = apiPath('/') || '/';

async function init() {
  try {
    graph = await request('/moss-studio/workflow.json'); original = defaults(graph);
    const saved = stored(localStorage,STORE);
    // Preserve the original prompt/model/sampling settings, with an explicit small first-test canvas.
    applyState(saved?.settings || {...original,width:768,height:768});
    $('randomize').checked = Boolean(saved?.randomize);
    await checkConnection(); connectSocket();
    const run = stored(sessionStorage,JOB);
    if (run?.prompt_id && run.settings) track(run);
  } catch (error) {
    setConnection(false,'Could not open Studio'); notice('Could not load the bundled workflow. Restart ComfyUI and reload this page.',true); showError(error);
  }
}
init();
