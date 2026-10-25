/* User-supplied Jeremy Soule playlist; no autoplay. Ambient audio stays independent. */
(()=>{'use strict';
const tracks=[['before-the-storm.mp3','Before the Storm'],['streets-of-whiterun.mp3','The Streets of Whiterun'],['sky-above-voice-within.mp3','Sky Above, Voice Within']];
function attach({AudioScene,toast=()=>{},document:doc=globalThis.document,Audio:AudioClass=globalThis.Audio,prefix=globalThis.MICROCOSM_ASSET_PREFIX||''}){
 const button=doc.getElementById('music'),volume=doc.getElementById('volume');
 const audio=new AudioClass();audio.preload='none';audio.loop=false;
 const select=doc.createElement('select');select.id='musicTrack';select.setAttribute('aria-label','Музыкальная композиция');select.title='Три композиции играют по порядку и повторяются';
 tracks.forEach(([,title],i)=>{const option=doc.createElement('option');option.value=String(i);option.textContent=title;select.append(option);});button.insertAdjacentElement('afterend',select);
 let enabled=false,index=0,generation=0,disposed=false;
 const update=()=>{button.textContent='♫ Музыка: '+(enabled?'вкл.':'выкл.');button.setAttribute('aria-pressed',String(enabled));AudioScene.music=enabled;select.value=String(index);};
 const setSource=()=>{audio.src=prefix+'assets/music/'+tracks[index][0];select.value=String(index);};
 const setVolume=()=>{audio.volume=Math.max(0,Math.min(1,Number(volume.value)/100));};
 async function play(){const token=++generation;try{await audio.play();if(token!==generation&&!enabled)audio.pause();}catch(error){if(token!==generation||disposed)return;enabled=false;audio.pause();update();toast('Не удалось включить музыку: '+error.message);}}
 function setEnabled(value){enabled=!!value;generation++;if(!enabled)audio.pause();update();if(enabled&&!doc.hidden)void play();}
 function next(nextIndex=(index+1)%tracks.length){index=nextIndex;generation++;audio.pause();setSource();if(enabled&&!doc.hidden)void play();}
 button.onclick=()=>setEnabled(!enabled);select.onchange=()=>next(Math.max(0,Math.min(tracks.length-1,Number(select.value)||0)));
 const previousVolume=volume.oninput;volume.oninput=e=>{previousVolume?.(e);setVolume();};
 const onEnded=()=>{if(enabled)next();};audio.addEventListener('ended',onEnded);
 const onError=()=>{if(enabled){enabled=false;generation++;audio.pause();update();toast('Музыкальный файл недоступен. Распакуйте всю папку игры вместе с assets/music.');}};audio.addEventListener('error',onError);
 const onVisibility=()=>{generation++;if(doc.hidden)audio.pause();else if(enabled)void play();};doc.addEventListener('visibilitychange',onVisibility);
 AudioScene.tick=()=>{};if(AudioScene.musicGain&&AudioScene.context)AudioScene.musicGain.gain.setValueAtTime(0,AudioScene.context.currentTime);
 setSource();setVolume();update();
 return {get enabled(){return enabled},get currentTrack(){return index},get tracks(){return tracks.map(([,title])=>title)},audio,setEnabled,next,dispose(){disposed=true;enabled=false;generation++;audio.pause();audio.removeEventListener('ended',onEnded);audio.removeEventListener('error',onError);doc.removeEventListener('visibilitychange',onVisibility);update();}};
}
globalThis.MicrocosmMusic={attach,tracks:tracks.map(([,title])=>title)};
})();
