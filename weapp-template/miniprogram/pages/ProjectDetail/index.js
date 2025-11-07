const adminSrv = require('../../services/admin.service');
const fmt = require('../../utils/format');

Page({
  data: {
    projectId: '',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    navigating: false
  },

  onLoad(options) {
    const id = (options && options.id) || '';
    this.setData({ projectId: id });
    this._alive = true;
    this.fetch(true);
  },
  onUnload() { this._alive = false; },

  onShow() { if (this.data.projectId) this.fetch(true); },
  onPullDownRefresh() { this.fetch(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.fetch(false); },

  fetch(reset) {
    if (!this.data.projectId) return;
    if (reset) this.setData({ page: 1, hasMore: true, list: [] });
    if (!this.data.hasMore) return;
    this.setData({ loading: true });

    adminSrv.getRecords(this.data.projectId, this.data.page, this.data.pageSize)
      .then(res => {
        if (!this._alive) return;
        const rows = (res.rows || []).map(r => {
          const y = Object.assign({}, r);
          y.timeText = fmt.time(r.ts || r.createdAt || Date.now());
          y.statusText = r.status === 'done' ? '已完成' : '待处理';
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

  goBack() {
    if (getCurrentPages && getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url: '/pages/AdminDashboard/index' });
    }
  },

  goRecordDetail(e) {
    if (this.data.navigating) return;
    const id = e.currentTarget.dataset.id;
    this.setData({ navigating: true });
    wx.navigateTo({ url: `/pages/RecordDetail/index?id=${id}`, complete: () => this.setData({ navigating: false }) });
  },

  addRecord() {
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    wx.navigateTo({ url: `/pages/AddRecordForm/index?projectId=${this.data.projectId}`, complete: () => this.setData({ navigating: false }) });
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ loading: true });
          adminSrv.deleteRecord(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'none' });
            this.fetch(true);
          }).catch(err => {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }).finally(() => {
            this.setData({ loading: false });
          });
        }
      }
    });
  }
});
