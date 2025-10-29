App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上版本的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true,
      })
    }
    console.log('小程序启动成功')
  }
})
