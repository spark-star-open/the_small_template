const { cloud, db } = require('./db')

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const formData = event.formData || event.data || event
  const now = Date.now()
  const doc = Object.assign({}, formData, {
    createdAt: now,
    createdBy: OPENID,
    status: formData.status || 'pending'
  })
  const res = await db.collection('surveys').add({ data: doc })
  return { code: 0, data: { _id: res._id, ...doc } }
}

