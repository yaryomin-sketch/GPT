// Native EGL GLES context for engine regression images. This runs no browser.
const koffi=require('koffi'),fs=require('fs');process.env.MESA_SHADER_CACHE_DISABLE='true';
const egl=koffi.load('libEGL.so.1'),gles=koffi.load('libGL.so.1');
const ef=(name,result,args)=>egl.func(name,result,args),ptr='void *';
const getDisplay=ef('eglGetPlatformDisplay','void *',['uint32','void *','void *']),display=getDisplay(0x31DD,null,null),major=new Int32Array(1),minor=new Int32Array(1);
if(!ef('eglInitialize','uint32',[ptr,ptr,ptr])(display,major,minor))throw Error('EGL initialization failed');ef('eglBindAPI','uint32',['uint32'])(0x30A0);
const cfg=koffi.alloc('void *',1),num=new Int32Array(1),attrs=new Int32Array([0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3026,8,0x3033,1,0x3040,0x40,0x3038]);
if(!ef('eglChooseConfig','uint32',[ptr,ptr,ptr,'int32',ptr])(display,attrs,cfg,1,num)||!num[0])throw Error('No EGL config');const config=koffi.decode(cfg,'void *');
const width=1280,height=800,surface=ef('eglCreatePbufferSurface',ptr,[ptr,ptr,ptr])(display,config,new Int32Array([0x3057,width,0x3056,height,0x3038])),context=ef('eglCreateContext',ptr,[ptr,ptr,ptr,ptr])(display,config,null,new Int32Array([0x3098,3,0x3038]));
if(!ef('eglMakeCurrent','uint32',[ptr,ptr,ptr,ptr])(display,surface,surface,context))throw Error('Cannot make EGL current');
const header=fs.readFileSync(__dirname+'/gl3.h','utf8'),constants={};for(const m of header.matchAll(/#define GL_(\w+)\s+(0x[0-9A-Fa-f]+|\d+)\b/g))constants[m[1]]=Number(m[2]);
Object.assign(constants,{UNPACK_FLIP_Y_WEBGL:0x9240,UNPACK_PREMULTIPLY_ALPHA_WEBGL:0x9241,UNPACK_COLORSPACE_CONVERSION_WEBGL:0x9243,BROWSER_DEFAULT_WEBGL:0x9244,CONTEXT_LOST_WEBGL:0x9242,MAX_CLIENT_WAIT_TIMEOUT_WEBGL:0x9247});
const types={void:'void',GLenum:'uint32',GLint:'int32',GLuint:'uint32',GLsizei:'int32',GLfloat:'float',GLclampf:'float',GLboolean:'uint8',GLbitfield:'uint32',GLchar:'char',GLintptr:'int64',GLsizeiptr:'int64',GLint64:'int64',GLuint64:'uint64',GLsync:ptr,GLubyte:'uint8'};
const native={},arity={};for(const m of header.matchAll(/GL_APICALL\s+([\w\s*]+?)\s*GL_APIENTRY\s+(gl\w+)\s*\(([^;]+)\);/g)){const cv=t=>t.includes('*')?ptr:types[t.replace(/\bconst\b/g,'').trim()]||ptr;const params=m[3].trim()==='void'?[]:m[3].split(',').map(x=>cv(x.trim().replace(/\s+\w+\s*$/,'')));try{native[m[2]]=gles.func(m[2],cv(m[1]),params);arity[m[2]]=params.length;}catch{}}
const call=(name,...args)=>{const fn=native[name];if(!fn)throw Error('Native function missing: '+name);try{return fn(...args.map(x=>x?.nativeId??x));}catch(e){throw Error(name+' '+args.map(x=>ArrayBuffer.isView(x)?x.constructor.name+'['+x.byteLength+']':String(x)).join(',')+' '+e.message);}};
const object=id=>({nativeId:id}),id=x=>x?.nativeId??x??0;
const special={canvas:null,drawingBufferWidth:width,drawingBufferHeight:height,
 clearDepth:value=>call('glClearDepthf',value),depthRange:(near,far)=>call('glDepthRangef',near,far),
 getContextAttributes:()=>({alpha:false,depth:true,stencil:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true}),isContextLost:()=>false,
 getSupportedExtensions:()=>['EXT_color_buffer_float','EXT_texture_filter_anisotropic','OES_texture_float_linear'],
 getExtension(name){if(name==='EXT_texture_filter_anisotropic')return {TEXTURE_MAX_ANISOTROPY_EXT:0x84FE,MAX_TEXTURE_MAX_ANISOTROPY_EXT:0x84FF};if(['EXT_color_buffer_float','OES_texture_float_linear'].includes(name))return {};return null;},
 getParameter(p){if([0x1F00,0x1F01,0x1F02,0x8B8C,0x1F03].includes(p)){const value=call('glGetString',p);return value?koffi.decode(value,'char',-1):'';}if(p===0x84FF){const out=new Float32Array(1);call('glGetFloatv',p,out);return out[0];}const out=new Int32Array(16);call('glGetIntegerv',p,out);if([0x0BA2,0x0C10,0x0C23].includes(p))return out.slice(0,4);if(p===0x846D||p===0x846E||p===0x0D3A)return out.slice(0,2);return out[0];},
 getShaderPrecisionFormat(shader,precision){const range=new Int32Array(2),out=new Int32Array(1);call('glGetShaderPrecisionFormat',shader,precision,range,out);return {rangeMin:range[0],rangeMax:range[1],precision:out[0]};},
 getProgramParameter(program,p){const out=new Int32Array(1);call('glGetProgramiv',id(program),p,out);return [0x8B82,0x8B83,0x8B80].includes(p)?!!out[0]:out[0];},
 getShaderParameter(shader,p){const out=new Int32Array(1);call('glGetShaderiv',id(shader),p,out);return p===0x8B81||p===0x8B80?!!out[0]:out[0];},
 getProgramInfoLog(p){const out=Buffer.alloc(32768);call('glGetProgramInfoLog',id(p),out.length,null,out);return out.toString().replace(/\0.*$/s,'');},
 getShaderInfoLog(p){const out=Buffer.alloc(32768);call('glGetShaderInfoLog',id(p),out.length,null,out);return out.toString().replace(/\0.*$/s,'');},
 shaderSource(shader,code){const text=Buffer.from(code+'\0'),strings=koffi.alloc(ptr,1);koffi.encode(strings,ptr,text);call('glShaderSource',id(shader),1,strings,new Int32Array([text.length-1]));koffi.free(strings);},
 getUniformLocation(p,name){const location=call('glGetUniformLocation',id(p),Buffer.from(name+'\0'));return location<0?null:{nativeId:location};},
 getAttribLocation(p,name){return call('glGetAttribLocation',id(p),Buffer.from(name+'\0'));},
 bindAttribLocation(p,i,name){call('glBindAttribLocation',id(p),i,Buffer.from(name+'\0'));},
 pixelStorei(p,value){if(p>=0x9240)return;call('glPixelStorei',p,Number(value));},
 bufferData(target,data,usage){call('glBufferData',target,typeof data==='number'?data:data.byteLength,typeof data==='number'?null:data,usage);},
 bufferSubData(target,offset,data,sourceOffset=0,length){if(sourceOffset||length)data=data.subarray(sourceOffset,length?sourceOffset+length:undefined);call('glBufferSubData',target,offset,data.byteLength,data);},
 texImage2D(...a){if(a.length===6){const img=a.pop();a=[...a.slice(0,3),img.width,img.height,0,a[3],a[4],img.data];}if(a[8]?.data)a[8]=a[8].data;if(typeof a[8]==='number')a[8]=null;call('glTexImage2D',...a);},
 texSubImage2D(...a){if(a.length===7){const img=a.pop();a=[...a.slice(0,4),img.width,img.height,a[4],a[5],img.data];}if(a[8]?.data)a[8]=a[8].data;call('glTexSubImage2D',...a);},
 readPixels(x,y,w,h,format,type,output){call('glReadPixels',x,y,w,h,format,type,output);},
 getActiveUniform(p,index){return active('glGetActiveUniform',p,index);},getActiveAttrib(p,index){return active('glGetActiveAttrib',p,index);},
 getBufferParameter(target,p){const out=new Int32Array(1);call('glGetBufferParameteriv',target,p,out);return out[0];},
 getFramebufferAttachmentParameter(target,attachment,p){const out=new Int32Array(1);call('glGetFramebufferAttachmentParameteriv',target,attachment,p,out);return out[0];},
 getTexParameter(target,p){const out=new Int32Array(1);call('glGetTexParameteriv',target,p,out);return out[0];},
};
function active(fn,p,index){const size=new Int32Array(1),type=new Uint32Array(1),name=Buffer.alloc(2048);call(fn,id(p),index,name.length,null,size,type,name);return {size:size[0],type:type[0],name:name.toString().replace(/\0.*$/s,'')};}
for(const [singular,plural]of [['Buffer','Buffers'],['Texture','Textures'],['Framebuffer','Framebuffers'],['Renderbuffer','Renderbuffers'],['VertexArray','VertexArrays'],['Query','Queries'],['Sampler','Samplers'],['TransformFeedback','TransformFeedbacks']]){special['create'+singular]=()=>{const out=new Uint32Array(1);call('glGen'+plural,1,out);return object(out[0]);};special['delete'+singular]=value=>{if(value)call('glDelete'+plural,1,new Uint32Array([id(value)]));};}
special.createShader=type=>object(call('glCreateShader',type));special.createProgram=()=>object(call('glCreateProgram'));
for(const [type,nativeType]of [['f','f'],['i','i'],['ui','ui']])for(let n=1;n<=4;n++)special['uniform'+n+type+'v']=(location,value)=>{if(location!==null)call('glUniform'+n+nativeType+'v',id(location),value.length/n,value);};
for(let n=2;n<=4;n++)special['uniformMatrix'+n+'fv']=(location,transpose,value)=>{if(location!==null)call('glUniformMatrix'+n+'fv',id(location),value.length/(n*n),Number(transpose),value);};
const gl=new Proxy(special,{get(o,key){if(key in o)return o[key];if(key in constants)return constants[key];const name='gl'+key[0]?.toUpperCase()+key.slice(1);if(native[name])return (...args)=>{args=args.map(a=>a===null?0:typeof a==='boolean'?Number(a):id(a));if(['vertexAttribPointer','vertexAttribIPointer','drawElements','drawElementsInstanced'].includes(key))args[args.length-1]=BigInt(args[args.length-1]||0);return call(name,...args);};return undefined;}});
module.exports={gl,width,height,call};
