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
    filters: { date: '', keyword: '' }
  },

  onShow() {
    if (!auth.ensureAdmin()) return; // 未登录会被重定向
    if (!this.data.list.length) {
      this.fetchList(true);
    }
  },

  onPullDownRefresh() { this.fetchList(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.fetchList(false); },

  onDate(e) {
    this.setData({ 'filters.date': e.detail.value });
    this.fetchList(true);
  },
  onKeyword(e) { this.setData({ 'filters.keyword': e.detail.value }); },
  refresh() { this.fetchList(true); },

  fetchList(reset) {
    if (reset) this.setData({ page: 1, hasMore: true, list: [] });
    if (!this.data.hasMore) return;
    this.setData({ loading: true });

    (function(){
      const params = { page: this.data.page, pageSize: this.data.pageSize };
      Object.assign(params, this.data.filters || {});
      return adminSrv.list(params)
        .then(res => {
          const rows = (res.rows || []).map(x => {
            const y = Object.assign({}, x);
            y.timeText = fmt.time(x.updatedAt || x.createdAt || x.ts || Date.now());
            y.statusText = x.status === 'active' ? '进行中' : (x.status === 'archived' ? '已归档' : (x.status === 'done' ? '已完成' : '待处理'));
            return y;
          });
          const list = this.data.list.concat(rows);
          this.setData({ list: list, page: this.data.page + 1, hasMore: !!res.hasMore });
        })
    }).call(this)
      .finally(() => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ProjectDetail/index?id=${id}` });
  },

  exportExcel() { wx.showToast({ title: '已发起导出（示例）', icon: 'none' }); },
  goAnalytics() { wx.showToast({ title: '统计页可后续添加', icon: 'none' }); }
});
