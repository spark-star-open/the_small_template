Page({
  data: {
    output: ''
  },

  async callCloud() {
    wx.cloud.callFunction({
      name: 'helloWorld',
      data: { msg: 'test call' }
    }).then(res => {
      this.setData({
        output: res.result.message
      })
      console.log('云函数返回：', res)
    }).catch(err => {
      console.error('调用失败', err)
    })
  }
})
