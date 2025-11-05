const { db } = require('./db')
const { ctx, getUserByOpenid, upsertUser } = require('./auth_help')

exports.main = async (event) => {
  const { OPENID } = ctx()
  const { op = 'login', pwd } = event || {}

  if (op === 'login') {
    // Password-only admin login; match multiple password field names
    if (!pwd) {
      return { code: 401, msg: '请输入密码' }
    }
    const _ = db.command
    try {
      const { data } = await db.collection('users').where(
        _.and([
          _.or([{ roles: _.in(['admin']) }, { isAdmin: true }]),
          _.or([{ adminPassword: pwd }, { password: pwd }, { loginPwd: pwd }])
        ])
      ).get()
      if (data && data.length) {
        // Ensure current OPENID has admin role for downstream admin checks
        let me = await getUserByOpenid(OPENID)
        const roles = new Set([...(me && me.roles ? me.roles : []), 'admin'])
        me = await upsertUser(OPENID, { roles: Array.from(roles) })
        return { code: 0, data: me }
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
