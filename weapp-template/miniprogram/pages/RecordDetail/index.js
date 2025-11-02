const adminSrv = require('../../../services/admin.service');
const fmt = require('../../../utils/format');


Page({
data: { detail: null },
onLoad(options) {
const id = options.id;
this.fetch(id);
},
fetch(id) {
adminSrv.detail(id).then(d => {
d.timeText = fmt.time(d.ts);
d.statusText = d.status === 'done' ? '已完成' : '待处理';
this.setData({ detail: d });
});
}
});