window.CHANNEL_SCHEDULES = window.CHANNEL_SCHEDULES || {};
(() => {
  const adBreak = window.SCHEDULE_TOOLS.makeTrailerBreaks(44219);
  // Ocho mezclas variadas de 2 o 3 piezas. Todas duran aproximadamente
  // siete minutos y, entre ellas, incluyen las 15 piezas disponibles.
  const musicGroups = [
    ["music-havana", "music-dont-stop-believin"],
    ["music-livin-on-a-prayer", "music-manchild"],
    ["music-livin-on-a-prayer-2", "music-have-you-ever-seen-the-rain"],
    ["music-training-season", "music-mystical-magical"],
    ["music-im-outta-love", "music-manchild-espresso"],
    ["music-somethings-got-a-hold-on-me", "music-waka-waka", "music-the-boys-are-back-in-town"],
    ["music-you-belong-with-me", "music-devuelveme-a-mi-chica", "music-dont-stop-believin"],
    ["music-havana", "music-manchild", "music-the-boys-are-back-in-town"]
  ].map((items) => ({ type: "group", title: "Música de Three of a Kind", items }));
  const summers = [1, 2, 3, 4].map((number) => `special-summer-sound-${number}`);
  const sequence = [];
  // Dos vueltas completas y explícitas: nunca se vuelve al 1 sin haber
  // emitido antes 1, 2, 3 y 4, cada uno con sus dos pausas correspondientes.
  for (let round = 0; round < 2; round++) {
    summers.forEach((summer, index) => {
      const group = musicGroups[round * summers.length + index];
      sequence.push(summer, adBreak(180), group, adBreak(180));
    });
  }
  window.CHANNEL_SCHEDULES.metv = {
    mode: "loop",
    videoMargin: 10,
    sequence
  };
})();
