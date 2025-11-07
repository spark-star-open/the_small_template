const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({ _openid: openid, roles: _.in(['admin']) }).get()
  return data && data.length > 0
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await ensureAdmin(OPENID))) return { code: 403, msg: '需要管理员权限' }

  const { page = 1, pageSize = 10, keyword = '' } = event
  const coll = db.collection('surveys')
  const where = keyword
    ? db.command.or([
        { shopName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { projectCode: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    : {}

  const totalRes = await coll.where(where).count()
  const total = totalRes.total || 0

  const listRes = await coll.where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return { code: 0, data: { rows: listRes.data || [], total, hasMore: page * pageSize < total } }
}

