const storage = require('../../../utils/storage');
const auth = require('../../../utils/auth');


Page({
data: { pwd: '', show: false, loading: false },
onInput(e) { this.setData({ pwd: e.detail.value }); },
toggleShow() { this.setData({ show: !this.data.show }); },
onLogin() {
if (this.data.loading) return;
if (!this.data.pwd) { wx.showToast({ title: '请输入密码', icon: 'none' }); return; }
this.setData({ loading: true });


// TODO: 替换为后端校验；当前仅做前端演示
setTimeout(() => {
this.setData({ loading: false });
if (this.data.pwd === '123456') { // 占位密码
storage.set('adminToken', 'demo-token');
wx.reLaunch({ url: '/pages/AdminDashboard/index' });
} else {
wx.showToast({ title: '密码错误', icon: 'none' });
}
}, 600);
}
});