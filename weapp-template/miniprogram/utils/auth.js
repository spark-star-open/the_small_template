// utils/auth.js
module.exports = {
  ensureAdmin() {
    try {
      const token = wx.getStorageSync('adminToken');
      if (token === 'ok') return true;
      wx.showToast({ title: '请先登录管理员', icon: 'none' });
      wx.reLaunch({ url: '/pages/AdminLogin/index' });
      return false;
    } catch (e) {
      return false;
    }
  }
};

