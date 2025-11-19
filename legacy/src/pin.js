(function (global) {
  function getProjectIdFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return params.get('project') || (localStorage.getItem('projectId') || 'default');
  }
  function loadConfig(projectId, isAdmin) {
    // 現在のページのパスに基づいて適切なパスを計算
    var pathname = window.location.pathname;
    var base = '';
    
    if (isAdmin) {
      // admin/ または src/editor/ から見たパスを計算
      if (pathname.indexOf('/admin/') >= 0) {
        // admin/editor.html から見た場合
        base = '../';
      } else if (pathname.indexOf('/src/editor/') >= 0) {
        // src/editor/editor.html から見た場合
        base = '../../';
      } else {
        // その他の場合（フォールバック）
        base = '../';
      }
    }
    
    var path = base + 'projects/' + projectId + '/project.json';
    return fetch(path, { cache: 'no-store' })
      .then(function (res) { 
        if (!res.ok) {
          throw new Error('Failed to load project.json: ' + res.status);
        }
        return res.json(); 
      });
  }
  function getMainHtmlPath() {
    var pathname = window.location.pathname;
    if (pathname.indexOf('/admin/') >= 0) {
      return '../main.html';
    } else if (pathname.indexOf('/src/editor/') >= 0) {
      return '../../main.html';
    } else {
      return 'main.html';
    }
  }
  function ensureAuth(config) {
    if (config.access_mode === 'public') return true;
    if (config.access_mode === 'login') {
      alert('このプロジェクトは login モードです（未実装）。管理画面にはアクセスできません。');
      window.location.href = getMainHtmlPath();
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
    window.location.href = getMainHtmlPath();
    return false;
  }
  function init(options) {
    var isAdmin = !!(options && options.admin);
    var pid = (options && options.projectId) || getProjectIdFromQuery();
    loadConfig(pid, isAdmin).then(function (cfg) {
      ensureAuth(cfg);
    }).catch(function (err) {
      console.error('project.json の読み込みエラー:', err);
      alert('project.json の読み込みに失敗しました: ' + (err.message || '不明なエラー'));
      window.location.href = getMainHtmlPath();
    });
  }
  global.AdminAuth = { init: init };
})(window);


