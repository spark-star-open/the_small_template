const { db } = require('./db')
const { ctx, getUserByOpenid } = require('./auth_help')

exports.main = async (event) => {
  const { OPENID } = ctx()
  const { op = 'login', pwd } = event || {}

  if (op === 'login') {
    // Password-only admin login
    if (!pwd) {
      return { code: 401, msg: '请输入密码' }
    }
    const _ = db.command
    try {
      const { data } = await db.collection('users').where(
        _.and([
          { roles: _.in(['admin']) },
          _.or([{ adminPassword: pwd }, { password: pwd }, { loginPwd: pwd }])
        ])
      ).get()
      if (data && data.length) {
        return { code: 0, data: { roles: ['admin'], _id: data[0]._id } }
      }
      return { code: 401, msg: '密码错误或未设置' }
    } catch (e) {
      if (String(e && e.message).includes('-502005')) {
        return { code: 401, msg: '未设置管理员' }
      }
      throw e
    }
  }

  if (op === 'myinfo') {
    const user = await getUserByOpenid(OPENID)
    return { code: 0, data: user || null }
  }
  return { code: 404, msg: 'unknown op' }
}
