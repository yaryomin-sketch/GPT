"""Compile Babylon-generated and cloud shaders in a real Mesa EGL context (no browser)."""
from pathlib import Path
import ctypes as C,json,os,re
os.environ['MESA_SHADER_CACHE_DISABLE']='true'
ROOT=Path(__file__).resolve().parents[1]
E=C.CDLL('libEGL.so.1');E.eglGetProcAddress.restype=C.c_void_p;E.eglGetProcAddress.argtypes=[C.c_char_p]
I=C.c_int;U=C.c_uint;P=C.c_void_p
def egl(name,res,args):
 f=getattr(E,name);f.restype=res;f.argtypes=args;return f
get=C.CFUNCTYPE(P,U,P,P)(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'));display=get(0x31DD,None,None);a=I();b=I();assert egl('eglInitialize',U,[P,P,P])(display,C.byref(a),C.byref(b));assert egl('eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3033,1,0x3040,0x0040,0x3038);config=P();num=I();assert egl('eglChooseConfig',U,[P,P,P,I,P])(display,attrs,C.byref(config),1,C.byref(num)) and num.value
ctxattrs=(I*3)(0x3098,3,0x3038);context=egl('eglCreateContext',P,[P,P,P,P])(display,config,None,ctxattrs);assert context
surfaceattrs=(I*5)(0x3057,8,0x3056,8,0x3038);surface=egl('eglCreatePbufferSurface',P,[P,P,P])(display,config,surfaceattrs);assert egl('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
def gl(name,res,args):return C.CFUNCTYPE(res,*args)(E.eglGetProcAddress(('gl'+name).encode()))
create=gl('CreateShader',U,[U]);source=gl('ShaderSource',None,[U,I,P,P]);compile=gl('CompileShader',None,[U]);getstatus=gl('GetShaderiv',None,[U,U,P]);getlog=gl('GetShaderInfoLog',None,[U,I,P,P]);createprogram=gl('CreateProgram',U,[]);attach=gl('AttachShader',None,[U,U]);link=gl('LinkProgram',None,[U]);getprogram=gl('GetProgramiv',None,[U,U,P]);programlog=gl('GetProgramInfoLog',None,[U,I,P,P])
count=0
for i,effect in enumerate(json.loads((ROOT/'tests/compiled-shaders.json').read_text())):
 shaders=[]
 for stage,enum in [('vertex',0x8B31),('fragment',0x8B30)]:
  # NullEngine retains inactive conditional branches; preprocess them as WebGL does.
  text=effect.get('defines','')+'\n'+effect[stage]
  text=re.sub(r'^#(extension|version)([^\n]*)',lambda m:'CODEX_'+m[1].upper()+m[2],text,flags=re.M)
  from subprocess import run
  result=run(['cpp','-P','-undef','-DGL_ES=1','-DGL_FRAGMENT_PRECISION_HIGH=1','-D__VERSION__=100'],input=text,text=True,capture_output=True)
  assert result.returncode==0,str(i)+' '+stage+' '+result.stderr
  text=re.sub(r'^CODEX_(EXTENSION|VERSION)([^\n]*)',lambda m:'#'+m[1].lower()+m[2],result.stdout,flags=re.M)
  extensions=re.findall(r'^#extension[^\n]*',text,re.M);text='\n'.join(extensions)+'\n'+re.sub(r'^#extension[^\n]*','',text,flags=re.M)
  raw=text.encode();src=C.c_char_p(raw);length=I(len(raw));shader=create(enum);source(shader,1,C.byref(src),C.byref(length));compile(shader);status=I();getstatus(shader,0x8B81,C.byref(status))
  if not status.value:
   log=C.create_string_buffer(16384);getlog(shader,len(log),None,log);(ROOT/'tests/failed-shader.glsl').write_text(text);raise AssertionError(f'{i} {stage}: '+log.value.decode())
  shaders.append(shader);count+=1
 program=createprogram()
 for shader in shaders:attach(program,shader)
 link(program);status=I();getprogram(program,0x8B82,C.byref(status))
 if not status.value:
  log=C.create_string_buffer(16384);programlog(program,len(log),None,log);raise AssertionError(log.value.decode())
print(f'PASS: {count} generated GLSL stages compiled, {count//2} programs linked in Mesa EGL.')
