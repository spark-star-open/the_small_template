const { db } = require('./db')
const { ctx, getUserByOpenid, upsertUser } = require('./auth_help')

exports.main = async (event) => {
  const { OPENID } = ctx()
  const { op = 'login' } = event || {}

  if (op === 'login') {
    let hasAdmin = false
    try {
      const admins = await db.collection('users')
        .where({ roles: db.command.in(['admin']) })
        .count()
      hasAdmin = admins.total > 0
    } catch (e) {
      // -502005 表示集合不存在：视为还没有管理员
      if (String(e && e.message).includes('-502005')) {
        hasAdmin = false
      } else {
        throw e
      }
    }

    let user = await getUserByOpenid(OPENID)
    if (!user) user = await upsertUser(OPENID, { roles: ['worker'] }) // 这里的 add 会自动创建 users 集合

    if (!hasAdmin && !user.roles.includes('admin')) {
      user = await upsertUser(OPENID, { roles: Array.from(new Set([...(user.roles||[]), 'admin'])) })
    }
    return { code: 0, data: user }
  }

  if (op === 'myinfo') {
    const user = await getUserByOpenid(OPENID)
    return { code: 0, data: user || null }
  }
  return { code: 404, msg: 'unknown op' }
}
