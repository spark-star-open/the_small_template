const { cloud, db } = require('./db')

exports.main = async (event) => {
  const { projectId, page = 1, pageSize = 20, recordId } = event || {}
  const coll = db.collection('records')

  if (recordId) {
    const res = await coll.doc(recordId).get().catch(() => ({ data: null }))
    return { code: 0, data: res.data || null }
  }

  if (!projectId) return { code: 400, msg: '缺少 projectId' }

  const where = { projectId }
  const totalRes = await coll.where(where).count()
  const total = totalRes.total || 0

  const listRes = await coll
    .where(where)
    .orderBy('ts', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const hasMore = page * pageSize < total
  return { code: 0, data: { rows: listRes.data || [], total, hasMore } }
}

