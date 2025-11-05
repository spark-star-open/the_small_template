const { cloud, db } = require('./db')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const data = event || {}

  if (!data.projectId) return { code: 400, msg: '缺少 projectId' }

  const now = Date.now()
  const doc = {
    projectId: data.projectId,
    type: data.type || 'construction', // construction | material | other
    content: data.content || '',
    photos: data.photos || [],
    cost: Number(data.cost || 0),
    workHours: Number(data.workHours || 0),
    status: data.status || 'pending',
    ts: data.ts || now,
    createdAt: now,
    createdBy: OPENID
  }

  const res = await db.collection('records').add({ data: doc })
  return { code: 0, data: { _id: res._id, ...doc } }
}

