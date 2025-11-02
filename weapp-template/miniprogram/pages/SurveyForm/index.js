// pages/survey/survey.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      // 基本信息
      technician: '',
      unitLeader: '',
      projectCode: '',
      shopName: '',
      location: '',
      locationDetail: {},
      shopPhotos: [],
      
      // 防火门
      needRemove: '',
      door1Height: '',
      door1Width: '',
      door1Open: '',
      door2Height: '',
      door2Width: '',
      door2Open: '',
      door3Height: '',
      door3Width: '',
      door3Open: '',
      
      // 防火窗
      window1Height: '',
      window1Width: '',
      window1Open: '',
      window2Height: '',
      window2Width: '',
      window2Open: '',
      window3Height: '',
      window3Width: '',
      window3Open: '',
      
      // 防火吊顶
      ceilingLength: '',
      ceilingWidth: '',
      
      // 防火隔断
      glassWallHeight: '',
      glassWallWidth: '',
      steelWallHeight: '',
      steelWallWidth: '',
      blockWallHeight: '',
      blockWallWidth: '',
      
      // 其他
      surveyPhotos: [],
      constructionTime: '',
      dateTimeIndex: [0, 0, 0, 0, 0],
      remark: ''
    },
    
    // 时间选择器数据
    dateTimeArray: [],
    
    // 提交状态
    submitting: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initDateTimeArray();
  },

  /**
   * 初始化时间选择器数据
   */
  initDateTimeArray() {
    const years = [];
    const months = [];
    const days = [];
    const hours = [];
    const minutes = [];
    
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      years.push((currentYear + i) + '年');
    }
    
    for (let i = 1; i <= 12; i++) {
      months.push(i + '月');
    }
    
    for (let i = 1; i <= 31; i++) {
      days.push(i + '日');
    }
    
    for (let i = 0; i <= 23; i++) {
      hours.push(i + '时');
    }
    
    for (let i = 0; i <= 59; i++) {
      minutes.push(i + '分');
    }
    
    this.setData({
      dateTimeArray: [years, months, days, hours, minutes]
    });
  },

  /**
   * 输入框内容改变
   */
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 单选框改变
   */
  onRadioChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 时间选择器改变
   */
  onDateTimeChange(e) {
    const value = e.detail.value;
    const dateTimeArray = this.data.dateTimeArray;
    const timeStr = `${dateTimeArray[0][value[0]]}/${dateTimeArray[1][value[1]]}/${dateTimeArray[2][value[2]]}/${dateTimeArray[3][value[3]]}/${dateTimeArray[4][value[4]]}`;
    
    this.setData({
      'formData.dateTimeIndex': value,
      'formData.constructionTime': timeStr
    });
  },

  /**
   * 选择地理位置
   */
  onChooseLocation() {
    const that = this;
    wx.chooseLocation({
      success(res) {
        console.log('选择的位置信息：', res);
        that.setData({
          'formData.location': res.address || res.name,
          'formData.locationDetail': {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail(err) {
        console.log('选择位置失败：', err);
        if (err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '提示',
            content: '需要授权位置信息才能选择地点',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  /**
   * 选择图片
   */
  onChooseImage(e) {
    const field = e.currentTarget.dataset.field;
    const that = this;
    const currentPhotos = this.data.formData[field] || [];
    const maxCount = 6 - currentPhotos.length;
    
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        const photos = currentPhotos.concat(tempFiles);
        that.setData({
          [`formData.${field}`]: photos
        });
      },
      fail(err) {
        console.log('选择图片失败：', err);
      }
    });
  },

  /**
   * 删除图片
   */
  onDeletePhoto(e) {
    const { index, field } = e.currentTarget.dataset;
    const photos = [...this.data.formData[field]];
    photos.splice(index, 1);
    this.setData({
      [`formData.${field}`]: photos
    });
  },

  /**
   * 定时和重复
   */
  onTimingRepeat() {
    wx.showToast({
      title: '定时和重复功能',
      icon: 'none'
    });
  },

  /**
   * 提写名单
   */
  onWriteList() {
    wx.showToast({
      title: '提写名单功能',
      icon: 'none'
    });
  },

  /**
   * 结束页
   */
  onEndPage() {
    wx.showToast({
      title: '结束页功能',
      icon: 'none'
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { 
      technician, unitLeader, projectCode, shopName, location, shopPhotos,
      needRemove, ceilingLength, ceilingWidth, glassWallHeight, glassWallWidth,
      steelWallHeight, steelWallWidth, blockWallHeight, blockWallWidth,
      surveyPhotos, constructionTime, remark
    } = this.data.formData;
    
    // 基本信息验证
    if (!technician) {
      wx.showToast({ title: '请输入项目技术人员', icon: 'none' });
      return false;
    }
    if (!unitLeader) {
      wx.showToast({ title: '请输入用户单位负责人', icon: 'none' });
      return false;
    }
    if (!projectCode) {
      wx.showToast({ title: '请输入项目代码', icon: 'none' });
      return false;
    }
    if (!shopName) {
      wx.showToast({ title: '请输入商家店名', icon: 'none' });
      return false;
    }
    if (!location) {
      wx.showToast({ title: '请选择地点', icon: 'none' });
      return false;
    }
    if (shopPhotos.length === 0) {
      wx.showToast({ title: '请上传店家正面照片', icon: 'none' });
      return false;
    }
    
    // 防火门验证
    if (!needRemove) {
      wx.showToast({ title: '请选择原防火门是否需要拆除', icon: 'none' });
      return false;
    }
    
    // 防火吊顶验证
    if (!ceilingLength) {
      wx.showToast({ title: '请输入吊顶长度', icon: 'none' });
      return false;
    }
    if (!ceilingWidth) {
      wx.showToast({ title: '请输入吊顶宽度', icon: 'none' });
      return false;
    }
    
    // 防火隔断验证
    if (!glassWallHeight) {
      wx.showToast({ title: '请输入防火玻璃隔墙高度', icon: 'none' });
      return false;
    }
    if (!glassWallWidth) {
      wx.showToast({ title: '请输入防火玻璃隔墙宽度', icon: 'none' });
      return false;
    }
    if (!steelWallHeight) {
      wx.showToast({ title: '请输入轻钢龙骨隔墙高度', icon: 'none' });
      return false;
    }
    if (!steelWallWidth) {
      wx.showToast({ title: '请输入轻钢龙骨隔墙宽度', icon: 'none' });
      return false;
    }
    if (!blockWallHeight) {
      wx.showToast({ title: '请输入砌块隔墙高度', icon: 'none' });
      return false;
    }
    if (!blockWallWidth) {
      wx.showToast({ title: '请输入砌块隔墙宽度', icon: 'none' });
      return false;
    }
    
    // 其他验证
    if (surveyPhotos.length === 0) {
      wx.showToast({ title: '请上传现场勘察记录表拍照', icon: 'none' });
      return false;
    }
    if (!constructionTime) {
      wx.showToast({ title: '请选择店家意向施工时间', icon: 'none' });
      return false;
    }
    if (!remark) {
      wx.showToast({ title: '请输入备注', icon: 'none' });
      return false;
    }
    
    return true;
  },

  /**
   * 提交表单
   */
  onSubmit() {
    if (typeof this.validateForm === 'function' && !this.validateForm()) return;
    
    if (this.data.submitting) return;
    
    this.setData({ submitting: true });
    
    wx.showLoading({ title: '提交中...' });
    
    // TODO: 与后端对接后用 wx.request 提交；当前先模拟成功
    setTimeout(() => {
      wx.hideLoading();
      this.setData({ submitting: false });
      const ts = Date.now();
      const shopName = (this.data.formData && this.data.formData.shopName) || '';
      wx.navigateTo({
        url: `/pages/SubmitSuccess/index?ts=${ts}&shopName=${encodeURIComponent(shopName)}`
      });
    }, 1000);
    
    /* 
    ========================================
    实际提交代码示例（供后端对接使用）：
    ========================================
    
    // 1. 上传所有图片
    const allPhotos = [
      ...this.data.formData.shopPhotos,
      ...this.data.formData.surveyPhotos
    ];
    
    const uploadPromises = allPhotos.map(photo => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://your-api.com/upload',  // 👈 替换为你的图片上传接口
          filePath: photo,
          name: 'file',
          success: res => {
            const data = JSON.parse(res.data);
            resolve(data.url);
          },
          fail: reject
        });
      });
    });
    
    Promise.all(uploadPromises).then(photoUrls => {
      const shopPhotoCount = this.data.formData.shopPhotos.length;
      const submitData = {
        ...this.data.formData,
        shopPhotos: photoUrls.slice(0, shopPhotoCount),
        surveyPhotos: photoUrls.slice(shopPhotoCount)
      };
      
      // 2. 提交表单
      wx.request({
        url: 'https://your-api.com/survey/submit',  // 👈 替换为你的表单提交接口
        method: 'POST',
        data: submitData,
        success(res) {
          wx.hideLoading();
          if (res.data.code === 200) {
            wx.showToast({
              title: '提交成功',
              icon: 'success'
            });
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
          }
        },
        fail() {
          wx.hideLoading();
          wx.showToast({
            title: '提交失败',
            icon: 'none'
          });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      });
    });
    */
  }
});
