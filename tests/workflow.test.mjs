import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, patchGraph, compileWorkflow, historyResult, randomSeed} from '../web/workflow.mjs';

const graph = JSON.parse(readFileSync(new URL('../workflow.json',import.meta.url)));
const settings = defaults(graph);
// Small server-schema fixture. This does not emulate image inference.
const combo = values => [values, {}];
const number = (kind,min,max) => [kind,{min,max}];
const text = ['STRING',{}];
const schema = {
  UNETLoader:{input:{required:{unet_name:combo([settings.model,'moss_image_sft_int8_convrot.safetensors']),weight_dtype:combo(['default'])}}},
  CLIPLoader:{input:{required:{clip_name:combo([settings.encoder]),type:combo(['moss_image']),device:combo(['default','cpu'])}}},
  VAELoader:{input:{required:{vae_name:combo([settings.vae])}}},
  ModelSamplingAuraFlow:{input:{required:{model:['MODEL'],shift:number('FLOAT',0,100)},optional:{sampling:combo(['flow'])}}},
  SkipLayerGuidanceDiTSimple:{input:{required:{model:['MODEL'],double_layers:text,single_layers:text,start_percent:number('FLOAT',0,1),end_percent:number('FLOAT',0,1)}}},
  CLIPTextEncode:{input:{required:{text,clip:['CLIP']}}},
  EmptyFlux2LatentImage:{input:{required:{width:number('INT',16,16384),height:number('INT',16,16384),batch_size:number('INT',1,4096)}}},
  KSampler:{input:{required:{model:['MODEL'],positive:['CONDITIONING'],negative:['CONDITIONING'],latent_image:['LATENT'],seed:number('INT',0,18446744073709551615),steps:number('INT',1,10000),cfg:number('FLOAT',0,100),sampler_name:combo(['euler']),scheduler:combo(['sgm_uniform']),denoise:number('FLOAT',0,1)}}},
  VAEDecode:{input:{required:{samples:['LATENT'],vae:['VAE']}}},
  SaveImage:{input:{required:{images:['IMAGE'],filename_prefix:text}}}
};
const imageSchema = {...schema,
  LoadImage:{input:{required:{image:combo(['moss-studio-source.png'])}}},
  ImageScale:{input:{required:{image:['IMAGE'],upscale_method:combo(['lanczos','bilinear']),width:number('INT',0,16384),height:number('INT',0,16384),crop:combo(['center','disabled'])}}},
  VAEEncode:{input:{required:{pixels:['IMAGE'],vae:['VAE']}}},
  RepeatLatentBatch:{input:{required:{samples:['LATENT'],amount:number('INT',1,4096)}}}
};
const imageSettings={...settings,mode:'img2img',source_image:'moss-studio-source.png',width:768,height:768,img2img_denoise:0.55};

test('compiles all 11 original links and omits the Note and control_after_generate widget', () => {
  const {prompt,workflow} = compileWorkflow(graph,settings,schema);
  assert.equal(Object.keys(prompt).length,11);
  for (const [,from,slot,to,inputIndex] of graph.links) {
    const node = graph.nodes.find(n=>n.id===to);
    assert.deepEqual(prompt[String(to)].inputs[node.inputs[inputIndex].name],[String(from),slot]);
  }
  assert.equal(prompt['20'],undefined);
  assert.equal(prompt['16'].inputs.control_after_generate,undefined);
  assert.equal(prompt['15'].class_type,'ModelSamplingAuraFlow');
  assert.equal(prompt['15'].inputs.shift,5);
  assert.equal(prompt['13'].inputs.single_layers,'22');
  assert.deepEqual(workflow,graph);
});
test('changed model, prompt, dimensions and seed reach both API and downloadable graph', () => {
  const changes = {...settings,model:'moss_image_sft_int8_convrot.safetensors',prompt:'A forest',width:768,height:768,seed:42};
  const {prompt,workflow} = compileWorkflow(graph,changes,schema);
  assert.equal(prompt['1'].inputs.unet_name,changes.model);
  assert.equal(prompt['4'].inputs.text,changes.prompt);
  assert.equal(prompt['6'].inputs.width,768);
  assert.equal(prompt['16'].inputs.seed,42);
  assert.equal(workflow.nodes.find(n=>n.id===16).widgets_values[0],42);
  assert.equal(workflow.nodes.find(n=>n.id===16).widgets_values[1],'fixed');
  assert.deepEqual(workflow.links,graph.links);
  assert.equal(defaults(graph).width,2560);
});
test('rejects missing nodes, unavailable models, invalid sizes, unsafe seeds and blank prompts', () => {
  const missing = {...schema}; delete missing.EmptyFlux2LatentImage;
  assert.throws(()=>compileWorkflow(graph,settings,missing),/missing EmptyFlux2LatentImage/);
  for (const changes of [{model:'absent.safetensors'},{width:767},{seed:2**53},{steps:0},{cfg:NaN},{prompt:' '},{start_percent:1,end_percent:0}])
    assert.throws(()=>compileWorkflow(graph,{...settings,...changes},schema));
});
test('optional sampling is omitted when installed core does not advertise it', () => {
  const other = structuredClone(schema); delete other.ModelSamplingAuraFlow.input.optional;
  const {prompt} = compileWorkflow(graph,settings,other);
  assert.equal(prompt['15'].inputs.sampling,undefined);
  assert.equal(prompt['15'].inputs.shift,5);
});
test('new required inputs without defaults block generation with a readable error', () => {
  const other = structuredClone(schema); other.VAEDecode.input.required.new_input = ['INT'];
  assert.throws(()=>compileWorkflow(graph,settings,other),/needs a new input/);
});
test('broken links are rejected instead of silently producing a different graph', () => {
  const broken=structuredClone(graph); broken.links=broken.links.filter(l=>l[0]!==13);
  assert.throws(()=>compileWorkflow(broken,settings,schema),/Broken workflow/);
});
test('history handles batches, errors, cancellation, incomplete and empty output', () => {
  const images=[{filename:'a.png'},{filename:'b.png'}];
  assert.equal(historyResult({},'id'),null);
  assert.equal(historyResult({id:{status:{completed:false}}},'id').state,'waiting');
  assert.deepEqual(historyResult({id:{status:{completed:true},outputs:{18:{images}}}},'id').images,images);
  assert.equal(historyResult({id:{status:{completed:true},outputs:{}}},'id').state,'error');
  assert.equal(historyResult({id:{status:{messages:[['execution_error',{exception_message:'out of memory'}]]}}},'id').message,'out of memory');
  assert.equal(historyResult({id:{status:{messages:[['execution_interrupted',{}]]}}},'id').state,'cancelled');
});
test('random seeds stay exact in JavaScript and acceptable to the workflow', () => {
  for(let i=0;i<100;i++) {const seed=randomSeed();assert.ok(Number.isSafeInteger(seed)&&seed>=0);}
});

test('graph patching leaves the supplied template untouched', () => {
  const copy=patchGraph(graph,{...settings,negative:'',single_layers:''});
  assert.equal(defaults(copy).negative,'');assert.equal(defaults(copy).single_layers,'');
  assert.equal(defaults(graph).single_layers,'22');
});

test('image-to-image replaces only the latent source and retains AuraFlow, SLG, prompts and decoder',()=>{
  const {prompt,workflow}=compileWorkflow(graph,imageSettings,imageSchema);
  assert.equal(prompt['6'],undefined);
  assert.equal(prompt['21'].class_type,'LoadImage');
  assert.deepEqual(prompt['22'].inputs.image,['21',0]);
  assert.deepEqual(prompt['23'].inputs.pixels,['22',0]);
  assert.deepEqual(prompt['23'].inputs.vae,['3',0]);
  assert.deepEqual(prompt['24'].inputs.samples,['23',0]);
  assert.deepEqual(prompt['16'].inputs.latent_image,['24',0]);
  assert.equal(prompt['16'].inputs.denoise,0.55);
  for(const id of ['1','2','3','4','5','13','15','17','18'])
    assert.deepEqual(prompt[id],compileWorkflow(graph,imageSettings.mode==='img2img'?{...imageSettings,mode:'txt2img'}:settings,schema).prompt[id]);
  assert.equal(defaults(graph).width,2560);
  assert.equal(workflow.extra.moss_studio.mode,'img2img');
});
test('image-to-image exports a connected graph with consistent link references and topological order',()=>{
  const {workflow}=compileWorkflow(graph,imageSettings,imageSchema);
  const ids=workflow.nodes.map(n=>n.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(new Set(workflow.links.map(l=>l[0])).size,workflow.links.length);
  for(const [id,from,slot,to,index,type] of workflow.links) {
    const source=workflow.nodes.find(n=>n.id===from),target=workflow.nodes.find(n=>n.id===to);
    assert.ok(source && target);
    assert.equal(target.inputs[index].link,id);
    assert.ok(source.outputs[slot].links.includes(id));
    assert.equal(source.outputs[slot].type,type);
    assert.equal(target.inputs[index].type,type);
    assert.ok(source.order<target.order);
  }
  assert.ok(workflow.last_node_id>=Math.max(...ids));
  assert.ok(workflow.last_link_id>=Math.max(...workflow.links.map(l=>l[0])));
});
test('image-to-image uses requested batch, target size and resize fit',()=>{
  const {prompt}=compileWorkflow(graph,{...imageSettings,width:1024,height:768,batch:3,crop:'disabled'},imageSchema);
  assert.equal(prompt['24'].inputs.amount,3);
  assert.equal(prompt['22'].inputs.width,1024);
  assert.equal(prompt['22'].inputs.height,768);
  assert.equal(prompt['22'].inputs.crop,'disabled');
});
test('image-to-image requires an available source and a strength strictly between zero and one',()=>{
  for(const changes of [{source_image:''},{source_image:'deleted.png'},{img2img_denoise:0},{img2img_denoise:1},{img2img_denoise:NaN},{img2img_denoise:-1}])
    assert.throws(()=>compileWorkflow(graph,{...imageSettings,...changes},imageSchema));
});
test('missing image-to-image nodes block only image-to-image mode',()=>{
  assert.doesNotThrow(()=>compileWorkflow(graph,settings,schema));
  assert.throws(()=>compileWorkflow(graph,imageSettings,schema),/missing LoadImage/);
  const broken={...imageSchema};delete broken.VAEEncode;
  assert.throws(()=>compileWorkflow(graph,imageSettings,broken),/missing VAEEncode/);
});
test('switching back to text-to-image restores its own denoise and original empty latent',()=>{
  compileWorkflow(graph,imageSettings,imageSchema);
  const {prompt,workflow}=compileWorkflow(graph,{...imageSettings,mode:'txt2img'},schema);
  assert.equal(prompt['6'].class_type,'EmptyFlux2LatentImage');
  assert.equal(prompt['21'],undefined);
  assert.equal(prompt['16'].inputs.denoise,settings.denoise);
  assert.equal(workflow.extra.moss_studio,undefined);
});
test('unknown methods and unsupported image resize options are rejected',()=>{
  assert.throws(()=>compileWorkflow(graph,{...imageSettings,mode:'edit-lora'},imageSchema),/Choose Text/);
  assert.throws(()=>compileWorkflow(graph,{...imageSettings,crop:'invalid'},imageSchema),/unavailable/);
});
