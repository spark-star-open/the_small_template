Page({
    data: { shopName: '', timeText: '', id: '' },
    onLoad(options) {
    const shopName = decodeURIComponent(options.shopName || '');
    const id = options.id || '';
    const ts = Number(options.ts || Date.now());
    const d = new Date(ts);
    const p = n => (n < 10 ? '0' + n : '' + n);
    const timeText = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    this.setData({ shopName, timeText, id });
    },
    goHome() { wx.reLaunch({ url: '/pages/role-select/index' }); },
    goNew() { wx.reLaunch({ url: '/pages/SurveyForm/index' }); }
    });
