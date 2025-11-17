(function (global) {
  function getConfigPath(projectId) {
    return 'projects/' + projectId + '/project.json';
  }
  function getAdminConfigPath(projectId) {
    return '../projects/' + projectId + '/project.json';
  }
  function load(projectId, opts) {
    var admin = opts && opts.admin;
    var path = admin ? getAdminConfigPath(projectId) : getConfigPath(projectId);
    return fetch(path, { cache: 'no-store' }).then(function (r) { return r.json(); });
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
        instant_threshold: 3,
        deliberate_threshold: 15,
        profile_name: 'default'
      };
    } else {
      if (typeof cfg.timing_profile.instant_threshold !== 'number' || cfg.timing_profile.instant_threshold < 0) {
        cfg.timing_profile.instant_threshold = 3;
      }
      if (typeof cfg.timing_profile.deliberate_threshold !== 'number' || cfg.timing_profile.deliberate_threshold < 0) {
        cfg.timing_profile.deliberate_threshold = 15;
      }
      if (!cfg.timing_profile.profile_name) {
        cfg.timing_profile.profile_name = 'default';
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



