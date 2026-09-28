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
const eqSliders = [...document.querySelectorAll(".eq-slider")];
const presets = [...document.querySelectorAll(".preset")];

let audioContext = null;
let sourceNode = null;
let bassFilter = null;
let eqFilters = [];
let masterGain = null;
let audioGraphReady = false;
const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
const defaultSettings = { bass: 0, eq: [0, 0, 0, 0, 0] };

let tracks = [];
let currentIndex = -1;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function titleFromPath(path) {
  const filename = decodeURIComponent(path.split("/").pop() || "");
  return filename.replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Untitled";
}

function render() {
  trackList.innerHTML = "";
  trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
  emptyState.hidden = tracks.length !== 0;

  tracks.forEach((track, index) => {
    const row = document.createElement("article");
    row.className = "track";
    row.dataset.index = index;

    row.innerHTML = `
      <div class="cover" aria-hidden="true">♪</div>
      <div class="track-info">
        <span class="track-title"></span>
        <span class="track-subtitle">MP3</span>
      </div>
      <span class="track-time" data-time>—</span>
      <button class="row-play" aria-label="Play track">▶</button>
    `;

    row.querySelector(".track-title").textContent = track.title;
    row.querySelector(".row-play").addEventListener("click", () => selectTrack(index, true));
    row.addEventListener("dblclick", () => selectTrack(index, true));
    trackList.appendChild(row);
  });
}

function updateRows() {
  [...trackList.children].forEach((row, index) => {
    const active = index === currentIndex;
    row.classList.toggle("active", active);
    const button = row.querySelector(".row-play");
    button.textContent = active && !audio.paused ? "❚❚" : "▶";
    button.setAttribute("aria-label", active && !audio.paused ? "Pause track" : "Play track");
  });
}

function selectTrack(index, autoplay = false) {
  if (!tracks[index]) return;
  currentIndex = index;
  audio.src = tracks[index].url;
  audio.load();
  playerTitle.textContent = tracks[index].title;
  playerStatus.textContent = "Ready to play";
  playerCover.textContent = "♪";
  seekBar.value = 0;
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  updateRows();
  if (autoplay) {
    ensureAudioGraph();
    if (audioContext.state === "suspended") audioContext.resume();
    audio.play().catch(() => {});
  }
}


function ensureAudioGraph() {
  if (audioGraphReady) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioContext.createMediaElementSource(audio);
  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 100;

  eqFilters = EQ_FREQUENCIES.map((frequency, index) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = index === 0 || index === 4 ? "lowshelf" : "peaking";
    if (index === 4) filter.type = "highshelf";
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;
    return filter;
  });

  masterGain = audioContext.createGain();
  sourceNode.connect(bassFilter);
  let node = bassFilter;
  eqFilters.forEach(filter => {
    node.connect(filter);
    node = filter;
  });
  node.connect(masterGain);
  masterGain.connect(audioContext.destination);
  audioGraphReady = true;
  applyAudioSettings();
}

function getAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("mp3ify-audio-settings"));
    if (saved && Array.isArray(saved.eq) && saved.eq.length === 5) return saved;
  } catch (_) {}
  return { ...defaultSettings, eq: [...defaultSettings.eq] };
}

function saveAudioSettings() {
  const settings = {
    bass: Number(bassBoost.value),
    eq: eqSliders.map(slider => Number(slider.value))
  };
  localStorage.setItem("mp3ify-audio-settings", JSON.stringify(settings));
}

function applyAudioSettings() {
  if (!audioGraphReady) return;
  bassFilter.gain.value = Number(bassBoost.value);
  eqSliders.forEach((slider, index) => {
    eqFilters[index].gain.value = Number(slider.value);
    slider.nextElementSibling.value = `${slider.value > 0 ? "+" : ""}${slider.value} dB`;
  });
  bassValue.value = `${bassBoost.value} dB`;
  if (masterGain) masterGain.gain.value = 1;
}

function setAudioSettings(settings) {
  bassBoost.value = settings.bass ?? 0;
  eqSliders.forEach((slider, index) => {
    slider.value = settings.eq?.[index] ?? 0;
  });
  applyAudioSettings();
  saveAudioSettings();
}

function loadAudioSettings() {
  setAudioSettings(getAudioSettings());
  const isFlat = Number(bassBoost.value) === 0 && eqSliders.every(slider => Number(slider.value) === 0);
  presets.forEach(button => button.classList.toggle("active", button.dataset.preset === (isFlat ? "flat" : "")));
}

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
  settingsPanel.setAttribute("aria-hidden", String(!settingsPanel.classList.contains("open")));
});

settingsClose.addEventListener("click", () => {
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
});

bassBoost.addEventListener("input", () => {
  ensureAudioGraph();
  applyAudioSettings();
  saveAudioSettings();
  presets.forEach(button => button.classList.remove("active"));
});

eqSliders.forEach(slider => {
  slider.addEventListener("input", () => {
    ensureAudioGraph();
    applyAudioSettings();
    saveAudioSettings();
    presets.forEach(button => button.classList.remove("active"));
  });
});

presets.forEach(button => {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;
    if (preset === "flat" || preset === "reset") {
      setAudioSettings(defaultSettings);
    } else if (preset === "bass") {
      setAudioSettings({ bass: 8, eq: [6, 3, 0, 0, -1] });
    } else if (preset === "boost") {
      setAudioSettings({ bass: 4, eq: [3, 2, 1, 2, 3] });
    }
    presets.forEach(item => item.classList.toggle("active", item === button));
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    settingsPanel.classList.remove("open");
    settingsPanel.setAttribute("aria-hidden", "true");
  }
});

playBtn.addEventListener("click", () => {
  if (currentIndex < 0 && tracks.length) selectTrack(0);
  if (!audio.src) return;
  ensureAudioGraph();
  if (audioContext.state === "suspended") audioContext.resume();
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
});

prevBtn.addEventListener("click", () => {
  if (!tracks.length) return;
  const index = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
  selectTrack(index, true);
});

nextBtn.addEventListener("click", () => {
  if (!tracks.length) return;
  const index = currentIndex >= tracks.length - 1 ? 0 : currentIndex + 1;
  selectTrack(index, true);
});

audio.addEventListener("play", () => {
  playBtn.textContent = "❚❚";
  playBtn.setAttribute("aria-label", "Pause");
  playerStatus.textContent = "Playing";
  updateRows();
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "Play");
  if (currentIndex >= 0) playerStatus.textContent = "Paused";
  updateRows();
});

audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
  const timeEl = trackList.children[currentIndex]?.querySelector("[data-time]");
  if (timeEl) timeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  seekBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});

audio.addEventListener("ended", () => {
  if (tracks.length) {
    const next = currentIndex >= tracks.length - 1 ? 0 : currentIndex + 1;
    selectTrack(next, true);
  }
});

seekBar.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
});
volumeBar.addEventListener("input", () => audio.volume = Number(volumeBar.value));
audio.volume = Number(volumeBar.value);

async function loadTracks() {
  try {
    const response = await fetch("tracks.json", { cache: "no-store" });
    if (!response.ok) throw new Error("tracks.json not found");
    const data = await response.json();
    tracks = Array.isArray(data) ? data : [];
    tracks = tracks.map(item => ({
      title: item.title || titleFromPath(item.url),
      url: item.url
    }));
    render();
  } catch (error) {
    console.error(error);
    tracks = [];
    render();
  }
}

loadAudioSettings();
loadTracks();
