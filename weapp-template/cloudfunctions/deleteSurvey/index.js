const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({ _openid: openid, roles: _.in(['admin']) }).get()
  return data && data.length > 0
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await ensureAdmin(OPENID))) return { code: 403, msg: '需要管理员权限' }

  const { id, _id } = event
  const docId = id || _id
  if (!docId) return { code: 400, msg: '缺少 id' }

  // 尝试清理云端文件
  try {
    const res = await db.collection('surveys').doc(docId).get()
    const d = res && res.data
    if (d) {
      const list = []
      ;(d.shopPhotos || []).forEach(p => { if (typeof p === 'string' && p.indexOf('cloud://') === 0) list.push(p) })
      ;(d.surveyPhotos || []).forEach(p => { if (typeof p === 'string' && p.indexOf('cloud://') === 0) list.push(p) })
      if (list.length) { try { await cloud.deleteFile({ fileList: list }) } catch(e) {} }
    }
  } catch(e) {}

  await db.collection('surveys').doc(docId).remove()
  return { code: 0, data: true }
}
