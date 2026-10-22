// This adapter retains the supplied graph's node IDs and every model connection.
export const fields = {
  model: [1, 'unet_name'], weight_dtype: [1, 'weight_dtype'],
  encoder: [2, 'clip_name'], encoder_type: [2, 'type'], encoder_device: [2, 'device'],
  vae: [3, 'vae_name'], prompt: [4, 'text'], negative: [5, 'text'],
  width: [6, 'width'], height: [6, 'height'], batch: [6, 'batch_size'],
  shift: [15, 'shift'], sampling: [15, 'sampling'],
  double_layers: [13, 'double_layers'], single_layers: [13, 'single_layers'],
  start_percent: [13, 'start_percent'], end_percent: [13, 'end_percent'],
  seed: [16, 'seed'], steps: [16, 'steps'], cfg: [16, 'cfg'],
  sampler: [16, 'sampler_name'], scheduler: [16, 'scheduler'],
  denoise: [16, 'denoise'], prefix: [18, 'filename_prefix']
};

export const experimentalDefaults = {mode:'txt2img', source_image:'', source_width:0,
  source_height:0, img2img_denoise:0.55, resize_method:'lanczos', crop:'center'};
export const projectKeys = [...Object.keys(fields), ...Object.keys(experimentalDefaults)];
export const img2imgNodeTypes = ['LoadImage','ImageScale','VAEEncode','RepeatLatentBatch'];

export function defaults(graph) {
  return {...Object.fromEntries(Object.entries(fields).map(([key, [id, name]]) =>
    [key, graph.nodes.find(n => n.id === id).widgets_values_named[name]])), ...experimentalDefaults};
}

export function patchGraph(graph, settings) {
  const copy = structuredClone(graph);
  for (const [key, [id, name]] of Object.entries(fields)) {
    if (settings[key] === undefined) continue;
    const node = copy.nodes.find(n => n.id === id);
    const names = Object.keys(node.widgets_values_named || {});
    const index = names.indexOf(name);
    if (index < 0) throw new Error(`Missing workflow widget: ${id}.${name}`);
    node.widgets_values_named[name] = settings[key];
    if (node.widgets_values) node.widgets_values[index] = settings[key];
  }
  return copy;
}

export function validateValue(value, spec, label) {
  const [kind, options = {}] = spec;
  if (Array.isArray(kind)) {
    if (!kind.includes(value)) throw new Error(`${label}: selected value is unavailable in ComfyUI (${value}).`);
  } else if (kind === 'INT' || kind === 'FLOAT') {
    if (!Number.isFinite(value) || (kind === 'INT' && !Number.isSafeInteger(value)))
      throw new Error(`${label}: enter a valid ${kind === 'INT' ? 'whole number' : 'number'}.`);
    if (options.min !== undefined && value < options.min) throw new Error(`${label}: minimum is ${options.min}.`);
    if (options.max !== undefined && value > options.max) throw new Error(`${label}: maximum is ${options.max}.`);
  } else if (kind === 'STRING' && typeof value !== 'string') {
    throw new Error(`${label}: expected text.`);
  }
}

export function compileWorkflow(graph, settings, schema) {
  const mode = settings.mode || 'txt2img';
  if (!['txt2img','img2img'].includes(mode)) throw new Error('Choose Text to image or Experimental image to image.');
  const workflow = mode === 'img2img' ? imageToImageGraph(patchGraph(graph,settings),settings) : patchGraph(graph, settings);
  const links = new Map(workflow.links.map(link => [link[0], link]));
  const prompt = {};
  for (const node of workflow.nodes) {
    if (node.type === 'Note') continue;
    const info = schema[node.type];
    if (!info) throw new Error(`ComfyUI is missing ${node.type}. Update ComfyUI core before generating.`);
    const required = info.input?.required || {};
    const specs = {...required, ...info.input?.optional};
    const inputs = {};
    for (const [name, spec] of Object.entries(specs)) {
      const input = (node.inputs || []).find(item => item.name === name);
      if (input?.link != null) {
        const link = links.get(input.link);
        if (!link) throw new Error(`Broken workflow connection: ${node.id}.${name}`);
        inputs[name] = [String(link[1]), link[2]];
      } else if (Object.hasOwn(node.widgets_values_named || {}, name)) {
        inputs[name] = node.widgets_values_named[name];
        validateValue(inputs[name], spec, `${node.type} / ${name}`);
      } else if (Object.hasOwn(required, name)) {
        if (spec[1]?.default !== undefined) inputs[name] = spec[1].default;
        else throw new Error(`The installed ${node.type} needs a new input: ${name}. This workflow needs updating.`);
      }
    }
    prompt[String(node.id)] = {class_type: node.type, inputs, _meta: {title: node.title || node.type}};
  }
  if (!String(settings.prompt ?? '').trim()) throw new Error('Describe the image you want to create.');
  for (const name of ['width', 'height']) {
    if (settings[name] % 16) throw new Error('Image width and height must be multiples of 16.');
  }
  if (settings.start_percent > settings.end_percent) throw new Error('Layer guidance start must be before its end.');
  return {prompt, workflow};
}

export function imageToImageGraph(workflow, settings) {
  if (typeof settings.source_image !== 'string' || !settings.source_image.trim())
    throw new Error('Upload a source image for Experimental image to image.');
  if (!Number.isFinite(settings.img2img_denoise) || settings.img2img_denoise <= 0 || settings.img2img_denoise >= 1)
    throw new Error('Experimental image-to-image change strength must be greater than 0 and less than 1.');
  const node = (id,type,title,pos,inputs,outputs,values) => ({id,type,title,pos,size:[300,220],flags:{},mode:0,
    inputs,outputs,properties:{'Node name for S&R':type},widgets_values:Object.values(values),widgets_values_named:values});
  const connection = (name,type,link) => ({name,type,link});
  const widget = (name,type) => ({name,type,link:null,widget:{name}});
  const output = (name,type,links) => ({name,type,links});
  const copy = structuredClone(workflow);
  copy.nodes = copy.nodes.filter(n => n.id !== 6);
  copy.links = copy.links.filter(l => l[0] !== 20);
  copy.nodes.push(
    node(21,'LoadImage','Experimental · source image',[10,1080],
      [widget('image','COMBO')],[output('IMAGE','IMAGE',[24]),output('MASK','MASK',[])],
      {image:settings.source_image}),
    node(22,'ImageScale','Resize source to output size',[370,1080],
      [connection('image','IMAGE',24),widget('upscale_method','COMBO'),widget('width','INT'),widget('height','INT'),widget('crop','COMBO')],
      [output('IMAGE','IMAGE',[25])],{upscale_method:settings.resize_method || 'lanczos',width:settings.width,height:settings.height,crop:settings.crop || 'center'}),
    node(23,'VAEEncode','Encode with the same MOSS VAE',[730,1080],
      [connection('pixels','IMAGE',25),connection('vae','VAE',26)],
      [output('LATENT','LATENT',[27])],{}),
    node(24,'RepeatLatentBatch','Source latent · requested image count',[1090,1080],
      [connection('samples','LATENT',27),widget('amount','INT')],
      [output('LATENT','LATENT',[20])],{amount:settings.batch})
  );
  copy.links.push([24,21,0,22,0,'IMAGE'],[25,22,0,23,0,'IMAGE'],[26,3,0,23,1,'VAE'],
    [27,23,0,24,0,'LATENT'],[20,24,0,16,3,'LATENT']);
  const vae = copy.nodes.find(n=>n.id===3);
  vae.outputs[0].links = [...(vae.outputs[0].links || []),26];
  const sampler = copy.nodes.find(n=>n.id===16);
  sampler.widgets_values_named.denoise = settings.img2img_denoise;
  sampler.widgets_values[Object.keys(sampler.widgets_values_named).indexOf('denoise')] = settings.img2img_denoise;
  copy.last_node_id = 24; copy.last_link_id = 27;
  // Recompute topological order after replacing the empty latent source.
  const pending = new Set(copy.nodes.map(n=>n.id)), assigned = new Set(); let order=0;
  while(pending.size) {
    let progressed=false;
    for(const n of copy.nodes) if(pending.has(n.id)) {
      const parents=copy.links.filter(l=>l[3]===n.id).map(l=>l[1]);
      if(parents.every(id=>assigned.has(id))) {n.order=order++;pending.delete(n.id);assigned.add(n.id);progressed=true;}
    }
    if(!progressed) throw new Error('The experimental workflow has a cycle or missing node.');
  }
  copy.groups.push({id:5,title:'EXPERIMENTAL IMAGE TO IMAGE · source → resize → VAE encode',
    bounding:[-15,1020,1440,330],color:'#8b6f40',flags:{}});
  copy.extra = {...copy.extra,moss_studio:{version:'1.1.0',mode:'img2img',source_image:settings.source_image,
    denoise:settings.img2img_denoise,notes:'Latent image-to-image; not an edit-trained instruction model.'}};
  return copy;
}

export function historyResult(history, promptId) {
  const item = history[promptId];
  if (!item) return null;
  const messages = item.status?.messages || [];
  const problem = messages.find(([type]) => ['execution_error', 'execution_interrupted'].includes(type));
  if (problem) return {state: problem[0] === 'execution_interrupted' ? 'cancelled' : 'error',
    message: problem[1]?.exception_message || problem[0], item};
  if (item.status?.status_str === 'error') return {state: 'error', message: 'ComfyUI reported an execution error.', item};
  if (!item.status?.completed) return {state: 'waiting', item};
  const images = item.outputs?.['18']?.images || [];
  return images.length ? {state: 'complete', images, item} :
    {state: 'error', message: 'The job finished without a saved image. Check node 18 in ComfyUI.', item};
}

export function randomSeed() {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return (words[0] & 0x1fffff) * 4294967296 + words[1];
}
