const { cloud, db } = require('./db')

async function ensureAdmin(openid) {
  const _ = db.command
  const { data } = await db.collection('users').where({ _openid: openid, roles: _.in(['admin']) }).get()
  return data && data.length > 0
}

function fmt(ts){
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n)=> String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await ensureAdmin(OPENID))) return { code: 403, msg: '需要管理员权限' }

  const { ids = [] } = event
  if (!Array.isArray(ids) || ids.length === 0) return { code: 400, msg: '缺少 ids' }

  const _ = db.command
  const { data: list } = await db.collection('surveys').where({ _id: _.in(ids) }).get()

  if (!list || !list.length) return { code: 404, msg: '未找到记录' }

  // 统一 key（排除冗余）
  const ignore = new Set(['_openid'])
  const keys = Array.from(list.reduce((s, r) => {
    Object.keys(r).forEach(k => { if (!ignore.has(k)) s.add(k) })
    return s
  }, new Set()))

  // 置顶常用列顺序
  const headOrder = ['_id','projectCode','shopName','location','constructionTime','needRemove','status','createdAt','updatedAt','shopPhotos','surveyPhotos']
  keys.sort((a,b)=>{
    const ia = headOrder.indexOf(a), ib = headOrder.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const rows = [keys]
  list.forEach(r => {
    const row = keys.map(k => {
      let v = r[k]
      if (k === 'createdAt' || k === 'updatedAt' || k === 'ts') return fmt(v)
      if (k === 'needRemove') return v === 'yes' ? '是' : (v === 'no' ? '否' : '')
      if (Array.isArray(v)) return v.join('\n')
      if (typeof v === 'object' && v !== null) return JSON.stringify(v)
      return v == null ? '' : String(v)
    })
    rows.push(row)
  })

  const XLSX = require('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'surveys')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

  const cloudPath = `exports/surveys_${Date.now()}_${ids.length}.xlsx`
  const up = await cloud.uploadFile({ cloudPath, fileContent: buffer })
  return { code: 0, data: { fileID: up.fileID, cloudPath } }
}

