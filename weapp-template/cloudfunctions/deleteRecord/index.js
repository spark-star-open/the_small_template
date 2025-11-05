const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({
    _openid: openid,
    roles: _.in(['admin'])
  }).get()
  return data && data.length > 0
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const isAdmin = await ensureAdmin(OPENID)
  if (!isAdmin) return { code: 403, msg: '需要管理员权限' }

  const { _id } = event || {}
  if (!_id) return { code: 400, msg: '缺少 _id' }

  await db.collection('records').doc(_id).remove()
  return { code: 0, data: true }
}

