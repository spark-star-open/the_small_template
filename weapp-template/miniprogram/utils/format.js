// utils/format.js
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function time(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${m}-${day} ${h}:${mi}`;
}

module.exports = { time };

