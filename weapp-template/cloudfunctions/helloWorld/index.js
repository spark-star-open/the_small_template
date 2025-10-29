// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  console.log('Hello Cloud Function', event)
  return {
    message: 'Hello from cloud!',
    event
  }
}
