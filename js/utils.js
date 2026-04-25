// ── OIKOS v2 · utils.js ──────────────────────
// Shared helpers used by all modules

const U = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2),
  today: () => new Date().toISOString().slice(0, 10),
  thisMonth: () => new Date().toISOString().slice(0, 7),

  fmt: n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  fmtShort: n => {
    n = Number(n || 0);
    if (Math.abs(n) >= 1000000) return '₱' + (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return '₱' + (n / 1000).toFixed(1) + 'K';
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  fmtDate: iso => {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  fmtDateShort: iso => {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  },
  monthName: iso => {
    if (!iso) return '';
    return new Date(iso + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  },
  daysFromNow: iso => Math.ceil((new Date(iso) - new Date(U.today())) / 864e5),
  weeksInMonth: (y, m) => Math.ceil(new Date(y, m + 1, 0).getDate() / 7),
  daysInMonth: (y, m) => new Date(y, m + 1, 0).getDate(),

  // Toast notification
  toast: (msg, dur = 2400) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), dur);
  },

  // Modal helpers
  openModal: id => document.getElementById(id)?.classList.add('open'),
  closeModal: id => document.getElementById(id)?.classList.remove('open'),
  closeAllModals: () => document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')),

  // Detail row helper
  drow: (label, val, cls = '') => val
    ? `<div class="d-row"><span class="d-lbl">${label}</span><span class="d-val ${cls}">${val}</span></div>`
    : '',

  // Safe number
  num: v => isFinite(+v) ? +v : 0,

  // Clamp
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),

  // Debounce
  debounce: (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // Month offset
  monthOffset: (base, offset) => {
    const d = new Date(base + '-01');
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 7);
  },

  // Color classes
  walletColors: ['cg', 'cb', 'ca', 'cr', 'cp', 'cg', 'cb', 'ca'],
  walletIcons:  ['💳', '🏦', '👛', '💰', '📱', '🏧', '💵', '🪙'],

  // Avatar color from name
  avatarColor: name => {
    const colors = ['#1d6e34','#0d4a9e','#7c3d1a','#4a0d9e','#9e0d3a','#0d6e6e'];
    return colors[name.charCodeAt(0) % colors.length];
  },

  // Category icons
  catIcon: cat => {
    const m = {
      'Food & Dining':'🍚','Transport':'🚌','Bills & Utilities':'🧾',
      'Health & Medical':'🏥','Rent / Housing':'🏠','Lifestyle':'👗',
      'Education':'🎓','Gadgets':'📱','Clothing':'👔','Entertainment':'🎮',
      'Impulse Buy':'🛒','Convenience':'☕','Gifts / Events':'🎁',
      'Savings':'💰','Other':'📌',
      'Salary':'💼','Allowance':'👨‍👩‍👧','Freelance':'💻',
      'Business':'🏪','Gift':'🎁','Refund':'↩️'
    };
    return m[cat] || '💸';
  },

  goalIcon: cat => {
    const m = { savings:'💰', trip:'✈️', event:'🎉', gadget:'📱', maintenance:'🔧', health:'🏥', hobby:'🎯', other:'📌' };
    return m[cat] || '📌';
  },

  // Necessity label
  necLabel: n => ({ needed:'✅ Needed', avoid:'⚠️ Could Avoid', wasteful:'❌ Wasteful' })[n] || '',

  // Resolution label
  resLabel: r => ({ resolved:'✅ Resolved', still:'⚠️ Still affects me', grew:'🌱 Grew from it', unresolved:'❌ Unresolved' })[r] || '',

  // Export helpers
  downloadFile: (name, type, content) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
