// ── OIKOS v2 · ledger.js ─────────────────────

const Ledger = {
  _tab: 'txn',
  _goalsView: 'list',
  _calYear: new Date().getFullYear(),
  _calMonth: new Date().getMonth(),
  _walletFilter: '',
  _dateFrom: '', _dateTo: '',

  init() { this.render(); },

  render() {
    if (this._tab === 'txn')    this.renderTxns();
    if (this._tab === 'people') this.renderPeople();
    if (this._tab === 'goals')  this.renderGoals();
  },

  switchTab(tab) {
    this._tab = tab;
    document.querySelectorAll('#page-ledger .tab').forEach((t, i) =>
      t.classList.toggle('active', ['txn','people','goals'][i] === tab));
    ['ltab-txn','ltab-people','ltab-goals'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.style.display = ['txn','people','goals'][i] === tab ? '' : 'none';
    });
    this.render();
  },

  filterWallet(walletId) {
    App.navTo('ledger');
    this.switchTab('txn');
    this._walletFilter = walletId;
    this.renderTxns();
  },

  // ── TRANSACTIONS ───────────────────────────
  renderTxns() {
    const search = document.getElementById('txn-search')?.value.toLowerCase() || '';
    const from   = document.getElementById('date-from')?.value || '';
    const to     = document.getElementById('date-to')?.value   || '';
    let txns = DB.data.transactions.filter(t => !t.deleted);
    if (this._walletFilter) txns = txns.filter(t => t.walletId === this._walletFilter);
    if (search) txns = txns.filter(t => (t.category + t.note + t.amount + '').toLowerCase().includes(search));
    if (from)   txns = txns.filter(t => t.date >= from);
    if (to)     txns = txns.filter(t => t.date <= to);
    txns = txns.sort((a, b) => b.date.localeCompare(a.date));

    // Clear wallet filter badge
    const badge = document.getElementById('wallet-filter-badge');
    if (badge) {
      if (this._walletFilter) {
        const w = DB.data.settings.wallets.find(x => x.id === this._walletFilter);
        badge.textContent = w ? '× ' + w.label : '';
        badge.style.display = '';
      } else { badge.style.display = 'none'; }
    }

    const el = document.getElementById('txn-list');
    if (!el) return;
    el.innerHTML = txns.length
      ? txns.map(t => Entry.txnRow(t)).join('')
      : '<div class="empty"><div class="empty-ico">📭</div><div class="empty-txt">No transactions found.</div></div>';
  },

  clearWalletFilter() { this._walletFilter = ''; this.renderTxns(); },

  // ── PEOPLE ─────────────────────────────────
  renderPeople() {
    const el = document.getElementById('people-list');
    if (!el) return;
    const people = DB.data.people.filter(p => !p.deleted);
    if (!people.length) {
      el.innerHTML = '<div class="empty"><div class="empty-ico">👥</div><div class="empty-txt">No people yet.<br>Add someone you split bills with.</div></div>';
      return;
    }
    el.innerHTML = people.map(p => {
      const bal = DB.personBalance(p.id);
      const cls = bal > 0 ? 'g' : bal < 0 ? 'r' : 'b';
      const lbl = bal > 0 ? `${p.name} owes you` : bal < 0 ? `You owe ${p.name}` : 'Settled';
      const ac  = U.avatarColor(p.name);
      return `<div class="person-card" onclick="Ledger.openPerson('${p.id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="p-avatar" style="background:${ac}22;border:1px solid ${ac}">${p.name[0].toUpperCase()}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${p.name}</div>
            <div style="font-size:11px;color:var(--txt-2)">${p.relationship || 'Person'} · <span class="${cls}">${lbl}</span></div>
          </div>
          <div style="font-family:var(--fm);font-size:16px;font-weight:600" class="${cls}">${bal !== 0 ? U.fmtShort(Math.abs(bal)) : '—'}</div>
        </div>
      </div>`;
    }).join('');
  },

  openAddPerson() {
    document.getElementById('p-name').value = '';
    document.getElementById('p-rel').value  = 'Friend';
    U.openModal('person-add-overlay');
  },

  savePerson() {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { U.toast('Enter a name'); return; }
    DB.data.people.push({ id: U.uid(), name, relationship: document.getElementById('p-rel').value, debts: [], settlements: [], createdAt: new Date().toISOString(), deleted: false });
    DB.save();
    U.closeModal('person-add-overlay');
    this.renderPeople();
    U.toast('✅ Person added');
  },

  openPerson(id) {
    const p = DB.data.people.find(x => x.id === id); if (!p) return;
    const bal = DB.personBalance(id);
    const debts = (p.debts || []);
    const txns  = DB.data.transactions.filter(t => !t.deleted && t.personId === id).sort((a, b) => a.date.localeCompare(b.date));

    // Build timeline
    let runningOwed = 0;
    const timelineRows = txns.map(t => {
      const d = debts.find(x => x.txnId === t.id);
      if (d) runningOwed += (d.amount - (d.paid || 0));
      return `<div class="act-item">
        <div class="act-ico r">💸</div>
        <div class="act-det">
          <div class="act-ttl">${t.category}${t.note ? ' · ' + t.note : ''}</div>
          <div class="act-meta">${U.fmtDate(t.date)}${d ? ' · Their share: ' + U.fmt(d.amount) : ''}</div>
        </div>
        <div class="act-amt r">${d ? '+' + U.fmtShort(d.amount - (d.paid || 0)) : ''}</div>
      </div>`;
    });

    const settlements = (p.settlements || []).sort((a, b) => a.date.localeCompare(b.date));
    const settleRows = settlements.map(s => `<div class="act-item">
      <div class="act-ico g">💰</div>
      <div class="act-det">
        <div class="act-ttl">Settlement${s.note ? ' · ' + s.note : ''}</div>
        <div class="act-meta">${U.fmtDate(s.date)}</div>
      </div>
      <div class="act-amt g">-${U.fmtShort(s.amount)}</div>
    </div>`);

    const ac = U.avatarColor(p.name);
    document.getElementById('person-detail-body').innerHTML = `
      <div style="text-align:center;margin-bottom:16px">
        <div class="p-avatar" style="background:${ac}22;border:2px solid ${ac};width:52px;height:52px;font-size:22px;margin:0 auto 8px">${p.name[0].toUpperCase()}</div>
        <div style="font-family:var(--fd);font-size:18px;font-weight:600;letter-spacing:.08em">${p.name}</div>
        <div style="font-size:11px;color:var(--txt-2);margin-bottom:8px">${p.relationship}</div>
        <div style="font-family:var(--fm);font-size:26px;color:var(--${bal > 0 ? 'green' : bal < 0 ? 'red' : 'txt-2'})">${bal !== 0 ? (bal > 0 ? '+' : '') + U.fmt(bal) : 'Settled'}</div>
        <div style="font-size:12px;color:var(--txt-2)">${bal > 0 ? p.name + ' owes you' : bal < 0 ? 'You owe ' + p.name : 'All settled'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${bal > 0 ? `<button class="btn btn-g btn-sm" style="width:100%" onclick="Ledger.openSettle('${id}','received')">💰 Mark Received</button>` : ''}
        ${bal < 0 ? `<button class="btn btn-ghost btn-sm" style="width:100%;color:var(--blue);border-color:var(--blue)" onclick="Ledger.openSettle('${id}','paid')">✅ Mark Paid</button>` : ''}
        <button class="btn btn-ghost btn-sm" style="width:100%" onclick="Ledger.openSettle('${id}','other')">Record Settlement</button>
      </div>
      <div class="card-title">Transaction Timeline</div>
      ${timelineRows.length || settleRows.length
        ? [...timelineRows, ...settleRows].join('')
        : '<div class="empty"><div class="empty-txt">No history yet</div></div>'}
    `;
    U.openModal('person-detail-overlay');
  },

  openSettle(personId, mode) {
    document.getElementById('settle-pid').value   = personId;
    document.getElementById('settle-mode').value  = mode;
    document.getElementById('settle-amount').value = '';
    document.getElementById('settle-note').value   = '';
    const p = DB.data.people.find(x => x.id === personId);
    const bal = DB.personBalance(personId);
    document.getElementById('settle-title').textContent =
      mode === 'received' ? `${p?.name} Paid You` : mode === 'paid' ? `You Paid ${p?.name}` : 'Record Settlement';
    document.getElementById('settle-bal').textContent = `Outstanding: ${U.fmt(Math.abs(bal))}`;
    U.openModal('settle-overlay');
  },

  saveSettle() {
    const personId = document.getElementById('settle-pid').value;
    const amount   = U.num(document.getElementById('settle-amount').value);
    if (!amount) { U.toast('Enter amount'); return; }
    const p = DB.data.people.find(x => x.id === personId); if (!p) return;
    p.settlements = p.settlements || [];
    p.settlements.push({ id: U.uid(), amount, note: document.getElementById('settle-note').value, date: U.today() });
    // Apply to debts FIFO
    let rem = amount;
    (p.debts || []).forEach(d => { if (rem <= 0) return; const pay = Math.min(rem, d.amount - (d.paid || 0)); d.paid = (d.paid || 0) + pay; rem -= pay; });
    DB.save();
    U.closeModal('settle-overlay');
    U.closeModal('person-detail-overlay');
    this.renderPeople();
    U.toast('✅ Settlement recorded');
  },

  // ── GOALS ──────────────────────────────────
  renderGoals() {
    const el = document.getElementById('goals-content'); if (!el) return;
    if (this._goalsView === 'list') this._renderGoalList(el);
    else this._renderGoalCalendar(el);
  },

  switchGoalsView(view) {
    this._goalsView = view;
    document.querySelectorAll('#ltab-goals .tabs .tab').forEach((t, i) =>
      t.classList.toggle('active', ['list','calendar'][i] === view));
    this.renderGoals();
  },

  _renderGoalList(el) {
    const goals = DB.data.goals.filter(g => !g.deleted);
    if (!goals.length) {
      el.innerHTML = '<div class="empty"><div class="empty-ico">🎯</div><div class="empty-txt">No goals yet.<br>Add something to work toward.</div></div>';
      return;
    }
    el.innerHTML = goals.map(g => {
      const saved = DB.goalSaved(g.id);
      const pct   = g.target > 0 ? U.clamp(Math.round((saved / g.target) * 100), 0, 100) : 0;
      const days  = g.targetDate ? U.daysFromNow(g.targetDate) : null;
      const short = Math.max(0, g.target - saved);
      const cls   = pct >= 100 ? 'g' : (days !== null && days < 14 && pct < 60) ? 'r' : pct > 50 ? 'b' : 'a';

      // Daily/weekly/monthly suggestion (1 week early)
      let suggest = '';
      if (short > 0 && days !== null && days > 0) {
        const daysEarly = Math.max(1, days - 7);
        const perDay  = short / daysEarly;
        const perWeek = perDay * 7;
        const perMonth= perDay * 30;
        suggest = `<div style="font-size:10px;color:var(--txt-3);margin-top:5px">
          Save: ${U.fmtShort(perDay)}/day · ${U.fmtShort(perWeek)}/week · ${U.fmtShort(perMonth)}/mo to finish 1 week early
        </div>`;
      }

      return `<div class="goal-card" onclick="Ledger.openGoal('${g.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">${U.goalIcon(g.category)}</span>
            <div>
              <div style="font-size:14px;font-weight:600">${g.name}</div>
              <div style="font-size:11px;color:var(--txt-2)">${g.category}${g.repeat ? ' · ↻ ' + g.repeat : ''}</div>
            </div>
          </div>
          <div style="font-family:var(--fm);font-size:20px;font-weight:600" class="${cls}">${pct}%</div>
        </div>
        <div class="prog-wrap"><div class="prog-fill ${cls}" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--txt-2);margin-top:5px">
          <span>${U.fmtShort(saved)} of ${U.fmtShort(g.target)}</span>
          <span>${days !== null ? days + ' days left' : ''}</span>
        </div>
        ${suggest}
        ${short > 0 && days !== null && days <= 30 ? `<div style="font-size:11px;color:var(--red);margin-top:4px">⚠️ Need ${U.fmt(short)} in ${days} days</div>` : ''}
      </div>`;
    }).join('');
  },

  _renderGoalCalendar(el) {
    const y = this._calYear, m = this._calMonth;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const firstDay   = new Date(y, m, 1).getDay();
    const daysInMo   = U.daysInMonth(y, m);
    const today_d    = new Date();

    const dotMap = {};
    DB.data.goals.filter(g => !g.deleted && g.targetDate).forEach(g => {
      const d = new Date(g.targetDate + 'T00:00:00');
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate();
        const saved = DB.goalSaved(g.id);
        const pct   = g.target > 0 ? (saved / g.target) * 100 : 0;
        dotMap[day] = dotMap[day] || [];
        dotMap[day].push({ name: g.name, pct });
      }
    });

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="ico-btn" onclick="Ledger.calNav(-1)">←</div>
        <div style="font-family:var(--fd);font-size:13px;letter-spacing:.1em">${monthNames[m]} ${y}</div>
        <div class="ico-btn" onclick="Ledger.calNav(1)">→</div>
      </div>
      <div class="ico-btn" style="width:auto;padding:4px 10px;font-size:11px;margin-bottom:10px" onclick="Ledger.calReset()">Today</div>
      <div class="cal-grid">
        ${dayNames.map(d => `<div class="cal-dh">${d}</div>`).join('')}
        ${Array(firstDay).fill('<div></div>').join('')}
        ${Array.from({ length: daysInMo }, (_, i) => {
          const d = i + 1;
          const isToday = today_d.getFullYear() === y && today_d.getMonth() === m && today_d.getDate() === d;
          const goals   = dotMap[d] || [];
          const hasDot  = goals.length > 0;
          const allFunded = goals.every(g => g.pct >= 100);
          const anyShort  = goals.some(g => g.pct < 50);
          const dotCls    = !hasDot ? '' : allFunded ? 'has-dot dot-g' : anyShort ? 'has-dot dot-r' : 'has-dot dot-a';
          const title     = goals.map(g => g.name + ' ' + Math.round(g.pct) + '%').join(', ');
          return `<div class="cal-d ${isToday ? 'today' : ''} ${dotCls}" onclick="Ledger.calDayTap(${d},'${title}')" title="${title}">${d}</div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:10px;font-size:11px;color:var(--txt-2);margin-top:4px">
        <span>🟢 Funded</span><span>🟡 On track</span><span>🔴 Short</span>
      </div>
      <div id="cal-day-popup" style="display:none;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-m);padding:10px;margin-top:10px;font-size:13px;color:var(--txt)"></div>`;
  },

  calNav(dir) {
    this._calMonth += dir;
    if (this._calMonth > 11) { this._calMonth = 0;  this._calYear++; }
    if (this._calMonth < 0)  { this._calMonth = 11; this._calYear--; }
    this.renderGoals();
  },

  calReset() {
    this._calYear  = new Date().getFullYear();
    this._calMonth = new Date().getMonth();
    this.renderGoals();
  },

  calDayTap(day, title) {
    const popup = document.getElementById('cal-day-popup');
    if (!popup) return;
    if (title) { popup.style.display = ''; popup.textContent = title; }
    else popup.style.display = 'none';
  },

  openAddGoal() {
    document.getElementById('g-name').value   = '';
    document.getElementById('g-target').value = '';
    document.getElementById('g-date').value   = '';
    document.getElementById('g-note').value   = '';
    // Populate person select
    const ps = document.getElementById('g-person');
    if (ps) ps.innerHTML = '<option value="">— None —</option>' + DB.data.people.filter(p => !p.deleted).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    U.openModal('goal-add-overlay');
  },

  saveGoal() {
    const name = document.getElementById('g-name').value.trim();
    if (!name) { U.toast('Enter goal name'); return; }
    DB.data.goals.push({
      id:           U.uid(),
      name,
      category:     document.getElementById('g-cat').value,
      target:       U.num(document.getElementById('g-target').value),
      targetDate:   document.getElementById('g-date').value,
      personId:     document.getElementById('g-person').value,
      note:         document.getElementById('g-note').value,
      repeat:       document.getElementById('g-repeat').value,
      contributions:[],
      createdAt:    new Date().toISOString(),
      deleted:      false
    });
    DB.save();
    U.closeModal('goal-add-overlay');
    this.renderGoals();
    U.toast('✅ Goal added');
  },

  openGoal(id) {
    const g = DB.data.goals.find(x => x.id === id); if (!g) return;
    const saved = DB.goalSaved(id);
    const pct   = g.target > 0 ? U.clamp(Math.round((saved / g.target) * 100), 0, 100) : 0;
    const days  = g.targetDate ? U.daysFromNow(g.targetDate) : null;
    const short = Math.max(0, g.target - saved);
    const income= DB.data.settings.monthlyIncome || 45000;
    const monthsLeft = days ? Math.max(1, days / 30) : 1;
    const perMonth   = short / monthsLeft;
    const perDay     = short / Math.max(1, days ? days - 7 : 30);

    document.getElementById('goal-detail-body').innerHTML = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:36px">${U.goalIcon(g.category)}</div>
        <div style="font-family:var(--fd);font-size:18px;font-weight:600;margin-top:6px">${g.name}</div>
        <div style="font-size:11px;color:var(--txt-2)">${g.category}</div>
        <div style="font-family:var(--fm);font-size:28px;color:var(--green);margin-top:8px">${pct}%</div>
      </div>
      <div class="prog-wrap" style="margin-bottom:12px"><div class="prog-fill g" style="width:${pct}%"></div></div>
      <div class="card-xs">
        ${U.drow('Saved', U.fmt(saved))}
        ${U.drow('Target', U.fmt(g.target))}
        ${U.drow('Remaining', U.fmt(short), short > 0 ? 'r' : 'g')}
        ${g.targetDate ? U.drow('Target Date', U.fmtDate(g.targetDate)) : ''}
        ${days !== null ? U.drow('Days Left', days + ' days') : ''}
        ${U.drow('Save per day', U.fmtShort(perDay) + '/day to finish 1 week early')}
        ${U.drow('Save per month', U.fmt(perMonth) + ' (' + Math.round(perMonth/income*100) + '% of income)')}
        ${g.note ? U.drow('Notes', g.note) : ''}
        ${g.repeat ? U.drow('Repeats', g.repeat) : ''}
      </div>
      <div style="margin-top:10px">
        <div class="field"><div class="field-label">Add Savings (₱)</div>
          <input type="number" id="goal-add-amt" inputmode="decimal" placeholder="0.00" style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-m);padding:10px 12px;width:100%;font-size:14px;color:var(--txt)"/>
        </div>
        <button class="btn btn-g" style="margin-bottom:8px" onclick="Ledger.addToGoal('${id}')">+ Add Savings</button>
        <button class="btn btn-ghost" style="margin-bottom:8px" onclick="Ledger.moveGoal('${id}')">↔ Move Funds</button>
        <button class="btn btn-r" onclick="Ledger.deleteGoal('${id}')">Delete Goal</button>
      </div>`;
    U.openModal('goal-detail-overlay');
  },

  addToGoal(id) {
    const amt = U.num(document.getElementById('goal-add-amt')?.value);
    if (!amt || amt <= 0) { U.toast('Enter amount'); return; }
    const g = DB.data.goals.find(x => x.id === id); if (!g) return;
    g.contributions = g.contributions || [];
    g.contributions.push({ amount: amt, date: U.today() });
    DB.save();
    U.closeModal('goal-detail-overlay');
    this.renderGoals();
    U.toast(`✅ ${U.fmt(amt)} added to ${g.name}`);
  },

  moveGoal(fromId) {
    const goals = DB.data.goals.filter(g => !g.deleted && g.id !== fromId);
    if (!goals.length) { U.toast('No other goals to move to'); return; }
    const toName = prompt('Move to which goal?\n' + goals.map((g, i) => `${i + 1}. ${g.name}`).join('\n') + '\n\nEnter number:');
    const idx = parseInt(toName) - 1;
    if (isNaN(idx) || !goals[idx]) { U.toast('Invalid selection'); return; }
    const amt = U.num(prompt('How much to move? (₱)'));
    if (!amt) return;
    const from = DB.data.goals.find(x => x.id === fromId);
    const to   = goals[idx];
    from.contributions = from.contributions || [];
    from.contributions.push({ amount: -amt, date: U.today(), note: 'Moved to ' + to.name });
    to.contributions   = to.contributions || [];
    to.contributions.push({ amount: amt,  date: U.today(), note: 'Moved from ' + from.name });
    DB.save();
    U.closeModal('goal-detail-overlay');
    this.renderGoals();
    U.toast(`↔ ${U.fmt(amt)} moved to ${to.name}`);
  },

  deleteGoal(id) {
    const g = DB.data.goals.find(x => x.id === id); if (!g) return;
    const typed = prompt(`Type "${g.name}" to confirm deletion:`);
    if (typed !== g.name) { U.toast('Name did not match. Not deleted.'); return; }
    g.deleted = true;
    DB.save();
    U.closeModal('goal-detail-overlay');
    this.renderGoals();
    U.toast('🗑️ Goal deleted');
  }
};
