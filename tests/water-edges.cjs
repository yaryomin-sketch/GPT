const fs=require('fs'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'scene.cjs'),'utf8').split('// Record the exact WebGL calls')[0];
const check=`
const view=new ctx.WorldView(canvas);view.enabled=true;view.setState(initial);
function rasterHeight(x,y){const ix=Math.floor(x*8)/8,iy=Math.floor(y*8)/8,fx=(x-ix)*8,fy=(y-iy)*8,a=view.height(ix,iy),b=view.height(ix+.125,iy),c=view.height(ix+.125,iy+.125),d=view.height(ix,iy+.125);return fy<fx?a*(1-fx)+b*(fx-fy)+c*fy:a*(1-fy)+c*fx+d*(fy-fx);}
let checked=0,buried=0,maxError=0;for(const seg of view.riverSegments){const length=Math.sqrt(seg.len2);for(const side of [-.7,0,.7]){const x=(seg.a[0]+seg.b[0])/2-seg.dy/length*seg.width*side,y=(seg.a[1]+seg.b[1])/2+seg.dx/length*seg.width*side,water=(seg.za+seg.zb)/2+.007,error=rasterHeight(x,y)-water;checked++;if(error>.02)buried++;maxError=Math.max(maxError,error);}}const result={checked,buried,maxError};fs.writeFileSync(root+'/tests/water-edges-result.json',JSON.stringify(result,null,2));console.log(result);assert.equal(buried,0,'banks and centres remain submerged under river mesh');
`;
new Function('require','__dirname',source+check)(require,__dirname);
