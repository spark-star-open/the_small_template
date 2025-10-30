App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上版本的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-3gcn7rgkab20f4ae',
        traceUser: true,
      })
    }
    console.log('小程序启动成功')
  }
})
