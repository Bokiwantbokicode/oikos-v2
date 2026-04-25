// ── OIKOS v2 · charts.js ─────────────────────

const Charts = {
  _tab: 'monthly',
  _instances: {},
  _reportSaved: false,

  init() { this.render(); },

  switchTab(tab) {
    this._tab = tab;
    document.querySelectorAll('#page-charts .tab').forEach((t, i) =>
      t.classList.toggle('active', ['monthly','weekly','daily'][i] === tab));
    this.render();
  },

  render() {
    // Destroy old charts
    Object.values(this._instances).forEach(c => { try { c.destroy(); } catch(_){} });
    this._instances = {};
    const el = document.getElementById('charts-content'); if (!el) return;
    if (this._tab === 'monthly') this._monthly(el);
    if (this._tab === 'weekly')  this._weekly(el);
    if (this._tab === 'daily')   this._daily(el);
  },

  COLORS: ['#2ea84f','#1f6feb','#d29922','#f85149','#58a6ff','#3fb950','#e3b341','#ff7b72','#79c0ff','#56d364','#8957e5','#db6d28'],

  _monthly(el) {
    const m   = U.thisMonth();
    const txns= DB.monthTxns(m);
    const out = txns.filter(t => t.type === 'out');
    const inn = txns.filter(t => t.type === 'in');
    const income = DB.data.settings.monthlyIncome || 45000;
    const totalOut = out.reduce((s, t) => s + t.amount, 0);
    const totalIn  = inn.reduce((s, t) => s + t.amount, 0);
    const net = totalIn - totalOut;
    const wasteful = out.filter(t => t.necessity === 'wasteful').reduce((s, t) => s + t.amount, 0);
    const avoid    = out.filter(t => t.necessity === 'avoid').reduce((s, t) => s + t.amount, 0);

    const catMap = {};
    out.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // 6-month trend
    const months = Array.from({ length: 6 }, (_, i) => U.monthOffset(m, i - 5));
    const trendIn  = months.map(mo => DB.monthTxns(mo).filter(t => t.type === 'in').reduce((s, t)  => s + t.amount, 0));
    const trendOut = months.map(mo => DB.monthTxns(mo).filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0));
    const trendLbl = months.map(mo => new Date(mo + '-01').toLocaleDateString('en-PH', { month: 'short' }));

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-family:var(--fd);font-size:12px;letter-spacing:.1em">${U.monthName(m)}</span>
        <span style="font-size:11px;color:var(--txt-2)">Target: ${U.fmtShort(income)}</span>
      </div>
      <div class="sum3">
        <div class="sum-item"><div class="sum-lbl">In</div><div class="sum-val g">${U.fmtShort(totalIn)}</div></div>
        <div class="sum-item"><div class="sum-lbl">Out</div><div class="sum-val r">${U.fmtShort(totalOut)}</div></div>
        <div class="sum-item"><div class="sum-lbl">Net</div><div class="sum-val ${net >= 0 ? 'g' : 'r'}">${U.fmtShort(net)}</div></div>
      </div>
      ${cats.length ? `<div class="chart-wrap">
        <div class="card-title">Spending by Category</div>
        <canvas id="ch-donut"></canvas>
        <div id="ch-legend" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
      </div>` : ''}
      ${wasteful > 0 ? `<div class="card-xs" style="background:var(--red-s);border-color:var(--red-g);margin-bottom:8px">
        <div style="display:flex;justify-content:space-between">
          <div><div style="font-size:12px;font-weight:600;color:var(--red)">❌ Wasteful Spend</div>
          <div style="font-size:11px;color:var(--txt-2)">Could have been avoided</div></div>
          <div style="font-family:var(--fm);color:var(--red)">${U.fmt(wasteful)}</div>
        </div>
      </div>` : ''}
      ${avoid > 0 ? `<div class="card-xs" style="background:var(--amber-s);border-color:var(--amber-g);margin-bottom:8px">
        <div style="display:flex;justify-content:space-between">
          <div><div style="font-size:12px;font-weight:600;color:var(--amber)">⚠️ Could-Avoid Spend</div></div>
          <div style="font-family:var(--fm);color:var(--amber)">${U.fmt(avoid)}</div>
        </div>
      </div>` : ''}
      <div class="chart-wrap">
        <div class="card-title">6-Month Trend</div>
        <canvas id="ch-trend"></canvas>
      </div>
      <button class="btn btn-ghost" style="margin-top:4px;font-size:13px" onclick="Charts.openPrompt()">🤖 Get AI Analysis Prompt</button>
      ${this._reportSaved ? `<button class="btn btn-ghost" style="margin-top:8px;font-size:13px" onclick="Charts.openExport()">📥 Export Data</button>` : ''}
    `;

    setTimeout(() => {
      if (cats.length) {
        const donutEl = document.getElementById('ch-donut');
        if (donutEl) {
          this._instances.donut = new Chart(donutEl, {
            type: 'doughnut',
            data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: this.COLORS, borderWidth: 2, borderColor: '#161b22' }] },
            options: { responsive: true, plugins: { legend: { display: false } }, cutout: '64%' }
          });
          const leg = document.getElementById('ch-legend');
          if (leg) leg.innerHTML = cats.slice(0, 8).map((c, i) =>
            `<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--txt-2)">
              <div style="width:8px;height:8px;border-radius:50%;background:${this.COLORS[i]};flex-shrink:0"></div>
              ${c[0]}<span style="color:var(--txt);font-family:var(--fm);margin-left:3px">${U.fmtShort(c[1])}</span>
            </div>`).join('');
        }
      }
      const trendEl = document.getElementById('ch-trend');
      if (trendEl) {
        this._instances.trend = new Chart(trendEl, {
          type: 'bar',
          data: { labels: trendLbl, datasets: [
            { label: 'In',  data: trendIn,  backgroundColor: 'rgba(46,168,79,.5)', borderColor: '#2ea84f', borderWidth: 1 },
            { label: 'Out', data: trendOut, backgroundColor: 'rgba(248,81,73,.5)', borderColor: '#f85149', borderWidth: 1 }
          ]},
          options: { responsive: true, plugins: { legend: { labels: { color: '#8b949e', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#8b949e' } }, y: { ticks: { color: '#8b949e', callback: v => U.fmtShort(v) }, grid: { color: '#21262d' } } } }
        });
      }
    }, 50);
  },

  _weekly(el) {
    const income = DB.data.settings.monthlyIncome || 45000;
    const now = new Date(); const y = now.getFullYear(), mo = now.getMonth();
    const weeks = U.weeksInMonth(y, mo);
    const ceil  = income / weeks;
    const daysInMo = U.daysInMonth(y, mo);

    const weekData = Array.from({ length: weeks }, (_, w) => {
      const start = new Date(y, mo, w * 7 + 1);
      const end   = new Date(y, mo, Math.min((w + 1) * 7, daysInMo));
      const spent = DB.data.transactions.filter(t => {
        if (t.deleted || t.type !== 'out') return false;
        const d = new Date(t.date + 'T00:00:00');
        return d >= start && d <= end;
      }).reduce((s, t) => s + t.amount, 0);
      return { label: `Wk ${w + 1}`, spent, ceil };
    });

    const daySpend = Array(7).fill(0);
    DB.monthTxns(U.thisMonth()).filter(t => t.type === 'out').forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      daySpend[(d.getDay() + 6) % 7] += t.amount;
    });
    const maxDay = Math.max(...daySpend, 1);
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    el.innerHTML = `
      <div class="chart-wrap">
        <div class="card-title">Weekly Spend vs Limit (${U.fmt(ceil)}/week)</div>
        <canvas id="ch-weekly"></canvas>
      </div>
      <div class="card">
        <div class="card-title">Spend by Day of Week</div>
        ${dayNames.map((d, i) => {
          const pct = (daySpend[i] / maxDay) * 100;
          const cls = pct > 70 ? 'r' : pct > 40 ? 'a' : 'g';
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-s)">
            <span style="font-size:11px;color:var(--txt-2);width:28px;flex-shrink:0">${d}</span>
            <div class="prog-wrap" style="flex:1;height:6px"><div class="prog-fill ${cls}" style="width:${pct}%"></div></div>
            <span style="font-family:var(--fm);font-size:11px;color:var(--txt-2);width:58px;text-align:right;flex-shrink:0">${U.fmtShort(daySpend[i])}</span>
          </div>`;
        }).join('')}
      </div>`;

    setTimeout(() => {
      const el2 = document.getElementById('ch-weekly');
      if (!el2) return;
      this._instances.weekly = new Chart(el2, {
        type: 'bar',
        data: { labels: weekData.map(w => w.label), datasets: [
          { label: 'Spent', data: weekData.map(w => w.spent), backgroundColor: weekData.map(w => w.spent > w.ceil ? 'rgba(248,81,73,.6)' : 'rgba(46,168,79,.6)'), borderColor: weekData.map(w => w.spent > w.ceil ? '#f85149' : '#2ea84f'), borderWidth: 1 },
          { label: 'Limit', data: weekData.map(w => w.ceil), type: 'line', borderColor: '#d29922', borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, fill: false }
        ]},
        options: { responsive: true, plugins: { legend: { labels: { color: '#8b949e', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#8b949e' } }, y: { ticks: { color: '#8b949e', callback: v => U.fmtShort(v) }, grid: { color: '#21262d' } } } }
      });
    }, 50);
  },

  _daily(el) {
    const m = U.thisMonth();
    const dayMap = {};
    DB.monthTxns(m).filter(t => t.type === 'out').forEach(t => { dayMap[t.date] = (dayMap[t.date] || 0) + t.amount; });
    const entries = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]));
    const top3 = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const wasteful = new Set(DB.monthTxns(m).filter(t => t.necessity === 'wasteful').map(t => t.date));
    const moodMap = {};
    DB.monthTxns(m).filter(t => t.type === 'out' && t.mood).forEach(t => { moodMap[t.mood] = (moodMap[t.mood] || 0) + t.amount; });

    el.innerHTML = `
      <div class="chart-wrap">
        <div class="card-title">Daily Spend — ${new Date().toLocaleDateString('en-PH', { month: 'long' })}</div>
        ${entries.length ? '<canvas id="ch-daily"></canvas>' : '<div class="empty"><div class="empty-txt">No spending this month yet</div></div>'}
      </div>
      ${top3.length ? `<div class="card">
        <div class="card-title">Most Expensive Days</div>
        ${top3.map(([d, v], i) => `<div class="act-item">
          <div class="act-ico ${i === 0 ? 'r' : 'a'}">${i === 0 ? '🔥' : '📌'}</div>
          <div class="act-det"><div class="act-ttl">${U.fmtDate(d)}</div>
          <div class="act-meta">${wasteful.has(d) ? '⚠️ Has wasteful entries' : ''}</div></div>
          <div class="act-amt r">${U.fmt(v)}</div>
        </div>`).join('')}
      </div>` : ''}
      ${Object.keys(moodMap).length ? `<div class="card">
        <div class="card-title">Spending by Mood</div>
        ${Object.entries(moodMap).sort((a, b) => b[1] - a[1]).map(([mood, amt]) =>
          `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-s)">
            <span style="font-size:20px">${mood}</span>
            <span style="font-family:var(--fm)">${U.fmt(amt)}</span>
          </div>`).join('')}
        <div style="font-size:11px;color:var(--txt-3);margin-top:6px">How emotional state affects spending</div>
      </div>` : ''}`;

    if (entries.length) setTimeout(() => {
      const el2 = document.getElementById('ch-daily'); if (!el2) return;
      const maxV = Math.max(...entries.map(e => e[1]));
      this._instances.daily = new Chart(el2, {
        type: 'bar',
        data: { labels: entries.map(([d]) => U.fmtDateShort(d)), datasets: [{ label: 'Spent', data: entries.map(([, v]) => v), backgroundColor: entries.map(([, v]) => v >= maxV * 0.8 ? 'rgba(248,81,73,.6)' : 'rgba(46,168,79,.5)'), borderWidth: 0, borderRadius: 3 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8b949e', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8b949e', callback: v => U.fmtShort(v) }, grid: { color: '#21262d' } } } }
      });
    }, 50);
  },

  // ── AI PROMPT ──────────────────────────────
  openPrompt() {
    this._buildPrompt();
    U.openModal('prompt-overlay');
  },

  _buildPrompt() {
    const layers = [...document.querySelectorAll('#prompt-layers .chip.on')].map(c => c.dataset.layer);
    const m = U.thisMonth();
    const txns = DB.monthTxns(m);
    const out  = txns.filter(t => t.type === 'out');
    const inn  = txns.filter(t => t.type === 'in');
    const income = DB.data.settings.monthlyIncome || 45000;
    let p = `=== OIKOS FINANCIAL ANALYSIS ===\nDate: ${new Date().toLocaleDateString()}\nUser: ${DB.data.settings.userName || 'User'}\n\n`;

    if (layers.includes('snapshot')) {
      const catMap = {};
      out.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
      const totalIn  = inn.reduce((s, t) => s + t.amount, 0);
      const totalOut = out.reduce((s, t) => s + t.amount, 0);
      p += `📊 SNAPSHOT — ${U.monthName(m)}\nTarget: ${U.fmt(income)}\nIn: ${U.fmt(totalIn)}  Out: ${U.fmt(totalOut)}  Net: ${U.fmt(totalIn - totalOut)}\nCategories:\n`;
      Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([c, v]) => { p += `  ${c}: ${U.fmt(v)} (${Math.round(v / income * 100)}%)\n`; });
      p += '\n';
    }
    if (layers.includes('habits')) {
      const prev = U.monthOffset(m, -1);
      const prevOut = DB.monthTxns(prev).filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
      const currOut = out.reduce((s, t) => s + t.amount, 0);
      const daySpend = Array(7).fill(0);
      out.forEach(t => { const d = new Date(t.date + 'T00:00:00'); daySpend[(d.getDay() + 6) % 7] += t.amount; });
      const maxDayIdx = daySpend.indexOf(Math.max(...daySpend));
      const dayNames  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      p += `📈 HABITS\nvs last month: ${currOut > prevOut ? '+' : ''}${Math.round((currOut - prevOut) / Math.max(prevOut, 1) * 100)}%\nHighest spend day: ${dayNames[maxDayIdx]}\n\n`;
    }
    if (layers.includes('regret')) {
      const w = out.filter(t => t.necessity === 'wasteful').reduce((s, t) => s + t.amount, 0);
      const a = out.filter(t => t.necessity === 'avoid').reduce((s, t) => s + t.amount, 0);
      p += `💸 REGRET DATA\nWasteful: ${U.fmt(w)} (${Math.round(w / income * 100)}%)\nCould-avoid: ${U.fmt(a)}\nTotal avoidable: ${U.fmt(w + a)}\n\n`;
    }
    if (layers.includes('debts')) {
      p += `👥 PEOPLE & GOALS\n`;
      DB.data.people.filter(x => !x.deleted).forEach(per => {
        const b = DB.personBalance(per.id);
        if (b !== 0) p += `  ${per.name}: ${b > 0 ? 'owes you' : 'you owe'} ${U.fmt(Math.abs(b))}\n`;
      });
      DB.data.goals.filter(g => !g.deleted).forEach(g => {
        const s = DB.goalSaved(g.id);
        p += `  ${g.name}: ${U.fmtShort(s)}/${U.fmtShort(g.target)} saved${g.targetDate ? ', ' + U.daysFromNow(g.targetDate) + ' days left' : ''}\n`;
      });
      p += '\n';
    }
    if (layers.includes('journal')) {
      const recent = DB.data.journal.slice(-7);
      if (recent.length) { p += `📓 JOURNAL (last 7 days)\n`; recent.forEach(j => { p += `  ${j.date} ${j.mood || ''}: ${j.text}\n`; }); p += '\n'; }
    }
    if (layers.includes('vault')) {
      const tags = {};
      DB.data.vents.forEach(v => (v.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
      p += `😤 EMOTIONAL PATTERNS\nVent triggers: ${Object.entries(tags).map(([k, v]) => `${k}(${v})`).join(', ') || 'none'}\nResolved: ${DB.data.vents.filter(v => v.resolution === 'resolved').length}\nUnresolved: ${DB.data.vents.filter(v => v.resolution === 'unresolved').length}\n\n`;
    }

    p += `=== PLEASE ANALYZE ===\n1. Key financial health observations\n2. Behavioral patterns connecting emotion to spending\n3. Three specific actionable changes this week\n4. Realistic weekly budget suggestion\n\nFormat your response with these prefixes:\nINSIGHT: [key takeaway]\nREMINDER: [actionable reminder]\nGOAL: [goal name] | [amount] | [target date YYYY-MM-DD]`;

    document.getElementById('prompt-output').textContent = p;
  },

  togglePromptLayer(el) {
    el.classList.toggle('on');
    this._buildPrompt();
  },

  copyPrompt() {
    const txt = document.getElementById('prompt-output')?.textContent || '';
    navigator.clipboard.writeText(txt).then(() => U.toast('📋 Prompt copied!')).catch(() => U.toast('Select text and copy manually'));
  },

  parseResponse() {
    const txt = document.getElementById('ai-response-input')?.value || '';
    if (!txt.trim()) { U.toast('Paste AI response first'); return; }
    const lines = txt.split('\n');
    let applied = 0;
    lines.forEach(l => {
      if (l.startsWith('INSIGHT:')) { DB.data.settings.aiInsight = l.replace('INSIGHT:', '').trim(); DB.data.settings.aiInsightDate = U.today(); applied++; }
      if (l.startsWith('GOAL:')) {
        const parts = l.replace('GOAL:', '').split('|');
        if (parts.length >= 2) {
          DB.data.goals.push({ id: U.uid(), name: parts[0].trim(), target: U.num(parts[1].replace(/[^0-9.]/g, '')), targetDate: (parts[2] || '').trim(), category: 'savings', contributions: [], createdAt: new Date().toISOString(), deleted: false });
          applied++;
        }
      }
    });
    DB.save();
    this._reportSaved = true;
    U.closeModal('prompt-overlay');
    App.refreshAll();
    U.toast(`✅ Applied ${applied} item${applied !== 1 ? 's' : ''} from AI`);
  },

  openExport() {
    if (!this._reportSaved) { U.toast('Save an AI report first to unlock export'); return; }
    Settings.exportCSV();
  }
};
