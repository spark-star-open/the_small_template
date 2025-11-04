// services/admin.service.js
// Minimal stub service for demo purposes

function list({ page = 1, pageSize = 10, date = '', keyword = '' } = {}) {
  return new Promise((resolve) => {
    // Simulate empty dataset
    resolve({ rows: [], hasMore: false });
  });
}

function detail(id) {
  return new Promise((resolve) => {
    // Simulate a record detail
    resolve({ id, ts: Date.now(), status: 'pending' });
  });
}

module.exports = { list, detail };

