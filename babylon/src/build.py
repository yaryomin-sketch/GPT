"""Build a presentation-only Babylon.js edition from the unmodified 17.0 game."""
from pathlib import Path
import base64,json,re,shutil,mimetypes,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'baseline/microcosm_17_0_pc.html'
if not BASE.exists():
 BASE.parent.mkdir(exist_ok=True);shutil.copyfile(next(p for p in [ROOT.parent/'microcosm_17_0_pc.html',ROOT.parent/'microcosm/microcosm_17_0_pc.html']if p.exists()),BASE)
# Source assets can be restored from the checked-in offline bundles.
for file in (ROOT/'assets/bundles').glob('*.js'):
 text=file.read_text();start=text.index('||{},')+5;resources=json.loads(text[start:-3])
 for key,entry in resources.items():
  destination=ROOT/'assets'/key
  if not destination.exists():destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(base64.b64decode(entry['data']))
source=BASE.read_text();bundle=ROOT/'assets/bundles';bundle.mkdir(parents=True,exist_ok=True)
paths=list((ROOT/'assets/materials').rglob('*.jpg'))+[ROOT/'assets/environment.env']+[ROOT/'assets/kenney'/n for n in ['tree_oak.glb','tree_pineDefaultA.glb','rock_largeA.glb','grass_large.glb']]
def write_bundle(name,files):
 resources={str(p.relative_to(ROOT/'assets')):{'mime':{'glb':'model/gltf-binary','gltf':'model/gltf+json','env':'application/octet-stream'}.get(p.suffix[1:],mimetypes.guess_type(p.name)[0]or'application/octet-stream'),'data':base64.b64encode(p.read_bytes()).decode()}for p in files}
 (bundle/name).write_text('globalThis.MICROCOSM_RESOURCES=Object.assign(globalThis.MICROCOSM_RESOURCES||{},'+json.dumps(resources,separators=(',',':'))+');\n')
write_bundle('nature-materials.js',paths)
for name in ['Deer','Stag','Fox','Wolf']:write_bundle(name.lower()+'.js',[ROOT/'assets/animals'/(name+'.gltf')])
bundles=['nature-materials','deer','stag','fox','wolf']
imports=['vendor/babylon.js','vendor/babylonjs.loaders.min.js','vendor/babylonjs.materials.min.js']+['assets/bundles/'+x+'.js'for x in bundles]+['src/engine-compat.js','src/world-geometry.js','src/world-view-babylon.js','src/music-player.js']
def build(prefix=''):
 def replace(m):
  text=m[0]
  if 'class WorldView{' in text and 'globalThis.WorldView=WorldView' in text:
   return '<script>globalThis.MICROCOSM_ASSET_PREFIX='+json.dumps(prefix)+';</script>'+''.join('<script src="'+prefix+path+('?v=18.1'if path.startswith('src/')else'')+'"></script>' for path in imports)
  return text
 html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>',replace,source)
 assert html!=source
 # All orbital drag gestures use the camera ray, including near-horizontal views.
 old_pan="else if(worldView?.enabled&&worldView.center){if(lookPitch119>=90){const base=Math.min(canvas.width/state.universe.W,canvas.height/state.universe.H)*camera.zoom;camera.x+=dx/Math.max(.3,Math.cos(worldView.yaw));camera.y+=dy/Math.max(.3,Math.cos(worldView.yaw));worldView.setup(camera,canvas.width,canvas.height);}else worldView.pan(camera,dx,dy);}"
 assert old_pan in html
 html=html.replace(old_pan,"else if(worldView?.enabled&&worldView.center){worldView.pan(camera,dx,dy);}")
 html=html.replace('modelVersion:state?.universe?.modelVersion,selectedAgent,rate:', 'modelVersion:state?.universe?.modelVersion,graphics:worldView?.metrics(),camera:{...camera,yaw:worldView?.yaw,tilt:worldView?.tilt},selectedAgent,rate:')
 html=html.replace('globalThis.__microcosmApp={','globalThis.__microcosmMusic=MicrocosmMusic.attach({AudioScene,toast});\nglobalThis.__microcosmApp={')
 html=html.replace('<title>Микрокосм 17.0','<title>Микрокосм 18.1').replace('МИКРОКОСМ 17.0 <i>','МИКРОКОСМ 18.1 <i>')
 html=html.replace('<title>Microcosm 17.0','<title>Microcosm 18.1').replace('Microcosm 17.0 ·','Microcosm 18.1 ·')
 return html
(ROOT/'index.html').write_text(build());(ROOT/'root-index.html').write_text(build('babylon/'))
# Report protected script hashes; the test also compares exact bytes.
protected={}
for id in ['initial-state','worker-source']:
 pattern=r'<script\b[^>]*id="'+id+r'"[^>]*>([\s\S]*?)</script>'
 before=re.search(pattern,source)[1];after=re.search(pattern,build())[1];assert before==after;protected[id]=hashlib.sha256(before.encode()).hexdigest()
shared=re.findall(r'<script>([\s\S]*?)</script>',source)[0]
assert shared in build();protected['shared-rules']=hashlib.sha256(shared.encode()).hexdigest()
(ROOT/'tests/protected-code.json').write_text(json.dumps(protected,indent=2)+'\n')
print('Built 18.1; simulation, initial world and shared rules unchanged.',protected)
