const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({ _openid: openid, roles: _.in(['admin']) }).get()
  return data && data.length > 0
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await ensureAdmin(OPENID))) return { code: 403, msg: '需要管理员权限' }

  const { page = 1, pageSize = 10, keyword = '', date = '', dateRange = '' } = event
  const coll = db.collection('surveys')
  const base = { deleted: db.command.neq(true) }
  // 日期过滤：支持 dateRange（3d/7d/30d/180d）或单日 date
  let dateCond = {}
  if (dateRange) {
    const now = Date.now()
    const map = { '3d': 3, '7d': 7, '30d': 30, '180d': 180 }
    const days = map[String(dateRange)]
    if (days) {
      const start = now - days * 24 * 60 * 60 * 1000
      dateCond = { createdAt: db.command.gte(start) }
    }
  } else if (date && typeof date === 'string') {
    try {
      const [y,m,d] = date.split('-').map(x=>parseInt(x,10))
      if (y && m && d) {
        const start = new Date(y, m-1, d).getTime()
        const end = new Date(y, m-1, d+1).getTime()
        dateCond = { createdAt: db.command.gte(start).and(db.command.lt(end)) }
      }
    } catch(e) {}
  }
  const whereKeyword = keyword
    ? db.command.or([
        Object.assign({ shopName: db.RegExp({ regexp: keyword, options: 'i' }) }, base, dateCond),
        Object.assign({ projectCode: db.RegExp({ regexp: keyword, options: 'i' }) }, base, dateCond)
      ])
    : Object.assign({}, base, dateCond)

  const totalRes = await coll.where(whereKeyword).count()
  const total = totalRes.total || 0

  const listRes = await coll.where(whereKeyword)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return { code: 0, data: { rows: listRes.data || [], total, hasMore: page * pageSize < total } }
}
