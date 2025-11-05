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

  const { projectId } = event || {}
  if (!projectId) return { code: 400, msg: '缺少 projectId' }

  const { data: records } = await db.collection('records').where({ projectId }).get()
  const summary = (records || []).reduce((acc, r) => {
    acc.totalCost += Number(r.cost || 0)
    acc.totalHours += Number(r.workHours || 0)
    acc.count += 1
    if (r.type) acc.byType[r.type] = (acc.byType[r.type] || 0) + 1
    return acc
  }, { totalCost: 0, totalHours: 0, count: 0, byType: {} })

  return { code: 0, data: summary }
}

