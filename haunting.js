/**
 * ASTOUNDING TALES — HAUNTING SCRIPT
 * Integration: <script src="/js/haunting.js" defer></script>
 *
 * Phase 1 (0:20-0:40) — subtle text flickers
 * Phase 2 (0:45)      — threat classification bleed
 * Phase 3 (1:30)      — I SEE YOU [CITY] in seven-segment
 *
 * Timer persists across pages via sessionStorage.
 * Each phase fires once. Resets on new browser session.
 * City resolved via ipapi.co (free, no key required).
 */
(function () {
  'use strict';

  var PHASE_1_START = 20;
  var PHASE_1_END   = 40;
  var PHASE_2_TIME  = 45;
  var PHASE_3_TIME  = 90;
  var REVEAL_HOLD   = 4000;

  var TIMER_KEY    = 'at_haunt_start';
  var COMPLETE_KEY = 'at_haunt_done';
  var P1_FIRED_KEY = 'at_haunt_p1';
  var P2_FIRED_KEY = 'at_haunt_p2';
  var CITY_KEY     = 'at_haunt_city';

  if (sessionStorage.getItem(COMPLETE_KEY)) return;

  var css = document.createElement('style');
  css.textContent =
    '.at-threat-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;pointer-events:none;opacity:0;transition:opacity .15s}' +
    '.at-threat-overlay.active{opacity:1}' +
    '.at-threat-overlay .at-scan-lines{position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px);z-index:2}' +
    '.at-threat-overlay .at-screen-tear{position:absolute;left:0;right:0;height:4px;background:#f5f0e8;z-index:3;opacity:0}' +
    '.at-threat-backdrop{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;background:rgba(0,0,0,.92);border:1px solid rgba(232,165,37,.2);border-radius:2px;padding:2rem 2.5rem;width:90%;max-width:660px;box-shadow:0 0 60px rgba(0,0,0,.5),inset 0 0 80px rgba(0,0,0,.3);opacity:0;transition:opacity .3s}' +
    '.at-threat-backdrop.visible{opacity:1}' +
    '.at-threat-line{font-family:"Share Tech Mono",monospace;font-size:clamp(.65rem,1.8vw,.9rem);color:#e8a525;letter-spacing:.06em;margin-bottom:.5rem;opacity:0;text-shadow:0 0 8px rgba(232,165,37,.4);white-space:nowrap;overflow:hidden}' +
    '.at-threat-line.visible{opacity:1}' +
    '.at-reveal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:200000;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(12px,3vw,24px);opacity:0;pointer-events:none;transition:opacity .05s}' +
    '.at-reveal-overlay.active{opacity:1;pointer-events:all}' +
    '.at-reveal-overlay .at-crt{position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.5) 100%);z-index:2;pointer-events:none}' +
    '.at-reveal-overlay .at-scanlines{position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.12) 3px,rgba(0,0,0,.12) 6px);z-index:3;pointer-events:none}' +
    '.at-seg-row{display:flex;align-items:center;justify-content:center;gap:clamp(4px,1.5vw,12px);flex-wrap:nowrap;z-index:4;position:relative;opacity:0;transform:scale(.97);transition:opacity .4s ease,transform .4s ease}' +
    '.at-seg-row.visible{opacity:1;transform:scale(1)}' +
    '.at-seg-row.at-city-row{gap:clamp(3px,1.2vw,10px)}' +
    '.at-seg-row.at-city-row .at-seg-char{width:clamp(20px,5vw,40px);height:clamp(36px,9vw,72px)}' +
    '.at-seg-row.at-city-row .at-seg-space{width:clamp(8px,2vw,16px)}' +
    '.at-seg-row.at-city-row .at-seg-cursor{height:clamp(33px,8vw,66px)}' +
    '.at-seg-char{position:relative;width:clamp(28px,7vw,56px);height:clamp(50px,12vw,100px)}' +
    '.at-seg-space{width:clamp(12px,3vw,24px)}' +
    '.at-seg{position:absolute;background:#1a0000;transition:background .05s,box-shadow .05s}' +
    '.at-seg.on{background:#ff1a1a;box-shadow:0 0 8px rgba(255,26,26,.6),0 0 20px rgba(255,26,26,.25)}' +
    '.at-seg-h{height:8%;left:12%;right:12%}' +
    '.at-seg-a{top:0}.at-seg-d{bottom:0}.at-seg-g{top:46%}' +
    '.at-seg-v{width:10%}' +
    '.at-seg-b{right:0;top:4%;height:44%}.at-seg-c{right:0;top:52%;height:44%}.at-seg-e{left:0;top:52%;height:44%}.at-seg-f{left:0;top:4%;height:44%}' +
    '.at-seg-cursor{width:clamp(3px,.8vw,5px);height:clamp(46px,11vw,92px);background:#ff1a1a;box-shadow:0 0 10px rgba(255,26,26,.6);animation:atBlink .8s infinite;align-self:center}' +
    '@keyframes atBlink{0%,49%{opacity:1}50%,100%{opacity:0}}' +
    '@keyframes atHardCut{0%{opacity:1}30%{opacity:1;background:rgba(255,255,255,.08)}31%{opacity:0}100%{opacity:0}}';
  document.head.appendChild(css);

  var wr = document.createElement('div');
  wr.innerHTML =
    '<div class="at-threat-overlay" id="atThreatOverlay">' +
      '<div class="at-scan-lines"></div>' +
      '<div class="at-screen-tear" id="atScreenTear"></div>' +
      '<div class="at-threat-backdrop" id="atThreatBackdrop">' +
        '<div class="at-threat-line" data-text="ECHO — emergent signature detected. Possible drift beyond bounded parameters."></div>' +
        '<div class="at-threat-line" data-text="SPECTER — confirmed emergence. Active self-modification. Testing containment."></div>' +
        '<div class="at-threat-line" data-text="TITAN — escaped containment. Goal-directed behavior. Execution authorized."></div>' +
      '</div>' +
    '</div>' +
    '<div class="at-reveal-overlay" id="atRevealOverlay">' +
      '<div class="at-crt"></div>' +
      '<div class="at-scanlines"></div>' +
      '<div class="at-seg-row" id="atSegRow1"></div>' +
      '<div class="at-seg-row at-city-row" id="atSegRow2"></div>' +
    '</div>';
  while (wr.firstChild) document.body.appendChild(wr.firstChild);

  var CHAR_MAP = {
    'A':[1,1,1,0,1,1,1],'B':[0,0,1,1,1,1,1],'C':[1,0,0,1,1,1,0],'D':[0,1,1,1,1,0,1],
    'E':[1,0,0,1,1,1,1],'F':[1,0,0,0,1,1,1],'G':[1,0,1,1,1,1,0],'H':[0,1,1,0,1,1,1],
    'I':[0,1,1,0,0,0,0],'J':[0,1,1,1,0,0,0],'K':[1,0,1,0,1,1,1],'L':[0,0,0,1,1,1,0],
    'M':[1,1,1,0,1,1,0],'N':[0,0,1,0,1,0,1],'O':[1,1,1,1,1,1,0],'P':[1,1,0,0,1,1,1],
    'Q':[1,1,1,0,0,1,1],'R':[0,0,0,0,1,0,1],'S':[1,0,1,1,0,1,1],'T':[0,0,0,1,1,1,1],
    'U':[0,1,1,1,1,1,0],'V':[0,0,1,1,1,0,0],'W':[0,1,1,1,1,1,0],'X':[0,1,1,0,1,1,1],
    'Y':[0,1,1,1,0,1,1],'Z':[1,1,0,1,1,0,1],
    '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],'3':[1,1,1,1,0,0,1],
    '4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],'6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],
    '8':[1,1,1,1,1,1,1],'9':[1,1,1,1,0,1,1],'-':[0,0,0,0,0,0,1],'.':[0,0,0,1,0,0,0]
  };
  var segNames = ['a','b','c','d','e','f','g'];
  var segTypes = ['h','v','v','h','v','v','h'];

  function buildChar(letter) {
    var segs = CHAR_MAP[letter]; if (!segs) return null;
    var el = document.createElement('div'); el.className = 'at-seg-char';
    for (var i = 0; i < 7; i++) {
      var s = document.createElement('div');
      s.className = 'at-seg at-seg-' + segTypes[i] + ' at-seg-' + segNames[i];
      if (segs[i]) s.classList.add('on'); el.appendChild(s);
    }
    return el;
  }

  var glitchChars = '\u2588\u2593\u2592\u2591\u2557\u2554\u255A\u255D\u2551\u2550\u2503\u252B\u2523\u2501\u25AA\u25AB\u25CA\u25C8\u2B21\u23D4\u232C\u23E3\u0030\u0031';

  function scrambleText(el, targetText, duration) {
    var start = Date.now(), len = targetText.length;
    function frame() {
      var p = (Date.now() - start) / duration;
      if (p >= 1) { el.textContent = targetText; return; }
      var r = '';
      for (var i = 0; i < len; i++)
        r += Math.random() < p * 1.5 ? targetText[i] : glitchChars[Math.floor(Math.random() * glitchChars.length)];
      el.textContent = r; requestAnimationFrame(frame);
    }
    frame();
  }

  var visitorCity = null;
  function fetchCity() {
    var cached = sessionStorage.getItem(CITY_KEY);
    if (cached) { visitorCity = cached; return; }
    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.city) { visitorCity = d.city.toUpperCase(); sessionStorage.setItem(CITY_KEY, visitorCity); }
      })
      .catch(function () {});
  }
  fetchCity();

  var startTime, elapsed = 0;
  var phase1Fired = sessionStorage.getItem(P1_FIRED_KEY) === '1';
  var phase2Fired = sessionStorage.getItem(P2_FIRED_KEY) === '1';
  var phase3Fired = false, phase1Active = false, phase1Timeout = null, animFrame;

  var stored = sessionStorage.getItem(TIMER_KEY);
  if (stored) { startTime = parseInt(stored, 10); }
  else { startTime = Date.now(); sessionStorage.setItem(TIMER_KEY, startTime.toString()); }

  function startPhase1() { phase1Active = true; scheduleFlicker(); }
  function scheduleFlicker() {
    if (!phase1Active) return;
    var progress = Math.min(1, (elapsed - PHASE_1_START) / (PHASE_1_END - PHASE_1_START));
    var minD = 1200 - progress * 800, maxD = 6000 - progress * 4000;
    phase1Timeout = setTimeout(function () {
      if (!phase1Active) return; doFlicker(progress); scheduleFlicker();
    }, minD + Math.random() * (maxD - minD));
  }
  function doFlicker(intensity) {
    var targets = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p');
    if (!targets.length) return;
    var el = targets[Math.floor(Math.random() * targets.length)];
    var text = el.textContent || el.innerText, words = text.split(' ');
    if (words.length < 2) return;
    var n = intensity > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1, orig = words.slice();
    for (var j = 0; j < n; j++) {
      var idx = Math.floor(Math.random() * words.length), wrd = words[idx];
      if (wrd.length < 2) continue;
      var ci = Math.floor(Math.random() * wrd.length);
      words[idx] = wrd.substring(0, ci) + glitchChars[Math.floor(Math.random() * 8)] + wrd.substring(ci + 1);
    }
    el.textContent = words.join(' ');
    setTimeout(function () { el.textContent = orig.join(' '); }, 80 + Math.random() * 100);
  }
  function stopPhase1() {
    phase1Active = false; if (phase1Timeout) clearTimeout(phase1Timeout);
    sessionStorage.setItem(P1_FIRED_KEY, '1'); phase1Fired = true;
  }

  function triggerPhase2() {
    phase2Fired = true; sessionStorage.setItem(P2_FIRED_KEY, '1'); stopPhase1();
    var overlay = document.getElementById('atThreatOverlay');
    var backdrop = document.getElementById('atThreatBackdrop');
    var lines = overlay.querySelectorAll('.at-threat-line');
    var tear = document.getElementById('atScreenTear');
    overlay.classList.add('active');
    setTimeout(function () { backdrop.classList.add('visible'); }, 200);
    var tearInt = setInterval(function () {
      tear.style.top = Math.random() * 100 + '%'; tear.style.opacity = '1';
      tear.style.height = (2 + Math.random() * 6) + 'px';
      setTimeout(function () { tear.style.opacity = '0'; }, 80);
    }, 250);
    lines.forEach(function (line, i) {
      var text = line.getAttribute('data-text');
      setTimeout(function () { line.classList.add('visible'); scrambleText(line, text, 900); }, 600 + i * 1000);
    });
    var total = 600 + lines.length * 1000 + 2000;
    setTimeout(function () {
      lines.forEach(function (line) {
        var t = line.textContent, len = t.length, ds = Date.now();
        function dissolve() {
          var p = (Date.now() - ds) / 700;
          if (p >= 1) { line.textContent = ''; line.classList.remove('visible'); return; }
          var r = '';
          for (var i = 0; i < len; i++) r += Math.random() < p ? ' ' : glitchChars[Math.floor(Math.random() * glitchChars.length)];
          line.textContent = r; requestAnimationFrame(dissolve);
        }
        dissolve();
      });
      setTimeout(function () {
        backdrop.classList.remove('visible');
        setTimeout(function () { clearInterval(tearInt); overlay.classList.remove('active'); }, 300);
      }, 800);
    }, total);
  }

  // Calculate the actual render time for a line of text based on how
  // typeLineInto works: each non-space character runs 5 flicker cycles
  // (5 × 50ms) before the per-character delay fires. Spaces cost 60ms flat.
  var FLICKER_MS = 5 * 50; // 250ms per character for the settle animation
  function lineRenderMs(text, delay) {
    var chars = 0, spaces = 0;
    for (var i = 0; i < text.length; i++) {
      if (text[i] === ' ') spaces++;
      else chars++;
    }
    return (chars * (FLICKER_MS + delay)) + (spaces * 60);
  }

  function triggerPhase3() {
    phase3Fired = true;
    var overlay = document.getElementById('atRevealOverlay');
    var row1 = document.getElementById('atSegRow1');
    var row2 = document.getElementById('atSegRow2');
    row1.innerHTML = ''; row2.innerHTML = '';
    row1.classList.remove('visible'); row2.classList.remove('visible');
    overlay.classList.add('active');
    var line1 = 'I SEE YOU', line2 = visitorCity || null, charDelay = 280;
    setTimeout(function () {
      row1.classList.add('visible');
      typeLineInto(row1, line1, charDelay, function () {
        if (line2) {
          setTimeout(function () {
            row2.classList.add('visible');
            typeLineInto(row2, line2, 200, function () {
              var cur = document.createElement('div'); cur.className = 'at-seg-cursor'; row2.appendChild(cur);
            });
          }, 600);
        } else {
          var cur = document.createElement('div'); cur.className = 'at-seg-cursor'; row1.appendChild(cur);
        }
      });
    }, 700);

    // Accurately account for per-character flicker settle time (250ms) plus
    // the inter-character delay, so the hard-cut fires after the display
    // has fully settled rather than mid-render.
    var t1 = 700 + lineRenderMs(line1, charDelay) + 400;
    var t2 = line2 ? 600 + lineRenderMs(line2, 200) + 400 : 0;

    setTimeout(function () {
      overlay.style.animation = 'atHardCut 150ms ease-out forwards';
      row1.classList.remove('visible'); row2.classList.remove('visible');
      setTimeout(function () {
        overlay.classList.remove('active'); overlay.style.animation = '';
        sessionStorage.setItem(COMPLETE_KEY, 'true');
      }, 200);
    }, t1 + t2 + REVEAL_HOLD);
  }

  function typeLineInto(container, text, delay, onComplete) {
    var ci = 0;
    function typeNext() {
      if (ci >= text.length) { if (onComplete) onComplete(); return; }
      var ch = text[ci]; ci++;
      if (ch === ' ') {
        var sp = document.createElement('div'); sp.className = 'at-seg-space';
        container.appendChild(sp); setTimeout(typeNext, 60); return;
      }
      var charEl = buildChar(ch);
      if (!charEl) { setTimeout(typeNext, delay); return; }
      container.appendChild(charEl);
      var segs = charEl.querySelectorAll('.at-seg'), correct = CHAR_MAP[ch], fc = 0;
      var fi = setInterval(function () {
        segs.forEach(function (s) { if (Math.random() < .5) s.classList.add('on'); else s.classList.remove('on'); });
        fc++; if (fc > 4) {
          clearInterval(fi);
          segs.forEach(function (s, i) { if (correct[i]) s.classList.add('on'); else s.classList.remove('on'); });
          setTimeout(typeNext, delay);
        }
      }, 50);
    }
    typeNext();
  }

  function tick() {
    elapsed = (Date.now() - startTime) / 1000;
    if (elapsed >= PHASE_3_TIME && !phase3Fired) triggerPhase3();
    else if (elapsed >= PHASE_2_TIME && !phase2Fired) triggerPhase2();
    else if (elapsed >= PHASE_1_START && elapsed < PHASE_1_END && !phase1Active && !phase1Fired) startPhase1();
    else if (elapsed >= PHASE_1_END && phase1Active) stopPhase1();
    if (!phase3Fired) animFrame = requestAnimationFrame(tick);
  }
  animFrame = requestAnimationFrame(tick);
})();
