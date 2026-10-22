// Application integration with simulated DOM and HTTP APIs, not a browser test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';

test('application uploads a source, submits the experimental graph and returns to text-to-image',async()=>{
  class Element {
    constructor(tag='div',type='') {this.tagName=tag.toUpperCase();this.type=type;this.value='';this.hidden=false;this.disabled=false;this.children=[];this.options=[];this.style={};this.listeners={};this.attributes={};}
    get valueAsNumber(){return this.value===''?NaN:Number(this.value);}
    add(option){this.options.push(option);}
    addEventListener(type,handler){(this.listeners[type] ||= []).push(handler);}
    async fire(type,event={}){for(const handler of this.listeners[type] || [])await handler(event);}
    replaceChildren(...items){this.children=items;if(this.tagName==='SELECT')this.options=[];}
    append(...items){this.children.push(...items);}
    setAttribute(k,v){this.attributes[k]=v;}
    removeAttribute(k){delete this.attributes[k];}
    hasAttribute(k){return Object.hasOwn(this.attributes,k);}
    getAttribute(k){return this.attributes[k] || null;}
    reportValidity(){return true;}
    click(){}
  }
  const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const elements={};
  for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const [,tag,attrs,id]=match;
    elements[id]=new Element(tag,attrs.match(/\btype="([^"]+)"/)?.[1] || '');
    elements[id].id=id;
  }
  const originalGlobals={};
  const inject=(name,value)=>{originalGlobals[name]=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
  const storage=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
  inject('document',{baseURI:'http://localhost:8188/moss-studio/',getElementById:id=>elements[id],createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})});
  inject('location',{origin:'http://localhost:8188',protocol:'http:'});
  inject('Option',function(label,value){this.textContent=label;this.value=value;});
  inject('localStorage',storage());inject('sessionStorage',storage());
  inject('WebSocket',class{close(){}});
  inject('createImageBitmap',async()=>({width:1600,height:900,close(){}}));
  const graph=JSON.parse(readFileSync(new URL('../workflow.json',import.meta.url)));
  const schema={};
  for(const node of graph.nodes.filter(n=>n.type!=='Note')){
    const required={};
    for(const input of node.inputs || []){
      if(input.link!=null) required[input.name]=[input.type];
      else if(input.widget){const value=node.widgets_values_named[input.name];required[input.name]=Array.isArray(value)?[value]:input.type==='COMBO'?[[value],{}]:[input.type,{}];}
    }
    schema[node.type]={input:{required}};
  }
  const combo=values=>[values,{}];
  schema.LoadImage={input:{required:{image:combo([])}}};
  schema.ImageScale={input:{required:{image:['IMAGE'],upscale_method:combo(['lanczos']),width:['INT'],height:['INT'],crop:combo(['center','disabled'])}}};
  schema.VAEEncode={input:{required:{pixels:['IMAGE'],vae:['VAE']}}};
  schema.RepeatLatentBatch={input:{required:{samples:['LATENT'],amount:['INT']}}};
  const submitted=[];let uploadedName;
  const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data)});
  inject('fetch',async(path,options={})=>{
    if(path==='/moss-studio/workflow.json')return response(graph);
    if(path.startsWith('/object_info/')){const name=decodeURIComponent(path.split('/').pop());return response({[name]:schema[name]});}
    if(path==='/upload/image'){
      const image=options.body.get('image');uploadedName=image.name;
      assert.match(uploadedName,/^moss-studio-.*\.png$/);
      assert.equal(options.body.get('overwrite'),'false');
      schema.LoadImage.input.required.image=combo([uploadedName]);
      return response({name:uploadedName,subfolder:'',type:'input'});
    }
    if(path==='/prompt'){submitted.push(JSON.parse(options.body));return response({prompt_id:'job-'+submitted.length});}
    if(path.startsWith('/history/')){const id=path.split('/').pop();return response({[id]:{status:{completed:true},outputs:{18:{images:[{filename:id+'.png',type:'output',subfolder:''}]}}}});}
    throw new Error('Unexpected request '+path);
  });
  const until=async predicate=>{for(let i=0;i<50;i++){if(predicate())return;await delay(5);}throw new Error('Application state did not settle');};
  try{
    await import('../web/app.mjs?integration');
    await until(()=>elements.connection.className?.includes('connected'));
    assert.equal(elements.generate.disabled,false);
    assert.equal(Number(elements.width.value),768);
    assert.equal(elements['source-panel'].hidden,true);
    elements.mode.value='img2img';await elements.settings.fire('change',{target:elements.mode});
    assert.equal(elements.generate.disabled,true);
    assert.equal(elements['source-panel'].hidden,false);
    assert.equal(elements.denoise.disabled,true);
    await elements['source-file'].onchange({target:{files:[new File(['fake-image'],'example.png',{type:'image/png'})],value:''}});
    assert.equal(elements.source_image.value,uploadedName);
    assert.equal(elements.generate.disabled,false);
    const saved=JSON.parse(localStorage.getItem('moss-studio.settings.v1'));
    assert.equal(saved.settings.source_width,1600);
    assert.equal(saved.settings.source_height,900);
    elements.img2img_denoise.value='0.35';elements.crop.value='disabled';elements.batch.value='2';
    await elements.settings.fire('input',{target:elements.img2img_denoise});
    await elements.settings.fire('submit',{preventDefault(){}});
    await until(()=>elements['job-state'].textContent==='Image complete');
    const api=submitted[0].prompt;
    assert.equal(api['21'].inputs.image,uploadedName);
    assert.equal(api['22'].inputs.crop,'disabled');
    assert.equal(api['24'].inputs.amount,2);
    assert.equal(api['16'].inputs.denoise,0.35);
    assert.equal(elements['result-actions'].hidden,false);
    elements.mode.value='txt2img';await elements.settings.fire('change',{target:elements.mode});
    assert.equal(elements.denoise.disabled,false);
    await elements.settings.fire('submit',{preventDefault(){}});
    await until(()=>submitted.length===2 && elements['job-state'].textContent==='Image complete');
    assert.equal(submitted[1].prompt['6'].class_type,'EmptyFlux2LatentImage');
    assert.equal(submitted[1].prompt['21'],undefined);
    assert.equal(submitted[1].prompt['16'].inputs.denoise,1);
  }finally{
    for(const[name,descriptor]of Object.entries(originalGlobals)){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
    }
  }
});
