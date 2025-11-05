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

  const now = Date.now()
  const data = event || {}
  const doc = {
    name: data.name || '',
    code: data.code || '',
    customerName: data.customerName || data.shopName || '',
    shopName: data.shopName || '',
    location: data.location || '',
    remark: data.remark || '',
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: OPENID
  }

  const coll = db.collection('projects')
  const res = await coll.add({ data: doc })
  return { code: 0, data: { _id: res._id, ...doc } }
}

