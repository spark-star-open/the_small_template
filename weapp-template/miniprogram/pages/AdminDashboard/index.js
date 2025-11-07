const auth = require('../../utils/auth');
const adminSrv = require('../../services/admin.service');
const fmt = require('../../utils/format');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    filters: { date: '', keyword: '' },
    navigating: false
  },

  onLoad() { this._alive = true; },
  onUnload() { this._alive = false; },
  onShow() { if (!auth.ensureAdmin()) return; try{ const f=wx.getStorageSync('surveys_need_refresh'); if (f==='1'){ wx.removeStorageSync('surveys_need_refresh'); this.fetchList(true); return; } }catch(e){} if (!this.data.list.length) this.fetchList(true); },

  onPullDownRefresh() { this.fetchList(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.fetchList(false); },

  onDate(e) { this.setData({ 'filters.date': e.detail.value }); this.fetchList(true); },
  onKeyword(e) { this.setData({ 'filters.keyword': e.detail.value }); },
  refresh() { this.fetchList(true); },

  fetchList(reset) {
    if (reset) this.setData({ page: 1, hasMore: true, list: [] });
    if (!this.data.hasMore) return;
    this.setData({ loading: true });

    const params = { page: this.data.page, pageSize: this.data.pageSize, ...(this.data.filters || {}) };
    adminSrv.listSurveys(params)
      .then(res => {
        if (!this._alive) return;
        const rows = (res.rows || []).map(x => {
          const y = Object.assign({}, x);
          y.timeText = fmt.time(x.updatedAt || x.createdAt || x.ts || Date.now());
          y.statusText = x.status === 'active' ? '进行中' : (x.status === 'archived' ? '已归档' : (x.status === 'done' ? '已完成' : '待处理'));
          return y;
        });
        const list = this.data.list.concat(rows);
        this.setData({ list, page: this.data.page + 1, hasMore: !!res.hasMore });
      })
      .finally(() => {
        if (!this._alive) return;
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      });
  },

  goDetail(e) {
    if (this.data.navigating) return;
    const id = e.currentTarget.dataset.id;
    this.setData({ navigating: true });
    wx.navigateTo({ url: `/pages/SurveyDetail/index?id=${id}`, complete: () => this.setData({ navigating: false }) });
  },

  exportExcel() { wx.showToast({ title: '已发起导出（示例）', icon: 'none' }); },
  goAnalytics() { wx.showToast({ title: '统计页可后续添加', icon: 'none' }); },
  goHome() {
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    wx.reLaunch({ url: '/pages/role-select/index', complete: () => this.setData({ navigating: false }) });
  }
});
