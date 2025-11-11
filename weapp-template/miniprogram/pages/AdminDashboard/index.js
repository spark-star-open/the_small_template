const auth = require('../../utils/auth');
const adminSrv = require('../../services/admin.service');
const fmt = require('../../utils/format');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    filters: { date: '', keyword: '' },
    navigating: false,
    // 清除选择相关（默认多选）
    selectedIds: [],
    selectedMap: {},
    selectMode: false,
    exportNotice: '',
    exportFileID: '',
    exportFileName: '',
    exportTempURL: '',
    exportLocalPath: ''
  },
  exportMode: false,

  // 安全配对 Loading（引用计数，彻底避免未配对告警）
  _loadingCount: 0,
  _safeShowLoading(title = '处理中...') {
    this._loadingCount = Math.max(0, (this._loadingCount || 0)) + 1;
    if (this._loadingCount === 1) wx.showLoading({ title });
    else wx.showLoading({ title });
  },
  _safeHideLoading() {
    this._loadingCount = Math.max(0, (this._loadingCount || 0) - 1);
    if (this._loadingCount === 0) try { wx.hideLoading(); } catch(e) {}
  },

  onLoad() { this._alive = true; },
  onUnload() { this._alive = false; this._loadingCount = 0; try { wx.hideLoading(); } catch(e) {} },
  onHide() { this._loadingCount = 0; try { wx.hideLoading(); } catch(e) {} },
  onShow() { if (!auth.ensureAdmin()) return; try{ const f=wx.getStorageSync('surveys_need_refresh'); if (f==='1'){ wx.removeStorageSync('surveys_need_refresh'); this.fetchList(true); return; } }catch(e){} if (!this.data.list.length) this.fetchList(true); },

  onPullDownRefresh() { this.fetchList(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.fetchList(false); },

  onDate(e) { this.setData({ 'filters.date': e.detail.value }); this.fetchList(true); },
  onKeyword(e) { this.setData({ 'filters.keyword': e.detail.value }); },
  refresh() { this.fetchList(true); },

  fetchList(reset) {
    if (reset) this.setData({ page: 1, hasMore: true, list: [] });
    if (!this.data.hasMore) return;
    this.setData({ loading: true });

    const params = { page: this.data.page, pageSize: this.data.pageSize, ...(this.data.filters || {}) };
    adminSrv.listSurveys(params)
      .then(res => {
        if (!this._alive) return;
        const rows = (res.rows || []).map(x => {
          const y = Object.assign({}, x);
          y.timeText = fmt.time(x.updatedAt || x.createdAt || x.ts || Date.now());
          y.statusText = x.status === 'active' ? '进行中' : (x.status === 'archived' ? '已归档' : (x.status === 'done' ? '已完成' : '待处理'));
          return y;
        });
        const list = this.data.list.concat(rows);
        this.setData({ list, page: this.data.page + 1, hasMore: !!res.hasMore });
      })
      .finally(() => {
        if (!this._alive) return;
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (this.exportMode && this.data.selectMode) {
      // 导出模式：点击条目直接导出
      this._doExport(id);
      return;
    }
    if (this.data.selectMode) {
      // 选择模式下：切换选中，不跳转
      const set = new Set(this.data.selectedIds || []);
      const map = Object.assign({}, this.data.selectedMap || {});
      if (set.has(id)) { set.delete(id); map[id] = false; } else { set.add(id); map[id] = true; }
      this.setData({ selectedIds: Array.from(set), selectedMap: map });
      return;
    }
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    wx.navigateTo({ url: `/pages/SurveyDetail/index?id=${id}`, complete: () => this.setData({ navigating: false }) });
  },

  // 点击左侧圆点切换多选
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const set = new Set(this.data.selectedIds || []);
    const map = Object.assign({}, this.data.selectedMap || {});
    if (set.has(id)) { set.delete(id); map[id] = false; } else { set.add(id); map[id] = true; }
    this.setData({ selectedIds: Array.from(set), selectedMap: map });
  },
  
  // 导出：点击按钮进入导出选择模式；点条目多选；按钮导出所选或取消
  exportExcel() {
    if (!this.exportMode) {
      this.exportMode = true;
      this.setData({ selectMode: true });
      wx.showToast({ title: '请选择一个项目导出', icon: 'none' });
      return;
    }
    const ids = this.data.selectedIds || [];
    if (ids.length > 0) {
      this._doBatchExport(ids);
    } else {
      // 再次点击且未选择：取消导出模式
      this.exportMode = false;
      this.setData({ selectMode: false, selectedIds: [], selectedMap: {} });
    }
  },

  _doExport(id) {
    this._safeShowLoading('导出中...');
    // 优先云函数生成 xlsx
    adminSrv.exportSurvey(id)
      .then(async ({ fileID }) => {
        if (!fileID) throw new Error('导出失败');
        this.setData({ exportFileID: fileID });
        // 尝试预先换取临时下载链接
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [fileID] });
          const u = urlRes && urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL;
          if (u) {
            this.setData({ exportTempURL: u });
            // 在开发者工具环境，自动复制链接方便粘贴到浏览器下载
            try {
              const sys = wx.getSystemInfoSync();
              if (sys && sys.platform === 'devtools') {
                wx.setClipboardData({ data: u, success: ()=>{ console.log('导出下载链接(复制到浏览器下载):', u);} });
              }
            } catch(e){}
          }
        } catch (e) {}
        return wx.cloud.downloadFile({ fileID });
      })
      .then(res => {
        const tmp = res.tempFilePath;
        const fs = wx.getFileSystemManager();
        const ts = Date.now();
        const fileName = `survey_${id}_${ts}.xlsx`;
        const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        // 使用 FileSystemManager.saveFile（避免 wx.saveFile 废弃告警）
        fs.saveFile({ tempFilePath: tmp, filePath: savedPath, success: () => {
          // 优先直接分享到聊天
          this._shareFile(savedPath, fileName, 'xlsx');
        }, fail: () => {
          this._shareFile(tmp, fileName, 'xlsx');
        }});
        this.setData({ selectMode: false, selectedIds: [], selectedMap: {}, exportNotice: `ok`, exportFileName: fileName, exportLocalPath: savedPath });
        this.exportMode = false;
      })
      .catch(async () => {
        // 退化到 CSV 本地生成
        try {
          const d = await adminSrv.getSurvey(id);
          const lines = [];
          Object.keys(d || {}).forEach(k => {
            if (['_id','_openid','createdBy'].includes(k)) return;
            const v = typeof d[k] === 'object' ? JSON.stringify(d[k]) : (d[k] == null ? '' : String(d[k]));
            // 简单 CSV 转义
            const cell = '"' + (v.replace ? v.replace(/"/g,'""') : v) + '"';
            lines.push(`${k},${cell}`);
          });
          const csv = '\uFEFF字段,值\n' + lines.join('\n');
          const fs = wx.getFileSystemManager();
          const ts = Date.now();
          const fileName = `survey_${id}_${ts}.csv`;
          const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
          fs.writeFile({ filePath, data: csv, encoding: 'utf8', success: () => {
            this._shareFile(filePath, fileName, 'csv');
            this.setData({ exportNotice: `ok`, exportFileID: '', exportTempURL: '', exportFileName: fileName, exportLocalPath: filePath });
          }, fail: () => {
            wx.showToast({ title: '已生成CSV，请在文件管理中查看', icon: 'none' });
          }});
        } catch (e) {
          wx.showToast({ title: '导出失败', icon: 'none' });
        }
      })
      .finally(() => {
        this._safeHideLoading();
        this.exportMode = false;
      });
  },

  _doBatchExport(ids) {
    this._safeShowLoading('导出中...');
    adminSrv.exportSurveys(ids)
      .then(async ({ fileID }) => {
        if (!fileID) throw new Error('导出失败');
        this.setData({ exportFileID: fileID });
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [fileID] });
          const u = urlRes && urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL;
          if (u) {
            this.setData({ exportTempURL: u });
            try { const sys = wx.getSystemInfoSync(); if (sys && sys.platform === 'devtools') wx.setClipboardData({ data: u }); } catch(e){}
          }
        } catch(e){}
        return wx.cloud.downloadFile({ fileID });
      })
      .then(res => {
        const tmp = res.tempFilePath;
        const fs = wx.getFileSystemManager();
        const ts = Date.now();
        const fileName = `surveys_${ts}_${(ids||[]).length}.xlsx`;
        const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        fs.saveFile({ tempFilePath: tmp, filePath: savedPath, success: () => {
          this._shareFile(savedPath, fileName, 'xlsx');
        }, fail: () => { this._shareFile(tmp, fileName, 'xlsx'); }});
        this.setData({ selectMode: false, selectedIds: [], selectedMap: {}, exportNotice: `ok`, exportFileName: fileName, exportLocalPath: savedPath });
        this.exportMode = false;
      })
      .catch(() => wx.showToast({ title: '导出失败', icon: 'none' }))
      .finally(() => this._safeHideLoading());
  },

  // 点击文件名：优先打开本地文件；若无则复制云端链接
  onExportLinkTap() {
    const { exportLocalPath, exportFileName, exportTempURL, exportFileID } = this.data;
    if (exportLocalPath) {
      const ext = (exportFileName || '').split('.').pop();
      wx.openDocument({ filePath: exportLocalPath, fileType: ext || 'xlsx', showMenu: true });
      return;
    }
    // 无本地路径则复制链接
    this.downloadExport();
  },

  // 下载：复制云端临时下载链接（PC 上粘贴到浏览器即可下载）
  downloadExport() {
    const { exportTempURL, exportFileID } = this.data;
    const doCopy = (url) => wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '下载链接已复制', icon: 'none' }) });
    if (exportTempURL) return doCopy(exportTempURL);
    if (exportFileID) {
      this._safeShowLoading('生成链接...');
      wx.cloud.getTempFileURL({ fileList: [exportFileID] })
        .then(res => {
          const u = res && res.fileList && res.fileList[0] && res.fileList[0].tempFileURL;
          if (u) { this.setData({ exportTempURL: u }); doCopy(u); } else { wx.showToast({ title: '无法生成链接', icon: 'none' }); }
        })
        .catch(() => wx.showToast({ title: '生成链接失败', icon: 'none' }))
        .finally(() => this._safeHideLoading());
      return;
    }
    wx.showToast({ title: '本地CSV无云端链接', icon: 'none' });
  },

  // 分享文件到聊天，若不支持则打开文档让用户通过菜单分享
  _shareFile(filePath, fileName, fileType) {
    const canShare = typeof wx.shareFileMessage === 'function';
    if (canShare) {
      wx.shareFileMessage({ filePath, fileName, success: () => {}, fail: () => {
        wx.openDocument({ filePath, fileType, showMenu: true });
      }});
    } else {
      // 开发者工具或低版本：直接打开，右上角菜单可分享
      wx.openDocument({ filePath, fileType, showMenu: true });
    }
  },
  // 全部标为已读（实际将状态置为已完成）
  markAllRead() {
    const list = this.data.list || [];
    if (!list.length) return wx.showToast({ title: '暂无可标记的数据', icon: 'none' });
    const toUpdate = list.filter(x => x.status !== 'done');
    if (!toUpdate.length) return wx.showToast({ title: '已全部为已处理', icon: 'none' });
    this._safeShowLoading('标记中...');
    Promise.all(toUpdate.map(x => adminSrv.updateSurvey(x._id, { status: 'done' })))
      .then(() => {
        wx.showToast({ title: '已全部标为已处理', icon: 'none' });
        // 本地同步状态与文案
        const rows = list.map(x => {
          if (x.status === 'done') return x;
          const y = Object.assign({}, x, { status: 'done', statusText: '已完成' });
          return y;
        });
        this.setData({ list: rows, selectMode: false, selectedIds: [], selectedMap: {} });
      })
      .catch(err => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      .finally(() => this._safeHideLoading());
  },

  // 清除按钮：第一次点击进入选择模式；选择后再次点击执行删除
  onClearTap() {
    if (!this.data.selectMode) {
      this.setData({ selectMode: true, selectedIds: [], selectedMap: {} });
      wx.showToast({ title: '点选条目进行多选', icon: 'none' });
      return;
    }
    const ids = this.data.selectedIds || [];
    if (!ids.length) return wx.showToast({ title: '请选择要清除的项目', icon: 'none' });
    wx.showModal({
      title: '确认清除',
      content: `将清除 ${ids.length} 条记录，确定吗？`,
      success: (res) => {
        if (!res.confirm) return;
        this._safeShowLoading('清除中...');
        // 先尝试硬删除，失败则软删除（打 deleted 标记）
        Promise.allSettled(ids.map(id => adminSrv.deleteSurvey(id)))
          .then(results => {
            const failedIds = results.map((r, idx) => ({ r, id: ids[idx] })).filter(x => x.r.status !== 'fulfilled').map(x => x.id)
            if (failedIds.length) {
              // 软删除
              return Promise.allSettled(failedIds.map(id => adminSrv.updateSurvey(id, { deleted: true, deletedAt: Date.now() })))
                .then(softRes => ({ hard: results, soft: softRes }))
            }
            return { hard: results, soft: [] }
          })
          .then(({ hard, soft }) => {
            const okHard = hard.filter(r => r.status === 'fulfilled').length
            const okSoft = (soft || []).filter(r => r.status === 'fulfilled').length
            const totalOk = okHard + okSoft
            const total = ids.length
            const fail = total - totalOk
            if (totalOk > 0) {
              wx.showToast({ title: fail ? `已清除${totalOk}条，失败${fail}条` : '已清除', icon: 'none' });
              this.setData({ selectedIds: [], selectedMap: {}, selectMode: false })
              this.fetchList(true)
            } else {
              wx.showToast({ title: '清除失败', icon: 'none' })
            }
          })
          .catch(err => wx.showToast({ title: err.message || '清除失败', icon: 'none' }))
          .finally(() => this._safeHideLoading());
      }
    });
  },
  goAnalytics() { wx.showToast({ title: '统计页可后续添加', icon: 'none' }); },
  goHome() {
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    wx.reLaunch({ url: '/pages/role-select/index', complete: () => this.setData({ navigating: false }) });
  }
});
