/* ─── Navbar scroll effect ────────────────────────────────────────────────── */
(function () {
  const nav = document.getElementById('main-nav');
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── Show Wrong Options toggle ─────────────────────────────────────────── */
(function () {
  document.addEventListener('click', function (e) {
    const btn = document.getElementById('btn-show-options');
    const popover = document.getElementById('demo-options-list');
    if (!btn || !popover) return;
    if (btn.contains(e.target)) {
      btn.classList.toggle('open');
      popover.style.display = btn.classList.contains('open') ? 'flex' : 'none';
    } else if (!popover.contains(e.target)) {
      btn.classList.remove('open');
      popover.style.display = 'none';
    }
  });
})();

/* ─── BibTeX copy button ─────────────────────────────────────────────────── */
(function () {
  const btn = document.getElementById('btn-copy-bibtex');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const text = document.getElementById('bibtex-text').textContent;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
    });
  });
})();

/* ─── Leaderboard sorting ────────────────────────────────────────────────── */
(function () {
  const table = document.getElementById('leaderboard-table');
  if (!table) return;

  // Build per-group row arrays; groups are never mixed
  const GROUPS = ['proprietary', 'opensource'];
  const groupRows = {};
  GROUPS.forEach(function (g) {
    groupRows[g] = Array.from(table.querySelectorAll('tr.group-' + g));
  });

  let sortCol = -1;
  let sortAsc = true;

  // Only sortable headers are in the second thead row (they have a sort-icon)
  // plus MCQ Acc which is rowspan=2 in the first row.
  // We bind click to all th that contain a .sort-icon.
  const sortHeaders = Array.from(table.querySelectorAll('thead th .sort-icon'))
    .map(function (ic) { return ic.closest('th'); });

  sortHeaders.forEach(function (th, sortIdx) {
    // colIdx in data rows: sortIdx maps directly (Model=0, MCQ=1, R@0.5=2, ...)
    var colIdx = sortIdx + 1;
    th.addEventListener('click', function () {
      if (sortCol === colIdx) {
        sortAsc = !sortAsc;
      } else {
        sortCol = colIdx;
        sortAsc = false;
      }
      sortHeaders.forEach(function (h) { h.classList.remove('sorted-asc', 'sorted-desc'); });
      th.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc');

      sortHeaders.forEach(function (h) {
        var ic = h.querySelector('.sort-icon');
        if (ic) ic.textContent = '↕';
      });
      var icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = sortAsc ? '↑' : '↓';

      GROUPS.forEach(function (g) {
        const rows = groupRows[g];
        rows.sort(function (a, b) {
          const aVal = parseFloat(a.cells[colIdx].textContent) || 0;
          const bVal = parseFloat(b.cells[colIdx].textContent) || 0;
          return sortAsc ? aVal - bVal : bVal - aVal;
        });
        const groupHeaderRow = table.querySelector('tr.group-header[data-group="' + g + '"]');
        let insertAfter = groupHeaderRow;
        rows.forEach(function (row) {
          insertAfter.insertAdjacentElement('afterend', row);
          insertAfter = row;
        });
      });

      highlightBest(colIdx);
    });
  });

  function highlightBest(colIdx) {
    // Clear all existing "best" in this column
    table.querySelectorAll('td.best').forEach(function (td) { td.classList.remove('best'); });

    // Find the th with sort-icon at this colIdx (sortHeaders[colIdx-1])
    const isLower = (sortHeaders[colIdx - 1] || {textContent: ''}).textContent.includes('↓');

    GROUPS.forEach(function (g) {
      const rows = groupRows[g];
      let bestVal = isLower ? Infinity : -Infinity;
      let bestCell = null;
      rows.forEach(function (row) {
        const val = parseFloat(row.cells[colIdx].textContent);
        if (isNaN(val)) return;
        if ((!isLower && val > bestVal) || (isLower && val < bestVal)) {
          bestVal = val;
          bestCell = row.cells[colIdx];
        }
      });
      if (bestCell) bestCell.classList.add('best');
    });
  }
})();

/* ─── Dataset Samples Demo ───────────────────────────────────────────────── */
(function () {
  const SAMPLE_FILES = window.CAST_SAMPLES || [];

  if (!SAMPLE_FILES.length) {
    const container = document.getElementById('demo-container');
    if (container) {
      container.innerHTML = '<p class="text-center text-muted py-5">Sample videos will be available soon.</p>';
    }
    return;
  }

  if (window.CAST_DEBUG) {
    document.getElementById('demo-container').classList.add('cast-debug');
  }

  let currentIndex = 0;

  const videoEl      = document.getElementById('demo-video');
  const qtypeBadge   = document.getElementById('demo-qtype');
  const questionEl   = document.getElementById('demo-question');
  const answerEl     = document.getElementById('demo-answer');
  const evidenceList = document.getElementById('demo-evidence-list');
  const optionsList  = document.getElementById('demo-options-list');
  const strip        = document.getElementById('demo-strip');
  const debugLabel   = document.getElementById('demo-debug-label');

  const QTYPE_LABELS = {
    CE: 'Causal Explanation',
    CR: 'Counterfactual Reasoning',
    PA: 'Predictive Anticipation',
    ID: 'Inferential Description',
  };

  const QTYPE_COLORS = { CE: '#3a7ab8', CR: '#c06818', PA: '#1e8c4e', ID: '#7a34a8' };

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Thumbnail strip ────────────────────────────────────────────────────────
  var thumbEls = [];

  function buildStrip() {
    strip.innerHTML = '';
    thumbEls = [];
    SAMPLE_FILES.forEach(function (file, idx) {
      var stem = file.replace(/^videos\//, '').replace(/\.json$/, '');
      var wrapper = document.createElement('div');
      wrapper.className = 'strip-thumb' + (idx === 0 ? ' active' : '');
      wrapper.title = stem;

      var img = document.createElement('img');
      img.src = 'videos/' + stem + '_thumb.jpg';
      img.alt = stem;
      img.draggable = false;

      var label = document.createElement('div');
      label.className = 'strip-thumb-label';
      label.textContent = stem;

      wrapper.appendChild(img);
      wrapper.appendChild(label);
      wrapper.addEventListener('click', function () { loadSample(idx, true); });
      strip.appendChild(wrapper);
      thumbEls.push(wrapper);
    });
  }

  function setActiveThumb(idx, scroll) {
    thumbEls.forEach(function (el, i) {
      el.classList.toggle('active', i === idx);
    });
    if (scroll && thumbEls[idx]) {
      thumbEls[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ── Load & render ──────────────────────────────────────────────────────────
  function loadSample(idx, scroll) {
    var btn = document.getElementById('btn-show-options');
    var pop = document.getElementById('demo-options-list');
    if (btn) btn.classList.remove('open');
    if (pop) pop.style.display = 'none';

    fetch(SAMPLE_FILES[idx])
      .then(function (r) { return r.json(); })
      .then(function (data) {
        currentIndex = idx;
        setActiveThumb(idx, scroll);
        renderSample(data);
      })
      .catch(function (err) { console.error('Failed to load sample:', SAMPLE_FILES[idx], err); });
  }

  function renderSample(data) {
    videoEl.src = 'videos/' + data.video_file;
    videoEl.load();
    videoEl.pause();
    if (debugLabel) debugLabel.textContent = SAMPLE_FILES[currentIndex].replace(/^videos\//, '').replace(/\.json$/, '');

    const code = data.question_type;
    qtypeBadge.textContent = QTYPE_LABELS[code] || code;
    qtypeBadge.className = 'qtype-badge qtype-' + code;

    questionEl.textContent = data.question;
    answerEl.textContent = data.answer;

    optionsList.innerHTML = '';
    data.options.forEach(function (opt) {
      const div = document.createElement('div');
      div.className = 'option-item option-wrong';
      div.textContent = opt.text;
      optionsList.appendChild(div);
    });

    evidenceList.innerHTML = '';
    data.evidences.forEach(function (ev) {
      const item = document.createElement('div');
      item.className = 'evidence-item';

      let bboxLine = '';
      if (ev.bboxes && Object.keys(ev.bboxes).length) {
        const parts = Object.keys(ev.bboxes).map(function (sec) {
          const mm = String(Math.floor(parseInt(sec) / 60)).padStart(2, '0');
          const ss = String(parseInt(sec) % 60).padStart(2, '0');
          return mm + ':' + ss + ': ' + ev.bboxes[sec];
        });
        bboxLine = '<div class="ev-bbox-line">' + escHtml(parts.join(', ')) + '</div>';
      }

      item.innerHTML =
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
            '<span class="ev-pill" style="background:' + ev.instance_color + '">' + escHtml(ev.instance_label) + '</span>' +
            '<span class="ev-time">' + formatTime(ev.start_time) + '&ndash;' + formatTime(ev.end_time) + '</span>' +
          '</div>' +
          '<div class="ev-rationale">' + escHtml(ev.rationale) + '</div>' +
          bboxLine +
        '</div>';

      item.addEventListener('click', function () {
        videoEl.currentTime = ev.start_time;
        videoEl.pause();
      });
      evidenceList.appendChild(item);
    });
  }

  buildStrip();
  loadSample(0);
})();
