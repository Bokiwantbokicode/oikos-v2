// ── OIKOS v2 · settings.js ───────────────────

const Settings = {
  init() { this.render(); },

  render() {
    const s = DB.data.settings;
    this._setVal('cfg-name',   s.userName || '');
    this._setVal('cfg-income', s.monthlyIncome || 45000);
    this._setVal('cfg-token',  s.ghToken  || '');
    this._setVal('cfg-repo',   s.ghRepo   || '');
    const jt = document.getElementById('cfg-journal-toggle');
    if (jt) jt.classList.toggle('on', !!s.syncJournal);
    this._renderWallets();
    this._renderCats();
    this._renderLastSync();
  },

  _setVal(id, val) {
    const el = document.getElementById(id); if (el) el.value = val;
  },

  save(key, val) {
    DB.data.settings[key] = val;
    DB.save();
    if (key === 'userName') App.updateGreeting();
    U.toast('✅ Saved');
  },

  // ── WALLETS ────────────────────────────────
  _renderWallets() {
    const el = document.getElementById('wallet-editor'); if (!el) return;
    const wallets = DB.data.settings.wallets;
    const colors = [
      { cls: 'cg', label: '🟢 Green' }, { cls: 'cb', label: '🔵 Blue' },
      { cls: 'ca', label: '🟡 Amber' }, { cls: 'cr', label: '🔴 Red'  }, { cls: 'cp', label: '🟣 Purple' }
    ];
    el.innerHTML = wallets.map((w, i) => `
      <div class="set-item" style="flex-wrap:wrap;gap:6px;padding:12px 0">
        <div style="display:flex;align-items:center;gap:8px;width:100%">
          <input value="${w.icon}" id="wicon-${i}" maxlength="2" style="width:36px;text-align:center;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-s);padding:5px;font-size:16px;color:var(--txt)" onchange="Settings.updateWallet(${i})"/>
          <input value="${w.label}" id="wlbl-${i}" style="flex:1;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-m);padding:7px 10px;font-size:13px;color:var(--txt)" onchange="Settings.updateWallet(${i})" placeholder="Wallet name"/>
          <input type="number" value="${w.opening || 0}" id="wopen-${i}" style="width:90px;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-m);padding:7px 10px;font-size:12px;color:var(--green);font-family:var(--fm)" onchange="Settings.updateWallet(${i})" placeholder="Opening ₱"/>
          ${wallets.length > 1 ? `<button onclick="Settings.removeWallet(${i})" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;padding:4px">×</button>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${colors.map(c => `<div class="chip ${w.color === c.cls ? 'on' : ''}" style="font-size:10px;padding:3px 8px" onclick="Settings.setWalletColor(${i},'${c.cls}')">${c.label}</div>`).join('')}
        </div>
      </div>`).join('') +
      `<button class="btn btn-ghost" style="margin-top:8px;font-size:13px" onclick="Settings.addWallet()">+ Add Wallet</button>`;
  },

  updateWallet(i) {
    const w = DB.data.settings.wallets[i];
    if (!w) return;
    w.icon    = document.getElementById(`wicon-${i}`)?.value || w.icon;
    w.label   = document.getElementById(`wlbl-${i}`)?.value  || w.label;
    w.opening = U.num(document.getElementById(`wopen-${i}`)?.value);
    DB.save(); Home.render(); U.toast('✅ Wallet updated');
  },

  setWalletColor(i, cls) {
    DB.data.settings.wallets[i].color = cls;
    DB.save(); this._renderWallets(); Home.render();
  },

  addWallet() {
    const i = DB.data.settings.wallets.length;
    const colors = ['cg','cb','ca','cr','cp'];
    const icons  = ['💳','🏦','👛','💰','📱'];
    DB.data.settings.wallets.push({ id: U.uid(), label: 'New Wallet', icon: icons[i % icons.length], color: colors[i % colors.length], opening: 0 });
    DB.save(); this._renderWallets(); Home.render();
    U.toast('✅ Wallet added');
  },

  removeWallet(i) {
    if (!confirm('Remove this wallet? Transactions linked to it will remain but balance will not be counted.')) return;
    DB.data.settings.wallets.splice(i, 1);
    DB.save(); this._renderWallets(); Home.render();
    U.toast('🗑️ Wallet removed');
  },

  // ── CATEGORIES ─────────────────────────────
  _renderCats() {
    const el = document.getElementById('cat-editor'); if (!el) return;
    const cats = DB.data.settings.categories.expense;
    el.innerHTML = cats.map((c, i) => `
      <div class="set-item">
        <input value="${c}" style="background:transparent;color:var(--txt);font-size:13px;flex:1;border:none;outline:none" onchange="Settings.renameCat(${i},this.value)"/>
        <button onclick="Settings.deleteCat(${i})" style="background:none;border:none;color:var(--txt-3);cursor:pointer;font-size:15px;padding:4px">×</button>
      </div>`).join('');
  },

  renameCat(i, val) { DB.data.settings.categories.expense[i] = val; DB.save(); },
  deleteCat(i) { DB.data.settings.categories.expense.splice(i, 1); DB.save(); this._renderCats(); },
  addCat() {
    const name = prompt('New expense category:');
    if (name) { DB.data.settings.categories.expense.push(name); DB.save(); this._renderCats(); U.toast('✅ Category added'); }
  },

  // ── GITHUB ─────────────────────────────────
  async testGitHub() {
    DB.data.settings.ghToken = document.getElementById('cfg-token')?.value || '';
    DB.data.settings.ghRepo  = document.getElementById('cfg-repo')?.value  || '';
    DB.save();
    U.toast('Testing…');
    const ok = await DB.testConnection();
    U.toast(ok ? '✅ GitHub connected!' : '❌ Connection failed — check token/repo');
  },

  async syncNow() {
    U.toast('Syncing…');
    const ok = await DB.syncToGitHub(true);
    U.toast(ok ? '✅ Synced to GitHub' : '❌ Sync failed');
    this._renderLastSync();
  },

  _renderLastSync() {
    const el = document.getElementById('last-sync-lbl');
    const ls = DB.data.settings.lastSync;
    if (el) el.textContent = ls ? 'Last sync: ' + new Date(ls).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' }) : 'Never synced';
  },

  toggleJournalSync() {
    DB.data.settings.syncJournal = !DB.data.settings.syncJournal;
    DB.save();
    const el = document.getElementById('cfg-journal-toggle');
    if (el) el.classList.toggle('on', DB.data.settings.syncJournal);
    U.toast(DB.data.settings.syncJournal ? 'Journal will sync to GitHub' : 'Journal stays local only');
  },

  // ── EXPORT ─────────────────────────────────
  exportCSV() {
    const rows = [['Date','Type','Amount','Wallet','Category','Necessity','Note','Mood','Person','Goal','Recurring']];
    DB.data.transactions.filter(t => !t.deleted).forEach(t => {
      const w = DB.data.settings.wallets.find(x => x.id === t.walletId);
      const p = t.personId ? DB.data.people.find(x => x.id === t.personId)?.name : '';
      const g = t.goalId   ? DB.data.goals.find(x => x.id === t.goalId)?.name    : '';
      rows.push([t.date, t.type, t.amount, w?.label || '', t.category, t.necessity, t.note, t.mood, p, g, t.recurring ? 'Yes' : '']);
    });
    const csv = rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    U.downloadFile('oikos-export.csv', 'text/csv;charset=utf-8', csv);
    U.toast('📥 CSV exported');
  },

  exportJSON() {
    U.downloadFile('oikos-backup.json', 'application/json', JSON.stringify(DB.data, null, 2));
    U.toast('📥 JSON exported');
  },

  clearData() {
    if (!confirm('Delete ALL local data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Type OK to confirm.')) return;
    localStorage.removeItem('oikos_v2');
    location.reload();
  }
};
