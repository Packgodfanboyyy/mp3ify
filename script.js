const audio = document.getElementById("audio");
const trackList = document.getElementById("trackList");
const emptyState = document.getElementById("emptyState");
const trackCount = document.getElementById("trackCount");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const seekBar = document.getElementById("seekBar");
const volumeBar = document.getElementById("volumeBar");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const playerTitle = document.getElementById("playerTitle");
const playerStatus = document.getElementById("playerStatus");
const playerCover = document.getElementById("playerCover");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsClose = document.getElementById("settingsClose");
const bassBoost = document.getElementById("bassBoost");
const bassValue = document.getElementById("bassValue");
const playbackSlider = document.getElementById("playbackSlider");
const playbackValue = document.getElementById("playbackValue");
const eqValue = document.getElementById("eqValue");
const eqSliders = [...document.querySelectorAll(".eq-slider")];
const presets = [...document.querySelectorAll(".preset")];

let audioContext = null, sourceNode = null, bassFilter = null, eqFilters = [], masterGain = null;
let audioGraphReady = false;
const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
const defaultSettings = { bass: 0, eq: [0,0,0,0,0], playback: 100 };
let tracks = [], currentIndex = -1;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,"0")}`;
}
function titleFromPath(path) {
  const filename = decodeURIComponent(path.split("/").pop() || "");
  return filename.replace(/\.[^/.]+$/,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim() || "Untitled";
}
function mediaType(url) {
  return /\.m4a($|\?)/i.test(url) ? "M4A" : "MP3";
}
function render() {
  trackList.innerHTML = "";
  trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
  emptyState.hidden = tracks.length !== 0;
  tracks.forEach((track,index) => {
    const row=document.createElement("article");
    row.className="track"; row.dataset.index=index;
    row.innerHTML=`<div class="cover" aria-hidden="true">♪</div>
      <div class="track-info"><span class="track-title"></span><span class="track-subtitle"></span></div>
      <span class="track-time" data-time>—</span><button class="row-play" aria-label="Play track">▶</button>`;
    row.querySelector(".track-title").textContent=track.title;
    row.querySelector(".track-subtitle").textContent=mediaType(track.url);
    row.querySelector(".row-play").addEventListener("click",()=>selectTrack(index,true));
    row.addEventListener("dblclick",()=>selectTrack(index,true));
    trackList.appendChild(row);
  });
}
function updateRows() {
  [...trackList.children].forEach((row,index)=>{
    const active=index===currentIndex;
    row.classList.toggle("active",active);
    const b=row.querySelector(".row-play");
    b.textContent=active&&!audio.paused?"❚❚":"▶";
    b.setAttribute("aria-label",active&&!audio.paused?"Pause track":"Play track");
  });
}
function selectTrack(index,autoplay=false) {
  if(!tracks[index]) return;
  currentIndex=index; audio.src=tracks[index].url; audio.load();
  playerTitle.textContent=tracks[index].title; playerStatus.textContent="Ready to play";
  playerCover.textContent="♪"; seekBar.value=0; currentTime.textContent="0:00"; duration.textContent="0:00";
  updateRows(); updateMediaSession();
  if(autoplay) startPlayback();
}
function ensureAudioGraph() {
  if(audioGraphReady) return;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C) return;
  audioContext=new C();
  sourceNode=audioContext.createMediaElementSource(audio);
  bassFilter=audioContext.createBiquadFilter(); bassFilter.type="lowshelf"; bassFilter.frequency.value=100;
  eqFilters=EQ_FREQUENCIES.map((frequency,index)=>{
    const f=audioContext.createBiquadFilter();
    f.type=index===0?"lowshelf":index===4?"highshelf":"peaking";
    f.frequency.value=frequency; f.Q.value=.9; return f;
  });
  masterGain=audioContext.createGain();
  let node=sourceNode; node.connect(bassFilter); node=bassFilter;
  eqFilters.forEach(f=>{node.connect(f);node=f;});
  node.connect(masterGain); masterGain.connect(audioContext.destination);
  audioGraphReady=true; applyAudioSettings();
}
async function resumeAudioContext() {
  ensureAudioGraph();
  if(audioContext?.state==="suspended") { try { await audioContext.resume(); } catch(_) {} }
}
function getSettings() {
  try {
    const s=JSON.parse(localStorage.getItem("mp3ify-audio-settings"));
    if(s && Array.isArray(s.eq) && s.eq.length===5) return {...defaultSettings,...s};
  } catch(_) {}
  return {...defaultSettings,eq:[...defaultSettings.eq]};
}
function saveSettings() {
  const s={bass:Number(bassBoost.value),eq:eqSliders.map(x=>Number(x.value)),playback:Number(playbackSlider.value)};
  localStorage.setItem("mp3ify-audio-settings",JSON.stringify(s));
}
function applyAudioSettings() {
  const settings=getSettings();
  if(audioGraphReady) {
    bassFilter.gain.value=Number(bassBoost.value);
    eqSliders.forEach((s,i)=>eqFilters[i].gain.value=Number(s.value));
    masterGain.gain.value=1;
  }
  bassValue.value=`${bassBoost.value} dB`;
  const activeEq=eqSliders.some(s=>Number(s.value)!==0);
  eqValue.value=activeEq?"Custom":"Flat";
  const rate=Number(playbackSlider.value)/100;
  audio.playbackRate=rate;
  playbackValue.value=`${playbackSlider.value}%`;
}
function setSettings(s) {
  bassBoost.value=s.bass??0;
  eqSliders.forEach((x,i)=>x.value=s.eq?.[i]??0);
  playbackSlider.value=s.playback??100;
  applyAudioSettings(); saveSettings();
}
function loadSettings(){setSettings(getSettings());}
async function startPlayback() {
  await resumeAudioContext();
  try { await audio.play(); } catch(e) { playerStatus.textContent="Tap play to start"; }
}
function updateMediaSession() {
  if(!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata=new MediaMetadata({
    title:tracks[currentIndex]?.title||"My Music", artist:"My Music", album:"Personal library"
  });
}
if("mediaSession" in navigator) {
  [["play",startPlayback],["pause",()=>audio.pause()],
   ["previoustrack",()=>prevBtn.click()],["nexttrack",()=>nextBtn.click()],
   ["seekbackward",()=>audio.currentTime=Math.max(0,audio.currentTime-10)],
   ["seekforward",()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)]]
   .forEach(([action,handler])=>{try{navigator.mediaSession.setActionHandler(action,handler)}catch(_){}});
}
settingsBtn.addEventListener("click",()=>{
  settingsPanel.classList.toggle("open");
  settingsPanel.setAttribute("aria-hidden",String(!settingsPanel.classList.contains("open")));
});
settingsClose.addEventListener("click",()=>{settingsPanel.classList.remove("open");settingsPanel.setAttribute("aria-hidden","true")});
document.addEventListener("pointerdown",e=>{
  if(settingsPanel.classList.contains("open") && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
    settingsPanel.classList.remove("open"); settingsPanel.setAttribute("aria-hidden","true");
  }
});
bassBoost.addEventListener("input",()=>{resumeAudioContext();applyAudioSettings();saveSettings();presets.forEach(b=>b.classList.remove("active"))});
eqSliders.forEach(s=>s.addEventListener("input",()=>{resumeAudioContext();applyAudioSettings();saveSettings();presets.forEach(b=>b.classList.remove("active"))}));
playbackSlider.addEventListener("input",()=>{applyAudioSettings();saveSettings()});
presets.forEach(b=>b.addEventListener("click",()=>{
  const p=b.dataset.preset;
  setSettings(p==="bass"?{bass:8,eq:[6,3,0,0,-1],playback:100}:p==="boost"?{bass:4,eq:[3,2,1,2,3],playback:100}:defaultSettings);
  presets.forEach(x=>x.classList.toggle("active",x===b));
}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")settingsClose.click()});
playBtn.addEventListener("click",()=>{if(currentIndex<0&&tracks.length)selectTrack(0);if(audio.src){if(audio.paused)startPlayback();else audio.pause()}});
prevBtn.addEventListener("click",()=>{if(tracks.length)selectTrack(currentIndex<=0?tracks.length-1:currentIndex-1,true)});
nextBtn.addEventListener("click",()=>{if(tracks.length)selectTrack(currentIndex>=tracks.length-1?0:currentIndex+1,true)});
audio.addEventListener("play",()=>{playBtn.textContent="❚❚";playBtn.setAttribute("aria-label","Pause");playerStatus.textContent="Playing";updateRows();updateMediaSession()});
audio.addEventListener("pause",()=>{playBtn.textContent="▶";playBtn.setAttribute("aria-label","Play");if(currentIndex>=0)playerStatus.textContent="Paused";updateRows()});
audio.addEventListener("loadedmetadata",()=>{duration.textContent=formatTime(audio.duration);const t=trackList.children[currentIndex]?.querySelector("[data-time]");if(t)t.textContent=formatTime(audio.duration)});
audio.addEventListener("timeupdate",()=>{currentTime.textContent=formatTime(audio.currentTime);seekBar.value=audio.duration?(audio.currentTime/audio.duration)*100:0});
audio.addEventListener("ended",()=>{if(tracks.length)selectTrack(currentIndex>=tracks.length-1?0:currentIndex+1,true)});
audio.addEventListener("error",()=>{playerStatus.textContent="Could not load this file";});
seekBar.addEventListener("input",()=>{if(audio.duration)audio.currentTime=Number(seekBar.value)/100*audio.duration});
volumeBar.addEventListener("input",()=>audio.volume=Number(volumeBar.value));
audio.volume=Number(volumeBar.value);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible" && !audio.paused) resumeAudioContext();});
async function loadTracks(){
  try{
    const response=await fetch("tracks.json",{cache:"no-store"});
    if(!response.ok)throw Error("tracks.json not found");
    const data=await response.json();
    tracks=(Array.isArray(data)?data:[]).filter(x=>x&&x.url).map(x=>({title:x.title||titleFromPath(x.url),url:x.url}));
    render();
  }catch(error){console.error(error);tracks=[];render()}
}
loadSettings(); loadTracks();
