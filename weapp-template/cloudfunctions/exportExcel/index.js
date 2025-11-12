const dbm = require('./db')
const tcb = require('wx-server-sdk')

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

// 动态生成列（包含所有填写项；自动识别防火门/窗多组）
function buildColumnsFromDoc(d, columns){
  if (Array.isArray(columns) && columns.length) return columns;
  const ignore = new Set(['_openid','createdBy','deleted','deletedAt']);
  const has = (k)=>Object.prototype.hasOwnProperty.call(d||{}, k);

  const titleOf = (key) => {
    const m1 = key.match(/^door(\d+)(Height|Width|Open)$/);
    if (m1){
      const n = m1[1];
      const t = m1[2] === 'Height' ? '高度(mm)' : (m1[2] === 'Width' ? '宽度(mm)' : '开启方向');
      return `防火门${n}${t}`;
    }
    const m2 = key.match(/^window(\d+)(Height|Width|Open)$/);
    if (m2){
      const n = m2[1];
      const t = m2[2] === 'Height' ? '高度(mm)' : (m2[2] === 'Width' ? '宽度(mm)' : '开启方向');
      return `防火窗${n}${t}`;
    }
    // 玻璃与轻钢
    const m4 = key.match(/^glass(\d+)(Height|Width|Remark)$/);
    if (m4){
      const n = m4[1];
      const map = { Height: '高度(mm)', Width: '宽度(mm)', Remark: '备注' };
      return `玻璃${n}${map[m4[2]] || ''}`;
    }
    const m5 = key.match(/^lightSteel(\d+)(Height|Width|Remark)$/);
    if (m5){
      const n = m5[1];
      const map = { Height: '高度(mm)', Width: '宽度(mm)', Remark: '备注' };
      return `轻钢${n}${map[m5[2]] || ''}`;
    }
    const m3 = key.match(/^partition(\d+)(Height|Width|Length|Thickness|Type|Material|Area|Count|Position|Remark)$/);
    if (m3){
      const n = m3[1];
      const map2 = { Height:'高度(mm)', Width:'宽度(mm)', Length:'长度(mm)', Thickness:'厚度(mm)', Type:'类型', Material:'材料', Area:'面积(㎡)', Count:'数量', Position:'位置', Remark:'备注' };
      return `防火隔断${n}${map2[m3[2]] || ''}`;
    }
    const map = {
      technician: '项目技术人员',
      unitLeader: '用户单位负责人',
      projectCode: '项目编号',
      shopName: '门店',
      location: '地址',
      locationDetail: '地址定位详细',
      constructionTime: '施工时间',
      dateTimeIndex: '施工时间索引',
      shopPhotos: '店面照片(fileID)',
      needRemove: '是否拆除防火门',
      blockWallHeight: '砌块墙高度(mm)',
      blockWallWidth: '砌块墙宽度(mm)',
      blockWallRemark: '砌块墙备注',
      ceilingLength: '吊顶长度(mm)',
      ceilingWidth: '吊顶宽度(mm)',
      surveyPhotos: '现场勘察照片(fileID)',
      status: '状态',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      remark: '备注'
    };
    // 默认不再加“字段-”前缀，避免显示英文“字段-xxx”
    return map[key] || key;
  };

  const cols = [];
  const push = (k) => { if (!ignore.has(k) && has(k) && !cols.find(x=>x.key===k)) cols.push({ key: k, title: titleOf(k) }); };

  // 固定前缀
  ['technician','unitLeader','projectCode','shopName','location','locationDetail','constructionTime','dateTimeIndex','shopPhotos','needRemove','blockWallHeight','blockWallWidth','blockWallRemark','ceilingLength','ceilingWidth'].forEach(push);
  // 防火门/窗/隔断/玻璃/轻钢系列
  const doorNums = new Set(); const winNums = new Set(); const partNums = new Set(); const glassNums = new Set(); const lsNums = new Set();
  Object.keys(d||{}).forEach(k=>{
    let m=k.match(/^door(\d+)/); if(m) doorNums.add(parseInt(m[1],10));
    m=k.match(/^window(\d+)/); if(m) winNums.add(parseInt(m[1],10));
    m=k.match(/^partition(\d+)/); if(m) partNums.add(parseInt(m[1],10));
    m=k.match(/^glass(\d+)/); if(m) glassNums.add(parseInt(m[1],10));
    m=k.match(/^lightSteel(\d+)/); if(m) lsNums.add(parseInt(m[1],10));
  });
  const attrs=['Height','Width','Open'];
  Array.from(doorNums).sort((a,b)=>a-b).forEach(n=>attrs.forEach(a=>push(`door${n}${a}`)));
  Array.from(winNums).sort((a,b)=>a-b).forEach(n=>attrs.forEach(a=>push(`window${n}${a}`)));
  const attrsP=['Height','Width','Length','Thickness','Type','Material','Area','Count','Position','Remark'];
  Array.from(partNums).sort((a,b)=>a-b).forEach(n=>attrsP.forEach(a=>push(`partition${n}${a}`)));
  const attrsSimple=['Height','Width','Remark'];
  Array.from(glassNums).sort((a,b)=>a-b).forEach(n=>attrsSimple.forEach(a=>push(`glass${n}${a}`)));
  Array.from(lsNums).sort((a,b)=>a-b).forEach(n=>attrsSimple.forEach(a=>push(`lightSteel${n}${a}`)));
  // 固定后缀
  ['surveyPhotos','status','createdAt','updatedAt','remark'].forEach(push);
  // 其余字段
  Object.keys(d||{}).sort().forEach(push);
  return cols;
}

exports.main = async (event = {}) => {
  // 跳过管理员角色校验
  const { id, _id, columns = [] } = event
  const docId = id || _id
  if (!docId) return { code: 400, msg: '缺少 id' }

  try {
    const snap = await dbm.db.collection('surveys').doc(docId).get().catch(() => ({ data: null }))
    const d = snap && snap.data
    if (!d) return { code: 404, msg: '记录不存在' }

    const __cols = buildColumnsFromDoc(d, columns)
    let rows = []
    if (Array.isArray(__cols) && __cols.length) {
      rows = __cols.map(c => {
        const key = c.key || c
        const title = c.title || key
        return [title, cellValue(d[key], key)]
      })
    } else {
      rows = Object.keys(d)
        .filter(k => !['_openid', 'createdBy'].includes(k))
        .map(k => [k, cellValue(d[k], k)])
    }

    const XLSX = require('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['字段', '值'], ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'survey')
    // 更稳妥：先生成 base64，再转为 Buffer，兼容云函数环境
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
    const buffer = Buffer.from(base64, 'base64')

    const cloudPath = `exports/survey_${docId}_${Date.now()}.xlsx`
    const up = await tcb.uploadFile({ cloudPath, fileContent: buffer })
    return { code: 0, data: { fileID: up.fileID, cloudPath } }
  } catch (e) {
    return { code: 500, msg: e && e.message ? e.message : '导出失败' }
  }
}
