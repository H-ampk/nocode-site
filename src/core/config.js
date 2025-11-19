(function (global) {
  function getConfigPath(projectId) {
    return 'projects/' + projectId + '/project.json';
  }
  function getAdminConfigPath(projectId) {
    // 現在のページのパスに基づいて適切なパスを計算
    var pathname = window.location.pathname;
    var base = '';
    
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
    
    return base + 'projects/' + projectId + '/project.json';
  }
  function load(projectId, opts) {
    var admin = opts && opts.admin;
    var path = admin ? getAdminConfigPath(projectId) : getConfigPath(projectId);
    return fetch(path, { cache: 'no-store' })
      .then(function (r) { 
        if (!r.ok) {
          throw new Error('Failed to load project.json: ' + r.status + ' from ' + path);
        }
        return r.json(); 
      });
  }
  function normalize(config) {
    var cfg = Object.assign({}, config);
    if (!cfg.access_mode) cfg.access_mode = 'public';
    if (cfg.access_mode !== 'pin') cfg.pin_code = null;
    // glossary_policy のデフォルト値
    if (!cfg.glossary_policy) {
      cfg.glossary_policy = {
        mode: 'project',
        domains: []
      };
    } else {
      if (!cfg.glossary_policy.mode) {
        cfg.glossary_policy.mode = 'project';
      }
      if (!cfg.glossary_policy.domains || !Array.isArray(cfg.glossary_policy.domains)) {
        cfg.glossary_policy.domains = [];
      }
    }
    // timing_profile のデフォルト値
    if (!cfg.timing_profile) {
      cfg.timing_profile = {
        preset: 'profileB',
        instant_threshold: 3,
        deliberate_threshold: 15
      };
    } else {
      // 旧形式（profile_name）からの移行対応
      if (cfg.timing_profile.profile_name && !cfg.timing_profile.preset) {
        // profile_nameをpresetに変換（後方互換性）
        var oldName = cfg.timing_profile.profile_name;
        if (oldName === 'general' || oldName === 'default') {
          cfg.timing_profile.preset = 'profileB';
        } else if (oldName === 'slow') {
          cfg.timing_profile.preset = 'profileC';
        } else if (oldName === 'fast') {
          cfg.timing_profile.preset = 'profileA';
        } else {
          cfg.timing_profile.preset = 'custom';
        }
        // profile_nameを削除
        delete cfg.timing_profile.profile_name;
      }
      
      // presetのデフォルト値
      if (!cfg.timing_profile.preset) {
        cfg.timing_profile.preset = 'profileB';
      }
      
      // 有効なpreset値かチェック
      var validPresets = ['profileA', 'profileB', 'profileC', 'custom'];
      if (validPresets.indexOf(cfg.timing_profile.preset) === -1) {
        cfg.timing_profile.preset = 'profileB';
      }
      
      if (typeof cfg.timing_profile.instant_threshold !== 'number' || cfg.timing_profile.instant_threshold < 0) {
        cfg.timing_profile.instant_threshold = 3;
      }
      if (typeof cfg.timing_profile.deliberate_threshold !== 'number' || cfg.timing_profile.deliberate_threshold < 0) {
        cfg.timing_profile.deliberate_threshold = 15;
      }
      
      // 不正値のチェック: instant_threshold > deliberate_threshold の場合
      if (cfg.timing_profile.instant_threshold > cfg.timing_profile.deliberate_threshold) {
        // 自動修正: 値を入れ替える
        var temp = cfg.timing_profile.instant_threshold;
        cfg.timing_profile.instant_threshold = cfg.timing_profile.deliberate_threshold;
        cfg.timing_profile.deliberate_threshold = temp;
      }
    }
    return cfg;
  }
  function toBlob(config) {
    var cfg = normalize(config);
    return new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  }
  function downloadProjectJson(projectId, config) {
    var blob = toBlob(config);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(a.href);
    alert('ダウンロードしました。projects/' + projectId + '/project.json を置き換えてください。');
  }
  global.ProjectConfig = {
    load: load,
    toBlob: toBlob,
    download: downloadProjectJson,
    normalize: normalize
  };
})(window);



