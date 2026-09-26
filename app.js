(function () {
  'use strict';

  var STEPS_PER_BAR = 16;
  var BARS = 4;
  var TOTAL_STEPS = STEPS_PER_BAR * BARS;

  var TRACKS = [
    { id: 'snare', label: 'Snare', file: 'sounds/S.m4a', gain: 0.1 },
    { id: 'bass', label: 'Bass', file: 'sounds/B.m4a', gain: 0.1 },
    { id: 'rim', label: 'Rim', file: 'sounds/R.m4a', gain: 0.09 },
    { id: 'crash', label: 'Crash', file: 'sounds/C.m4a', gain: 0.09 }
  ];

  // Each preset is a per-bar step list (0-15) for each track, one array per bar.
  var PRESETS = {
    amen: {
      label: 'Amen',
      bars: {
        snare: [[4, 7, 9, 12, 15], [4, 7, 9, 12, 15], [4, 7, 9, 14], [1, 4, 7, 9, 14]],
        bass: [[0, 2, 10, 11], [0, 2, 10, 11], [0, 2, 10], [2, 3, 10]],
        rim: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 12, 14]],
        // One crash in the whole break: bar 4, the 'and' of beat 3, replacing the ride hit there.
        crash: [[], [], [], [10]]
      }
    },
    think: {
      label: 'Think Break',
      bars: {
        snare: [[4, 12], [4, 12], [4, 12], [4, 12, 14]],
        bass: [[0, 10], [0, 10], [0, 10], [0, 7, 10, 11]],
        rim: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 9, 10, 12, 14, 15]],
        crash: [[0], [], [], []]
      }
    },
    boomBap: {
      label: 'Boom Bap',
      bars: {
        snare: [[8], [8], [8], [8, 9]],
        bass: [[0, 3, 6, 10], [0, 3, 6, 10], [0, 3, 6, 10], [0, 3, 6, 10, 13]],
        rim: [[2, 6, 10, 14], [2, 6, 10, 14], [2, 6, 10, 14], [2, 6, 9, 10, 14]],
        crash: [[], [], [], []]
      }
    },
    fourOnFloor: {
      label: 'Four on the Floor',
      bars: {
        snare: [[4, 12], [4, 12], [4, 12], [4, 12]],
        bass: [[0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12]],
        rim: [[2, 6, 10, 14], [2, 6, 10, 14], [2, 6, 10, 14], [2, 3, 6, 10, 14, 15]],
        crash: [[0], [], [], []]
      }
    },
    jungle: {
      label: 'Jungle Skitter',
      bars: {
        snare: [[5, 9, 15], [3, 9, 13], [5, 11, 15], [3, 7, 9, 13]],
        bass: [[0, 3, 7, 10, 13], [0, 6, 10, 13], [0, 3, 7, 10], [0, 3, 6, 10, 13, 14]],
        rim: [[0, 2, 3, 6, 8, 9, 11, 12, 14, 15], [0, 1, 3, 5, 6, 8, 10, 11, 13, 15], [0, 2, 3, 6, 8, 9, 11, 12, 14, 15], [0, 1, 3, 4, 6, 8, 9, 11, 13, 15]],
        crash: [[0], [], [8], []]
      }
    }
  };

  var DEFAULT_PRESET = 'amen';

  function barsToSteps(bars) {
    var steps = new Array(TOTAL_STEPS).fill(false);
    bars.forEach(function (bar, barIndex) {
      bar.forEach(function (x) {
        steps[x + barIndex * STEPS_PER_BAR] = true;
      });
    });
    return steps;
  }

  function presetPattern(key) {
    var bars = PRESETS[key].bars;
    var pat = {};
    TRACKS.forEach(function (t) {
      pat[t.id] = barsToSteps(bars[t.id]);
    });
    return pat;
  }

  function emptyPattern() {
    var pat = {};
    TRACKS.forEach(function (t) {
      pat[t.id] = new Array(TOTAL_STEPS).fill(false);
    });
    return pat;
  }

  var currentPresetKey = DEFAULT_PRESET;
  var pattern = presetPattern(currentPresetKey);
  var cells = {}; // "trackId-step" -> element

  var playBtn = document.getElementById('playBtn');
  var presetSelect = document.getElementById('presetSelect');
  var reloadBtn = document.getElementById('reloadBtn');
  var clearBtn = document.getElementById('clearBtn');
  var tempoInput = document.getElementById('tempo');
  var tempoValue = document.getElementById('tempoValue');
  var volumeInput = document.getElementById('volume');
  var volumeValue = document.getElementById('volumeValue');
  var grid = document.getElementById('grid');

  var CELL_BASE_CLASSES = ['cell', 'aspect-square', 'rounded-sm', 'border', 'transition-colors', 'duration-75', 'touch-manipulation', 'select-none'];
  var CELL_INACTIVE_CLASSES = ['bg-base-200', 'border-base-content/10'];
  var CELL_ACTIVE_CLASSES = ['bg-primary', 'border-primary'];
  var CELL_PLAYHEAD_CLASSES = ['ring-2', 'ring-accent', 'ring-inset'];

  function populatePresetSelect() {
    Object.keys(PRESETS).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = PRESETS[key].label;
      presetSelect.appendChild(opt);
    });
    presetSelect.value = currentPresetKey;
  }

  function buildGrid() {
    for (var bar = 0; bar < BARS; bar++) {
      var barEl = document.createElement('div');
      barEl.className = 'card bg-base-100/40 border border-base-content/10 rounded-box p-2 sm:p-3 overflow-hidden';

      TRACKS.forEach(function (track) {
        var rowEl = document.createElement('div');
        rowEl.className = 'flex items-center gap-1.5 sm:gap-2 py-0.5 min-w-0';

        var labelEl = document.createElement('span');
        labelEl.className = 'w-9 sm:w-12 shrink-0 text-[9px] sm:text-[11px] uppercase tracking-wider text-base-content/50 truncate';
        labelEl.textContent = track.label;
        rowEl.appendChild(labelEl);

        var cellsEl = document.createElement('div');
        cellsEl.className = 'grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5 sm:gap-1 flex-1 min-w-0';

        for (var col = 0; col < STEPS_PER_BAR; col++) {
          var step = bar * STEPS_PER_BAR + col;
          var cellEl = document.createElement('button');
          cellEl.type = 'button';
          cellEl.className = CELL_BASE_CLASSES.concat(CELL_INACTIVE_CLASSES).join(' ');
          if (col % 4 === 0) {
            cellEl.classList.add('ml-px', 'sm:ml-0.5');
          }
          cellEl.setAttribute('aria-label', track.label + ' step ' + (step + 1));
          (function (trackId, stepIndex) {
            cellEl.addEventListener('click', function () {
              pattern[trackId][stepIndex] = !pattern[trackId][stepIndex];
              renderCell(trackId, stepIndex);
            });
          })(track.id, step);
          cellsEl.appendChild(cellEl);
          cells[track.id + '-' + step] = cellEl;
        }

        rowEl.appendChild(cellsEl);
        barEl.appendChild(rowEl);
      });

      grid.appendChild(barEl);
    }
  }

  function renderCell(trackId, step) {
    var el = cells[trackId + '-' + step];
    if (pattern[trackId][step]) {
      el.classList.remove.apply(el.classList, CELL_INACTIVE_CLASSES);
      el.classList.add.apply(el.classList, CELL_ACTIVE_CLASSES);
    } else {
      el.classList.remove.apply(el.classList, CELL_ACTIVE_CLASSES);
      el.classList.add.apply(el.classList, CELL_INACTIVE_CLASSES);
    }
  }

  function renderAll() {
    TRACKS.forEach(function (track) {
      for (var step = 0; step < TOTAL_STEPS; step++) {
        renderCell(track.id, step);
      }
    });
  }

  populatePresetSelect();
  buildGrid();
  renderAll();

  /* ---- audio ---- */

  var audioCtx = null;
  var masterGain = null;
  var rawBuffers = {};
  var buffers = {};
  var soundsReady = fetchAllRaw();

  function fetchAllRaw() {
    return Promise.all(TRACKS.map(function (track) {
      return fetch(track.file)
        .then(function (res) { return res.arrayBuffer(); })
        .then(function (data) { rawBuffers[track.id] = data; })
        .catch(function (err) { console.error('failed to fetch', track.file, err); });
    })).then(function () {
      playBtn.disabled = false;
      playBtn.textContent = 'Play';
    });
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volumeInput.value / 100;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function decodeAll() {
    return Promise.all(TRACKS.map(function (track) {
      if (buffers[track.id] || !rawBuffers[track.id]) {
        return null;
      }
      // decodeAudioData detaches the buffer, so hand it a copy.
      var copy = rawBuffers[track.id].slice(0);
      return audioCtx.decodeAudioData(copy).then(function (buffer) {
        buffers[track.id] = buffer;
      }).catch(function (err) {
        console.error('failed to decode', track.file, err);
      });
    }));
  }

  function playSound(track, time) {
    var buffer = buffers[track.id];
    if (!buffer) {
      return;
    }
    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    var gainNode = audioCtx.createGain();
    gainNode.gain.value = track.gain;
    source.connect(gainNode).connect(masterGain);
    source.start(time);
  }

  /* ---- scheduler (lookahead technique) ---- */

  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD_TIME = 0.1;

  var isPlaying = false;
  var currentStep = 0;
  var nextStepTime = 0;
  var timerId = null;
  var stepsInQueue = [];
  var tempo = parseFloat(tempoInput.value);

  function secondsPerStep() {
    return tempo > 0 ? 60 / tempo : Infinity;
  }

  function scheduleStep(step, time) {
    TRACKS.forEach(function (track) {
      if (pattern[track.id][step]) {
        playSound(track, time);
      }
    });
    stepsInQueue.push({ step: step, time: time });
  }

  function advanceStep() {
    nextStepTime += secondsPerStep();
    currentStep = (currentStep + 1) % TOTAL_STEPS;
  }

  function schedulerTick() {
    while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleStep(currentStep, nextStepTime);
      advanceStep();
    }
    timerId = setTimeout(schedulerTick, LOOKAHEAD_MS);
  }

  var lastDrawnStep = -1;
  var playheadCells = [];

  function clearPlayhead() {
    playheadCells.forEach(function (el) { el.classList.remove.apply(el.classList, CELL_PLAYHEAD_CLASSES); });
    playheadCells = [];
  }

  function drawStep(step) {
    clearPlayhead();
    TRACKS.forEach(function (track) {
      var el = cells[track.id + '-' + step];
      el.classList.add.apply(el.classList, CELL_PLAYHEAD_CLASSES);
      playheadCells.push(el);
    });
  }

  function draw() {
    var drawn = lastDrawnStep;
    var now = audioCtx.currentTime;
    while (stepsInQueue.length && stepsInQueue[0].time < now) {
      drawn = stepsInQueue[0].step;
      stepsInQueue.shift();
    }
    if (drawn !== lastDrawnStep) {
      drawStep(drawn);
      lastDrawnStep = drawn;
    }
    if (isPlaying) {
      requestAnimationFrame(draw);
    }
  }

  function startPlayback() {
    isPlaying = true;
    currentStep = 0;
    stepsInQueue = [];
    lastDrawnStep = -1;
    nextStepTime = audioCtx.currentTime + 0.05;
    schedulerTick();
    requestAnimationFrame(draw);
    playBtn.textContent = 'Stop';
  }

  function stopPlayback() {
    isPlaying = false;
    clearTimeout(timerId);
    clearPlayhead();
    playBtn.textContent = 'Play';
  }

  playBtn.addEventListener('click', function () {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    ensureAudioContext();
    playBtn.disabled = true;
    playBtn.textContent = 'Starting…';

    Promise.all([soundsReady, audioCtx.resume(), decodeAll()]).then(function () {
      playBtn.disabled = false;
      startPlayback();
    });
  });

  presetSelect.addEventListener('change', function () {
    currentPresetKey = presetSelect.value;
    pattern = presetPattern(currentPresetKey);
    renderAll();
  });

  reloadBtn.addEventListener('click', function () {
    pattern = presetPattern(currentPresetKey);
    renderAll();
  });

  clearBtn.addEventListener('click', function () {
    pattern = emptyPattern();
    renderAll();
  });

  tempoInput.addEventListener('input', function () {
    tempo = parseFloat(tempoInput.value);
    tempoValue.textContent = tempoInput.value;
  });

  volumeInput.addEventListener('input', function () {
    volumeValue.textContent = volumeInput.value + '%';
    if (masterGain) {
      masterGain.gain.value = volumeInput.value / 100;
    }
  });
})();
