/* Presentation-only geometry inherited from 17.0. Never mutates simulation. */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,CELL_METERS=40,CHUNK=8;
const hash=(i,n,s=0)=>{let x=Math.imul(i+101,374761393)^Math.imul(n+79,668265263)^s;x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;};
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);},dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),d=near-far;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/d,-1,0,0,2*far*near/d,0]);}
function geometry(kind){
 const out=[],tri=(a,b,c,na,nb,nc)=>{const n=norm(cross(sub(b,a),sub(c,a)));for(const [p,v] of [[a,na||n],[b,nb||n],[c,nc||n]])out.push(...p,...v);};
 if(kind==='volume'){const b=geometry('box');for(let i=0;i<b.length;i+=18){for(const off of [0,12,6]){for(let j=0;j<3;j++)out.push(b[i+off+j]);for(let j=3;j<6;j++)out.push(-b[i+off+j]);}}}
 else if(kind==='box'||kind==='roof'){
  const p=kind==='box'?[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]]:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5],[0,.5,-.5],[0,.5,-.5],[0,.5,.5],[0,.5,.5]];
  for(const [a,b,c,d] of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]){tri(p[a],p[b],p[c]);tri(p[a],p[c],p[d]);}
 }else if(kind==='blade'){
  // A curved, tapered ribbon with a real silhouette, rooted at local y=0.
  const rows=4;for(let blade=0;blade<3;blade++)for(let i=0;i<rows;i++){const t=i/rows,u=(i+1)/rows,w=(1-t)*.5,v=(1-u)*.5,angle=blade*2.399,height=1-blade*.16,point=(x,y)=>[x*Math.cos(angle)+blade*.38,y*height,x*Math.sin(angle)+y*y*(blade===1?-.32:.24)];tri(point(-w,t),point(w,t),point(v,u));tri(point(-w,t),point(v,u),point(-v,u));}
 }else if(kind==='cone'||kind==='cylinder'){
  const count=10;for(let i=0;i<count;i++){const a=i*TAU/count,b=(i+1)*TAU/count,p=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,-.5,Math.sin(b)*.5];if(kind==='cone')tri(p,q,[0,.5,0]);else{const r=[q[0],.5,q[2]],s=[p[0],.5,p[2]];tri(p,q,r,norm([p[0],0,p[2]]),norm([q[0],0,q[2]]),norm([q[0],0,q[2]]));tri(p,r,s,norm([p[0],0,p[2]]),norm([q[0],0,q[2]]),norm([p[0],0,p[2]]));tri(s,r,[0,.5,0]);}tri(q,p,[0,-.5,0]);}
 }else{
  const rows=kind==='rock'||kind==='foliage'?4:7,cols=kind==='rock'||kind==='foliage'?7:12,pt=(a,b)=>[Math.cos(a)*Math.sin(b)*.5,Math.cos(b)*.5,Math.sin(a)*Math.sin(b)*.5];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=i*TAU/cols,b=(i+1)*TAU/cols,c=j*Math.PI/rows,d=(j+1)*Math.PI/rows,p=pt(a,c),q=pt(b,c),r=pt(b,d),s=pt(a,d),smooth=kind!=='rock';tri(p,q,r,...(smooth?[norm(p),norm(q),norm(r)]:[]));tri(p,r,s,...(smooth?[norm(p),norm(r),norm(s)]:[]));}
 }
 return new Float32Array(out);
}

class WorldGeometry{
constructor(){this.state=null;this.headings=new Map();this.layer="natural";this.actorScale=1;}
setState(s){this.state=s;this.rivers=WorldRules.riverFlow(s.universe);this.prepareSurface();}
kind(x,y){const u=this.state.universe,i=clamp(Math.floor(y),0,u.H-1)*u.W+clamp(Math.floor(x),0,u.W-1);return u.ecology?.terrain?.[i]??WorldRules.terrainAt(u.fields,u.living,i);}
 rawHeight(x,y){const u=this.state.universe,i=clamp(Math.floor(y),0,u.H-1)*u.W+clamp(Math.floor(x),0,u.W-1),z=u.fields.height[i]||0;return Math.max(0,z-.22)*2.8+Math.pow(Math.max(0,z-.50),2)*245;}
 cornerHeight(x,y){if(this.cornerGround)return this.cornerGround[clamp(Math.floor(y),0,this.state.universe.H)*(this.state.universe.W+1)+clamp(Math.floor(x),0,this.state.universe.W)];return 0;}
 baseHeight(x,y){const u=this.state.universe,xx=clamp(x,0,u.W-.0001),yy=clamp(y,0,u.H-.0001),ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy,a=this.cornerHeight(ix,iy),b=this.cornerHeight(ix+1,iy),c=this.cornerHeight(ix+1,iy+1),d=this.cornerHeight(ix,iy+1);return fy<fx?a*(1-fx)+b*(fx-fy)+c*fy:a*(1-fy)+c*fx+d*(fy-fx);}
 prepareSurface(){
  const u=this.state.universe,W=u.W,H=u.H;let fingerprint=u.seed+':'+W+':'+H,h=2166136261;for(let i=0;i<W*H;i++){h=Math.imul(h^Math.round(u.fields.height[i]*100000),16777619);h=Math.imul(h^(u.living?.water?.[i]||0),16777619);}fingerprint+=':'+h;
  if(fingerprint===this.surfaceKey)return;this.surfaceKey=fingerprint;this.surfaceSamples=new Float32Array((W*8+1)*(H*8+1));this.surfaceSamples.fill(NaN);this.cornerGround=new Float32Array((W+1)*(H+1));for(let y=0;y<=H;y++)for(let x=0;x<=W;x++)this.cornerGround[y*(W+1)+x]=(this.rawHeight(x-1,y-1)+this.rawHeight(x,y-1)+this.rawHeight(x-1,y)+this.rawHeight(x,y))/4;
  this.maxElevation=this.cornerGround.reduce((a,b)=>Math.max(a,b),0);this.orbitFits=new Map();
  this.lakeIds=new Int32Array(W*H);this.lakeIds.fill(-1);this.lakeLevels=[];
  const wet=i=>[2,4].includes(u.living?.water?.[i]);for(let i=0;i<W*H;i++)if(wet(i)&&this.lakeIds[i]<0){const id=this.lakeLevels.length,queue=[i];this.lakeIds[i]=id;let level=0;for(let n=0;n<queue.length;n++){const j=queue[n],x=j%W,y=Math.floor(j/W);level+=this.baseHeight(x+.5,y+.5);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*W+xx;if(xx>=0&&yy>=0&&xx<W&&yy<H&&wet(k)&&this.lakeIds[k]<0){this.lakeIds[k]=id;queue.push(k);}}}this.lakeLevels.push(level/queue.length+.035);}
  this.riverSegments=[];this.riverBins=new Map();const paths=(u.living?.bodies||[]).filter(b=>b.kind==='river'&&b.path?.length>1);const visited=new Set();
  const addPath=path=>{let pts=path.map(i=>[i%W+.5,Math.floor(i/W)+.5]);if(pts.length>3)for(let pass=0;pass<2;pass++){const out=[pts[0]];for(let n=0;n<pts.length-1;n++){out.push([mix(pts[n][0],pts[n+1][0],.25),mix(pts[n][1],pts[n+1][1],.25)],[mix(pts[n][0],pts[n+1][0],.75),mix(pts[n][1],pts[n+1][1],.75)]);}out.push(pts[pts.length-1]);pts=out;}const cat=(a,b,c,d,t)=>{const t2=t*t,t3=t2*t;return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t2+(-a[k]+3*v-3*c[k]+d[k])*t3));};let prev=pts[0],prevZ=this.baseHeight(...prev)-.018;for(let n=0;n<pts.length-1;n++)for(let j=1;j<=1;j++){const p=cat(pts[Math.max(0,n-1)],pts[n],pts[n+1],pts[Math.min(pts.length-1,n+2)],j),z=Math.min(prevZ,this.baseHeight(...p)-.018),width=.14+.16*(n+j)/pts.length;const seg={a:prev,b:p,za:prevZ,zb:z,width,dx:p[0]-prev[0],dy:p[1]-prev[1],index:this.riverSegments.length};seg.len2=seg.dx*seg.dx+seg.dy*seg.dy;if(seg.len2>.000001){this.riverSegments.push(seg);for(let yy=Math.floor(Math.min(prev[1],p[1])-.9);yy<=Math.ceil(Math.max(prev[1],p[1])+.9);yy++)for(let xx=Math.floor(Math.min(prev[0],p[0])-.9);xx<=Math.ceil(Math.max(prev[0],p[0])+.9);xx++){const key=xx+':'+yy,list=this.riverBins.get(key)||[];list.push(seg);this.riverBins.set(key,list);}}prev=p;prevZ=z;}};
  for(const p of paths){addPath(p.path);for(const i of p.path)visited.add(i);}for(const [i,j]of this.rivers||[])if(!visited.has(i))addPath([i,j]);const joints=new Map();for(const s of this.riverSegments)for(const p of [s.a,s.b]){const key=p.map(v=>v.toFixed(5)).join(':'),j=joints.get(key)||{x:0,y:0,width:0},len=Math.sqrt(s.len2);j.x+=-s.dy/len;j.y+=s.dx/len;j.width=Math.max(j.width,s.width);joints.set(key,j);}for(const s of this.riverSegments){s.joints=[s.a,s.b].map(p=>{const j=joints.get(p.map(v=>v.toFixed(5)).join(':')),len=Math.hypot(j.x,j.y)||1;return {x:j.x/len,y:j.y/len,width:j.width};});}
 }
 waterInfo(x,y){
  if(!this.lakeIds)return null;const u=this.state.universe,W=u.W,H=u.H;let lakeWeight=0,lakeLevel=0;const xx=x-.5,yy=y-.5,ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;
  for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){const gx=clamp(ix+dx,0,W-1),gy=clamp(iy+dy,0,H-1),id=this.lakeIds[gy*W+gx];if(id<0)continue;const w=(dx?fx:1-fx)*(dy?fy:1-fy);lakeWeight+=w;lakeLevel+=w*this.lakeLevels[id];}
  let result=lakeWeight>.001?{weight:lakeWeight,level:lakeLevel/lakeWeight,kind:1,shore:clamp((lakeWeight-.48)*3,0,1)}:null;let distance=Infinity,bedCap=Infinity;
  for(const s of this.riverBins.get(Math.floor(x)+':'+Math.floor(y))||[]){const t=clamp(((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/s.len2,0,1),d=Math.hypot(x-s.a[0]-t*s.dx,y-s.a[1]-t*s.dy);if(d<s.width+.125)bedCap=Math.min(bedCap,s.za-.22,s.zb-.22);if(d>=distance||d>s.width+.55)continue;distance=d;const info={weight:clamp(1-(d-s.width)/.42,0,1),level:mix(s.za,s.zb,t),kind:2,distance:d,width:s.width,shore:clamp(1-d/s.width,0,1),segment:s};if(!result||result.weight<.5)result=info;}
  if(result)result.bedCap=bedCap;return result;
 }
 heightUncached(x,y){if(!this.state)return 0;const base=this.baseHeight(x,y),water=this.waterInfo(x,y);if(!water)return base;const cap=water.bedCap??Infinity;if(water.kind===2){const t=water.distance/water.width;if(t<=1)return Math.min(cap,base,water.level-.06-.22*(1-t*t));const blend=clamp((water.distance-water.width)/.42,0,1);return Math.min(cap,mix(Math.min(base,water.level-.06),base,blend*blend*(3-2*blend)));}const w=clamp(water.weight,0,1);return Math.min(cap,mix(base,Math.min(base,water.level-.12-.10*water.shore),w*w*(3-2*w)));}
 height(x,y){if(!this.state)return 0;const u=this.state.universe,xx=Math.round(x*8),yy=Math.round(y*8);if(this.surfaceSamples&&xx>=0&&yy>=0&&xx<=u.W*8&&yy<=u.H*8&&Math.abs(x*8-xx)<.00001&&Math.abs(y*8-yy)<.00001){const index=yy*(u.W*8+1)+xx,value=this.surfaceSamples[index];if(!Number.isNaN(value))return value;return this.surfaceSamples[index]=this.heightUncached(x,y);}return this.heightUncached(x,y);}
 waterHeight(x,y){return this.waterInfo(x+.5,y+.5)?.level??this.height(x+.5,y+.5);}
 appendWater(out,cx,cy,endX,endY,props){
  const vertex=(p,level,alpha)=>{out.push(p[0],level,p[1],0,1,0,.035,.26,.32,alpha,1);};
  // Lakes and seas have an actual level and a clipped, rounded shoreline.
  const step=.5;for(let y=cy;y<endY;y+=step)for(let x=cx;x<endX;x+=step){const coords=[[x,y],[Math.min(endX,x+step),y],[Math.min(endX,x+step),Math.min(endY,y+step)],[x,Math.min(endY,y+step)]];for(const ids of [[0,1,2],[0,2,3]]){let poly=ids.map(i=>{const p=coords[i],q=this.waterInfo(...p);return {p,w:q?.kind===1?q.weight:0,z:q?.kind===1?q.level:0};});let clipped=[];for(let i=0;i<3;i++){const a=poly[i],b=poly[(i+1)%3],inside=a.w>=.48;if(inside)clipped.push(a);if(inside!==(b.w>=.48)){const t=(.48-a.w)/(b.w-a.w);clipped.push({p:[mix(a.p[0],b.p[0],t),mix(a.p[1],b.p[1],t)],w:.48,z:a.w>b.w?a.z:b.z});}}for(let i=1;i<clipped.length-1;i++)for(const v of [clipped[0],clipped[i],clipped[i+1]])vertex(v.p,v.z+.006,1);}}
  for(const s of this.riverSegments){const mx=(s.a[0]+s.b[0])/2,my=(s.a[1]+s.b[1])/2;if(mx<cx||my<cy||mx>=endX||my>=endY)continue;const len=Math.sqrt(s.len2),nx=-s.dy/len,ny=s.dx/len,angle=Math.atan2(s.dy,s.dx),alpha=2+(angle+TAU)%TAU/TAU;
   const [ja,jb]=s.joints;const points=[[s.a[0]+ja.x*(ja.width+.04),s.a[1]+ja.y*(ja.width+.04)],[s.a[0]-ja.x*(ja.width+.04),s.a[1]-ja.y*(ja.width+.04)],[s.b[0]+jb.x*(jb.width+.04),s.b[1]+jb.y*(jb.width+.04)],[s.b[0]-jb.x*(jb.width+.04),s.b[1]-jb.y*(jb.width+.04)]];
   for(const ids of [[0,1,2],[1,3,2]])for(const n of ids)vertex(points[n],(n<2?s.za:s.zb)+.007,alpha);
   for(const side of [-1,1]){const edge=side===1?[points[0],points[2]]:[points[1],points[3]],outer=[[s.a[0]+ja.x*(ja.width+.21)*side,s.a[1]+ja.y*(ja.width+.21)*side],[s.b[0]+jb.x*(jb.width+.21)*side,s.b[1]+jb.y*(jb.width+.21)*side]],ps=[[edge[0][0],s.za+.006,edge[0][1]],[edge[1][0],s.zb+.006,edge[1][1]],[outer[0][0],Math.max(s.za,this.height(...outer[0])),outer[0][1]],[outer[1][0],Math.max(s.zb,this.height(...outer[1])),outer[1][1]]];for(const ids of [[0,1,2],[1,3,2]]){const n=norm(cross(sub(ps[ids[1]],ps[ids[0]]),sub(ps[ids[2]],ps[ids[0]])));for(const i of ids)out.push(...ps[i],...n.map(v=>v*(n[1]<0?-1:1)),.20,.24,.12,1,35);}}
   if(s.index%6===0)for(const side of [-1,1]){const x=mx+nx*(s.width+.22)*side,y=my+ny*(s.width+.22)*side,z=this.height(x,y);this.add(props,'rock',x,z+.007,y,.025,.016,.033,[.24,.25,.22,1],angle);for(let j=0;j<3;j++)this.add(props,'blade',x+(j-1)*.012,z+.004,y,.002,.028+j*.005,.002,[.24,.32,.08,1],angle+j,3);}

  }
 }
 heading(a,seconds){let h=this.headings.get(a.id);if(!h){h={x:a.fx,y:a.fy,angle:a.id*.71,t:seconds};this.headings.set(a.id,h);}const dx=a.fx-h.x,dy=a.fy-h.y,dt=clamp(seconds-h.t,0,.2);h.moving=Math.hypot(dx,dy)>.00001;if(h.moving){const t=Math.atan2(dy,dx),d=Math.atan2(Math.sin(t-h.angle),Math.cos(t-h.angle));h.angle+=clamp(d,-dt*4,dt*4);}h.x=a.fx;h.y=a.fy;h.t=seconds;return h;}
 add(data,k,x,y,z,sx,sy,sz,c,r=0,m=0){const a=data[k]||(data[k]=[]);a.push(x,y,z,sx,sy,sz,c[0],c[1],c[2],c[3]??1,...(Array.isArray(r)?r:[r,0,0]),m);}
 segment(data,a,b,width,color,kind='cylinder',tip=width){const d=sub(b,a),l=Math.hypot(...d);if(l<.00001)return;this.add(data,kind,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,l,tip,color,[Math.atan2(d[0],d[2]),Math.acos(clamp(d[1]/l,-1,1)),0]);}
 addTree(data,x,y,size,pine,k,seed,lod){
  const h=this.height(x,y),trunk=(pine?7.2:4.6)*( .80+size)/CELL_METERS,crown=(pine?4.8:5.6)*( .85+size)/CELL_METERS,r=hash(seed,12,this.state.universe.seed),birch=!pine&&r>.73,wood=birch?[.74,.74,.63,1]:[.22,.12,.055,1],foliage=k===18?[.025,.13,.095,1]:k===14?[.23,.31,.055,1]:[.07,.25+r*.08,.035,1];
  this.add(data,'cylinder',x,h+trunk*.52,y,.010,trunk*1.05,.010,wood,0,birch?15:11);
  if(pine){for(let j=0;j<5;j++){const w=crown*(1-j*.15);this.add(data,'cone',x,h+trunk*.48+j*trunk*.17,y,w,trunk*.45,w,foliage,hash(seed,j)*TAU,7);}return;}
  const clusters=lod===0?8:lod===1?4:2;for(let j=0;j<clusters;j++){const angle=j*2.39996,rr=crown*(j===0?0:.25+.12*hash(seed,j+44)),px=x+Math.cos(angle)*rr,py=y+Math.sin(angle)*rr,ph=h+trunk*(.87+hash(seed,j+78)*.22),s=crown*(.46+hash(seed,j+97)*.23);if(lod===0&&j%2===0)this.segment(data,[x,h+trunk*.55,y],[px,ph-.02,py],.005,wood);this.add(data,'foliage',px,ph,py,s,s*(k===14?.50:.85),s,foliage,angle,7);}
 }
 terrainColor(x,y){const u=this.state.universe,i=clamp(Math.floor(y),0,u.H-1)*u.W+clamp(Math.floor(x),0,u.W-1),k=this.kind(x,y);if(this.layer!=='natural'&&this.colors)return Array.from(this.colors.slice(i*4,i*4+3)).map(v=>v/255);const palette=[[.035,.16,.22],[.05,.25,.32],[.14,.42,.18],[.24,.29,.10],[.075,.20,.055],[.24,.34,.10],[.36,.51,.065],[.16,.36,.06],[.59,.40,.20],[.32,.35,.38],[.095,.075,.06],[.48,.50,.37],[.055,.27,.15],[.56,.43,.13],[.45,.39,.10],[.14,.42,.18],[.37,.30,.14],[.23,.42,.26],[.055,.18,.16]];const c=palette[k]||[.5,0,.5],cover=clamp((u.ext?.snow?.[i]||0)*.4,0,.95);return c.map((v,j)=>mix(v,[.81,.87,.90][j],cover));}
 terrainVertex(out,x,y,material,col){const z=this.height(x,y),eps=.125,n=norm([this.height(x-eps,y)-this.height(x+eps,y),eps*2,this.height(x,y-eps)-this.height(x,y+eps)]),c=col||this.terrainColor(Math.min(x,this.state.universe.W-.001),Math.min(y,this.state.universe.H-.001));out.push(x,z,y,...n,...c,1,material);}
 creature(data,a,seconds,now,detail){
  const x=a.fx,y=a.fy,h=this.height(x,y),heading=this.heading(a,seconds),angle=heading.angle,co=Math.cos(angle),si=Math.sin(angle),ageScale=/детёныш|ребёнок|child/i.test(a.life?.bio?.stage||a.life?.stage||'')?.65:1,variation=.92+hash(a.id,30)*.16,s=variation*ageScale*(12/CELL_METERS)*(this.actorScale||1),ground=h+.003;
  const world=(px,py,pz)=>[x+(px*co-pz*si)*s,ground+py*s,y+(px*si+pz*co)*s];
  const node=(k,px,py,pz,sx,sy,sz,c,r=0,m=13)=>{const p=world(px,py,pz);this.add(data,k,...p,sx*s,sy*s,sz*s,c,Array.isArray(r)?[-angle+r[0],r[1],r[2]]:-angle+r,m);};
  const line=(a,b,w,c,k='cylinder')=>this.segment(data,world(...a),world(...b),w*s,c,k);
  const dark=[.055,.045,.032,1],cream=[.74,.67,.49,1],black=[.035,.032,.025,1],white=[.83,.81,.70,1];
  const moving=heading.moving&& !['rest','sleep','eat','drink'].includes(a.life?.action?.kind),gait=moving?Math.sin(seconds*11+a.id):0;
  const eye=(xx,yy,zz,size=.0035)=>node('sphere',xx,yy,zz,size,size,size,black);
  const ears=(hx,hy,spread,tall,col,style='cone')=>{for(const side of [-1,1]){node(style,hx,hy,spread*side,.016,tall,.015,col,[0,0,-.15]);if(detail)node(style,hx+.003,hy,spread*side,.008,tall*.75,.008,[.48,.28,.23,1],[0,0,-.15]);}};
  const legs=(length,width,top,foot,col,thickness=.009)=>{for(const front of [-1,1])for(const side of [-1,1]){const phase=(front===side?1:-1)*gait,swing=phase*.015;line([front*length,top,side*width],[front*length+swing,foot+.028,side*width],thickness,col);line([front*length+swing,foot+.028,side*width],[front*length-swing,foot,side*width],thickness*.75,col);node('sphere',front*length-swing,foot,side*width,thickness*1.3,thickness*.8,thickness*1.4,dark);}};
  if(a.type==='butterfly'){
   const base=.065+Math.sin(now*.002+a.id)*.008,flap=Math.sin(now*.014+a.id)*.85;node('sphere',0,base,0,.028,.008,.007,dark);for(const side of [-1,1]){const col=a.id%2?[.85,.33,.055,1]:[.07,.43,.64,1];node('sphere',.005,base+.005,side*.022,.043,.003,.039,col,[.3,side*flap,0]);node('sphere',-.020,base+.004,side*.016,.026,.003,.025,col,[-.3,side*flap,0]);for(let j=0;j<4;j++)node('sphere',.012-j*.008,base+.008,side*(.017+j*.004),.006,.002,.009,[.92,.81,.40,1],[0,side*flap,0]);line([.014,base,side*.002],[.030,base+.014,side*.006],.001,black);}return;
  }
  if(a.type==='hedgehog'){
   node('sphere',-.008,.027,0,.077,.051,.054,[.28,.20,.11,1]);node('sphere',.036,.021,0,.039,.024,.030,[.54,.41,.26,1]);node('sphere',.057,.017,0,.009,.009,.011,black);for(const side of [-1,1]){eye(.044,.028,side*.011,.0035);for(const xx of [-.023,.018])node('sphere',xx,.005,side*.019,.015,.010,.012,dark);}
   for(let j=0;j<65;j++){const angle=j*2.39996,rr=Math.sqrt(j/65),xx=-.01+Math.cos(angle)*rr*.035,zz=Math.sin(angle)*rr*.024,yy=.024+Math.sqrt(1-rr*rr)*.027;line([xx,yy,zz],[xx+Math.cos(angle)*.008,yy+.015,zz+Math.sin(angle)*.008],.0025,j%3?[.44,.35,.20,1]:[.70,.62,.43,1],'cone');}return;
  }
  if(a.type==='bear'){
   const brown=[.24,.14,.065,1];node('sphere',-.006,.105,0,.190,.135,.113,brown);node('sphere',.068,.134,0,.090,.089,.078,brown);node('sphere',.111,.116,0,.059,.040,.046,[.46,.31,.15,1]);node('sphere',.140,.119,0,.019,.019,.026,black);for(const side of [-1,1]){node('sphere',.060,.181,side*.031,.027,.029,.023,brown);eye(.099,.148,side*.031,.005);for(const xx of [-.060,.052]){line([xx,.103,side*.039],[xx+gait*side*.01,.022,side*.041],.029,brown);node('sphere',xx+.014,.014,side*.041,.048,.028,.035,dark);if(detail)for(let j=0;j<3;j++)node('cone',xx+.037,.012,side*.041+(j-1)*.007,.004,.013,.004,cream,[0,0,-1.4]);}}return;
  }
  if(a.type==='goat'){
   const fur=[.61,.57,.43,1];node('sphere',0,.098,0,.119,.060,.046,fur);legs(.039,.017,.086,.006,fur,.008);line([.041,.102,0],[.058,.143,0],.027,fur);node('sphere',.070,.146,0,.044,.040,.030,fur);node('sphere',.091,.131,0,.027,.025,.022,[.40,.36,.26,1]);ears(.059,.161,.021,.021,fur,'sphere');for(const side of [-1,1]){eye(.082,.150,side*.014);line([.058,.163,side*.010],[.041,.200,side*.015],.007,dark);line([.041,.200,side*.015],[.012,.220,side*.018],.0045,dark);}node('cone',.083,.113,0,.012,.039,.014,fur);node('cone',-.064,.128,0,.018,.034,.018,fur,[0,0,.5]);return;
  }
  if(a.type==='elk'){
   const fur=[.29,.20,.115,1];node('sphere',0,.151,0,.192,.096,.069,fur);legs(.065,.026,.137,.007,fur,.011);node('sphere',.062,.174,0,.083,.104,.073,[.22,.15,.085,1]);line([.066,.170,0],[.088,.231,0],.043,fur);node('sphere',.114,.225,0,.093,.043,.044,fur);node('sphere',.146,.203,0,.061,.045,.045,[.36,.25,.15,1]);node('sphere',.172,.200,0,.017,.025,.036,dark);ears(.091,.254,.034,.044,fur,'sphere');for(const side of [-1,1]){eye(.128,.232,side*.022,.0045);if(a.id%3!==0){line([.085,.253,side*.012],[.068,.291,side*.052],.008,cream);node('sphere',.061,.304,side*.064,.061,.012,.039,cream,[0,side*.2,-.3]);for(let j=0;j<5;j++)line([.035+j*.012,.304,side*(.059+j*.004)],[.026+j*.013,.330+j*.003,side*(.072+j*.004)],.004,cream);}}node('sphere',.096,.180,0,.019,.045,.018,dark);return;
  }
  if(a.type==='human'){
   const skin=[.57+hash(a.id,3)*.16,.37+hash(a.id,4)*.12,.23,1],cloth=[.27+hash(a.id,5)*.12,.30,.20,1];
   node('sphere',0,.101,0,.036,.060,.026,cloth);node('sphere',.003,.151,0,.027,.033,.027,skin);node('sphere',-.002,.160,0,.028,.016,.029,[.16,.105,.06,1]);node('sphere',.018,.148,0,.009,.008,.008,skin);node('box',0,.079,0,.038,.022,.033,[.28,.20,.12,1]);
   for(const side of [-1,1]){const swing=gait*side*.015;line([0,.083,side*.010],[swing,.044,side*.012],.013,[.29,.23,.16,1]);line([swing,.044,side*.012],[-swing,.009,side*.012],.010,skin);node('sphere',-swing+.006,.007,side*.012,.025,.014,.012,dark);line([0,.123,side*.021],[-swing,.094,side*.024],.009,skin);line([-swing,.094,side*.024],[swing+.009,.074,side*.027],.007,skin);if(detail)eye(.015,.154,side*.009,.003);}
   if(a.carry?.food||a.carry?.wood)node('box',-.027,.107,0,.022,.040,.032,[.40,.28,.13,1]);return;
  }
  if(a.type==='bee'){
   const fly=.09+Math.sin(now*.005+a.id)*.012,gold=[.72,.51,.07,1];node('sphere',0,fly,0,.031,.019,.019,gold);node('sphere',.020,fly+.003,0,.017,.019,.019,black);for(const dx of [-.010,0,.010])node('sphere',dx,fly,0,.005,.020,.020,black);
   for(const side of [-1,1]){const flap=Math.sin(now*.08+a.id)*.7;node('sphere',-.003,fly+.010,side*.019,.031,.002,.026,[.68,.83,.89,.65],[0,side*flap,0]);if(detail){line([.022,fly+.007,side*.004],[.034,fly+.020,side*.009],.0015,black);for(let j=0;j<3;j++)line([-.01+j*.009,fly-.006,side*.007],[-.016+j*.009,fly-.020,side*.014],.0013,black);}}return;
  }
  if(['raven','owl','vulture'].includes(a.type)){
   const owl=a.type==='owl',vulture=a.type==='vulture',bs=vulture?1.6:1,col=owl?[.39,.29,.16,1]:vulture?[.25,.19,.11,1]:[.035,.048,.064,1],flying=['move','hunt','flee','explore'].includes(a.life?.action?.kind)||moving,base=flying?.12:.018,flap=flying?Math.sin(seconds*(vulture?3.4:7)+a.id)*.35:0;
   const B=(k,px,py,pz,sx,sy,sz,c,r=0)=>node(k,px*bs,py*bs,pz*bs,sx*bs,sy*bs,sz*bs,c,r);
   B('sphere',0,base+.034,0,.071,.047,.042,col);B('sphere',-.023,base+.042,0,.054,.035,.040,col);
   if(vulture){B('sphere',.028,base+.054,0,.031,.022,.030,[.71,.66,.49,1]);B('cylinder',.040,base+.061,0,.014,.026,.014,[.58,.31,.21,1],[0,0,-.32]);B('sphere',.050,base+.076,0,.026,.025,.024,[.63,.36,.24,1]);B('cone',.068,base+.068,0,.014,.029,.015,[.47,.39,.23,1],[0,0,-1.65]);line([.062*bs,(base+.071)*bs,0],[.079*bs,(base+.066)*bs,0],.006*bs,[.56,.47,.29,1]);line([.079*bs,(base+.066)*bs,0],[.078*bs,(base+.057)*bs,0],.004*bs,black);for(let j=0;j<7;j++)B('sphere',.027+Math.cos(j*TAU/7)*.010,base+.054,Math.sin(j*TAU/7)*.014,.017,.018,.013,[.75,.69,.52,1]);}
   else{B('sphere',.026,base+.062,0,owl?.043:.032,owl?.043:.031,.036,col);B('cone',.049,base+.056,0,.012,.028,.012,owl?[.53,.39,.16,1]:black,[0,0,-1.5]);}
   for(const side of [-1,1]){
    if(owl){B('sphere',.039,base+.066,side*.010,.010,.027,.020,[.68,.58,.37,1]);B('sphere',.045,base+.068,side*.012,.006,.014,.014,[.94,.62,.11,1]);B('sphere',.049,base+.068,side*.012,.004,.008,.008,black);B('cone',.018,base+.090,side*.014,.011,.025,.010,col);}
    else B('sphere',vulture?.057:.039,base+(vulture?.079:.068),side*(vulture?.008:.013),.004,.005,.004,black);
    const wingSpan=flying?.11:.025,wingY=base+.043;
    B('sphere',-.009,wingY,side*(wingSpan*.50),.066,.014,wingSpan*1.1,col,[0,side*flap,0]);
    for(let j=0;j<6;j++){const z=side*(wingSpan*.75+j*.006),yy=wingY+(flying?Math.sin(flap)*Math.abs(z)*side:0);B('sphere',-.021-j*.006,yy,z,.052-j*.002,.005,.010,vulture?(j%2?[.13,.11,.08,1]:[.35,.28,.17,1]):col,[0,side*flap,side*.15]);}
    if(!flying){line([0,(base+.022)*bs,side*.012*bs],[.007*bs,.008,side*.014*bs],.003*bs,[.35,.28,.14,1]);for(let j=0;j<3;j++)line([.007*bs,.008,side*.014*bs],[(.021+j*.002)*bs,.004,side*.014*bs+(j-1)*.004],.0015,[.35,.28,.14,1]);}
   }
   for(let j=0;j<4;j++)B('sphere',-.055,base+.027,(j-1.5)*.006,.047,.004,.009,col,[0,0,.08]);return;
  }
  // Each mammal has its own dimensions and anatomical features, in metres / CELL_METERS.
  const dims={rabbit:[.065,.044,.038,.035],mouse:[.042,.023,.022,.016],deer:[.160,.069,.048,.112],boar:[.128,.071,.061,.053],wolf:[.135,.053,.044,.072],lynx:[.095,.055,.045,.064],fox:[.104,.043,.038,.055],bison:[.215,.115,.085,.095],badger:[.103,.047,.052,.031]};
  const palette={rabbit:[.48,.43,.33,1],mouse:[.37,.32,.26,1],deer:[.49,.28,.12,1],boar:[.25,.20,.14,1],wolf:[.39,.40,.36,1],lynx:[.55,.38,.19,1],fox:[.69,.29,.075,1],bison:[.23,.15,.085,1],badger:[.28,.28,.25,1]};
  if(!dims[a.type]){node('rock',0,.08,0,.05,.09,.05,[.8,.1,.6,1]);return;}const [length,thick,width,leg]=dims[a.type],col=palette[a.type]||palette.rabbit,bodyY=leg+thick*.42,headX=length*.50,headY=bodyY+thick*.24;
  node('sphere',0,bodyY,0,length,thick,width,col);legs(length*.31,width*.33,leg+.007,.006,col,a.type==='bison'?.017:a.type==='deer'?.009:.010);
  if(a.type==='rabbit'){
   node('sphere',-.020,.035,0,.048,.053,.042,col);node('sphere',.034,.064,0,.036,.035,.029,col);ears(.035,.097,.011,.064,col,'sphere');node('sphere',-.040,.045,0,.021,.023,.021,white);for(const side of [-1,1]){eye(.046,.070,side*.014,.0045);node('sphere',-.012,.012,side*.021,.043,.020,.018,col);}node('sphere',.053,.060,0,.010,.009,.009,[.61,.38,.31,1]);
  }else if(a.type==='mouse'){
   node('sphere',.024,.029,0,.027,.024,.022,col);for(const side of [-1,1]){node('sphere',.018,.043,side*.013,.019,.020,.009,col);node('sphere',.019,.043,side*.016,.012,.014,.004,[.56,.35,.30,1]);eye(.033,.032,side*.008,.004);}line([-.022,.022,0],[-.047,.012,.008],.003,[.48,.34,.29,1]);line([-.047,.012,.008],[-.072,.009,.015],.002,[.48,.34,.29,1]);node('sphere',.039,.024,0,.015,.010,.014,col);
  }else if(a.type==='deer'){
   line([.051,.115,0],[.083,.185,0],.035,col);node('sphere',.092,.187,0,.059,.031,.028,col);node('sphere',.112,.178,0,.034,.021,.025,col);node('sphere',.129,.179,0,.012,.014,.018,black);ears(.076,.202,.026,.029,col,'sphere');for(const side of [-1,1]){eye(.101,.191,side*.015);if(a.id%3!==0){line([.073,.201,side*.012],[.062,.241,side*.028],.005,cream);line([.062,.241,side*.028],[.082,.268,side*.039],.004,cream);line([.065,.235,side*.026],[.044,.251,side*.048],.0035,cream);if(detail)line([.073,.255,side*.034],[.050,.274,side*.031],.003,cream);}}node('sphere',-.082,.132,0,.024,.014,.018,cream);
  }else if(a.type==='bison'){
   node('sphere',.048,.161,0,.145,.147,.102,[.25,.16,.085,1]);node('sphere',.118,.126,0,.085,.103,.085,[.17,.11,.064,1]);node('sphere',.151,.099,0,.057,.042,.061,dark);node('cone',.122,.067,0,.035,.064,.036,[.16,.10,.058,1],0);for(const side of [-1,1]){line([.116,.156,side*.034],[.109,.169,side*.066],.012,cream);line([.109,.169,side*.066],[.118,.194,side*.062],.007,cream);eye(.146,.139,side*.035,.005);}line([-.107,.135,0],[-.125,.061,.011],.005,dark);node('sphere',-.125,.055,.011,.016,.027,.017,dark);
  }else if(a.type==='boar'){
   node('sphere',.069,.084,0,.065,.049,.049,col);node('sphere',.102,.069,0,.041,.024,.035,[.34,.25,.20,1]);node('sphere',.123,.067,0,.008,.021,.027,[.44,.31,.24,1]);ears(.066,.118,.024,.027,col);for(const side of [-1,1]){eye(.090,.091,side*.021,.004);line([.108,.062,side*.015],[.116,.078,side*.019],.004,white);}if(detail)for(let j=0;j<8;j++)node('cone',-.05+j*.013,.122,0,.005,.017,.005,dark);line([-.063,.086,0],[-.080,.094,.007],.003,dark);
  }else if(a.type==='badger'){
   node('sphere',.055,.053,0,.059,.036,.036,white);node('sphere',.082,.041,0,.032,.020,.023,white);for(const side of [-1,1]){node('sphere',.060,.058,side*.014,.046,.017,.009,black);node('sphere',.044,.074,side*.017,.017,.018,.012,col);eye(.071,.058,side*.015,.004);}node('sphere',.099,.042,0,.009,.012,.016,black);node('sphere',-.057,.043,0,.035,.016,.018,col);
  }else{
   const fox=a.type==='fox',lynx=a.type==='lynx',wolf=a.type==='wolf';node('sphere',headX,headY,0,length*.40,thick*.80,width*.78,col);node('sphere',headX+length*.20,headY-thick*.14,0,length*(lynx?.22:.35),thick*.36,width*.48,fox?cream:col);node('sphere',headX+length*(lynx?.28:.36),headY-thick*.13,0,.010,.010,.014,black);ears(headX-length*.03,headY+thick*.5,width*.28,lynx?.034:fox?.033:.030,col);
   for(const side of [-1,1]){eye(headX+length*.12,headY+thick*.13,side*width*.34,.004);if(lynx){node('cone',headX-length*.03,headY+thick*.8,side*width*.28,.004,.026,.004,black);node('sphere',headX,headY-thick*.1,side*width*.45,.028,.022,.016,cream);}}
   const tailL=lynx?.035:fox?.09:.085;line([-length*.43,bodyY,0],[-length*.53-tailL*.5,bodyY-.015,.006],lynx?.016:fox?.025:.022,col);line([-length*.53-tailL*.5,bodyY-.015,.006],[-length*.5-tailL,bodyY-.039,.013],lynx?.014:.020,fox?white:col);
   if(detail&&lynx)for(let j=0;j<20;j++){const xx=(hash(a.id,j)-.5)*length*.8,zz=(hash(a.id,j+30)>.5?1:-1)*width*.43;node('sphere',xx,bodyY+hash(a.id,j+60)*thick*.25,zz,.007,.009,.003,[.24,.18,.11,1]);}
   if(wolf)node('sphere',length*.20,bodyY+thick*.27,0,.060,.045,.048,[.46,.46,.39,1]);
  }
 }
 buildings(data){const u=this.state.universe;let count=0;this.blockers=[];for(const o of WorldRules.buildingInstances(u)){const x=o.x+.5+(o.dx||0),y=o.y+.5+(o.dy||0),h=this.height(x,y),s=(o.size||.48)*.48,dist=Math.hypot(x-this.eye[0],y-this.eye[2]);if(dist>Math.max(32,this.scale<8?200:65))continue;const add=(k,dx,dy,dz,sx,sy,sz,c,r=0,m=0)=>this.add(data,k,x+dx*.48,h+dy*.48,y+dz*.48,sx*.48,sy*.48,sz*.48,c,r,m);if(o.kind==='road'){add('box',0,.010,0,.94,.008,.20,[.45,.37,.25,1]);continue;}if(o.kind==='farm'){add('box',0,.007,0,.88,.012,.88,[.26,.17,.08,1]);const g=o.crop20?.growth||0;for(let n=0;n<6;n++){add('box',-.35+n*.14,.015,0,.022,.008,.8,[.37,.25,.12,1]);if(g>.1)for(let j=0;j<4;j++)add('blade',-.35+n*.14,.018,-.3+j*.18,.03,.04+g*.15,.05,[.46,.48,.15,1],0,3);}continue;}
   if(o.kind==='well'){for(let n=0;n<12;n++)add('box',Math.sin(n*TAU/12)*.12,.08,Math.cos(n*TAU/12)*.12,.06,.16,.05,[.45,.44,.37,1],n*TAU/12);add('roof',0,.34,0,.38,.17,.34,[.38,.22,.11,1]);for(const dx of [-.14,.14])add('cylinder',dx,.22,0,.018,.29,.018,[.30,.20,.10,1]);continue;}
   if(o.kind==='mine'){add('rock',0,.14,0,.70,.30,.42,[.30,.31,.28,1]);add('box',0,.11,-.22,.25,.22,.018,[.035,.040,.036,1]);continue;}
   this.blockers.push({x,y,r:s*.48});const hut=['hut','shelter'].includes(o.kind),hh=hut?.19:.31;add('box',0,hh/2,0,s,hh,s*.76,[.57,.43,.26,1]);add(hut?'cone':'roof',0,hh+s*.23,0,s*1.13,s*.50,s*.95,[.39,.27,.12,1]);add('box',0,.085,-s*.385,.083,.17,.009,[.15,.12,.075,1]);if(dist<18){for(const dx of [-.15,.15])add('box',dx,.21,-s*.387,.058,.063,.012,[.44,.54,.49,1]);for(let j=0;j<6;j++)add('box',0,.025+j*.045,-s*.383,s,.004,.012,[.42,.31,.18,1]);}if(o.kind==='workshop')add('box',s*.29,.43,.07,.065,.27,.07,[.31,.30,.26,1]);count++;
  }this.buildingCount=count;
 }
 makeChunk(cx,cy,lod,groundOnly=false,coarse=false){const started=performance.now(),u=this.state.universe,verts=[],props={},grass={},endX=Math.min(u.W,cx+CHUNK),endY=Math.min(u.H,cy+CHUNK),step=.5;
  for(let gy=cy;gy<endY;gy++)for(let gx=cx;gx<endX;gx++){const fine=this.riverBins.has(gx+':'+gy),step=coarse?1:fine?(lod===2?.25:.125):(lod===0?.25:lod===2?1:.5);for(let y=gy;y<Math.min(endY,gy+1);y+=step)for(let x=gx;x<Math.min(endX,gx+1);x+=step){const xx=Math.min(endX,x+step),yy=Math.min(endY,y+step),kind=this.kind(x+step*.5,y+step*.5),material=kind===2?35:20+kind;for(const p of [[x,y],[xx,yy],[xx,y],[x,y],[x,yy],[xx,yy]])this.terrainVertex(verts,...p,material);}}
  if(this.layer==='natural')this.appendWater(verts,cx,cy,endX,endY,props);let treeCount=0,grassCount=0;if(!groundOnly)for(let y=cy;y<endY;y++)for(let x=cx;x<endX;x++){
   const i=y*u.W+x,k=this.kind(x,y),h=this.height(x+.5,y+.5),r=n=>hash(i,n,u.seed),snow=u.ext?.snow?.[i]||0;
   if(k<=2)continue;
   if(this.layer!=='natural')continue;
   const count=WorldRules.treeCount(u.fields,u.living,i);if(count&&(lod<3||i%3===0)){const shown=lod===0?Math.min(8,count):lod===1?Math.min(2,count):1;for(let n=0;n<shown;n++){const xx=x+.10+r(10+n)*.8,yy=y+.1+r(30+n)*.8,z=this.height(xx,yy),size=.28+r(70+n)*.24,pine=y/u.H>.55||u.fields.height[i]>.62,col=[.13,.25+r(41+n)*.1,.10,1];
    this.addTree(props,xx,yy,size,pine,k,i*19+n,lod);treeCount++;
   }}
   if(lod===0&&[3,4,5,6,7,11,12,13,14,15,16,17,18].includes(k)&&snow<1){    if(k===6&&(u.fields.flowers[i]||0)>1)for(let n=0;n<3;n++){const xx=x+r(800+n),yy=y+r(810+n),z=this.height(xx,yy)+.07;this.add(props,'cylinder',xx,z-.03,yy,.003,.06,.003,[.23,.4,.12,1]);for(let j=0;j<5;j++)this.add(props,'sphere',xx+Math.cos(j*TAU/5)*.009,z,yy+Math.sin(j*TAU/5)*.009,.015,.006,.015,n%2?[.78,.66,.38,1]:[.72,.64,.77,1]);}}
   if(lod<2&&((k===9&&r(701)>.65)||r(702)>.985)){const xx=x+r(710),yy=y+r(711),z=this.height(xx,yy),s=.04+r(712)*.10;this.add(props,'rock',xx,z+s*.3,yy,s,s*.65,s*.8,[.40,.41,.36,1],r(713)*TAU);}
  }
  return {cx,cy,lod,vertices:new Float32Array(verts),props,grass,treeCount,grassCount};
 }
}
globalThis.WorldGeometry=WorldGeometry;globalThis.WorldPrimitiveGeometry=geometry;})();
