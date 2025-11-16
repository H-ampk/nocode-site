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



