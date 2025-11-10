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

  // 读取问卷
  const doc = await db.collection('surveys').doc(docId).get().catch(() => ({ data: null }))
  if (!doc || !doc.data) return { code: 404, msg: '记录不存在' }
  const d = doc.data

  // 动态行：key-value 形式
  const rows = []
  const pushKV = (k, v) => rows.push([k, typeof v === 'object' ? JSON.stringify(v) : (v == null ? '' : String(v))])
  Object.keys(d).forEach(k => {
    if (['_id','_openid','createdBy'].includes(k)) return
    pushKV(k, d[k])
  })

  // 生成 xlsx
  const XLSX = require('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([['字段','值'], ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'survey')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

  const cloudPath = `exports/survey_${docId}_${Date.now()}.xlsx`
  const up = await cloud.uploadFile({ cloudPath, fileContent: buffer })
  return { code: 0, data: { fileID: up.fileID, cloudPath } }
}

