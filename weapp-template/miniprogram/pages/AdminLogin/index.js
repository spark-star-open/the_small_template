// miniprogram/pages/AdminLogin/index.js

Page({
  data: {
    pwd: '',
    show: false,
    toggleText: '显示',
    loading: false,
    msg: ''
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

  // 返回主页面（角色选择）
  goHome() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  onLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true, msg: '' });

    wx.cloud.callFunction({
      name: 'auth',
      data: { op: 'login', pwd: this.data.pwd }
    }).then(res => {
      const { code, data, msg } = res.result || {};
      if (code !== 0) throw new Error(msg || '登录失败');

      const roles = (data && data.roles) || [];
      if (roles.includes('admin')) {
        // 用内置存储
        wx.setStorageSync('adminToken', 'ok');
        wx.showToast({ title: '管理员登录成功', icon: 'success' });
        wx.reLaunch({ url: '/pages/AdminDashboard/index' });
      } else {
        this.setData({ msg: '当前账号不是管理员，请联系管理员在后台添加权限' });
        wx.showToast({ title: '非管理员', icon: 'none' });
      }
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
      this.setData({ msg: err.message || '' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
