// ── OIKOS v2 · entry.js ──────────────────────

const Entry = {
  _type: 'out',
  _nec:  'needed',
  _mood: '',
  _recur: false,
  _photoB64: '',
  _editId: null,

  open(editId = null) {
    this._type = 'out'; this._nec = 'needed'; this._mood = '';
    this._recur = false; this._photoB64 = ''; this._editId = editId;

    this._populateSelects();
    this._setType('out');
    this._resetForm();

    if (editId) {
      const t = DB.data.transactions.find(x => x.id === editId);
      if (t) this._fillForm(t);
    }
    document.getElementById('entry-title').textContent = editId ? 'Edit Entry' : 'New Entry';
    U.openModal('entry-overlay');
  },

  _resetForm() {
    ['e-amount','e-note','e-share'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('e-photo-preview').innerHTML = '';
    document.getElementById('e-breath-hint').style.display = 'none';
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('[data-nec]').forEach(c => c.classList.toggle('on', c.dataset.nec === 'needed'));
    const rt = document.getElementById('e-recur-toggle'); if (rt) rt.classList.remove('on');
  },

  _fillForm(t) {
    this._setType(t.type);
    document.getElementById('e-amount').value = t.amount;
    document.getElementById('e-note').value   = t.note || '';
    const ws = document.getElementById('e-wallet');    if (ws) ws.value = t.walletId || '';
    const cs = document.getElementById('e-category');  if (cs) cs.value = t.category || '';
    const ps = document.getElementById('e-person');    if (ps) ps.value = t.personId || '';
    const gs = document.getElementById('e-goal');      if (gs) gs.value = t.goalId   || '';
    if (t.recurring) { this._recur = true; document.getElementById('e-recur-toggle')?.classList.add('on'); }
    if (t.mood) { this._mood = t.mood; document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('on', b.dataset.mood === t.mood)); }
    this._nec = t.necessity || 'needed';
    document.querySelectorAll('[data-nec]').forEach(c => c.classList.toggle('on', c.dataset.nec === this._nec));
    this._onPersonChange();
  },

  _populateSelects() {
    const wallets = DB.data.settings.wallets;
    ['e-wallet','e-to-wallet'].forEach(id => {
      const s = document.getElementById(id);
      if (s) s.innerHTML = wallets.map(w => `<option value="${w.id}">${w.icon} ${w.label}</option>`).join('');
    });
    const people = DB.data.people.filter(p => !p.deleted);
    const ps = document.getElementById('e-person');
    if (ps) ps.innerHTML = '<option value="">— None —</option>' + people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const goals = DB.data.goals.filter(g => !g.deleted);
    const gs = document.getElementById('e-goal');
    if (gs) gs.innerHTML = '<option value="">— None —</option>' + goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  },

  setType(type) { this._setType(type); },

  _setType(type) {
    this._type = type;
    document.querySelectorAll('.type-btn').forEach(b => {
      b.classList.remove('sel-out','sel-in','sel-xfr');
      if (b.dataset.type === type) b.classList.add(`sel-${type}`);
    });
    const isOut = type === 'out', isIn = type === 'in', isXfr = type === 'xfr';
    this._show('e-cat-wrap',   !isXfr);
    this._show('e-nec-wrap',   isOut);
    this._show('e-mood-wrap',  isOut);
    this._show('e-person-wrap',isOut);
    this._show('e-share-wrap', false);
    this._show('e-goal-wrap',  !isXfr);
    this._show('e-to-wallet-wrap', isXfr);
    document.getElementById('e-wallet-label').textContent = isIn ? 'Deposit To' : isOut ? 'Pay From' : 'From Wallet';
    this._loadCats(isIn ? 'income' : 'expense');
  },

  _show(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  },

  _loadCats(type) {
    const s = document.getElementById('e-category');
    if (!s) return;
    s.innerHTML = DB.data.settings.categories[type].map(c => `<option>${c}</option>`).join('');
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
    const share = U.num(document.getElementById('e-share')?.value);
    const el = document.getElementById('e-share-hint');
    if (el && amt && share) el.textContent = `Your share: ${U.fmt(amt - share)} · Their share: ${U.fmt(share)}`;
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

    const walletId  = document.getElementById('e-wallet')?.value;
    const category  = document.getElementById('e-category')?.value || '';
    const note      = document.getElementById('e-note')?.value.trim() || '';
    const personId  = document.getElementById('e-person')?.value || '';
    const goalId    = document.getElementById('e-goal')?.value || '';
    const toWalletId= document.getElementById('e-to-wallet')?.value || '';
    const shareAmt  = U.num(document.getElementById('e-share')?.value);

    // Duplicate check
    if (!this._editId) {
      const dup = DB.data.transactions.filter(t => !t.deleted).slice(0, 5)
        .find(t => t.amount === amount && t.date === U.today() && t.walletId === walletId);
      if (dup && !confirm('Possible duplicate. Save anyway?')) return;
    }

    const txn = {
      id:         this._editId || U.uid(),
      type:       this._type,
      amount,     walletId,  category, note,
      personId,   goalId,    toWalletId,
      necessity:  this._type === 'out' ? this._nec : '',
      mood:       this._mood,
      recurring:  this._recur,
      photoData:  this._photoB64,
      date:       U.today(),
    };

    if (this._editId) {
      DB.updateTxn(this._editId, txn);
      U.toast('✅ Entry updated');
    } else {
      DB.addTxn(txn);

      // Person debt
      if (personId && this._type === 'out' && shareAmt > 0) {
        const p = DB.data.people.find(x => x.id === personId);
        if (p) {
          p.debts = p.debts || [];
          p.debts.push({ id: U.uid(), txnId: txn.id, amount: shareAmt, paid: 0, note, date: U.today() });
          DB.save();
        }
      }

      // Goal contribution
      if (goalId && this._type === 'in') {
        const g = DB.data.goals.find(x => x.id === goalId);
        if (g) { g.contributions = g.contributions || []; g.contributions.push({ amount, date: U.today() }); DB.save(); }
      }
      U.toast('✅ Saved');
    }

    U.closeModal('entry-overlay');
    App.refreshAll();
  },

  // ── TXN ROW (shared renderer) ──────────────
  txnRow(t) {
    const ico  = t.type === 'in' ? '💰' : t.type === 'xfr' ? '🔄' : U.catIcon(t.category);
    const cls  = t.type === 'in' ? 'g'  : t.type === 'xfr' ? 'b'  : 'r';
    const sign = t.type === 'in' ? '+' : t.type === 'xfr' ? '⇄' : '-';
    const w    = DB.data.settings.wallets.find(x => x.id === t.walletId);
    return `<div class="act-item" onclick="Entry.openDetail('${t.id}')">
      <div class="act-ico ${cls}">${ico}</div>
      <div class="act-det">
        <div class="act-ttl">${t.category || 'Entry'}${t.note ? ' · ' + t.note : ''}</div>
        <div class="act-meta">${U.fmtDateShort(t.date)}${w ? ' · ' + w.label : ''}${t.mood ? ' ' + t.mood : ''}${t.recurring ? ' <span class="recur">↻</span>' : ''}</div>
      </div>
      <div class="act-amt ${cls}">${sign}${U.fmtShort(t.amount)}</div>
    </div>`;
  },

  openDetail(id) {
    const t = DB.data.transactions.find(x => x.id === id); if (!t) return;
    const w = DB.data.settings.wallets.find(x => x.id === t.walletId);
    const tw= DB.data.settings.wallets.find(x => x.id === t.toWalletId);
    const p = t.personId ? DB.data.people.find(x => x.id === t.personId) : null;
    const g = t.goalId   ? DB.data.goals.find(x => x.id === t.goalId)    : null;
    const sign = t.type === 'in' ? '+' : '-';
    const cls  = t.type === 'in' ? 'g' : t.type === 'xfr' ? 'b' : 'r';

    document.getElementById('txn-detail-body').innerHTML = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:38px">${U.catIcon(t.category)}</div>
        <div style="font-family:var(--fm);font-size:28px;color:var(--${t.type==='in'?'green':t.type==='xfr'?'blue':'red'})">${sign}${U.fmt(t.amount)}</div>
        <div style="font-size:12px;color:var(--txt-2)">${t.category || ''}</div>
      </div>
      ${t.photoData ? `<img src="${t.photoData}" style="width:100%;border-radius:var(--r-m);margin-bottom:12px;max-height:160px;object-fit:cover"/>` : ''}
      <div class="card-xs">
        ${U.drow('Date', U.fmtDate(t.date))}
        ${U.drow('Wallet', w ? w.icon + ' ' + w.label : '')}
        ${tw ? U.drow('To Wallet', tw.icon + ' ' + tw.label) : ''}
        ${U.drow('Necessity', U.necLabel(t.necessity))}
        ${U.drow('Mood', t.mood)}
        ${U.drow('Note', t.note)}
        ${p ? U.drow('Person', p.name) : ''}
        ${g ? U.drow('Goal', g.name) : ''}
        ${t.recurring ? U.drow('Recurring', '↻ Monthly') : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="Entry.open('${t.id}');U.closeModal('txn-detail-overlay')">✏️ Edit</button>
        <button class="btn btn-r btn-sm" style="flex:1" onclick="Entry.confirmDelete('${t.id}')">🗑️ Delete</button>
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
