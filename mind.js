// ── OIKOS v2 · mind.js ───────────────────────

const Mind = {
  _tab: 'focus',
  _breathActive: false,
  _breathTimer: null,
  _breathPhaseIdx: 0,
  _breathCount: 0,
  _jarAnim: null,
  _jarParticles: [],
  _currentRevealId: null,
  _journalMood: '',
  _ventTags: [],

  init() { this.render(); },

  switchTab(tab) {
    this._tab = tab;
    document.querySelectorAll('#page-mind .tab').forEach((t, i) =>
      t.classList.toggle('active', ['focus','journal','vault'][i] === tab));
    if (this._jarAnim) { cancelAnimationFrame(this._jarAnim); this._jarAnim = null; }
    if (!this._breathActive) clearTimeout(this._breathTimer);
    this.render();
  },

  render() {
    const el = document.getElementById('mind-content'); if (!el) return;
    if (this._tab === 'focus')   this._renderFocus(el);
    if (this._tab === 'journal') this._renderJournal(el);
    if (this._tab === 'vault')   this._renderVault(el);
  },

  // ── FOCUS ──────────────────────────────────
  _renderFocus(el) {
    el.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="card-title" style="text-align:center">Breath Pacer</div>
        <div class="breath-container">
          <div class="breath-svg-wrap" id="breath-wrap" onclick="Mind.toggleBreath()">
            <svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
              <circle cx="85" cy="85" r="78" fill="none" stroke="var(--border)" stroke-width="1.5"/>
              <circle cx="85" cy="85" r="60" fill="var(--bg-3)" stroke="var(--border-s)" stroke-width="1"/>
              <circle id="breath-glow" cx="85" cy="85" r="60" fill="radial-gradient(circle,var(--green-s),transparent)" opacity="0.4"/>
              <circle id="breath-arc" cx="85" cy="85" r="78"
                fill="none" stroke="var(--green)" stroke-width="3"
                stroke-dasharray="490" stroke-dashoffset="490"
                stroke-linecap="round"
                transform="rotate(-90 85 85)"
                style="transition:stroke-dashoffset 0.5s linear,stroke 0.5s"/>
            </svg>
            <div class="breath-inner">
              <div class="breath-word" id="breath-word">TAP</div>
              <div class="breath-count" id="breath-count"></div>
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--txt-3);margin-top:4px">4s inhale · 4s hold · 6s exhale</div>
        <div style="font-size:11px;color:var(--txt-3)">Use before a large purchase to pause and reflect</div>
      </div>

      <div class="card">
        <div class="card-title">Stone Drop</div>
        <div style="font-size:12px;color:var(--txt-2);margin-bottom:8px">Tap the water — ritual close after a wasteful entry</div>
        <div class="stone-area" id="stone-area" onclick="Mind.dropStone(event)">
          <svg style="position:absolute;inset:0;width:100%;height:100%" id="ripple-svg"></svg>
          <div class="stone-hint" id="stone-hint">tap the water</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Focus Jar</div>
        <div style="font-size:12px;color:var(--txt-2);margin-bottom:8px">Tap to shake — watch your thoughts settle</div>
        <div class="jar-wrap" onclick="Mind.shakeJar()">
          <canvas id="jarCanvas"></canvas>
        </div>
        <div style="font-size:11px;color:var(--txt-3);text-align:center">No scores. No streaks. Just settle.</div>
      </div>`;
    this._initJar();
  },

  // Breath pacer
  toggleBreath() {
    this._breathActive = !this._breathActive;
    if (this._breathActive) { this._breathPhaseIdx = 0; this._breathCount = 0; this._runBreath(); }
    else {
      clearTimeout(this._breathTimer);
      document.getElementById('breath-word').textContent  = 'TAP';
      document.getElementById('breath-count').textContent = '';
      this._setArc(0, 'var(--green)');
    }
  },

  _phases: [
    { word: 'Inhale', dur: 4000, color: 'var(--green)',  arcEnd: 490 },
    { word: 'Hold',   dur: 4000, color: 'var(--amber)',  arcEnd: 490 },
    { word: 'Exhale', dur: 6000, color: 'var(--blue)',   arcEnd: 0   }
  ],

  _runBreath() {
    if (!this._breathActive) return;
    const phase = this._phases[this._breathPhaseIdx % 3];
    document.getElementById('breath-word').textContent = phase.word;
    this._setArc(phase.arcEnd, phase.color);
    // Countdown
    let secs = Math.round(phase.dur / 1000);
    document.getElementById('breath-count').textContent = secs;
    const tick = setInterval(() => {
      secs--;
      const el = document.getElementById('breath-count');
      if (el) el.textContent = secs > 0 ? secs : '';
    }, 1000);
    this._breathTimer = setTimeout(() => {
      clearInterval(tick);
      this._breathPhaseIdx++;
      this._runBreath();
    }, phase.dur);
  },

  _setArc(offset, color) {
    const arc = document.getElementById('breath-arc'); if (!arc) return;
    arc.style.strokeDashoffset = 490 - offset;
    arc.style.stroke = color;
  },

  // Stone drop
  dropStone(e) {
    const area = document.getElementById('stone-area');
    const svg  = document.getElementById('ripple-svg');
    const hint = document.getElementById('stone-hint');
    if (!area || !svg) return;
    if (hint) hint.style.opacity = '0';
    const rect = area.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0);
        c.setAttribute('fill', 'none'); c.setAttribute('stroke', 'rgba(46,168,79,0.5)'); c.setAttribute('stroke-width', '1.5');
        svg.appendChild(c);
        let r = 0, op = 0.7;
        const anim = setInterval(() => {
          r += 2.5; op -= 0.013;
          c.setAttribute('r', r); c.setAttribute('stroke-opacity', Math.max(0, op));
          if (op <= 0) { clearInterval(anim); try { svg.removeChild(c); } catch(_){} }
        }, 16);
      }, i * 200);
    }
    setTimeout(() => { if (hint) hint.style.opacity = '1'; }, 3500);
  },

  // Focus jar
  _initJar() {
    const canvas = document.getElementById('jarCanvas'); if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this._jarParticles = Array.from({ length: 38 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 2.5 + 1.5,
      hue: 120 + Math.random() * 80
    }));
    this._animJar(canvas.getContext('2d'), canvas);
  },

  _animJar(ctx, canvas) {
    if (!document.getElementById('jarCanvas')) { cancelAnimationFrame(this._jarAnim); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._jarParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vx *= .99; p.vy *= .99;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},60%,55%,0.7)`; ctx.fill();
    });
    this._jarAnim = requestAnimationFrame(() => this._animJar(ctx, canvas));
  },

  shakeJar() {
    this._jarParticles.forEach(p => { p.vx = (Math.random() - .5) * 9; p.vy = (Math.random() - .5) * 9; });
    U.toast('Watch them settle… 🫙');
  },

  // ── JOURNAL ────────────────────────────────
  _renderJournal(el) {
    this._journalMood = '';
    const today = U.today();
    const todayEntry = DB.data.journal.find(j => j.date === today);
    const entries = [...DB.data.journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

    el.innerHTML = `
      <div class="card">
        <div class="card-title">Journal Entry</div>
        <div class="field">
          <div class="field-label">Date</div>
          <input type="date" id="journal-date" value="${today}" max="${today}" style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-m);padding:9px 12px;width:100%;font-size:13px;color:var(--txt)"/>
        </div>
        <div class="mood-row" id="jmood-row">
          ${['😊','😐','😩','😤','😰','🥳'].map(m =>
            `<button class="mood-btn ${todayEntry?.mood === m ? 'on' : ''}" data-mood="${m}" onclick="Mind.setJournalMood(this)">${m}</button>`
          ).join('')}
        </div>
        <div class="field">
          <textarea id="journal-text" style="min-height:90px" placeholder="How was your day? What's on your mind? Even 2–3 sentences helps the AI understand your patterns…">${todayEntry?.text || ''}</textarea>
        </div>
        <button class="btn btn-g" style="font-size:13px" onclick="Mind.saveJournal()">Save Entry</button>
      </div>

      <div class="card">
        <div class="card-title">Past Entries</div>
        ${entries.length ? entries.map(j => `
          <div class="act-item" onclick="Mind.editJournal('${j.date}')">
            <div style="font-size:20px;flex-shrink:0">${j.mood || '📓'}</div>
            <div class="act-det">
              <div style="font-size:12px;line-height:1.5;color:var(--txt);white-space:normal">${j.text}</div>
              <div class="act-meta">${U.fmtDate(j.date)}</div>
            </div>
          </div>`).join('')
        : '<div class="empty"><div class="empty-txt">No journal entries yet</div></div>'}
      </div>`;

    if (todayEntry) this._journalMood = todayEntry.mood || '';
  },

  setJournalMood(btn) {
    document.querySelectorAll('#jmood-row .mood-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    this._journalMood = btn.dataset.mood;
  },

  saveJournal() {
    const text = document.getElementById('journal-text')?.value.trim();
    const date = document.getElementById('journal-date')?.value || U.today();
    if (!text) { U.toast('Write something first'); return; }
    const idx = DB.data.journal.findIndex(j => j.date === date);
    const entry = { id: U.uid(), date, text, mood: this._journalMood, createdAt: new Date().toISOString() };
    if (idx >= 0) DB.data.journal[idx] = entry; else DB.data.journal.push(entry);
    DB.save();
    U.toast('📓 Journal saved');
    this._renderJournal(document.getElementById('mind-content'));
  },

  editJournal(date) {
    const el = document.getElementById('journal-date'); if (el) el.value = date;
    const entry = DB.data.journal.find(j => j.date === date);
    if (entry) {
      const txt = document.getElementById('journal-text'); if (txt) txt.value = entry.text;
      this._journalMood = entry.mood || '';
      document.querySelectorAll('#jmood-row .mood-btn').forEach(b =>
        b.classList.toggle('on', b.dataset.mood === this._journalMood));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ── VAULT ──────────────────────────────────
  _renderVault(el) {
    const now  = new Date();
    const due  = DB.data.vents.filter(v => v.sealed && !v.resolution && new Date(v.revealDate) <= now);
    const sealed   = DB.data.vents.filter(v => v.sealed && !v.resolution && new Date(v.revealDate) > now);
    const resolved = DB.data.vents.filter(v => v.resolution);

    el.innerHTML = `
      <button class="btn btn-ghost" style="margin-bottom:10px;font-size:13px;border-color:var(--amber-g);color:var(--amber)" onclick="Mind.openVent()">😤 Write to the Vault</button>

      ${due.length ? `<div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">🔓 Ready to Open</div>
      ${due.map(v => `<div class="vault-card" style="border-color:var(--green-g);cursor:pointer" onclick="Mind.openReveal('${v.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--green);font-weight:600">🔓 Tap to reveal</span>
          <span style="font-size:11px;color:var(--txt-2)">${U.fmtDate(v.date)}</span>
        </div>
        <div style="font-size:12px;color:var(--txt-2);margin-top:4px">Intensity: ${'●'.repeat(v.intensity || 3)} · ${(v.tags || []).join(', ')}</div>
      </div>`).join('')}` : ''}

      ${sealed.length ? `<div style="font-size:10px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.1em;margin:${due.length ? '12px' : '0'} 0 8px">🔒 Sealed</div>
      ${sealed.map(v => { const days = Math.ceil((new Date(v.revealDate) - now) / 864e5); return `<div class="vault-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--amber);font-family:var(--fm)">Opens in ${days} day${days !== 1 ? 's' : ''}</span>
          <span style="font-size:11px;color:var(--txt-2)">${U.fmtDate(v.date)}</span>
        </div>
        <div style="font-size:12px;color:var(--txt-2);margin-top:4px">Intensity: ${'●'.repeat(v.intensity || 3)} · ${(v.tags || []).join(', ')}</div>
      </div>`; }).join('')}` : ''}

      ${resolved.length ? `<div style="font-size:10px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.1em;margin-top:12px;margin-bottom:8px">Past Reflections</div>
      ${resolved.slice(0, 8).map(v => `<div class="vault-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;${
            v.resolution === 'resolved' ? 'background:var(--green-s);color:var(--green)' :
            v.resolution === 'grew'     ? 'background:var(--blue-s);color:var(--blue)' :
            'background:var(--red-s);color:var(--red)'}">${U.resLabel(v.resolution)}</span>
          <span style="font-size:11px;color:var(--txt-2)">${U.fmtDate(v.date)}</span>
        </div>
        ${v.reflection ? `<div style="font-size:12px;color:var(--txt-2);margin-top:6px;font-style:italic">"${v.reflection}"</div>` : ''}
      </div>`).join('')}` : ''}

      ${!due.length && !sealed.length && !resolved.length ? `<div class="empty">
        <div class="empty-ico">🔐</div>
        <div class="empty-txt">The vault is empty.<br>Write what you need to let go of.<br>It opens in 30 days.</div>
      </div>` : ''}`;
  },

  openVent() {
    this._ventTags = [];
    document.getElementById('vent-txt').value = '';
    document.getElementById('vent-intensity').value = 3;
    document.querySelectorAll('#vent-tags .chip').forEach(c => c.classList.remove('on'));
    U.openModal('vent-overlay');
  },

  toggleVentTag(el) {
    el.classList.toggle('on');
    this._ventTags = [...document.querySelectorAll('#vent-tags .chip.on')].map(c => c.dataset.tag);
  },

  sealVent() {
    const text = document.getElementById('vent-txt')?.value.trim();
    if (!text) { U.toast('Write something first'); return; }
    const revealDate = new Date(); revealDate.setDate(revealDate.getDate() + 30);
    DB.data.vents.push({
      id: U.uid(), text, tags: this._ventTags,
      intensity: +document.getElementById('vent-intensity').value,
      date: U.today(), revealDate: revealDate.toISOString().slice(0, 10),
      sealed: true, resolution: null, reflection: null
    });
    DB.save();
    U.closeModal('vent-overlay');
    this._renderVault(document.getElementById('mind-content'));
    U.toast('🔒 Sealed. Opens in 30 days.');
  },

  openReveal(id) {
    this._currentRevealId = id;
    const v = DB.data.vents.find(x => x.id === id);
    document.getElementById('reveal-date').textContent   = `Written ${U.fmtDate(v.date)}`;
    document.getElementById('reveal-content').textContent = v.text;
    document.getElementById('reveal-reflection').value    = '';
    document.getElementById('reveal-resolution').value    = '';
    document.querySelectorAll('#reveal-chips .chip').forEach(c => c.classList.remove('on'));
    U.openModal('reveal-overlay');
  },

  setResolution(el, val) {
    document.querySelectorAll('#reveal-chips .chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    document.getElementById('reveal-resolution').value = val;
  },

  submitReveal() {
    const res = document.getElementById('reveal-resolution')?.value;
    if (!res) { U.toast('How do you feel about it now?'); return; }
    const v = DB.data.vents.find(x => x.id === this._currentRevealId);
    v.resolution   = res;
    v.reflection   = document.getElementById('reveal-reflection')?.value.trim() || '';
    v.resolvedDate = U.today();
    DB.save();
    U.closeModal('reveal-overlay');
    this._renderVault(document.getElementById('mind-content'));
    U.toast('🌱 Reflection saved');
  }
};
