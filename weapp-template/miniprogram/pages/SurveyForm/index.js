// pages/survey/survey.js

const pageDef = {
  data: {
    formData: {
      shopName: '',
      location: '',
      locationDetail: {},
      shopPhotos: [],
      surveyPhotos: [],
      constructionTime: '',
      dateTimeIndex: [0,0,0,0,0]
    },
    dateTimeArray: [],
    submitting: false
  },

  onLoad() { this.initDateTimeArray(); },

  initDateTimeArray() {
    const years = [], months = [], days = [], hours = [], minutes = [];
    const y = new Date().getFullYear();
    for (let i=0;i<5;i++) years.push(String(y+i));
    for (let i=1;i<=12;i++) months.push(String(i));
    for (let i=1;i<=31;i++) days.push(String(i));
    for (let i=0;i<=23;i++) hours.push(String(i));
    for (let i=0;i<=59;i++) minutes.push(String(i));
    this.setData({ dateTimeArray: [years, months, days, hours, minutes] });
  },

  onInputChange(e){
    const k = 'formData.' + (e.currentTarget.dataset.field || '');
    const v = e.detail.value;
    const obj = {}; obj[k] = v; this.setData(obj);
  },

  onDateTimeChange(e){
    const idx = e.detail.value; const arr = this.data.dateTimeArray;
    const t = arr[0][idx[0]] + '/' + arr[1][idx[1]] + '/' + arr[2][idx[2]] + '/' + arr[3][idx[3]] + '/' + arr[4][idx[4]];
    this.setData({ 'formData.dateTimeIndex': idx, 'formData.constructionTime': t });
  },

  onChooseLocation(){
    const that = this;
    wx.chooseLocation({
      success(res){
        that.setData({ 'formData.location': res.address || res.name, 'formData.locationDetail': { name: res.name, address: res.address, latitude: res.latitude, longitude: res.longitude } });
      },
      fail(err){
        if (err && err.errMsg && err.errMsg.indexOf('auth deny') !== -1){
          wx.showModal({ title: '提示', content: '请在设置中开启位置权限', success(r){ if (r.confirm) wx.openSetting(); } });
        }
      }
    });
  },

  onChooseImage(e){
    const field = e.currentTarget.dataset.field; const that = this;
    const current = this.data.formData[field] || []; const max = Math.max(0, 6 - current.length);
    wx.chooseMedia({ count: max, mediaType: ['image'], sourceType: ['album','camera'], sizeType: ['compressed'],
      success(res){ const imgs = current.concat(res.tempFiles.map(f=>f.tempFilePath)); const o={}; o['formData.'+field]=imgs; that.setData(o); }
    });
  },

  onDeletePhoto(e){
    const field = e.currentTarget.dataset.field; const index = e.currentTarget.dataset.index;
    const arr = (this.data.formData[field] || []).slice(); arr.splice(index,1);
    const o={}; o['formData.'+field]=arr; this.setData(o);
  },

  onTimingRepeat(){ wx.showToast({ title: '定时和重复功能', icon: 'none' }); },
  onWriteList(){ wx.showToast({ title: '填写名单功能', icon: 'none' }); },
  onEndPage(){ wx.showToast({ title: '结束页功能', icon: 'none' }); },

  validateForm(){
    const d = this.data.formData || {};
    if (!d.shopName){ wx.showToast({ title: '请输入商家店名', icon: 'none' }); return false; }
    const totalPhotos = (d.shopPhotos?d.shopPhotos.length:0) + (d.surveyPhotos?d.surveyPhotos.length:0);
    if (totalPhotos === 0){ wx.showToast({ title: '请至少上传一张图片', icon: 'none' }); return false; }
    return true;
  },

  onSubmit(){
    if (!this.validateForm || !this.validateForm()) return;
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });
    const data = this.data.formData || {};
    wx.cloud.callFunction({ name: 'submitSurvey', data: { formData: data } })
      .then(()=>{ wx.hideLoading(); this.setData({ submitting: false }); const ts=Date.now(); const shopName=this.data.formData.shopName||''; wx.navigateTo({ url: `/pages/SubmitSuccess/index?ts=${ts}&shopName=${encodeURIComponent(shopName)}` }); })
      .catch(err=>{ wx.hideLoading(); this.setData({ submitting: false }); wx.showToast({ title: (err&&err.message)?err.message:'提交失败', icon: 'none' }); });
  }
};

if (typeof Page === 'function'){ Page(pageDef); }
if (typeof module !== 'undefined' && module.exports){ module.exports = pageDef; }