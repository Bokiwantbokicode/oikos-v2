// ── OIKOS v2 · db.js ─────────────────────────
// Data layer: localStorage + GitHub sync

const DB = {
  data: {
    transactions: [],
    people: [],
    goals: [],
    journal: [],
    vents: [],
    reports: [],
    settings: {
      userName: '',
      monthlyIncome: 45000,
      wallets: [
        { id: 'w1', label: 'GCash',  icon: '💳', color: 'cg', opening: 0 },
        { id: 'w2', label: 'BDO',    icon: '🏦', color: 'cb', opening: 0 },
        { id: 'w3', label: 'Wallet', icon: '👛', color: 'ca', opening: 0 }
      ],
      categories: {
        income:  ['Salary','Allowance','Freelance','Business','Gift','Refund','Other'],
        expense: ['Food & Dining','Transport','Bills & Utilities','Health & Medical',
                  'Rent / Housing','Lifestyle','Education','Gadgets','Clothing',
                  'Entertainment','Impulse Buy','Convenience','Gifts / Events','Savings','Other']
      },
      ghToken: '',
      ghRepo: '',
      syncJournal: false,
      lastSync: null,
      aiInsight: '',
      aiInsightDate: '',
      onboarded: false
    }
  },

  // ── LOAD / SAVE ──────────────────────────────
  load() {
    try {
      const raw = localStorage.getItem('oikos_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Deep merge settings
        this.data = {
          transactions: parsed.transactions || [],
          people:       parsed.people       || [],
          goals:        parsed.goals        || [],
          journal:      parsed.journal      || [],
          vents:        parsed.vents        || [],
          reports:      parsed.reports      || [],
          settings:     Object.assign({}, this.data.settings, parsed.settings || {})
        };
        // Ensure wallets array exists
        if (!Array.isArray(this.data.settings.wallets)) {
          this.data.settings.wallets = [
            { id: 'w1', label: 'GCash',  icon: '💳', color: 'cg', opening: 0 },
            { id: 'w2', label: 'BDO',    icon: '🏦', color: 'cb', opening: 0 },
            { id: 'w3', label: 'Wallet', icon: '👛', color: 'ca', opening: 0 }
          ];
        }
      }
    } catch (e) { console.warn('DB load error', e); }
  },

  save() {
    try {
      localStorage.setItem('oikos_v2', JSON.stringify(this.data));
      this._scheduleSyncDebounced();
    } catch (e) { console.warn('DB save error', e); }
  },

  // ── GITHUB SYNC ──────────────────────────────
  _syncTimer: null,
  _scheduleSyncDebounced: U.debounce
    ? function() { clearTimeout(this._syncTimer); this._syncTimer = setTimeout(() => this.syncToGitHub(), 30000); }
    : function() {},

  async syncToGitHub(force = false) {
    const { ghToken, ghRepo } = this.data.settings;
    if (!ghToken || !ghRepo) return;

    this._setSyncStatus('busy');
    try {
      // Build payload (exclude sensitive journal if toggle off)
      const payload = { ...this.data };
      if (!this.data.settings.syncJournal) {
        payload.journal = [];
        payload.vents   = [];
      }
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

      // Get current SHA
      let sha = null;
      try {
        const r = await fetch(`https://api.github.com/repos/${ghRepo}/contents/oikos-data.json`, {
          headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (r.ok) { const j = await r.json(); sha = j.sha; }
      } catch (_) {}

      // Write
      const body = { message: `oikos sync ${new Date().toISOString()}`, content };
      if (sha) body.sha = sha;

      const res = await fetch(`https://api.github.com/repos/${ghRepo}/contents/oikos-data.json`, {
        method: 'PUT',
        headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        this.data.settings.lastSync = new Date().toISOString();
        localStorage.setItem('oikos_v2', JSON.stringify(this.data));
        this._setSyncStatus('ok');
        return true;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      this._setSyncStatus('err');
      console.warn('Sync error', e);
      return false;
    }
  },

  async checkAutoSync() {
    const last = this.data.settings.lastSync;
    if (!last) { await this.syncToGitHub(); return; }
    const hoursSince = (Date.now() - new Date(last)) / 36e5;
    if (hoursSince >= 6) await this.syncToGitHub();
  },

  async testConnection() {
    const { ghToken, ghRepo } = this.data.settings;
    if (!ghToken || !ghRepo) return false;
    try {
      const r = await fetch(`https://api.github.com/repos/${ghRepo}`, {
        headers: { Authorization: `token ${ghToken}` }
      });
      return r.ok;
    } catch (_) { return false; }
  },

  _setSyncStatus(status) {
    const dot = document.getElementById('sync-dot');
    const lbl = document.getElementById('sync-lbl');
    if (!dot) return;
    dot.className = 'sync-dot ' + status;
    if (lbl) lbl.textContent = status === 'ok' ? 'Synced' : status === 'busy' ? 'Syncing…' : 'Sync error';
  },

  // ── COMPUTED ─────────────────────────────────
  walletBalance(walletId) {
    const w = this.data.settings.wallets.find(x => x.id === walletId);
    if (!w) return 0;
    let bal = U.num(w.opening);
    this.data.transactions.filter(t => !t.deleted).forEach(t => {
      if (t.type === 'in'  && t.walletId === walletId) bal += t.amount;
      if (t.type === 'out' && t.walletId === walletId) bal -= t.amount;
      if (t.type === 'xfr' && t.walletId   === walletId) bal -= t.amount;
      if (t.type === 'xfr' && t.toWalletId === walletId) bal += t.amount;
    });
    return bal;
  },

  monthTxns(month) {
    return this.data.transactions.filter(t => !t.deleted && t.date.startsWith(month));
  },

  personBalance(personId) {
    let bal = 0;
    const p = this.data.people.find(x => x.id === personId);
    if (!p) return 0;
    (p.debts || []).forEach(d => { bal += (d.amount - (d.paid || 0)); });
    return bal;
  },

  goalSaved(goalId) {
    const g = this.data.goals.find(x => x.id === goalId);
    if (!g) return 0;
    return (g.contributions || []).reduce((s, c) => s + c.amount, 0);
  },

  // ── MUTATION HELPERS ─────────────────────────
  addTxn(txn) {
    txn.id = txn.id || U.uid();
    txn.createdAt = new Date().toISOString();
    txn.deleted = false;
    txn.changelog = [{ action: 'created', at: txn.createdAt }];
    this.data.transactions.unshift(txn);
    this.save();
    return txn;
  },

  updateTxn(id, updates) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx < 0) return;
    const old = this.data.transactions[idx];
    this.data.transactions[idx] = { ...old, ...updates, changelog: [...(old.changelog || []), { action: 'edited', at: new Date().toISOString() }] };
    this.save();
  },

  deleteTxn(id) {
    const t = this.data.transactions.find(x => x.id === id);
    if (t) { t.deleted = true; t.changelog.push({ action: 'deleted', at: new Date().toISOString() }); }
    this.save();
  }
};
