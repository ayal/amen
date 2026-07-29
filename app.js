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

  // The original "Load Amen" pattern: per-bar step lists for each track.
  var AMEN_BARS = {
    snare: [[4, 7, 9, 12, 15], [4, 7, 9, 12, 15], [4, 7, 9, 14], [1, 4, 7, 9, 14]],
    bass: [[0, 2, 10, 11], [0, 2, 10, 11], [0, 2, 10], [2, 3, 10]],
    rim: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14]],
    crash: [[], [], [], []]
  };

  function barsToSteps(bars) {
    var steps = new Array(TOTAL_STEPS).fill(false);
    bars.forEach(function (bar, barIndex) {
      bar.forEach(function (x) {
        steps[x + barIndex * STEPS_PER_BAR] = true;
      });
    });
    return steps;
  }

  function amenPattern() {
    var pattern = {};
    TRACKS.forEach(function (t) {
      pattern[t.id] = barsToSteps(AMEN_BARS[t.id]);
    });
    return pattern;
  }

  function emptyPattern() {
    var pattern = {};
    TRACKS.forEach(function (t) {
      pattern[t.id] = new Array(TOTAL_STEPS).fill(false);
    });
    return pattern;
  }

  var pattern = amenPattern();
  var cells = {}; // "trackId-step" -> element

  var playBtn = document.getElementById('playBtn');
  var loadAmenBtn = document.getElementById('loadAmenBtn');
  var clearBtn = document.getElementById('clearBtn');
  var tempoInput = document.getElementById('tempo');
  var tempoValue = document.getElementById('tempoValue');
  var volumeInput = document.getElementById('volume');
  var volumeValue = document.getElementById('volumeValue');
  var grid = document.getElementById('grid');

  function buildGrid() {
    for (var bar = 0; bar < BARS; bar++) {
      var barEl = document.createElement('div');
      barEl.className = 'bar';

      TRACKS.forEach(function (track) {
        var rowEl = document.createElement('div');
        rowEl.className = 'bar__row';

        var labelEl = document.createElement('span');
        labelEl.className = 'bar__label';
        labelEl.textContent = track.label;
        rowEl.appendChild(labelEl);

        var cellsEl = document.createElement('div');
        cellsEl.className = 'bar__cells';

        for (var col = 0; col < STEPS_PER_BAR; col++) {
          var step = bar * STEPS_PER_BAR + col;
          var cellEl = document.createElement('button');
          cellEl.type = 'button';
          cellEl.className = 'cell';
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
      el.classList.add('is-active');
    } else {
      el.classList.remove('is-active');
    }
  }

  function renderAll() {
    TRACKS.forEach(function (track) {
      for (var step = 0; step < TOTAL_STEPS; step++) {
        renderCell(track.id, step);
      }
    });
  }

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
    playheadCells.forEach(function (el) { el.classList.remove('is-playhead'); });
    playheadCells = [];
  }

  function drawStep(step) {
    clearPlayhead();
    TRACKS.forEach(function (track) {
      var el = cells[track.id + '-' + step];
      el.classList.add('is-playhead');
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

  loadAmenBtn.addEventListener('click', function () {
    pattern = amenPattern();
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
