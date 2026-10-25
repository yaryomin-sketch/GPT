from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'microcosm_15_0_pc.html').read_text()
# Double the original physical cell edge; migrate old saves at the shared living-state loader.
s=s.replace('const CELL_METRES=20,','const CELL_METRES=40,')
s=s.replace(' if(living.hydroRevision!==2)buildRivers();',' living.cellMetres=CELL_METRES;\n if(living.hydroRevision!==2)buildRivers();')
s=s.replace('seconds*3.5/20*13/W','seconds*3.5/(u.living?.cellMetres||40)*13/W').replace('seconds*2.6/20*11/H','seconds*2.6/(u.living?.cellMetres||40)*11/H')
renderer=(ROOT/'src/world-view.js').read_text()
a=s.index('/* Client-only WebGL2 renderer.')
b=s.index('</script>',a)
s=s[:a]+renderer+s[b:]
a=s.index("const sky119=document.getElementById('sky119')")
b=s.index('let operatorState=',a)
s=s[:a]+'''let lookPitch119=40,skyPrior119=40;
function pitch119(degrees){lookPitch119=clamp(degrees,15,145);$('viewTilt').value=String(Math.round(lookPitch119));if(worldView){if(worldView.walking)worldView.walk.pitch=clamp((lookPitch119-90)*Math.PI/180,-1.4,1.4);else worldView.tilt=clamp(lookPitch119,15,82)*Math.PI/180;}}
function updatePhase16(seconds){const phase=WorldRules.circadianAt(seconds);$('dayPhase119').textContent=({morning:'🌅',day:'☀',evening:'🌇',night:'🌙'})[phase.phase]+' '+phase.label+' · '+[Math.floor(phase.hour),Math.floor(phase.hour%1*60)].map(v=>String(v).padStart(2,'0')).join(':');}

'''+s[b:]
s=s.replace('<canvas id="sky119" width="1080" height="672" hidden aria-hidden="true"></canvas>', '''<div id="walkHud16" class="walkHud16" hidden><div class="walkPill16"><span class="walkDot16"></span>НА ПОВЕРХНОСТИ <span id="walkPosition16"></span></div><div class="walkCross16" aria-hidden="true">+</div><div class="walkHelp16"><b>W A S D</b> — идти · <b>Shift</b> — быстрее · <b>Пробел</b> — прыжок<br><span id="walkLock16">Мышь — обзор · Esc — карта</span></div><div class="walkTouch16" aria-label="Управление прогулкой"><button data-walk-key="KeyW" aria-label="Идти вперёд">↑</button><button data-walk-key="KeyA" aria-label="Идти влево">←</button><button data-walk-key="KeyS" aria-label="Идти назад">↓</button><button data-walk-key="KeyD" aria-label="Идти вправо">→</button><button id="walkJump16" aria-label="Прыгнуть">⤒</button></div></div>''')
s=s.replace('sky119.hidden=false;sky119Draw(presentTime);','updatePhase16(presentTime);')
s=s.replace('sky119.hidden=true;','')
s=s.replace('[canvas,gpuCanvas,sky119]','[canvas,gpuCanvas]')
s=s.replace('if(worldView?.enabled&&state&&rasterReady)', 'if(worldView?.enabled&&state)')
s=s.replace('if(followingId){const a=agentsAt(presentationTime()).find(a=>a.id===followingId);', 'if(followingId&&!worldView?.walking){const a=agentsAt(presentationTime()).find(a=>a.id===followingId);')
s=s.replace("`${fmt(m.frameMs,1)}", "`${fmt(m.frameMs,1)}")
s=s.replace('`WebGL2 · ${fmt(m.frameMs,1)} мс CPU/кадр · LOD ${m.lod} · ${m.waterfalls} водопадов${m.cloudsHidden?" · облака скрыты вблизи":""}`', '`≈ ${fmt(m.fps)} FPS · ${fmt(m.frameMs,1)} мс CPU · ${m.visibleChunks} участков · ${fmt(m.grassBlades)} стеблей`')
s=s.replace('function pointerDown(e){', 'function pointerDown(e){if(worldView?.walking)return;')
s=s.replace('function pointerMove(e){', 'function pointerMove(e){if(worldView?.walking)return;')
s=s.replace('function pointerUp(e){', 'function pointerUp(e){if(worldView?.walking)return;')
s=s.replace('function zoomAt(f,p={x:canvas.width/2,y:canvas.height/2}){', 'function zoomAt(f,p={x:canvas.width/2,y:canvas.height/2}){if(worldView?.walking)return;')
s=s.replace("function focus(x,y,id){if(!state)return;", "function focus(x,y,id){if(!state)return;if(worldView?.walking)worldView.stopWalk(camera);")
s=s.replace("function activateTab(name){tab=name;", "function activateTab(name){if(name!=='observe'&&worldView?.walking)worldView.stopWalk(camera);tab=name;")
s=s.replace("if(value==='2d'){if(worldView)worldView.enabled=false;", "if(value==='2d'){if(worldView){worldView.stopWalk(camera);worldView.enabled=false;}")
s=s.replace("$('fit').onclick=()=>{stopCameraFollow();", "$('fit').onclick=()=>{if(worldView?.walking)worldView.stopWalk(camera);stopCameraFollow();")
s=s.replace("$('viewYaw').oninput=e=>{if(worldView)worldView.yaw=Number(e.target.value)*Math.PI/180;};", "$('viewYaw').oninput=e=>{if(worldView){worldView.yaw=Number(e.target.value)*Math.PI/180;if(worldView.walking)worldView.walk.yaw=worldView.yaw;}};")
s=s.replace("$('lookSky').onclick=()=>{if(!worldView?.enabled)setView('3d');if(lookPitch119<95){skyPrior119=lookPitch119;pitch119(118);}else pitch119(skyPrior119);};", "$('lookSky').onclick=()=>{if(!worldView?.enabled)setView('3d');if(worldView?.walking){worldView.walk.pitch=worldView.walk.pitch>.5?0:1.15;}else if(state){$('walk16').click();if(worldView?.walking)worldView.walk.pitch=1.15;}};")
s=s.replace("$('viewQuality').onchange=e=>{if(worldView){worldView.quality=e.target.value;worldView.key='';}};", "$('viewQuality').onchange=e=>{if(worldView){worldView.quality=e.target.value;worldView.clearChunks();}};")
s=s.replace("now-lastFrame>(worldView?.enabled?33:75)", "now-lastFrame>(worldView?.enabled?(worldView.walking?15:30):75)")
s=s.replace('<option value="low">Экономно</option>', '<option value="high">Подробно</option><option value="low">Экономно</option>')
s=s.replace('<button id="fullscreen"', '<button id="walk16" type="button" class="walkButton16" aria-pressed="false" title="Войти в мир от первого лица">🚶 Гулять по миру</button><button id="fullscreen"',1)
s=s.replace('<label>Детали <select id="viewQuality">','<label><input type="checkbox" id="showGrid16"> Сетка · 40 × 40 м</label><label>Детали <select id="viewQuality">')
s=s.replace('Перетаскивайте карту мышью или одним пальцем · колесо / два пальца — масштаб · правая кнопка — поворот и взгляд · поиск переносит камеру к выбранному объекту','Кнопка «Гулять по миру» — прогулка от первого лица · WASD / стрелки — идти · мышь — обзор · Shift — быстрее · пробел — прыжок · Esc — вернуться. На карте: перетаскивание, масштаб колесом, поворот правой кнопкой. Клетка — 40 × 40 м.')
s=s.replace('Объёмный мир: масштаб колесом, выбор существа нажатием', 'Объёмный мир. Гулять по миру — вид от первого лица; WASD — идти, мышь — обзор, Esc — карта')
s=s.replace('Микрокосм 13.2 · Живая планета','Микрокосм 16.1 · Мир изнутри',1).replace('МИКРОКОСМ 15.0','МИКРОКОСМ 16.1')
s=s.replace("setView(localStorage.getItem('microcosm-view')||'3d');", """setView(localStorage.getItem('microcosm-view')||'3d');
$('walk16').onclick=()=>{if(worldView?.walking){worldView.stopWalk(camera);return;}stopCameraFollow();if(!worldView?.enabled)setView('3d');if(!worldView?.enabled)return;if(!state)return toast('Мир ещё загружается');worldView.setup(camera,canvas.width,canvas.height);if(!worldView.startWalk(camera,selection))return toast('В этом мире нет доступной суши для прогулки');pointers.clear();gesture=null;lab36Painting=false;const vp=$('worldViewport');worldView.walkOwnFullscreen=!document.fullscreenElement&&!vp.classList.contains('immersive');if(worldView.walkOwnFullscreen){vp.classList.add('immersive');try{vp.requestFullscreen()?.catch(()=>{});}catch{}}$('exitFull').hidden=false;};
$('showGrid16').onchange=e=>{if(worldView)worldView.grid=e.target.checked;};
document.addEventListener('fullscreenchange',()=>{if(worldView?.walking&&worldView.walkOwnFullscreen&&!document.fullscreenElement)worldView.stopWalk(camera);});gpuCanvas.addEventListener('walkchange',()=>{if(worldView.walkOwnFullscreen){worldView.walkOwnFullscreen=false;exitFullscreen();}drawDirty=true;});$('walkJump16').onclick=()=>worldView?.jump();
for(const b of document.querySelectorAll('[data-walk-key]')){const release=e=>{e.preventDefault();worldView?.keys.delete(b.dataset.walkKey);};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);worldView?.keys.add(b.dataset.walkKey);});for(const n of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,release);}
""")
s=s.replace("get view(){return worldView?.enabled?'3d':'2d'}", "get view(){return worldView?.enabled?'3d':'2d'},get worldView(){return worldView},get camera(){return camera}")
# The old 2D sky canvas is fully removed; the ray-based sky renders behind world geometry.
s=re.sub(r'#sky119\{[^}]*\}', '', s)
s=s.replace('<div class="mapFoot">','<details class="biomeGuide16"><summary>Биомы мира · 19 типов местности</summary><div id="biomeList16"></div></details><div class="mapFoot">',1)
s=s.replace('state=s;if(worldView)', 'state=s;renderBiomeGuide16();if(worldView)',1)
s=s.replace("function weatherAt(x,y,seconds=state.worldSeconds)", "function renderBiomeGuide16(){const host=$('biomeList16');if(!host||!state)return;const counts=Array(19).fill(0);for(const k of state.universe.ecology?.terrain||[])counts[k]=(counts[k]||0)+1;host.innerHTML=WorldRules.terrains.map((b,i)=>`<div><i style=\"background:rgb(${b.color.join(',')})\"></i>${esc(b.name)} <small>${counts[i]} клеток</small></div>`).join('');}\nfunction weatherAt(x,y,seconds=state.worldSeconds)")
style=(ROOT/'src/world-style.css').read_text()
s=s.replace('</style>',style+'\n</style>',1)
assert 'sky119' not in s
(ROOT/'microcosm_16_1_pc.html').write_text(s)
print('Built',ROOT/'microcosm_16_1_pc.html',len(s.encode()),'bytes')
