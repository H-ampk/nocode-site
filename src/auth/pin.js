(function (global) {
  function getProjectIdFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return params.get('project') || (localStorage.getItem('projectId') || 'default');
  }
  function loadConfig(projectId, isAdmin) {
    var base = isAdmin ? '../' : '';
    return fetch(base + 'projects/' + projectId + '/project.json', { cache: 'no-store' })
      .then(function (res) { return res.json(); });
  }
  function ensureAuth(config) {
    if (config.access_mode === 'public') return true;
    if (config.access_mode === 'login') {
      alert('このプロジェクトは login モードです（未実装）。管理画面にはアクセスできません。');
      window.location.href = (location.pathname.indexOf('/admin/') >= 0) ? '../main.html' : 'main.html';
      return false;
    }
    var key = 'admin_authenticated_' + (config.project_id || 'default');
    if (localStorage.getItem(key) === 'true') return true;
    var input = prompt('管理用PIN（4桁）を入力してください:');
    if (input && input === String(config.pin_code)) {
      localStorage.setItem(key, 'true');
      return true;
    }
    alert('PINが間違っています。');
    window.location.href = (location.pathname.indexOf('/admin/') >= 0) ? '../main.html' : 'main.html';
    return false;
  }
  function init(options) {
    var isAdmin = !!(options && options.admin);
    var pid = (options && options.projectId) || getProjectIdFromQuery();
    loadConfig(pid, isAdmin).then(function (cfg) {
      ensureAuth(cfg);
    }).catch(function () {
      alert('project.json の読み込みに失敗しました');
      window.location.href = (location.pathname.indexOf('/admin/') >= 0) ? '../main.html' : 'main.html';
    });
  }
  global.AdminAuth = { init: init };
})(window);


