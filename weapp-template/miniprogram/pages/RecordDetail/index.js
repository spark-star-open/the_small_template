const adminSrv = require('../../services/admin.service');
const fmt = require('../../utils/format');

Page({
  data: { detail: null },
  onLoad(options) {
    const id = options.id;
    this.fetch(id);
  },
  fetch(id) {
    adminSrv.detail(id).then(d => {
      if (!d) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        setTimeout(() => { wx.navigateBack(); }, 1500);
        return;
      }
      d.timeText = fmt.time(d.ts || d.createdAt || Date.now());
      d.statusText = d.status === 'done' ? '已完成' : '待处理';
      this.setData({ detail: d });
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  }
});
