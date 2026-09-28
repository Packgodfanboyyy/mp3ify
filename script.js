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
  if (autoplay) audio.play().catch(() => {});
}

playBtn.addEventListener("click", () => {
  if (currentIndex < 0 && tracks.length) selectTrack(0);
  if (!audio.src) return;
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

loadTracks();
