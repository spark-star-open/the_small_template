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
    submitting: false,
    uploading: false,
    openid: ''
  },

  onLoad() { 
    this.initDateTimeArray(); 
    // 获取 openid 用于云存储分目录
    try {
      wx.cloud.callFunction({ name: 'auth', data: { op: 'myinfo' } })
        .then(res => {
          const d = (res && res.result && res.result.data) || {};
          if (d && d._openid) this.setData({ openid: d._openid });
        })
        .catch(()=>{});
    } catch(e) {}
  },

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
      async success(res){
        const files = res.tempFiles || [];
        if (!files.length){ return; }
        that.setData({ uploading: true });
        wx.showLoading({ title: '上传图片中...' });
        try {
          // 构造云存储路径前缀：surveys/YYYY/MM/DD/<projectCode>/<field>
          const d = new Date();
          const y = d.getFullYear();
          const m = (d.getMonth()+1).toString().padStart(2,'0');
          const day = d.getDate().toString().padStart(2,'0');
          const proj = encodeURIComponent(that.data.formData.projectCode || 'unknown');
          const openid = encodeURIComponent(that.data.openid || 'anon');
          const folder = `surveys/${y}/${m}/${day}/${openid}/${proj}/${field}`;
          const fileIDs = await that._uploadMediaFiles(files, folder);
          const imgs = current.concat(fileIDs);
          const o={}; o['formData.'+field]=imgs; that.setData(o);
        } catch (err){
          wx.showToast({ title: '图片上传失败', icon: 'none' });
        } finally {
          that.setData({ uploading: false });
          wx.hideLoading();
        }
      }
    });
  },

  onDeletePhoto(e){
    const field = e.currentTarget.dataset.field; const index = e.currentTarget.dataset.index;
    const list = (this.data.formData[field] || []).slice();
    const toDel = list[index];
    wx.showModal({
      title: '删除图片',
      content: '确定要删除这张图片吗？',
      success: (r) => {
        if (!r.confirm) return;
        list.splice(index,1);
        const o={}; o['formData.'+field]=list; this.setData(o);
        // 同步删除云端文件（仅当是 cloud:// fileID）
        if (typeof toDel === 'string' && toDel.indexOf('cloud://') === 0){
          wx.cloud.deleteFile({ fileList: [toDel] }).catch(()=>{});
        }
      }
    });
  },

  // 单选项变更（如“是否拆除旧门”）
  onRadioChange(e){
    const field = e.currentTarget.dataset.field || '';
    const value = (e.detail && e.detail.value) || '';
    if (!field) return;
    const obj = {}; obj['formData.' + field] = value;
    this.setData(obj);
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
    if (this.data.submitting || this.data.uploading) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });
    const data = Object.assign({}, this.data.formData || {});
    // 确保图片都为云 fileID（cloud:// 开头）
    const ensureCloud = async (arr=[]) => {
      const out = [];
      for (const p of (arr||[])){
        if (typeof p === 'string' && p.indexOf('cloud://') === 0){ out.push(p); continue; }
        // 非云路径也上传
        const up = await this._uploadMediaFiles([{ tempFilePath: p }]);
        out.push(up[0]);
      }
      return out;
    };
    Promise.resolve()
      .then(() => ensureCloud(data.shopPhotos))
      .then(ids => { data.shopPhotos = ids; return ensureCloud(data.surveyPhotos); })
      .then(ids => { data.surveyPhotos = ids; return wx.cloud.callFunction({ name: 'submitSurvey', data: { formData: data } }); })
      .then(()=>{ wx.hideLoading(); this.setData({ submitting: false }); const ts=Date.now(); const shopName=this.data.formData.shopName||''; wx.navigateTo({ url: `/pages/SubmitSuccess/index?ts=${ts}&shopName=${encodeURIComponent(shopName)}` }); })
      .catch(err=>{ wx.hideLoading(); this.setData({ submitting: false }); wx.showToast({ title: (err&&err.message)?err.message:'提交失败', icon: 'none' }); });
  },

  // 私有：上传图片到云存储，返回 fileID 数组
  _uploadMediaFiles(files, folder){
    const prefix = (folder && typeof folder === 'string') ? folder.replace(/\/+$/,'') : 'surveys';
    const list = (files||[]).map((f,idx)=>({ path: f.tempFilePath || f.path || f }));
    const tasks = list.map((x, i) => {
      const ext = (x.path.split('.').pop() || 'jpg').toLowerCase();
      const cloudPath = `${prefix}/${Date.now()}_${Math.floor(Math.random()*100000)}_${i}.${ext}`;
      return wx.cloud.uploadFile({ cloudPath, filePath: x.path }).then(r => r.fileID);
    });
    return Promise.all(tasks);
  }
};

if (typeof Page === 'function'){ Page(pageDef); }
if (typeof module !== 'undefined' && module.exports){ module.exports = pageDef; }
