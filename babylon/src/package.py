"""Create the offline release and a SHA-verified GitHub publication manifest."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
files=[ROOT/'index.html',ROOT/'README.md']+[p for p in (ROOT/'src').iterdir()if p.suffix in ['.js','.py']]+list((ROOT/'vendor').glob('*.js'))+list((ROOT/'assets/bundles').glob('*.js'))+list((ROOT/'assets/music').glob('*.mp3'))+list((ROOT/'assets/licenses').glob('*'))+[ROOT/'baseline/microcosm_17_0_pc.html']+[ROOT/'tests'/name for name in ['scene.cjs','music.cjs','camera.cjs','motion.cjs','landscape.cjs','setup.py','shaders.py','protected-code.json','verification.json','gpu-verification.json','closeup-verification.json']]+[ROOT/'tests/gpu'/name for name in ['native-gl.cjs','render.cjs','closeups.cjs','gl3.h','package.json']]+list((ROOT/'previews').glob('*.png'))
assert all(p.is_file()for p in files)
archive=ROOT/'microcosm_18_2_package.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in files:z.write(p,'microcosm_18_2/'+str(p.relative_to(ROOT)))
with zipfile.ZipFile(archive)as z:assert z.testzip()is None
manifest=[]
for p in files+[ROOT/'root-index.html',ROOT/'repository-README.md',archive]:
 data=p.read_bytes();relative=str(p.relative_to(ROOT));remote='index.html'if relative=='root-index.html'else'README.md'if relative=='repository-README.md'else'releases/'+relative if relative.endswith('.zip')else'babylon/'+relative
 manifest.append({'path':str(p),'remote':remote,'size':len(data),'sha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),'sha256':hashlib.sha256(data).hexdigest()})
(ROOT/'publish-18-2-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Archive verified:',archive.stat().st_size,'bytes;',len(files),'package files;',len(manifest),'repository entries')
