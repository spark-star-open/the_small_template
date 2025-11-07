const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({ _openid: openid, roles: _.in(['admin']) }).get()
  return data && data.length > 0
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await ensureAdmin(OPENID))) return { code: 403, msg: '需要管理员权限' }
  const { id, _id, patch = {} } = event
  const docId = id || _id
  if (!docId) return { code: 400, msg: '缺少 id' }
  const data = Object.assign({}, patch, { updatedAt: Date.now() })
  await db.collection('surveys').doc(docId).update({ data })
  return { code: 0, data: true }
}

