"use strict";

// La parrilla y el proveedor de vídeo están aislados aquí para facilitar el cambio a MP4 o HLS.
const TIME_ZONE = "Europe/Madrid";
const CHANNELS = {
  cnt: { name: "CNT", legalName: "CNT", color: "#fec601", logo: "assets/cnt-logo.png", type: "Generalista" },
  weazel: { name: "Weazel", legalName: "Weazel", color: "#cf0000", logo: "assets/weazel-logo.png", type: "Segundo generalista" },
  comedy: { name: "CCC", legalName: "Conglomerated Comedy Channel", color: "#2475ba", logo: "assets/comedy-tv-logo.png", type: "Comedia" },
  metv: { name: "MeTV", legalName: "Music Entertainment TV", color: "#44cafe", logo: "assets/metv-logo.png", type: "Música" },
  canyon: { name: "The Canyon Channel", legalName: "The Canyon Channel", color: "#843600", logo: "assets/canyon-logo.png", type: "Cine y películas" },
  emotion: { name: "Emotion", legalName: "Emotion", color: "#af087c", logo: "assets/emotion-logo.png", type: "Entretenimiento" }
};
const CATALOG = window.CONTENT_CATALOG;
const SCHEDULES = window.CHANNEL_SCHEDULES;
const CHANNEL_HASHES = { metv: "music" };
const HASH_CHANNELS = { music: "metv", ccc: "comedy" };

// Cambiar a "html5" cuando los archivos estén alojados en un servidor con streaming por rangos.
const VIDEO_PROVIDER = "drive";
const html5Sources = {};

const $ = (id) => document.getElementById(id);
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
});
let loadedKey = "";
let awaitingDriveClick = false;
let guideKey = "";
let guideWindowStart = 0;
let guideNowLineLeft = 0;
let guideFollowScrollLeft = 0;
let guideReturnScrollLeft = 0;
let guideScrollbarDrag;
let controlsTimer;
let activeChannel = "cnt";
let suppressChannelBug = false;
let hasStartedBroadcast = false;
let hasStartedCurrentVideo = false;
let tuneGateTimer;
let videoHelpTimer;
let videoHelpReady = false;
let tuneGateEndsAt = performance.now() + 2500;
const logoVersion = Date.now();

function updateGuideReturnVisibility() {
  const viewport = $("program-guide-scroll");
  const button = $("guide-return-button");
  if (!viewport || !button) return;
  const edgeMargin = Math.min(36, viewport.clientWidth * .075);
  const linePosition = guideNowLineLeft - viewport.scrollLeft;
  const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  // No se pide un margen imposible en los extremos reales de la parrilla.
  const lineIsLeft = linePosition < edgeMargin && viewport.scrollLeft > .5;
  const lineIsRight = linePosition > viewport.clientWidth - edgeMargin && viewport.scrollLeft < maximum - .5;
  const visible = !viewport.hidden && (lineIsLeft || lineIsRight);
  const startViewShowsNow = guideNowLineLeft <= viewport.clientWidth - edgeMargin;
  if (lineIsLeft) {
    guideReturnScrollLeft = startViewShowsNow
      ? 0
      : Math.max(0, Math.min(maximum, guideNowLineLeft - edgeMargin));
  } else if (lineIsRight) {
    guideReturnScrollLeft = startViewShowsNow
      ? 0
      : Math.max(0, Math.min(maximum, guideNowLineLeft - (viewport.clientWidth - edgeMargin)));
  }
  const shell = document.querySelector(".guide-scroll-shell");
  shell?.classList.toggle("is-away", !viewport.hidden && Math.abs(viewport.scrollLeft - guideFollowScrollLeft) >= 10);
  shell?.classList.toggle("is-return-needed", visible);
  shell?.classList.toggle("return-backward", visible && lineIsLeft);
  shell?.classList.toggle("return-forward", visible && lineIsRight);
  button.classList.toggle("is-visible", visible);
  button.setAttribute("aria-hidden", String(!visible));
  button.tabIndex = visible ? 0 : -1;
  const scrollbar = $("guide-scrollbar");
  const thumb = $("guide-scrollbar-thumb");
  if (!scrollbar || !thumb) return;
  const trackWidth = scrollbar.clientWidth;
  const thumbWidth = Math.max(38, Math.min(trackWidth, trackWidth * viewport.clientWidth / Math.max(viewport.scrollWidth, 1)));
  const thumbTravel = Math.max(0, trackWidth - thumbWidth);
  const thumbLeft = maximum ? (viewport.scrollLeft / maximum) * thumbTravel : 0;
  thumb.style.width = `${thumbWidth}px`;
  thumb.style.transform = `translateX(${thumbLeft}px)`;
}

function moveGuideScrollbar(event) {
  if (!guideScrollbarDrag || event.pointerId !== guideScrollbarDrag.pointerId) return;
  const scrollbar = $("guide-scrollbar");
  const thumb = $("guide-scrollbar-thumb");
  const viewport = $("program-guide-scroll");
  const rect = scrollbar.getBoundingClientRect();
  const available = Math.max(1, rect.width - thumb.offsetWidth);
  const position = Math.max(0, Math.min(available, event.clientX - rect.left - guideScrollbarDrag.offset));
  viewport.scrollLeft = (position / available) * Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function guideScrollTarget(nowLineLeft, viewport) {
  const edgeMargin = Math.min(36, viewport.clientWidth * .075);
  const rightLimit = viewport.clientWidth - edgeMargin;
  return nowLineLeft <= rightLimit
    ? 0
    : Math.max(0, nowLineLeft - rightLimit);
}

function updateVideoHelpVisibility() {
  const link = $("video-help-link");
  const panel = $("video-help-panel");
  if (!link || !panel) return;
  link.hidden = !videoHelpReady || hasStartedCurrentVideo || !isChannelProgrammed(activeChannel) || !panel.hidden;
  if (hasStartedCurrentVideo) panel.hidden = true;
}

const googleAccountLink = $("google-account-link");
function openGoogleAccountWindow(event) {
  if (!googleAccountLink) return;
    const width = 520;
    const height = 700;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const accountWindow = window.open(
      googleAccountLink.href,
      "cnt-google-account",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!accountWindow) return;
    event?.preventDefault();
    accountWindow.focus();
    const closeWatcher = window.setInterval(() => {
      if (!accountWindow.closed) return;
      window.clearInterval(closeWatcher);
      window.focus();
    }, 500);
}
if (googleAccountLink) googleAccountLink.addEventListener("click", openGoogleAccountWindow);

function isChannelProgrammed(id) {
  return ["daily", "loop"].includes(SCHEDULES[id]?.mode);
}

function showActivationControl() {
  const loader = $("tune-loader");
  const button = $("sound-help");
  const remaining = Math.max(0, tuneGateEndsAt - performance.now());
  clearTimeout(tuneGateTimer);
  if (remaining > 0) {
    loader.hidden = false;
    loader.style.setProperty("--tune-wait", `${remaining}ms`);
    button.hidden = true;
    tuneGateTimer = setTimeout(showActivationControl, remaining);
    return;
  }
  loader.hidden = true;
  button.textContent = "Ver emisión";
  button.hidden = false;
  clearTimeout(videoHelpTimer);
  videoHelpReady = false;
  updateVideoHelpVisibility();
  videoHelpTimer = setTimeout(() => {
    videoHelpReady = true;
    updateVideoHelpVisibility();
  }, 2000);
}

function madridParts(date = new Date()) {
  const parts = Object.fromEntries(timeFormatter.formatToParts(date).map(p => [p.type, p.value]));
  const dateParts = Object.fromEntries(dateFormatter.formatToParts(date).map(p => [p.type, p.value]));
  return {
    seconds: Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second),
    day: Math.floor(Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day)) / 86400000)
  };
}

function parseClock(value) {
  return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

const loopCache = new WeakMap();

function expandedLoop(schedule) {
  if (loopCache.has(schedule)) return loopCache.get(schedule);
  const margin = Number.isFinite(schedule.videoMargin) ? schedule.videoMargin : 10;
  const entries = [];
  let groupCounter = 0;
  const addVideo = (id, type, options = {}) => {
    const item = CATALOG[id];
    if (!item || !Number.isFinite(item.duration)) return 0;
    const playoutDuration = item.duration + margin;
    entries.push({
      type,
      duration: playoutDuration,
      groupId: options.groupId,
      item: {
        id, ...item,
        playoutDuration,
        ...(options.title ? { title: options.title } : {}),
        ...(options.programDuration ? { programDuration: options.programDuration, programOffset: options.programOffset || 0, groupLast: options.groupLast } : {}),
        ...(options.blockDuration ? { blockDuration: options.blockDuration, blockOffset: options.blockOffset || 0 } : {}),
        isAdvertising: type === "filler"
      }
    });
    return playoutDuration;
  };

  (schedule.sequence || []).forEach((entry) => {
    if (typeof entry === "string") {
      addVideo(entry, "program");
      return;
    }
    if (entry?.type === "adBreak") {
      const groupId = `ad-${groupCounter++}`;
      const target = Math.max(0, Number(entry.duration) || 120);
      let used = 0;
      const accepted = (entry.items || []).filter((id) => {
        const item = CATALOG[id];
        if (!item || used + item.duration + margin > target) return false;
        used += item.duration + margin;
        return true;
      });
      used = 0;
      accepted.forEach((id) => {
        used += addVideo(id, "filler", { groupId, blockDuration: target, blockOffset: used });
      });
      if (used < target) entries.push({ type: "pause", duration: target - used, groupId, adDuration: target, adOffset: used });
      return;
    }
    if (entry?.type === "group") {
      const ids = (entry.items || []).filter((id) => CATALOG[id] && Number.isFinite(CATALOG[id].duration));
      const groupId = `program-${groupCounter++}`;
      const programDuration = ids.reduce((total, id) => total + CATALOG[id].duration + margin, 0);
      let programOffset = 0;
      ids.forEach((id, index) => {
        programOffset += addVideo(id, "program", {
          groupId,
          title: entry.title,
          programDuration,
          programOffset,
          groupLast: index === ids.length - 1
        });
      });
      return;
    }
    if (entry?.type === "pause" && entry.duration > 0) entries.push({ type: "pause", duration: entry.duration });
  });

  const cycleDuration = entries.reduce((total, entry) => total + entry.duration, 0);
  const result = { entries, cycleDuration };
  loopCache.set(schedule, result);
  return result;
}

function buildLoopEvents(day, schedule) {
  const { entries, cycleDuration } = expandedLoop(schedule);
  if (!cycleDuration) return [];
  const dayStart = day * 86400;
  const dayEnd = dayStart + 86400;
  const phase = ((dayStart % cycleDuration) + cycleDuration) % cycleDuration;
  let cycleStart = dayStart - phase;
  const events = [];
  while (cycleStart < dayEnd) {
    // Las pausas tienen duración fija por bloque: la mezcla no altera el ciclo.
    const cycleEntries = schedule.sequenceForCycle
      ? expandedLoop({ ...schedule, sequence: schedule.sequenceForCycle(Math.floor(cycleStart / cycleDuration)) }).entries
      : entries;
    let cursor = cycleStart;
    cycleEntries.forEach((entry) => {
      const end = cursor + entry.duration;
      if (end > dayStart && cursor < dayEnd) {
        events.push({
          type: entry.type,
          groupId: entry.groupId ? `${entry.groupId}-${cycleStart}` : undefined,
          ...(entry.adDuration ? { adDuration: entry.adDuration, adOffset: entry.adOffset || 0 } : {}),
          ...(entry.item ? { item: entry.item } : {}),
          ...(entry.groupId ? { guideStart: cursor - dayStart - (entry.item?.blockOffset ?? entry.item?.programOffset ?? entry.adOffset ?? 0) } : {}),
          start: cursor - dayStart,
          end: end - dayStart
        });
      }
      cursor = end;
    });
    cycleStart += cycleDuration;
  }
  return events;
}

function buildDayEvents(day, channelId = activeChannel) {
  const schedule = SCHEDULES[channelId];
  if (schedule?.mode === "loop") return buildLoopEvents(day, schedule);
  if (!schedule || schedule.mode !== "daily") return [];
  const rotationDay = day - (schedule.rotationAnchorDay || 0);
  const rotations = schedule.rotations || [];
  const rotation = rotations.length ? rotations[((rotationDay % rotations.length) + rotations.length) % rotations.length] : null;
  const rotatingBlocks = (schedule.rotatingBlocks || []).map((block) => {
    const index = ((rotationDay % block.variants.length) + block.variants.length) % block.variants.length;
    return { start: block.start, label: block.label, items: block.variants[index] };
  });
  const blocks = [...schedule.blocks, ...rotatingBlocks, ...(rotation ? [rotation] : [])].sort((a, b) => parseClock(a.start) - parseClock(b.start));
  const programs = [];
  blocks.forEach((block) => {
    let cursor = parseClock(block.start);
    block.items.forEach((id) => {
      const item = CATALOG[id];
      if (!item || !Number.isFinite(item.duration)) return;
      programs.push({ type: "program", item: { id, ...item }, start: cursor, end: cursor + item.duration, block: block.label });
      cursor += item.duration;
    });
  });

  const events = [];
  const usedFillers = new Set();
  const fillers = schedule.fillers || [];
  let fillerCursor = fillers.length ? ((day % fillers.length) + fillers.length) % fillers.length : 0;

  const fillGap = (start, end) => {
    if (schedule.gapMode === "continuity") {
      if (start < end) events.push({ type: "continuity", start, end });
      return;
    }
    let cursor = start;
    while (cursor < end) {
      const remaining = end - cursor;
      let selectedIndex = -1;
      for (let step = 0; step < fillers.length; step++) {
        const index = (fillerCursor + step) % fillers.length;
        const id = fillers[index];
        const item = CATALOG[id];
        if (!usedFillers.has(id) && item && item.duration <= remaining) {
          selectedIndex = index;
          break;
        }
      }
      if (selectedIndex < 0) break;
      const id = fillers[selectedIndex];
      const item = CATALOG[id];
      events.push({ type: "filler", item: { id, ...item }, start: cursor, end: cursor + item.duration, guideStart: start, guideEnd: end });
      usedFillers.add(id);
      fillerCursor = (selectedIndex + 1) % fillers.length;
      cursor += item.duration;
    }
    if (cursor < end) events.push({ type: "pause", start: cursor, end, guideStart: start, guideEnd: end });
  };

  const dayStart = parseClock(schedule.dayStartsAt);
  if (programs[0] && programs[0].start > dayStart) fillGap(dayStart, programs[0].start);
  programs.forEach((program, index) => {
    events.push(program);
    const next = programs[index + 1];
    if (next && next.start > program.end) fillGap(program.end, next.start);
  });
  const last = programs.at(-1);
  const nextDayStart = 86400 + parseClock(schedule.dayStartsAt);
  const offAirBoundary = parseClock(schedule.offAirStartsAt || schedule.dayStartsAt) || 86400;
  if (last) {
    if (last.end < offAirBoundary) fillGap(last.end, offAirBoundary);
    const offAirStart = Math.max(last.end, offAirBoundary);
    if (offAirStart < nextDayStart) events.push({ type: "offair", start: offAirStart, end: nextDayStart });
  }
  return events.sort((a, b) => a.start - b.start);
}

function broadcastState(now = new Date()) {
  const schedule = SCHEDULES[activeChannel];
  const broadcastDayStart = schedule.mode === "loop" ? 0 : parseClock(schedule.dayStartsAt);
  const madrid = madridParts(now);
  const day = madrid.seconds < broadcastDayStart ? madrid.day - 1 : madrid.day;
  const position = madrid.seconds < broadcastDayStart ? madrid.seconds + 86400 : madrid.seconds;
  const events = buildDayEvents(day);
  const index = events.findIndex((event) => position >= event.start && position < event.end);
  const event = events[Math.max(0, index)];
  let nextProgram;
  if (schedule.mode === "loop" && event) {
    const currentAbsoluteEnd = day * 86400 + event.end;
    nextProgram = [day, day + 1].flatMap((candidateDay) =>
      buildDayEvents(candidateDay).map((candidate) => ({
        ...candidate,
        absoluteStart: candidateDay * 86400 + candidate.start
      }))
    ).find((candidate) => candidate.type === "program" && candidate.absoluteStart >= currentAbsoluteEnd && (!event.groupId || candidate.groupId !== event.groupId));
  } else {
    nextProgram = events.slice(Math.max(0, index) + 1).find(candidate => candidate.type === "program") || buildDayEvents(day + 1).find(candidate => candidate.type === "program");
  }
  return { onAir: event?.type === "program" || event?.type === "filler", event, index, events, day, position, nextProgram };
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function clockFromSeconds(seconds) {
  const normalized = ((seconds % 86400) + 86400) % 86400;
  return `${String(Math.floor(normalized / 3600)).padStart(2, "0")}:${String(Math.floor((normalized % 3600) / 60)).padStart(2, "0")}`;
}

function renderAgeRating(rating) {
  const badge = $("age-badge");
  if (!hasStartedBroadcast) {
    badge.hidden = true;
    return;
  }
  if (!rating) {
    badge.hidden = true;
    return;
  }
  const normalized = String(rating).toUpperCase().replace("+", "");
  badge.className = `age-badge rating-${normalized.toLowerCase()}`;
  badge.textContent = normalized === "TP" ? "TP" : `+${normalized}`;
  badge.setAttribute("aria-label", normalized === "TP" ? "Apto para todos los públicos" : `No recomendado para menores de ${normalized} años`);
  badge.hidden = false;
}

function renderAdvertisingBadge() {
  const badge = $("age-badge");
  if (!hasStartedBroadcast) {
    badge.hidden = true;
    return;
  }
  badge.className = "age-badge advertising-badge";
  badge.textContent = "PUBLICIDAD";
  badge.setAttribute("aria-label", "Publicidad");
  badge.hidden = false;
}

function renderTestingBadge() {
  const badge = $("age-badge");
  if (!hasStartedBroadcast) {
    badge.hidden = true;
    return;
  }
  badge.className = "age-badge advertising-badge testing-badge";
  badge.textContent = "CANAL EN PRUEBAS";
  badge.setAttribute("aria-label", "Canal en pruebas");
  badge.hidden = false;
}

function renderPlayer(item, offset, key) {
  if (loadedKey === key) return;
  loadedKey = key;
  hasStartedCurrentVideo = false;
  $("video-help-panel").hidden = true;
  clearTimeout(tuneGateTimer);
  clearTimeout(videoHelpTimer);
  tuneGateEndsAt = performance.now() + 2500;
  videoHelpReady = false;
  updateVideoHelpVisibility();
  const loadingBar = $("tune-loader-bar");
  loadingBar.style.animation = "none";
  void loadingBar.offsetWidth;
  loadingBar.style.animation = "";
  suppressChannelBug = item.isAdvertising === true;
  const stage = $("player-stage");
  stage.replaceChildren();
  $("channel-bug").hidden = true;
  awaitingDriveClick = false;
  document.querySelector(".player-lock").classList.remove("is-open");
  $("sound-help").classList.remove("is-retry", "is-pass-through");
  $("tune-loader").hidden = true;

  if (VIDEO_PROVIDER === "html5" && html5Sources[item.driveId]) {
    const video = document.createElement("video");
    video.src = html5Sources[item.driveId];
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.setAttribute("controlsList", "nodownload noplaybackrate");
    video.addEventListener("loadedmetadata", () => { video.currentTime = offset; video.play().catch(showActivationControl); }, { once: true });
    video.addEventListener("playing", () => { hasStartedBroadcast = true; hasStartedCurrentVideo = true; updateVideoHelpVisibility(); $("channel-bug").hidden = suppressChannelBug; });
    stage.append(video);
    $("drive-note").hidden = true;
  } else {
    const iframe = document.createElement("iframe");
    const start = Math.max(0, Math.floor(offset));
    // Drive deja el visor negro en dominios publicados cuando recibe autoplay=1.
    // Drive usa `t` en sus enlaces temporales; `start` hacía que algunos visores
    // aceptasen la URL pero comenzasen igualmente desde el principio.
    iframe.src = `https://drive.google.com/file/d/${item.driveId}/preview?t=${start}`;
    iframe.title = `En directo: ${item.title}`;
    iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "eager";
    iframe.tabIndex = 0;
    stage.append(iframe);
    $("drive-note").hidden = false;
    document.querySelector(".player-lock").classList.add("is-open");
    $("sound-help").classList.add("is-pass-through");
    showActivationControl();
    awaitingDriveClick = true;
  }
}

function renderProgramGuide(state) {
  const viewport = $("program-guide-scroll");
  // La anchura visible representa una hora desde el inicio del bloque actual;
  // las 23 horas restantes siguen disponibles mediante desplazamiento horizontal.
  const hourWidth = Math.max(280, viewport.clientWidth);
  const nowSeconds = state.day * 86400 + state.position;
  const current = state.event;
  const currentGuideStart = current.guideStart ?? (current.item?.programDuration
    ? current.start - (current.item.programOffset || 0)
    : current.start);
  const key = `${state.day}-${currentGuideStart}-${current.type === "filler" ? "pause" : current.type}`;
  if (guideKey === key) {
    const nowLineLeft = ((nowSeconds - guideWindowStart) / 3600) * hourWidth;
    const edgeMargin = Math.min(36, viewport.clientWidth * .075);
    const rightLimit = viewport.clientWidth - edgeMargin;
    const previousLinePosition = guideNowLineLeft - viewport.scrollLeft;
    const wasFollowingEmission = Math.abs(viewport.scrollLeft - guideFollowScrollLeft) < 1;
    const reachesRightMargin = !wasFollowingEmission
      && previousLinePosition >= rightLimit - 1
      && previousLinePosition <= rightLimit + 1;
    guideNowLineLeft = nowLineLeft;
    guideFollowScrollLeft = guideScrollTarget(nowLineLeft, viewport);
    $("guide-now-line").style.left = `${nowLineLeft}px`;
    if (wasFollowingEmission || reachesRightMargin) viewport.scrollLeft = guideFollowScrollLeft;
    updateGuideReturnVisibility();
    return;
  }
  guideKey = key;
  guideWindowStart = state.day * 86400 + currentGuideStart;
  const nominalEnd = guideWindowStart + 86400;
  const allEvents = [state.day - 1, state.day, state.day + 1, state.day + 2].flatMap((day) =>
    buildDayEvents(day, activeChannel).map((event) => ({ ...event, absoluteStart: day * 86400 + event.start, absoluteEnd: day * 86400 + event.end }))
  );
  const uniqueEvents = [...new Map(allEvents.map((event) => [
    `${event.absoluteStart}-${event.absoluteEnd}-${event.type}-${event.item?.id || ""}`,
    event
  ])).values()].sort((a, b) => a.absoluteStart - b.absoluteStart);
  const guideEvents = uniqueEvents.reduce((result, event) => {
    const normalized = event.type === "filler" ? { ...event, type: "pause" } : event;
    const previous = result.at(-1);
    if (previous && normalized.groupId && previous.groupId === normalized.groupId && previous.absoluteEnd === normalized.absoluteStart) {
      previous.absoluteEnd = normalized.absoluteEnd;
      if (normalized.type === "program") previous.type = "program";
      return result;
    }
    if (previous && previous.type === "pause" && normalized.type === "pause" && previous.absoluteEnd === normalized.absoluteStart) {
      previous.absoluteEnd = normalized.absoluteEnd;
    } else {
      result.push({ ...normalized });
    }
    return result;
  }, []);
  const instances = guideEvents.filter(event => event.absoluteEnd > guideWindowStart && event.absoluteStart < nominalEnd);
  const lastVisible = instances.at(-1);
  const extendedEnd = Math.max(nominalEnd, lastVisible?.absoluteEnd || nominalEnd);

  const timelineWidth = ((extendedEnd - guideWindowStart) / 3600) * hourWidth;
  const nowLineLeft = ((nowSeconds - guideWindowStart) / 3600) * hourWidth;
  guideNowLineLeft = nowLineLeft;
  $("guide-now-line").style.left = `${nowLineLeft}px`;
  const track = $("program-guide-track");
  const scale = $("hour-scale");
  const timeline = $("guide-timeline");
  const fragment = document.createDocumentFragment();
  const hourFragment = document.createDocumentFragment();
  const secondsUntilClockHour = (3600 - (guideWindowStart % 3600)) % 3600;
  const clockHourOffset = (secondsUntilClockHour / 3600) * hourWidth;
  timeline.style.width = `${timelineWidth}px`;
  timeline.style.setProperty("--hour-width", `${hourWidth}px`);
  timeline.style.setProperty("--clock-hour-offset", `${clockHourOffset}px`);

  const currentMark = document.createElement("span");
  currentMark.className = "hour-mark is-now";
  currentMark.style.left = "0px";
  currentMark.textContent = clockFromSeconds(guideWindowStart);
  hourFragment.append(currentMark);

  const firstFullHour = (Math.floor(guideWindowStart / 3600) + 1) * 3600;
  for (let hourTime = firstFullHour; hourTime < extendedEnd; hourTime += 3600) {
    const markLeft = ((hourTime - guideWindowStart) / 3600) * hourWidth;
    if (markLeft < 82) continue;
    const mark = document.createElement("span");
    mark.className = "hour-mark";
    mark.style.left = `${markLeft}px`;
    mark.textContent = `${Math.floor((hourTime % 86400) / 3600)}:00`;
    hourFragment.append(mark);
  }

  instances.forEach((event) => {
      const programStart = event.absoluteStart;
      const programEnd = event.absoluteEnd;
      const visibleDuration = programEnd - programStart;
      const row = document.createElement("article");
      const time = document.createElement("time");
      const title = document.createElement("strong");
      const isCurrent = nowSeconds >= programStart && nowSeconds < programEnd;
      row.className = `guide-item${isCurrent ? " is-current" : ""}${event.type === "pause" || event.type === "offair" ? " is-pause" : ""}${event.type === "continuity" ? " is-continuity" : ""}`;
      row.setAttribute("role", "listitem");
      const isEmptyPause = event.type === "pause" || event.type === "offair";
      const itemTitle = event.type === "program" ? event.item.title : event.type === "continuity" ? `Continuidad ${CHANNELS[activeChannel].name}` : "";
      row.title = isEmptyPause ? (event.type === "offair" ? "Fuera de emisión" : "Pausa de emisión") : `${clockFromSeconds(programStart)} · ${itemTitle}`;
      if (isEmptyPause) row.setAttribute("aria-label", event.type === "offair" ? "Fuera de emisión" : "Pausa de emisión");
      row.style.left = `${((programStart - guideWindowStart) / 3600) * hourWidth}px`;
      row.style.width = `${Math.max(2, (visibleDuration / 3600) * hourWidth - 2)}px`;
      if (!isEmptyPause) {
        time.textContent = clockFromSeconds(programStart);
        title.textContent = itemTitle;
        row.append(time, title);
      }
      fragment.append(row);
  });
  scale.replaceChildren(hourFragment);
  track.replaceChildren(fragment);
  requestAnimationFrame(() => {
    guideFollowScrollLeft = guideScrollTarget(nowLineLeft, viewport);
    guideReturnScrollLeft = guideFollowScrollLeft;
    viewport.scrollTo({ left: guideFollowScrollLeft, behavior: "auto" });
    updateGuideReturnVisibility();
  });
}

function renderIntermission(state, key) {
  clearTimeout(videoHelpTimer);
  videoHelpReady = false;
  $("video-help-panel").hidden = true;
  updateVideoHelpVisibility();
  clearTimeout(tuneGateTimer);
  const duration = state.event.end - state.event.start;
  const isBlackout = state.event.type === "pause" && duration <= 5;
  if (loadedKey !== key) {
    loadedKey = key;
    awaitingDriveClick = false;
    const isOffAir = state.event.type === "offair";
    const isContinuity = state.event.type === "continuity";
    const stage = $("player-stage");
    stage.replaceChildren();
    const card = document.createElement("div");
    card.className = `off-air${isContinuity ? " continuity" : ""}${isBlackout ? " blackout" : ""}`;
    card.setAttribute("aria-label", isBlackout ? "Separador entre vídeos" : isOffAir ? "Fin de emisión" : isContinuity ? `Continuidad ${CHANNELS[activeChannel].name}` : "Pausa de emisión");
    if (isContinuity) {
      const alternatives = Object.entries(CHANNELS)
        .filter(([id]) => id !== activeChannel && isChannelProgrammed(id))
        .map(([id, channel]) => `<button type="button" data-watch-channel="${id}" style="--switch-color:${channel.color}">Ver ${channel.name}</button>`)
        .join("");
      card.innerHTML = `<img src="${CHANNELS[activeChannel].logo}?v=${logoVersion}" alt="${CHANNELS[activeChannel].name}"><p>Continuidad</p>${alternatives ? `<div class="continuity-switch"><span>También en emisión</span>${alternatives}</div>` : ""}`;
    } else if (!isBlackout) {
      const returnWith = state.nextProgram?.item.title || `Nueva jornada de ${CHANNELS[activeChannel].name}`;
      card.innerHTML = `<p class="pause-heading">${CHANNELS[activeChannel].legalName.toLocaleUpperCase("es-ES")}</p><strong class="countdown">VOLVEMOS EN <span id="break-countdown">${formatDuration(state.event.end - state.position)}</span></strong><span class="break-next">A CONTINUACIÓN: ${returnWith.toLocaleUpperCase("es-ES")}</span>`;
    }
    stage.append(card);
  }
  const remaining = state.event.end - state.position;
  const countdown = $("break-countdown");
  if (countdown) countdown.textContent = state.event.type === "offair"
    ? `${clockFromSeconds(parseClock(SCHEDULES[activeChannel].dayStartsAt))} · faltan ${formatDuration(remaining)}`
    : formatDuration(remaining);
  $("channel-bug").hidden = true;
  if (state.event.type === "pause" && !isBlackout) renderAdvertisingBadge();
  else $("age-badge").hidden = true;
  $("sound-help").hidden = true;
  $("tune-loader").hidden = true;
  document.querySelector(".player-lock").classList.toggle("is-open", state.event.type === "continuity");
}

function renderComingUp(state) {
  const overlay = $("coming-up");
  const screen = $("screen");
  const remaining = state.event.item.duration - (state.position - state.event.start);
  const visible = hasStartedCurrentVideo && !SCHEDULES[activeChannel]?.testing && state.event.type === "program" && (!state.event.groupId || state.event.item.groupLast) && remaining <= 20 && remaining > 12;
  overlay.classList.toggle("is-visible", visible);
  screen.classList.toggle("coming-up-visible", visible);
  overlay.setAttribute("aria-hidden", String(!visible));
  if (!visible) return;
  $("coming-up-title").textContent = state.nextProgram?.item.title || `Nueva jornada de ${CHANNELS[activeChannel].name}`;
}

function render() {
  if (!isChannelProgrammed(activeChannel)) return;
  const now = new Date();
  const state = broadcastState(now);
  if (!state.event) return;
  const stateKey = `${state.day}-${state.event.start}-${state.event.type}`;
  const next = state.nextProgram;
  const isTestingChannel = Boolean(SCHEDULES[activeChannel]?.testing);
  $("player-stage").hidden = false;
  $("live-badge").hidden = state.event.type === "offair";
  $("live-label").textContent = isTestingChannel ? "REDIFUSIÓN" : state.event.type === "continuity" ? CHANNELS[activeChannel].name.toUpperCase() : "EN DIRECTO";
  $("live-badge").classList.toggle("is-channel-label", isTestingChannel || state.event.type === "continuity");
  $("next-label").textContent = "A CONTINUACIÓN";
  const testingLoop = SCHEDULES[activeChannel]?.testing && state.event.item?.programDuration;
  $("next-title").textContent = next?.item.title || (testingLoop ? state.event.item.title : `Nueva jornada de ${CHANNELS[activeChannel].name}`);
  $("next-time").textContent = next
    ? clockFromSeconds(next.start)
    : testingLoop
      ? clockFromSeconds(state.event.start - (state.event.item.programOffset || 0) + state.event.item.programDuration)
      : clockFromSeconds(parseClock(SCHEDULES[activeChannel].dayStartsAt));

  if (state.onAir) {
    const clipElapsed = state.position - state.event.start;
    const isAdvertising = state.event.type === "filler";
    const itemElapsed = clipElapsed + (isAdvertising ? state.event.item.blockOffset || 0 : state.event.item.programOffset || 0);
    const itemDuration = isAdvertising ? state.event.item.blockDuration || state.event.item.playoutDuration : state.event.item.programDuration || state.event.item.playoutDuration;
    $("status-kicker").textContent = SCHEDULES[activeChannel]?.testing ? "CANAL EN PRUEBAS" : "EN EMISIÓN";
    $("current-title").textContent = isAdvertising ? "Publicidad" : state.event.item.title;
    $("program-meta").hidden = false;
    $("rating-meta").hidden = isTestingChannel;
    $("current-rating").textContent = isAdvertising ? "PUBLICIDAD" : state.event.item.rating ? (String(state.event.item.rating).toUpperCase() === "TP" ? "TP" : `+${String(state.event.item.rating).replace("+", "")}`) : "SIN CLASIFICAR";
    $("current-duration").textContent = formatDuration(itemDuration);
    if (SCHEDULES[activeChannel]?.testing) renderTestingBadge();
    else if (isAdvertising) renderAdvertisingBadge();
    else renderAgeRating(state.event.item.rating);
    $("elapsed").textContent = formatDuration(itemElapsed);
    $("remaining").textContent = `−${formatDuration(itemDuration - itemElapsed)}`;
    $("progress-bar").style.width = `${Math.min(100, (itemElapsed / itemDuration) * 100)}%`;
    renderPlayer(state.event.item, clipElapsed, stateKey);
    renderComingUp(state);
  } else {
    const elapsed = state.position - state.event.start;
    const duration = state.event.end - state.event.start;
    const isAdRemainder = Boolean(state.event.adDuration);
    $("status-kicker").textContent = isAdRemainder ? "EN EMISIÓN" : state.event.type === "offair" ? CHANNELS[activeChannel].name.toUpperCase() : state.event.type === "continuity" ? `CONTINUIDAD ${CHANNELS[activeChannel].name.toUpperCase()}` : "PAUSA DE EMISIÓN";
    $("current-title").textContent = isAdRemainder ? "Publicidad" : state.event.type === "offair" ? `Volvemos a las ${clockFromSeconds(parseClock(SCHEDULES[activeChannel].dayStartsAt))}` : state.event.type === "continuity" ? CHANNELS[activeChannel].name : "Volvemos enseguida";
    $("program-meta").hidden = !isAdRemainder;
    if (isAdRemainder) {
      $("rating-meta").hidden = false;
      const breakElapsed = state.event.adOffset + elapsed;
      $("current-rating").textContent = "PUBLICIDAD";
      $("current-duration").textContent = formatDuration(state.event.adDuration);
      $("elapsed").textContent = formatDuration(breakElapsed);
      $("remaining").textContent = `−${formatDuration(state.event.adDuration - breakElapsed)}`;
      $("progress-bar").style.width = `${Math.min(100, (breakElapsed / state.event.adDuration) * 100)}%`;
    } else {
      $("elapsed").textContent = formatDuration(elapsed);
      $("remaining").textContent = `−${formatDuration(state.event.end - state.position)}`;
      $("progress-bar").style.width = `${Math.min(100, (elapsed / duration) * 100)}%`;
    }
    renderIntermission(state, stateKey);
    $("coming-up").classList.remove("is-visible");
    $("screen").classList.remove("coming-up-visible");
    $("coming-up").setAttribute("aria-hidden", "true");
  }
  renderProgramGuide(state);
}

$("sound-help").addEventListener("click", () => {
  const media = $("player-stage").querySelector("video");
  if (media) {
    media.play();
    hasStartedBroadcast = true;
    hasStartedCurrentVideo = true;
    updateVideoHelpVisibility();
    $("sound-help").hidden = true;
  }
});

$("player-stage").addEventListener("click", (event) => {
  const button = event.target.closest("[data-watch-channel]");
  if (button) setActiveChannel(button.dataset.watchChannel);
});

function watchDriveActivation() {
  if (!awaitingDriveClick) return;
  const iframe = $("player-stage").querySelector("iframe");
  if (iframe && document.activeElement === iframe) {
    awaitingDriveClick = false;
    hasStartedBroadcast = true;
    hasStartedCurrentVideo = true;
    updateVideoHelpVisibility();
    iframe.tabIndex = -1;
    document.querySelector(".player-lock").classList.remove("is-open");
    $("sound-help").hidden = true;
    $("channel-bug").hidden = suppressChannelBug;
    $("drive-note").textContent = "El reproductor está bloqueado para mantener la emisión lineal.";
  }
}

function setExpandedPlayer(enabled) {
  $("screen").classList.toggle("is-expanded", enabled);
  document.body.classList.toggle("player-expanded", enabled);
  $("fullscreen-button").setAttribute("aria-label", enabled ? "Salir de pantalla completa" : "Ver a pantalla completa");
  showPlayerControls();
}
$("fullscreen-button").addEventListener("click", async () => {
  const player = $("screen");
  if (player.classList.contains("is-expanded")) return setExpandedPlayer(false);
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const request = player.requestFullscreen || player.webkitRequestFullscreen;
      if (request) await request.call(player);
      else setExpandedPlayer(true);
    }
  } catch {
    setExpandedPlayer(true);
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") setExpandedPlayer(false);
});

function showPlayerControls() {
  $("screen").classList.add("controls-visible");
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => $("screen").classList.remove("controls-visible"), 2000);
}

function hidePlayerControlsSoon() {
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => $("screen").classList.remove("controls-visible"), 2000);
}

function updateFavicon(color, official = false) {
  const foreground = official ? "#080b12" : "white";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${color}"/><path d="M11 5l5 4 5-4" fill="none" stroke="${foreground}" stroke-width="2" stroke-linecap="round"/><rect x="6" y="9" width="20" height="16" rx="3" fill="${foreground}"/><rect x="9" y="12" width="14" height="10" rx="1" fill="${color}"/><path d="M11 26h10v2H11z" fill="${foreground}"/></svg>`;
  document.querySelector('link[rel="icon"]').href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

$("screen").addEventListener("pointerenter", showPlayerControls);
$("screen").addEventListener("pointermove", showPlayerControls);
$("screen").addEventListener("pointerleave", hidePlayerControlsSoon);
$("screen").addEventListener("touchstart", showPlayerControls, { passive: true });
$("screen").addEventListener("focusin", showPlayerControls);

function setActiveChannel(id, updateHash = true) {
  const requestedId = id;
  id = HASH_CHANNELS[id] || id;
  const channel = CHANNELS[id] || CHANNELS.cnt;
  activeChannel = CHANNELS[id] ? id : "cnt";
  clearTimeout(tuneGateTimer);
  clearTimeout(videoHelpTimer);
  tuneGateEndsAt = performance.now() + 2500;
  hasStartedBroadcast = false;
  hasStartedCurrentVideo = false;
  videoHelpReady = false;
  $("video-help-panel").hidden = true;
  updateVideoHelpVisibility();
  document.documentElement.dataset.channel = activeChannel;
  document.documentElement.style.setProperty("--yellow", channel.color);
  document.title = `${channel.name} Live`;
  updateFavicon(channel.color, activeChannel === "cnt");
  $("brand-logo").src = `${channel.logo}?v=${logoVersion}`;
  $("brand-logo").alt = channel.name;
  $("channel-bug").src = `${channel.logo}?v=${logoVersion}`;
    $("channel-bug").hidden = true;
    $("age-badge").hidden = true;
  $("coming-up").classList.remove("is-visible");
  $("screen").classList.remove("coming-up-visible");
  $("coming-up").setAttribute("aria-hidden", "true");
  $("guide-empty").textContent = "Las emisiones empezarán próximamente.";
  document.querySelectorAll(".channel-tab").forEach((tab) => {
    const selected = tab.dataset.channel === activeChannel;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  if (isChannelProgrammed(activeChannel)) {
    $("coming-soon").hidden = true;
    $("player-stage").hidden = false;
    $("progress-track").hidden = false;
    $("time-row").hidden = false;
    document.querySelector(".next-card").hidden = false;
    $("program-guide-scroll").hidden = false;
    document.querySelector(".guide-scroll-shell")?.classList.remove("is-away", "is-return-needed", "return-backward", "return-forward");
    $("guide-return-button").classList.remove("is-visible");
    $("guide-empty").hidden = true;
    loadedKey = "";
    guideKey = "";
    render();
  } else {
    updateVideoHelpVisibility();
    clearTimeout(tuneGateTimer);
    awaitingDriveClick = false;
    loadedKey = "";
    $("player-stage").replaceChildren();
    $("player-stage").hidden = true;
    $("sound-help").hidden = true;
    $("tune-loader").hidden = true;
    $("live-badge").hidden = true;
    $("coming-soon").hidden = false;
    $("coming-soon-title").textContent = channel.name;
    $("status-kicker").textContent = channel.type.toUpperCase();
    $("current-title").textContent = "Las emisiones empezarán próximamente";
    $("program-meta").hidden = true;
    $("progress-track").hidden = true;
    $("time-row").hidden = true;
    document.querySelector(".next-card").hidden = true;
    $("program-guide-scroll").hidden = true;
    document.querySelector(".guide-scroll-shell")?.classList.remove("is-away", "is-return-needed", "return-backward", "return-forward");
    $("guide-return-button").classList.remove("is-visible");
    updateGuideReturnVisibility();
    $("guide-empty").hidden = false;
    if (SCHEDULES[activeChannel]?.mode !== "upcoming") {
      // La ausencia de datos es un error de carga, no un canal sin estrenar.
      $("coming-soon").querySelector(".eyebrow").textContent = "ERROR DE CARGA";
      $("coming-soon").querySelector("p:last-child").textContent = "No se ha podido cargar la programación. Prueba a recargar la página.";
      $("status-kicker").textContent = "PROGRAMACIÓN NO DISPONIBLE";
      $("current-title").textContent = "No se ha podido cargar la parrilla";
      $("guide-empty").textContent = "La programación no se ha cargado.";
    } else {
      $("coming-soon").querySelector(".eyebrow").textContent = "PRÓXIMAMENTE...";
      $("coming-soon").querySelector("p:last-child").textContent = "Las emisiones empezarán próximamente.";
    }
  }

  if (updateHash || requestedId === "metv" || requestedId === "ccc" || (!CHANNELS[requestedId] && !HASH_CHANNELS[requestedId])) {
    history.replaceState(null, "", `#${CHANNEL_HASHES[activeChannel] || activeChannel}`);
  }
}

function reloadCurrentPlayer() {
  $("video-help-panel").hidden = true;
  loadedKey = "";
  hasStartedCurrentVideo = false;
  $("age-badge").hidden = true;
  render();
  showPlayerControls();
}

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  reloadCurrentPlayer();
});

document.querySelectorAll(".channel-tab").forEach((tab) => {
  tab.addEventListener("click", () => setActiveChannel(tab.dataset.channel));
});

$("video-help-link").addEventListener("click", () => {
  $("video-help-panel").hidden = false;
  updateVideoHelpVisibility();
});
$("video-help-close").addEventListener("click", () => {
  $("video-help-panel").hidden = true;
  updateVideoHelpVisibility();
});
$("video-help-reload").addEventListener("click", reloadCurrentPlayer);
$("program-guide-scroll").addEventListener("scroll", updateGuideReturnVisibility, { passive: true });
$("guide-return-button").addEventListener("click", () => {
  $("program-guide-scroll").scrollTo({ left: guideReturnScrollLeft, behavior: "smooth" });
});
$("guide-scrollbar").addEventListener("pointerdown", (event) => {
  const thumb = $("guide-scrollbar-thumb");
  const thumbRect = thumb.getBoundingClientRect();
  const clickedThumb = event.target === thumb;
  guideScrollbarDrag = {
    pointerId: event.pointerId,
    offset: clickedThumb ? event.clientX - thumbRect.left : thumbRect.width / 2
  };
  $("guide-scrollbar").setPointerCapture(event.pointerId);
  moveGuideScrollbar(event);
});
$("guide-scrollbar").addEventListener("pointermove", moveGuideScrollbar);
$("guide-scrollbar").addEventListener("pointerup", (event) => {
  if (guideScrollbarDrag?.pointerId !== event.pointerId) return;
  guideScrollbarDrag = undefined;
  $("guide-scrollbar").releasePointerCapture(event.pointerId);
});
$("guide-scrollbar").addEventListener("pointercancel", () => { guideScrollbarDrag = undefined; });
window.addEventListener("hashchange", () => {
  setActiveChannel(location.hash.slice(1), false);
});

setActiveChannel(location.hash.slice(1) || "cnt", false);
window.CNT_APP_READY = true;
document.documentElement.classList.remove("app-booting");
showPlayerControls();
setInterval(render, 1000);
setInterval(watchDriveActivation, 50);
window.addEventListener("resize", () => { guideKey = ""; });
