// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化 cloud 环境（一定要指定你的环境 ID）
cloud.init({
  env: 'cloud1-3gcn7rgkab20f4ae' // ← 这里改成你自己的环境ID
})

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('Hello Cloud Function', event)
  return {
    message: 'Hello from cloud!',
    event
  }
}

