// ── OIKOS v2 · home.js ───────────────────────

const Home = {
  init() {
    this.render();
  },

  render() {
    this.renderWallets();
    this.renderSummary();
    this.renderWeeklyBar();
    this.renderWarnings();
    this.renderInsight();
    this.renderQuote();
    this.renderActivity();
    this.checkVaultDue();
  },

  // ── WALLETS ────────────────────────────────
  renderWallets() {
    const row = document.getElementById('wallet-row');
    if (!row) return;
    const wallets = DB.data.settings.wallets;
    let html = wallets.map((w, i) => {
      const bal = DB.walletBalance(w.id);
      return `<div class="w-card ${w.color}" onclick="Ledger.filterWallet('${w.id}')">
        <div class="w-icon">${w.icon}</div>
        <div class="w-lbl">${w.label}</div>
        <div class="w-amt">${U.fmtShort(bal)}</div>
      </div>`;
    }).join('');
    const total = wallets.reduce((s, w) => s + DB.walletBalance(w.id), 0);
    html += `<div class="w-total">
      <div class="w-icon">∑</div>
      <div class="w-lbl">Total</div>
      <div class="w-amt">${U.fmtShort(total)}</div>
    </div>`;
    row.innerHTML = html;
  },

  // ── MONTH SUMMARY ──────────────────────────
  renderSummary() {
    const el = document.getElementById('home-sum3');
    if (!el) return;
    const m = U.thisMonth();
    const txns = DB.monthTxns(m);
    const inn = txns.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const out = txns.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    const net = inn - out;
    const now = new Date();
    const label = now.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
    el.innerHTML = `
      <div class="sum-item" onclick="Home.showMonthList('in')">
        <div class="sum-lbl">Cash In</div>
        <div class="sum-val g">${U.fmtShort(inn)}</div>
        <div style="font-size:9px;color:var(--txt-3);margin-top:2px">${label}</div>
      </div>
      <div class="sum-item" onclick="Home.showMonthList('out')">
        <div class="sum-lbl">Cash Out</div>
        <div class="sum-val r">${U.fmtShort(out)}</div>
        <div style="font-size:9px;color:var(--txt-3);margin-top:2px">${label}</div>
      </div>
      <div class="sum-item" onclick="Home.showMonthList('all')">
        <div class="sum-lbl">Net</div>
        <div class="sum-val ${net >= 0 ? 'g' : 'r'}">${U.fmtShort(net)}</div>
        <div style="font-size:9px;color:var(--txt-3);margin-top:2px">${label}</div>
      </div>`;
  },

  showMonthList(filter) {
    const m = U.thisMonth();
    let txns = DB.monthTxns(m);
    if (filter === 'in')  txns = txns.filter(t => t.type === 'in');
    if (filter === 'out') txns = txns.filter(t => t.type === 'out');
    txns = txns.sort((a, b) => b.date.localeCompare(a.date));
    const title = filter === 'in' ? 'Cash In' : filter === 'out' ? 'Cash Out' : 'All Transactions';
    document.getElementById('month-list-title').textContent = title + ' — ' + U.monthName(m);
    document.getElementById('month-list-body').innerHTML = txns.length
      ? txns.map(t => Entry.txnRow(t)).join('')
      : '<div class="empty"><div class="empty-txt">No transactions</div></div>';
    U.openModal('month-list-overlay');
  },

  // ── WEEKLY BAR ─────────────────────────────
  renderWeeklyBar() {
    const income = DB.data.settings.monthlyIncome || 45000;
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    const weeks = U.weeksInMonth(y, mo);
    const ceil = income / weeks;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const spent = DB.data.transactions.filter(t => {
      if (t.deleted || t.type !== 'out') return false;
      const d = new Date(t.date + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    }).reduce((s, t) => s + t.amount, 0);
    const pct  = U.clamp(Math.round((spent / ceil) * 100), 0, 100);
    const rem  = Math.max(0, ceil - spent);
    const cls  = pct >= 90 ? 'r' : pct >= 70 ? 'a' : 'g';
    const weekNum = Math.ceil(now.getDate() / 7);

    const el = document.getElementById('weekly-section');
    if (!el) return;
    el.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="card-title" style="margin:0">Weekly Limit</span>
          <span style="font-family:var(--fm);font-size:11px;color:var(--txt-2)">Wk ${weekNum}/${weeks} · <span class="${cls}" style="font-weight:600">${pct}%</span></span>
        </div>
        <div class="prog-wrap"><div class="prog-fill ${cls}" style="width:${pct}%"></div></div>
        <div style="font-size:11px;color:var(--txt-3);margin-top:5px">${U.fmt(spent)} spent · ${U.fmt(rem)} remaining of ${U.fmt(ceil)}/week</div>
        <div class="calc-wrap" style="margin-top:10px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--txt-3);margin-bottom:6px">Cost Calculator</div>
          <div style="display:flex;gap:6px;align-items:center">
            <div class="field" style="margin:0;flex:1">
              <input type="number" id="calc-input" placeholder="Enter amount ₱" inputmode="decimal" style="background:var(--bg-4);border:1px solid var(--border);border-radius:var(--r-m);padding:8px 10px;width:100%;font-size:13px;color:var(--txt)"/>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Home.calcCost(${ceil},${spent})">Check</button>
          </div>
          <div class="calc-result" id="calc-result"></div>
        </div>
      </div>`;
  },

  calcCost(ceil, spent) {
    const v = U.num(document.getElementById('calc-input')?.value);
    if (!v) return;
    const pctOfCeil  = Math.round((v / ceil) * 100);
    const newSpent   = spent + v;
    const newPct     = Math.round((newSpent / ceil) * 100);
    const rem        = Math.max(0, ceil - newSpent);
    const cls        = newPct >= 100 ? 'r' : newPct >= 80 ? 'a' : 'g';
    const el = document.getElementById('calc-result');
    if (el) el.innerHTML = `
      <span class="${cls}">${U.fmt(v)} = ${pctOfCeil}% of weekly limit.</span>
      After this: <span class="${cls}">${newPct}% used</span>, ${U.fmt(rem)} remaining.
      ${newPct >= 100 ? '<br><span class="r">⚠️ Over weekly limit!</span>' : ''}`;
  },

  // ── WARNINGS ───────────────────────────────
  renderWarnings() {
    const el = document.getElementById('home-warnings');
    if (!el) return;
    const goals = DB.data.goals.filter(g => !g.deleted && g.targetDate);
    const due = goals.filter(g => {
      const d = U.daysFromNow(g.targetDate);
      return d >= 0 && d <= 30;
    });
    if (!due.length) { el.innerHTML = ''; return; }
    el.innerHTML = due.map(g => {
      const saved = DB.goalSaved(g.id);
      const short = g.target - saved;
      const days  = U.daysFromNow(g.targetDate);
      return `<div class="warn-card">
        <span style="font-size:17px">⏰</span>
        <div style="font-size:12px;color:var(--txt)">
          <strong>${g.name}</strong> in ${days} day${days !== 1 ? 's' : ''}<br>
          <span class="${short <= 0 ? 'g' : 'r'}">${short <= 0 ? '✅ Fully funded' : U.fmt(short) + ' still needed'}</span>
        </div>
      </div>`;
    }).join('');
  },

  // ── INSIGHT ────────────────────────────────
  renderInsight() {
    const el = document.getElementById('home-insight');
    if (!el) return;
    const { aiInsight, aiInsightDate } = DB.data.settings;
    el.innerHTML = aiInsight
      ? `<div class="insight-card">
          <div class="insight-lbl">🤖 AI Insight · ${U.fmtDate(aiInsightDate)}</div>
          <div style="font-size:13px;line-height:1.6">${aiInsight}</div>
          <div style="text-align:right;margin-top:6px">
            <button class="btn btn-ghost btn-sm" onclick="Home.dismissInsight()">Dismiss</button>
          </div>
        </div>`
      : '';
  },

  dismissInsight() {
    DB.data.settings.aiInsight = '';
    DB.save();
    this.renderInsight();
  },

  // ── DAILY QUOTE ────────────────────────────
  renderQuote() {
    const el = document.getElementById('home-quote');
    if (!el) return;
    // Check vault due first
    const due = DB.data.vents.filter(v => v.sealed && !v.resolution && new Date(v.revealDate) <= new Date());
    if (due.length) {
      el.innerHTML = `<div class="quote-card" style="border-color:var(--green-g);cursor:pointer" onclick="App.navTo('mind');Mind.switchTab('vault')">
        <div style="font-size:22px;margin-bottom:4px">🔓</div>
        <div class="quote-txt" style="color:var(--green)">A vault entry is ready to open.</div>
        <div class="quote-attr">Tap to reflect → Mind → Vault</div>
      </div>`;
      return;
    }
    const q = getDailyQuote();
    el.innerHTML = `<div class="quote-card">
      <div class="quote-txt">"${q.text}"</div>
      ${q.attr ? `<div class="quote-attr">— ${q.attr}</div>` : ''}
    </div>`;
  },

  // ── ACTIVITY ───────────────────────────────
  renderActivity() {
    const el = document.getElementById('home-activity');
    if (!el) return;
    const recent = [...DB.data.transactions]
      .filter(t => !t.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
    el.innerHTML = recent.length
      ? recent.map(t => Entry.txnRow(t)).join('')
      : '<div class="empty"><div class="empty-ico">📭</div><div class="empty-txt">No transactions yet.<br>Tap + to add your first entry.</div></div>';
  },

  checkVaultDue() {
    const due = DB.data.vents.filter(v => v.sealed && !v.resolution && new Date(v.revealDate) <= new Date());
    if (due.length) U.toast(`🔓 ${due.length} vault entr${due.length > 1 ? 'ies' : 'y'} ready to open`, 4000);
  }
};
