const adminSrv = require('../../services/admin.service');

Page({
  data: { detail: null, loading: false },
  onLoad(options) {
    const id = options.id;
    this.fetch(id);
  },
  fetch(id) {
    adminSrv.getSurvey(id).then(d => {
      if (!d) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        setTimeout(() => { wx.navigateBack(); }, 1500);
        return;
      }
      this.setData({ detail: d });
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },
  markDone() {
    if (this.data.loading) return;
    const d = this.data.detail || {};
    const id = d._id;
    if (!id) return;
    this.setData({ loading: true });
    adminSrv.updateSurvey(id, { status: 'done' }).then(() => {
      this.setData({ 'detail.status': 'done', loading: false });
      try { wx.setStorageSync('surveys_need_refresh', '1'); } catch (e) {}
      wx.showToast({ title: '已处理', icon: 'success' });
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: (err && err.message) ? err.message : '操作失败', icon: 'none' });
    });
  },
  goBack() {
    if (getCurrentPages && getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url: '/pages/AdminDashboard/index' });
    }
  }
});
