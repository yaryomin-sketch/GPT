"""Replay the renderer's WebGL2 calls using an actual surfaceless EGL ES3 context.
No browser or DOM substitution is involved in shader compilation / rasterization.
"""
from pathlib import Path
import ctypes as C,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'tests/gl-data'
E=C.CDLL('libEGL.so.1');E.eglGetProcAddress.restype=C.c_void_p;E.eglGetProcAddress.argtypes=[C.c_char_p]
def egl(name,result,args):
 f=getattr(E,name);f.restype=result;f.argtypes=args;return f
I=C.c_int;U=C.c_uint;P=C.c_void_p;F=C.c_float;B=C.c_ubyte
get=C.CFUNCTYPE(P,U,P,P)(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'));display=get(0x31DD,None,None)
a=I();b=I();assert egl('eglInitialize',U,[P,P,P])(display,C.byref(a),C.byref(b))
assert egl('eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3033,1,0x3040,0x0040,0x3038)
config=P();num=I();assert egl('eglChooseConfig',U,[P,P,P,I,P])(display,attrs,C.byref(config),1,C.byref(num)) and num.value
ctxattrs=(I*3)(0x3098,3,0x3038);context=egl('eglCreateContext',P,[P,P,P,P])(display,config,None,ctxattrs);assert context
surfaceattrs=(I*5)(0x3057,1280,0x3056,800,0x3038);surface=egl('eglCreatePbufferSurface',P,[P,P,P])(display,config,surfaceattrs);assert surface
assert egl('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
def gl(name,res,args):
 addr=E.eglGetProcAddress(('gl'+name).encode());assert addr,name
 return C.CFUNCTYPE(res,*args)(addr)
funcs={'bindFramebuffer':gl('BindFramebuffer',None,[U,U]),'bindTexture':gl('BindTexture',None,[U,U]),'activeTexture':gl('ActiveTexture',None,[U]),'texParameteri':gl('TexParameteri',None,[U,U,I]),'texImage2D':gl('TexImage2D',None,[U,I,I,I,I,I,U,U,P]),'framebufferTexture2D':gl('FramebufferTexture2D',None,[U,U,U,U,I]),'copyBufferSubData':gl('CopyBufferSubData',None,[U,U,C.c_ssize_t,C.c_ssize_t,C.c_ssize_t]),
 'createShader':gl('CreateShader',U,[U]),'createProgram':gl('CreateProgram',U,[]),'shaderSource':gl('ShaderSource',None,[U,I,P,P]),'compileShader':gl('CompileShader',None,[U]),'attachShader':gl('AttachShader',None,[U,U]),'deleteShader':gl('DeleteShader',None,[U]),'linkProgram':gl('LinkProgram',None,[U]),'useProgram':gl('UseProgram',None,[U]),'getUniformLocation':gl('GetUniformLocation',I,[U,C.c_char_p]),'bindBuffer':gl('BindBuffer',None,[U,U]),'bindVertexArray':gl('BindVertexArray',None,[U]),'enableVertexAttribArray':gl('EnableVertexAttribArray',None,[U]),'vertexAttribPointer':gl('VertexAttribPointer',None,[U,I,U,B,I,P]),'vertexAttribDivisor':gl('VertexAttribDivisor',None,[U,U]),'viewport':gl('Viewport',None,[I,I,I,I]),'clearColor':gl('ClearColor',None,[F,F,F,F]),'clear':gl('Clear',None,[U]),'enable':gl('Enable',None,[U]),'disable':gl('Disable',None,[U]),'blendFunc':gl('BlendFunc',None,[U,U]),'depthMask':gl('DepthMask',None,[B]),'drawArrays':gl('DrawArrays',None,[U,I,I]),'drawArraysInstanced':gl('DrawArraysInstanced',None,[U,I,I,I]),'uniform1f':gl('Uniform1f',None,[I,F]),'uniform1i':gl('Uniform1i',None,[I,I]),'uniform2f':gl('Uniform2f',None,[I,F,F]),'bufferData':gl('BufferData',None,[U,C.c_ssize_t,P,U]),'bufferSubData':gl('BufferSubData',None,[U,C.c_ssize_t,C.c_ssize_t,P]),'uniform3fv':gl('Uniform3fv',None,[I,I,P]),'uniformMatrix4fv':gl('UniformMatrix4fv',None,[I,I,B,P]),
}
genbuffer=gl('GenBuffers',None,[I,P]);genvao=gl('GenVertexArrays',None,[I,P]);deletebuffer=gl('DeleteBuffers',None,[I,P]);deletevao=gl('DeleteVertexArrays',None,[I,P]);geterror=gl('GetError',U,[]);finish=gl('Finish',None,[]);read=gl('ReadPixels',None,[I,I,I,I,U,U,P]);getstring=gl('GetString',C.c_char_p,[U])
print('GL',getstring(0x1F02).decode(),getstring(0x1F01).decode(),flush=True)
handles={};shader_count=0;image_count=0;errors=[]
def resolve(x):return handles.get(x,x) if isinstance(x,str) else x
commands=json.loads((DATA/'commands.json').read_text());capture=set();last_clear=0
for n,cmd in enumerate(commands):
 if cmd['op']=='clear':last_clear=n
 if cmd['op']=='saveImage':capture.update(range(last_clear,n+1))
for step,cmd in enumerate(commands):
 op=cmd['op'];args=cmd['args'];a=[resolve(x) for x in args]
 if op in ('drawArrays','drawArraysInstanced','clear') and step not in capture:continue
 if op=='createShader':handles[args[-1]]=funcs[op](a[0])
 elif op=='createProgram':handles[args[-1]]=funcs[op]()
 elif op in ('createBuffer','createVertexArray','createTexture','createFramebuffer'):
  v=U();(genbuffer if op=='createBuffer' else genvao if op=='createVertexArray' else gl('GenTextures' if op=='createTexture' else 'GenFramebuffers',None,[I,P]))(1,C.byref(v));handles[args[-1]]=v.value
 elif op in ('deleteBuffer','deleteVertexArray','deleteTexture','deleteFramebuffer'):
  v=U(a[0]);(deletebuffer if op=='deleteBuffer' else deletevao if op=='deleteVertexArray' else gl('DeleteTextures' if op=='deleteTexture' else 'DeleteFramebuffers',None,[I,P]))(1,C.byref(v))
 elif op=='shaderSource':
  raw=args[1].encode();src=C.c_char_p(raw);length=I(len(raw));funcs[op](a[0],1,C.byref(src),C.byref(length))
 elif op=='getUniformLocation':handles[args[-1]]=funcs[op](a[0],args[1].encode())
 elif op in ('bufferData','bufferSubData'):
  pos=1 if op=='bufferData' else 2;data=args[pos]
  if isinstance(data,dict):
   raw=(DATA/data['file']).read_bytes();buf=C.create_string_buffer(raw);length=len(raw)
  else:buf=None;length=data
  if op=='bufferData':funcs[op](a[0],length,buf,a[2])
  else:funcs[op](a[0],a[1],length,buf)
 elif op in ('uniform3fv','uniformMatrix4fv'):
  source=args[1 if op=='uniform3fv' else 2]
  raw=(DATA/source['file']).read_bytes() if isinstance(source,dict) else None
  buf=C.create_string_buffer(raw) if raw else (F*len(source))(*source)
  if op=='uniform3fv':funcs[op](a[0],1,buf)
  else:funcs[op](a[0],1,a[1],buf)
 elif op=='saveImage':
  finish();buf=(B*(1280*800*4))();read(0,0,1280,800,0x1908,0x1401,buf);image=Image.frombytes('RGBA',(1280,800),bytes(buf)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);image.save(ROOT/'previews'/args[0]);image_count+=1;print('Saved',args[0],flush=True)
 elif op in funcs:
  if op in ('bindBuffer','bindFramebuffer','bindTexture') and a[1] is None:a[1]=0
  if op=='bindVertexArray' and a[0] is None:a[0]=0
  funcs[op](*a)
  if op in ('compileShader','linkProgram'):
   isshader=op=='compileShader';check=gl('GetShaderiv' if isshader else 'GetProgramiv',None,[U,U,P]);status=I();check(a[0],0x8B81 if isshader else 0x8B82,C.byref(status))
   if not status.value:
    info=gl('GetShaderInfoLog' if isshader else 'GetProgramInfoLog',None,[U,I,P,P]);log=C.create_string_buffer(10000);info(a[0],10000,None,log);raise RuntimeError(log.value.decode())
   shader_count+=isshader
 else:raise RuntimeError(op)
 error=geterror()
 if error:errors.append((step,op,hex(error)))
 if len(errors)>10:raise RuntimeError(errors)
print('EGL validation:',shader_count,'shaders,',image_count,'images, errors:',errors)
assert not errors
(ROOT/'tests/egl-result.json').write_text(json.dumps({'renderer':getstring(0x1F01).decode(),'shaders':shader_count,'images':image_count,'glErrors':errors},indent=2))
