// ── OIKOS v2 · entry.js ──────────────────────

const Entry = {
  _type: 'out',
  _nec:  'needed',
  _mood: '',
  _recur: false,
  _photoB64: '',
  _editId: null,
  _walletId: '',
  _toWalletId: '',

  open(type = 'out', editId = null) {
    this._type = type; this._nec = 'needed'; this._mood = '';
    this._recur = false; this._photoB64 = ''; this._editId = editId;
    this._walletId   = DB.data.settings.wallets[0]?.id || '';
    this._toWalletId = DB.data.settings.wallets[1]?.id || DB.data.settings.wallets[0]?.id || '';
    this._populateSelects();
    this._resetForm();
    this._setType(type);
    if (editId) {
      const t = DB.data.transactions.find(x => x.id === editId);
      if (t) this._fillForm(t);
    }
    document.getElementById('entry-title').textContent =
      editId ? 'Edit Entry' : type === 'in' ? 'Cash In' : type === 'out' ? 'Cash Out' : 'Transfer';
    U.openModal('entry-overlay');
  },

  _resetForm() {
    ['e-amount','e-note','e-share'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const pp = document.getElementById('e-photo-preview'); if (pp) pp.innerHTML = '';
    const bh = document.getElementById('e-breath-hint');   if (bh) bh.style.display = 'none';
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('[data-nec]').forEach(c => c.classList.toggle('on', c.dataset.nec === 'needed'));
    const rt = document.getElementById('e-recur-toggle'); if (rt) rt.classList.remove('on');
  },

  _fillForm(t) {
    this._setType(t.type);
    document.getElementById('e-amount').value = t.amount;
    document.getElementById('e-note').value   = t.note || '';
    this._walletId   = t.walletId   || '';
    this._toWalletId = t.toWalletId || '';
    this._renderWalletChips();
    this._renderToWalletChips();
    this._renderCashWalletChips();
    const cs = document.getElementById('e-category'); if (cs) cs.value = t.category || '';
    const ps = document.getElementById('e-person');   if (ps) ps.value = t.personId || '';
    const gs = document.getElementById('e-goal');     if (gs) gs.value = t.goalId   || '';
    if (t.recurring) { this._recur = true; document.getElementById('e-recur-toggle')?.classList.add('on'); }
    if (t.mood) { this._mood = t.mood; document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('on', b.dataset.mood === t.mood)); }
    this._nec = t.necessity || 'needed';
    document.querySelectorAll('[data-nec]').forEach(c => c.classList.toggle('on', c.dataset.nec === this._nec));
    this._onPersonChange();
  },

  _populateSelects() {
    const people = DB.data.people.filter(p => !p.deleted);
    const ps = document.getElementById('e-person');
    if (ps) ps.innerHTML = '<option value="">— None —</option>' + people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const goals = DB.data.goals.filter(g => !g.deleted);
    const gs = document.getElementById('e-goal');
    if (gs) gs.innerHTML = '<option value="">— None —</option>' + goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  },

  // Wallet chip renderers
  _renderCashWalletChips() {
    const el = document.getElementById('e-cash-wallet-chips'); if (!el) return;
    if (!this._walletId) this._walletId = DB.data.settings.wallets[0]?.id || '';
    el.innerHTML = DB.data.settings.wallets.map(w =>
      `<div class="chip ${this._walletId === w.id ? 'on' : ''}" onclick="Entry._selectCashWallet('${w.id}')">${w.icon} ${w.label}</div>`
    ).join('');
  },

  _renderWalletChips() {
    const el = document.getElementById('e-wallet-chips'); if (!el) return;
    el.innerHTML = DB.data.settings.wallets.map(w =>
      `<div class="chip ${this._walletId === w.id ? 'on' : ''}" onclick="Entry._selectWallet('${w.id}')">${w.icon} ${w.label}</div>`
    ).join('');
  },

  _renderToWalletChips() {
    const el = document.getElementById('e-to-wallet-chips'); if (!el) return;
    el.innerHTML = DB.data.settings.wallets.filter(w => w.id !== this._walletId).map(w =>
      `<div class="chip ${this._toWalletId === w.id ? 'on' : ''}" onclick="Entry._selectToWallet('${w.id}')">${w.icon} ${w.label}</div>`
    ).join('');
  },

  _selectCashWallet(id) { this._walletId = id; this._renderCashWalletChips(); },
  _selectWallet(id) {
    this._walletId = id;
    if (this._toWalletId === id) {
      const other = DB.data.settings.wallets.find(w => w.id !== id);
      this._toWalletId = other?.id || '';
    }
    this._renderWalletChips(); this._renderToWalletChips();
  },
  _selectToWallet(id) { this._toWalletId = id; this._renderToWalletChips(); },

  setType(type) { this._setType(type); },

  _setType(type) {
    this._type = type;
    document.querySelectorAll('.type-btn').forEach(b => {
      b.classList.remove('sel-out','sel-in','sel-xfr');
      if (b.dataset.type === type) b.classList.add(`sel-${type}`);
    });
    const isOut = type === 'out', isIn = type === 'in', isXfr = type === 'xfr';

    // Wallet sections: cash in/out = single chip row, transfer = from+to chips
    this._show('e-cash-wallet-wrap', !isXfr);
    this._show('e-xfr-wallet-wrap',  isXfr);
    const cwl = document.getElementById('e-cash-wallet-label');
    if (cwl) cwl.textContent = isIn ? 'Add money to' : 'Pay from';

    this._show('e-cat-wrap',    !isXfr);
    this._show('e-nec-wrap',    isOut);
    this._show('e-mood-wrap',   isOut);
    this._show('e-person-wrap', isOut);
    this._show('e-share-wrap',  false);
    this._show('e-goal-wrap',   !isXfr);

    this._loadCats(isIn ? 'income' : 'expense');
    if (isXfr) { this._renderWalletChips(); this._renderToWalletChips(); }
    else { this._renderCashWalletChips(); }
  },

  _show(id, v) { const el = document.getElementById(id); if (el) el.style.display = v ? '' : 'none'; },

  _loadCats(type) {
    const s = document.getElementById('e-category'); if (!s) return;
    s.innerHTML = (DB.data.settings.categories[type] || []).map(c => `<option>${c}</option>`).join('');
  },

  setNec(el) {
    document.querySelectorAll('[data-nec]').forEach(c => c.classList.remove('on'));
    el.classList.add('on'); this._nec = el.dataset.nec;
  },

  setMood(btn) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on'); this._mood = btn.dataset.mood;
  },

  toggleRecur() {
    this._recur = !this._recur;
    document.getElementById('e-recur-toggle')?.classList.toggle('on', this._recur);
  },

  onAmountChange() {
    const v = U.num(document.getElementById('e-amount')?.value);
    const income = DB.data.settings.monthlyIncome || 45000;
    const hint = document.getElementById('e-breath-hint');
    if (hint) hint.style.display = (this._type === 'out' && v >= income * 0.08) ? '' : 'none';
    this._updateShareHint();
  },

  _onPersonChange() {
    const pid = document.getElementById('e-person')?.value;
    this._show('e-share-wrap', !!(pid && this._type === 'out'));
    this._updateShareHint();
  },

  _updateShareHint() {
    const amt = U.num(document.getElementById('e-amount')?.value);
    const shr = U.num(document.getElementById('e-share')?.value);
    const el  = document.getElementById('e-share-hint');
    if (el && amt && shr) el.textContent = `Your share: ${U.fmt(amt - shr)} · Their share: ${U.fmt(shr)}`;
    else if (el) el.textContent = '';
  },

  handlePhoto(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this._photoB64 = e.target.result;
      const prev = document.getElementById('e-photo-preview');
      if (prev) prev.innerHTML = `<img src="${this._photoB64}" style="width:100%;border-radius:var(--r-m);max-height:110px;object-fit:cover;margin-top:6px"/>`;
    };
    reader.readAsDataURL(file);
  },

  save() {
    const amount = U.num(document.getElementById('e-amount')?.value);
    if (!amount || amount <= 0) { U.toast('⚠️ Enter an amount'); return; }
    const isXfr     = this._type === 'xfr';
    const walletId   = this._walletId;
    const toWalletId = isXfr ? this._toWalletId : '';
    if (isXfr && walletId === toWalletId) { U.toast('⚠️ From and To wallet must be different'); return; }
    const category  = document.getElementById('e-category')?.value || (isXfr ? 'Transfer' : '');
    const note      = document.getElementById('e-note')?.value.trim() || '';
    const personId  = document.getElementById('e-person')?.value || '';
    const goalId    = document.getElementById('e-goal')?.value || '';
    const shareAmt  = U.num(document.getElementById('e-share')?.value);

    if (!this._editId) {
      const dup = DB.data.transactions.filter(t => !t.deleted).slice(0, 5)
        .find(t => t.amount === amount && t.date === U.today() && t.walletId === walletId);
      if (dup && !confirm('Possible duplicate. Save anyway?')) return;
    }

    const txn = {
      id: this._editId || U.uid(),
      type: this._type, amount, walletId, toWalletId,
      category, note, personId, goalId,
      necessity: this._type === 'out' ? this._nec : '',
      mood: this._mood, recurring: this._recur,
      photoData: this._photoB64, date: U.today(),
    };

    if (this._editId) {
      DB.updateTxn(this._editId, txn);
      U.toast('✅ Entry updated');
    } else {
      DB.addTxn(txn);
      if (personId && this._type === 'out' && shareAmt > 0) {
        const p = DB.data.people.find(x => x.id === personId);
        if (p) { p.debts = p.debts || []; p.debts.push({ id: U.uid(), txnId: txn.id, amount: shareAmt, paid: 0, note, date: U.today() }); DB.save(); }
      }
      if (goalId && this._type === 'in') {
        const g = DB.data.goals.find(x => x.id === goalId);
        if (g) { g.contributions = g.contributions || []; g.contributions.push({ amount, date: U.today() }); DB.save(); }
      }
      U.toast('✅ Saved');
    }
    U.closeModal('entry-overlay');
    App.refreshAll();
  },

  // ── TXN ROW ─────────────────────────────────
  txnRow(t) {
    const isIn  = t.type === 'in';
    const isXfr = t.type === 'xfr';
    const ico   = isIn ? '💰' : isXfr ? '🔄' : U.catIcon(t.category);
    const cls   = isIn ? 'g'  : isXfr ? 'b'  : 'r';
    const sign  = isIn ? '+'  : isXfr ? '⇄'  : '-';
    const w     = DB.data.settings.wallets.find(x => x.id === t.walletId);
    const tw    = DB.data.settings.wallets.find(x => x.id === t.toWalletId);
    const wlbl  = isXfr && w && tw ? `${w.label} → ${tw.label}` : w ? w.label : '';
    return `<div class="act-item" onclick="Entry.openDetail('${t.id}')">
      <div class="act-ico ${cls}">${ico}</div>
      <div class="act-det">
        <div class="act-ttl">${t.category || (isXfr ? 'Transfer' : 'Entry')}${t.note ? ' · ' + t.note : ''}</div>
        <div class="act-meta">${U.fmtDateShort(t.date)}${wlbl ? ' · ' + wlbl : ''}${t.mood ? ' ' + t.mood : ''}${t.recurring ? ' <span class="recur">↻</span>' : ''}</div>
      </div>
      <div class="act-amt ${cls}">${sign}${U.fmtShort(t.amount)}</div>
    </div>`;
  },

  openDetail(id) {
    const t  = DB.data.transactions.find(x => x.id === id); if (!t) return;
    const w  = DB.data.settings.wallets.find(x => x.id === t.walletId);
    const tw = DB.data.settings.wallets.find(x => x.id === t.toWalletId);
    const p  = t.personId ? DB.data.people.find(x => x.id === t.personId) : null;
    const g  = t.goalId   ? DB.data.goals.find(x => x.id === t.goalId)    : null;
    const sign  = t.type === 'in' ? '+' : t.type === 'xfr' ? '⇄' : '-';
    const color = t.type === 'in' ? 'green' : t.type === 'xfr' ? 'blue' : 'red';
    document.getElementById('txn-detail-body').innerHTML = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:38px">${t.type === 'xfr' ? '🔄' : U.catIcon(t.category)}</div>
        <div style="font-family:var(--fm);font-size:28px;color:var(--${color})">${sign}${U.fmt(t.amount)}</div>
        <div style="font-size:12px;color:var(--txt-2)">${t.category || (t.type === 'xfr' ? 'Transfer' : '')}</div>
      </div>
      ${t.photoData ? `<img src="${t.photoData}" style="width:100%;border-radius:var(--r-m);margin-bottom:12px;max-height:160px;object-fit:cover"/>` : ''}
      <div class="card-xs">
        ${U.drow('Date', U.fmtDate(t.date))}
        ${t.type === 'xfr'
          ? U.drow('Transfer', (w?.icon||'') + ' ' + (w?.label||'?') + ' → ' + (tw?.icon||'') + ' ' + (tw?.label||'?'))
          : U.drow('Wallet', w ? w.icon + ' ' + w.label : '')}
        ${U.drow('Necessity', U.necLabel(t.necessity))}
        ${U.drow('Mood', t.mood)}
        ${U.drow('Note', t.note)}
        ${p ? U.drow('Person', p.name) : ''}
        ${g ? U.drow('Goal',   g.name) : ''}
        ${t.recurring ? U.drow('Recurring', '↻ Monthly') : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-ghost btn-sm" style="flex:1"
          onclick="Entry.open('${t.type}','${t.id}');U.closeModal('txn-detail-overlay')">✏️ Edit</button>
        <button class="btn btn-r btn-sm" style="flex:1"
          onclick="Entry.confirmDelete('${t.id}')">🗑️ Delete</button>
      </div>`;
    U.openModal('txn-detail-overlay');
  },

  confirmDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    DB.deleteTxn(id);
    U.closeModal('txn-detail-overlay');
    App.refreshAll();
    U.toast('🗑️ Deleted');
  }
};
