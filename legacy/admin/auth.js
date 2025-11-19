// admin配下の簡易PIN認証
(function () {
  // 設定: クエリ ?project=xxxx があればそれを、無ければ sample_project
  function getProjectId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('project') || 'sample_project';
  }

  function loadProjectConfig(projectId) {
    return fetch('../projects/' + projectId + '/project.json', { cache: 'no-store' })
      .then(function (res) { return res.json(); });
  }

  function requirePinIfNeeded(config) {
    if (config.access_mode === 'public') {
      // 認証不要
      return Promise.resolve(true);
    }
    if (config.access_mode === 'login') {
      // 将来実装。現状は拒否またはスキップ。ここでは拒否メッセージのみ。
      alert('このプロジェクトは login モードです（未実装）。adminにアクセスできません。');
      window.location.href = '../main.html';
      return Promise.reject(new Error('login mode not implemented'));
    }
    // pin モード
    var authedKey = 'admin_authenticated_' + (config.project_id || 'default');
    if (localStorage.getItem(authedKey) === 'true') {
      return Promise.resolve(true);
    }
    var input = prompt('管理用PIN（4桁）を入力してください:');
    if (input && input === String(config.pin_code)) {
      localStorage.setItem(authedKey, 'true');
      return Promise.resolve(true);
    } else {
      alert('PINが間違っています。');
      window.location.href = '../main.html';
      return Promise.reject(new Error('invalid pin'));
    }
  }

  loadProjectConfig(getProjectId())
    .then(requirePinIfNeeded)
    .catch(function () { /* 遷移済み */ });
})();



