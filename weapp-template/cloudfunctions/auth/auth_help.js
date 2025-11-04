const { cloud, db } = require('./db')
exports.ctx = () => cloud.getWXContext()
exports.getUserByOpenid = async (openid) => {
  const { data } = await db.collection('users').where({ _openid: openid }).get()
  return data[0] || null
}
exports.upsertUser = async (openid, patch = {}) => {
  const users = db.collection('users')
  const existed = await users.where({ _openid: openid }).get()
  const base = {
    _openid: openid,
    roles: ['worker'],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  if (!existed.data.length) {
    const doc = { ...base, ...patch }
    const { _id } = await users.add({ data: doc })
    return { _id, ...doc }
  } else {
    const doc = { ...existed.data[0], ...patch, updatedAt: Date.now() }
    await users.doc(existed.data[0]._id).update({ data: { ...patch, updatedAt: Date.now() } })
    return doc
  }
}
