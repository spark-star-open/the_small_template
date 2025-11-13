const dbm = require('./db')
const tcb = require('wx-server-sdk')

function isFilled(v) {
  if (v == null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v)
  if (typeof v === 'object') return Object.keys(v).length > 0
  return true
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('下载超时')), ms))
  ])
}

function fmtDatetime(ts) {
  if (!ts) return ''
  try {
    const d = new Date(Number(ts))
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch (e) { return '' }
}

function cellValue(val, key) {
  if (key === 'needRemove') return val === 'yes' ? '是' : (val === 'no' ? '否' : '')
  if (key === 'createdAt' || key === 'updatedAt' || key === 'ts') return fmtDatetime(val)
  if (Array.isArray(val)) return val.join('\n')
  if (val && typeof val === 'object') return JSON.stringify(val)
  return val == null ? '' : String(val)
}

function computePrice(d = {}) {
  const keys = Object.keys(d || {})
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
  const areaPair = (h,w)=>{ const H=num(h), W=num(w); if(H<=0||W<=0) return 0; return (H*W)/1e6 }
  let doorArea=0, winArea=0, ceilArea=0, partArea=0, glassArea=0, lsArea=0
  const mapH={}, mapW={}
  keys.forEach(k=>{
    let m
    if ((m=k.match(/^door(\d+)(Height|Width)$/))) { const n=`door${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
    else if ((m=k.match(/^window(\d+)(Height|Width)$/))) { const n=`window${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
    else if ((m=k.match(/^partition(\d+)(Height|Width)$/))) { const n=`partition${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
    else if ((m=k.match(/^glass(\d+)(Height|Width)$/))) { const n=`glass${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
    else if ((m=k.match(/^lightSteel(\d+)(Height|Width)$/))) { const n=`lightSteel${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
    else if ((m=k.match(/^ceiling(\d+)(Height|Width)$/))) { const n=`ceiling${m[1]}`; (m[2]==='Height'?(mapH[n]=num(d[k])):(mapW[n]=num(d[k]))) }
  })
  Object.keys(mapH).forEach(n=>{
    const a = areaPair(mapH[n], mapW[n])
    if(n.startsWith('door')) doorArea+=a
    else if(n.startsWith('window')) winArea+=a
    else if(n.startsWith('partition')) partArea+=a
    else if(n.startsWith('glass')) glassArea+=a
    else if(n.startsWith('lightSteel')) lsArea+=a
    else if(n.startsWith('ceiling')) ceilArea+=a
  })
  ceilArea += areaPair(d.ceilingLength, d.ceilingWidth)
  const priceDoor = Math.max(0, doorArea - 3) * 630
  const priceWin = winArea * 1110
  const priceCeiling = Math.max(0, ceilArea - 15) * 260
  const combo = partArea + glassArea + lsArea
  const priceCombo = Math.max(0, combo - 8) * 520
  const total = priceDoor + priceWin + priceCeiling + priceCombo
  const fix = (n)=> Math.round(n * 100) / 100
  return { door: fix(priceDoor), win: fix(priceWin), combo: fix(priceCombo), ceiling: fix(priceCeiling), total: fix(total) }
}

// 扫描记录动态生成列（可传入 columns 覆盖）
function buildColumnsFromList(list, columns){
  if (Array.isArray(columns) && columns.length) return columns
  const ignore = new Set(['_openid','createdBy','deleted','deletedAt'])
  const anyFilled = (key) => Array.isArray(list) && list.some(r => !ignore.has(key) && isFilled((r||{})[key]))
  const titleOf = (key) => {
    let m = key.match(/^door(\d+)(Height|Width|Open)$/)
    if (m){ const n=m[1]; const t=m[2]==='Height'?'高度(mm)':(m[2]==='Width'?'宽度(mm)':'开启方向'); return `防火门${n}${t}` }
    m = key.match(/^window(\d+)(Height|Width|Open)$/)
    if (m){ const n=m[1]; const t=m[2]==='Height'?'高度(mm)':(m[2]==='Width'?'宽度(mm)':'开启方向'); return `防火窗${n}${t}` }
    m = key.match(/^ceiling(\d+)(Height|Width|Remark)$/)
    if (m){ const n=m[1]; const map={Height:'高度(mm)',Width:'宽度(mm)',Remark:'备注'}; return `吊顶${n}${map[m[2]]||''}` }
    m = key.match(/^partition(\d+)(Height|Width|Length|Thickness|Type|Material|Area|Count|Position|Remark)$/)
    if (m){ const n=m[1]; const map={Height:'高度(mm)',Width:'宽度(mm)',Length:'长度(mm)',Thickness:'厚度(mm)',Type:'类型',Material:'材料',Area:'面积(㎡)',Count:'数量',Position:'位置',Remark:'备注'}; return `防火隔断${n}${map[m[2]]||''}` }
    m = key.match(/^glass(\d+)(Height|Width|Remark)$/)
    if (m){ const n=m[1]; const map={Height:'高度(mm)',Width:'宽度(mm)',Remark:'备注'}; return `玻璃${n}${map[m[2]]||''}` }
    m = key.match(/^lightSteel(\d+)(Height|Width|Remark)$/)
    if (m){ const n=m[1]; const map={Height:'高度(mm)',Width:'宽度(mm)',Remark:'备注'}; return `轻钢${n}${map[m[2]]||''}` }
    const base={ _id:'编号', id:'编号', technician:'项目技术人员', unitLeader:'用户单位负责人', projectCode:'项目编号', shopName:'门店', location:'地址', locationDetail:'地址定位详细', constructionTime:'施工时间', dateTimeIndex:'施工时间索引', shopPhotos:'店面照片(fileID)', needRemove:'是否拆除防火门', blockWallHeight:'砌块墙高度(mm)', blockWallWidth:'砌块墙宽度(mm)', blockWallRemark:'砌块墙备注', ceilingLength:'吊顶长度(mm)', ceilingWidth:'吊顶宽度(mm)', surveyPhotos:'现场勘察照片(fileID)', status:'状态', createdAt:'创建时间', updatedAt:'更新时间', remark:'备注' }
    return base[key] || ''
  }
  const push=(arr,k,t)=>{ if(!ignore.has(k) && anyFilled(k) && !arr.find(x=>x.key===k)) arr.push({ key:k, title:t||titleOf(k) }) }
  const cols=[]
  // 固定前缀
  ;['technician','unitLeader','projectCode','shopName','location','locationDetail','constructionTime','dateTimeIndex','shopPhotos','needRemove','blockWallHeight','blockWallWidth','blockWallRemark','ceilingLength','ceilingWidth'].forEach(k=>push(cols,k))
  // 动态编号
  const doorNums=new Set(), winNums=new Set(), partNums=new Set(), glassNums=new Set(), lsNums=new Set(), ceilNums=new Set()
  ;(list||[]).forEach(r=>{ Object.keys(r||{}).forEach(k=>{ let m=k.match(/^door(\d+)/); if(m) doorNums.add(+m[1]); m=k.match(/^window(\d+)/); if(m) winNums.add(+m[1]); m=k.match(/^partition(\d+)/); if(m) partNums.add(+m[1]); m=k.match(/^glass(\d+)/); if(m) glassNums.add(+m[1]); m=k.match(/^lightSteel(\d+)/); if(m) lsNums.add(+m[1]); m=k.match(/^ceiling(\d+)/); if(m) ceilNums.add(+m[1]); }) })
  const attrs=['Height','Width','Open']
  Array.from(doorNums).sort((a,b)=>a-b).forEach(n=>attrs.forEach(a=>push(cols,`door${n}${a}`)))
  Array.from(winNums).sort((a,b)=>a-b).forEach(n=>attrs.forEach(a=>push(cols,`window${n}${a}`)))
  const attrsP=['Height','Width','Length','Thickness','Type','Material','Area','Count','Position','Remark']
  Array.from(partNums).sort((a,b)=>a-b).forEach(n=>attrsP.forEach(a=>push(cols,`partition${n}${a}`)))
  const attrsSimple=['Height','Width','Remark']
  Array.from(glassNums).sort((a,b)=>a-b).forEach(n=>attrsSimple.forEach(a=>push(cols,`glass${n}${a}`)))
  Array.from(lsNums).sort((a,b)=>a-b).forEach(n=>attrsSimple.forEach(a=>push(cols,`lightSteel${n}${a}`)))
  Array.from(ceilNums).sort((a,b)=>a-b).forEach(n=>attrsSimple.forEach(a=>push(cols,`ceiling${n}${a}`)))
  // 固定后缀
  ;['surveyPhotos','status','createdAt','updatedAt','remark'].forEach(k=>push(cols,k))
  // 不再附加未知字段，避免英文列头
  return cols
}

exports.main = async (event = {}) => {
  const { ids = [], columns = [] } = event
  const embedImages = !!event.embedImages
  if (!Array.isArray(ids) || !ids.length) return { code: 400, msg: '缺少 ids' }

  try {
    const _ = dbm.db.command
    const { data: list } = await dbm.db.collection('surveys').where({ _id: _.in(ids) }).get()
    if (!list || !list.length) return { code: 404, msg: '未找到记录' }

    const __cols = buildColumnsFromList(list, columns)
    const header = __cols.map(c => c.title || c.key || String(c))
    header.push('防火门价格(元)')
    header.push('防火窗价格(元)')
    header.push('防火隔断+玻璃+轻钢价格(元)')
    header.push('吊顶价格(元)')
    header.push('总价(元)')
    const rows = [header]
    list.forEach(r => {
      const row = __cols.map(c => cellValue(r[c.key || c], c.key || c))
      const p = computePrice(r)
      row.push(p.door, p.win, p.combo, p.ceiling, p.total)
      rows.push(row)
    })
    const XLSX = require('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'surveys')
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
    const buffer = Buffer.from(base64, 'base64')

    const cloudPath = `exports/surveys_${Date.now()}_${ids.length}.xlsx`
    const up = await tcb.uploadFile({ cloudPath, fileContent: buffer })
    return { code: 0, data: { fileID: up.fileID, cloudPath } }
  } catch (e) {
    return { code: 500, msg: e && e.message ? e.message : '导出失败' }
  }
}
