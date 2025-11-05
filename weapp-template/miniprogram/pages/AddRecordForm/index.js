const adminSrv = require('../../services/admin.service');

Page({
  data: {
    projectId: '',
    typeIndex: 0,
    types: [
      { label: '施工记录', value: 'construction' },
      { label: '材料记录', value: 'material' },
      { label: '其他', value: 'other' }
    ],
    content: '',
    cost: '',
    workHours: '' ,
    submitting: false
  },

  onLoad(options) {
    this.setData({ projectId: (options && options.projectId) || '' });
  },

  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value || 0) }); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },

  onSubmit() {
    if (this.data.submitting) return;
    const type = this.data.types[this.data.typeIndex].value;
    const content = (this.data.content || '').trim();
    const cost = Number(this.data.cost || 0);
    const workHours = Number(this.data.workHours || 0);
    if (!content) return wx.showToast({ title: '请输入内容', icon: 'none' });
    if (!this.data.projectId) return wx.showToast({ title: '缺少项目ID', icon: 'none' });

    this.setData({ submitting: true });
    adminSrv.addRecord({ projectId: this.data.projectId, type, content, cost, workHours })
      .then(() => {
        wx.showToast({ title: '已提交', icon: 'success' });
        setTimeout(() => { wx.navigateBack(); }, 700);
      })
      .catch(err => {
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      })
      .finally(() => this.setData({ submitting: false }));
  }
});

