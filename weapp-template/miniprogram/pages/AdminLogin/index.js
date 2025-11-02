const storage = require('../../utils/storage');

Page({
  data: {
    pwd: '',
    show: false,
    toggleText: '显示',
    loading: false
  },

  onInput(e) {
    this.setData({ pwd: e.detail.value });
  },

  toggleShow() {
    const nextShow = !this.data.show;
    this.setData({
      show: nextShow,
      toggleText: nextShow ? '隐藏' : '显示'
    });
  },

  onLogin() {
    if (this.data.loading) return;
    if (!this.data.pwd) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });

    // TODO: 接后端验证；此处仅演示
    setTimeout(() => {
      this.setData({ loading: false });
      if (this.data.pwd === '123456') {
        storage.set('adminToken', 'demo-token');
        wx.reLaunch({ url: '/pages/AdminDashboard/index' });
      } else {
        wx.showToast({ title: '密码错误', icon: 'none' });
      }
    }, 500);
  }
});
