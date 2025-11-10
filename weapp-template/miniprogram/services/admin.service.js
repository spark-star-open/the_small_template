// services/admin.service.js

function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data })
      .then(res => {
        const r = res.result || {}
        if (r.code === 0) resolve(r.data)
        else reject(new Error(r.msg || 'cloud error'))
      })
      .catch(reject)
  })
}

// Projects/Records
function list({ page = 1, pageSize = 10, keyword = '' } = {}) {
  return call('getProjects', { page, pageSize, keyword }).then(d => ({
    rows: d.rows || [],
    hasMore: !!d.hasMore
  }))
}
function addProject(data) { return call('addProject', data) }
function updateProject(_id, patch) { return call('updateProject', { _id, patch }) }
function getRecords(projectId, page = 1, pageSize = 20) { return call('getRecords', { projectId, page, pageSize }) }
function addRecord(data) { return call('addRecord', data) }
function deleteRecord(_id) { return call('deleteRecord', { _id }) }
function stats(projectId) { return call('statistics', { projectId }) }
function detail(id) { return call('getRecords', { recordId: id }) }

// Surveys
function listSurveys({ page = 1, pageSize = 10, keyword = '' } = {}) {
  return call('getSurveys', { page, pageSize, keyword }).then(d => ({ rows: d.rows || [], hasMore: !!d.hasMore }))
}
function getSurvey(id) { return call('getSurvey', { id }) }
function submitSurvey(formData) { return call('submitSurvey', { formData }) }
function updateSurvey(id, patch) { return call('updateSurvey', { id, patch }) }
function deleteSurvey(id) { return call('deleteSurvey', { id }) }
function exportSurvey(id) { return call('exportSurvey', { id }) }

module.exports = {
  call,
  // projects/records
  list,
  addProject,
  updateProject,
  getRecords,
  addRecord,
  deleteRecord,
  stats,
  detail,
  // surveys
  listSurveys,
  getSurvey,
  submitSurvey,
  updateSurvey,
  deleteSurvey,
  exportSurvey,
}
