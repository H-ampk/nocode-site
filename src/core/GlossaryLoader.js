/**
 * GlossaryLoader - 3層構造のGlossaryを読み込み・統合する
 * 
 * 3層構造:
 * 1. Project Glossary: /projects/{projectId}/glossary.json
 * 2. Domain Glossary: /glossary/domains/{domainName}.json
 * 3. Global Glossary: /glossary/global.json
 */

(function (global) {
  'use strict';

  /**
   * 現在のページのパスに基づいて適切なベースパスを取得
   * @param {boolean} admin - admin モードかどうか
   * @returns {string} ベースパス（例: '../', '../../', ''）
   */
  function getBasePath(admin) {
    if (!admin) return '';
    var pathname = window.location.pathname;
    if (pathname.indexOf('/admin/') >= 0) {
      return '../';
    } else if (pathname.indexOf('/src/editor/') >= 0) {
      return '../../';
    } else {
      return '../';
    }
  }

  /**
   * プロジェクトGlossaryを読み込む
   * @param {string} projectId - プロジェクトID
   * @param {Object} opts - オプション（admin: true で相対パスを調整）
   * @returns {Promise<Object>} Glossaryオブジェクト（termIdをキーとする）
   */
  function loadProjectGlossary(projectId, opts) {
    var admin = opts && opts.admin;
    var base = getBasePath(admin);
    var path = base + 'projects/' + projectId + '/glossary.json';
    
    return fetch(path, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          return {}; // ファイルが存在しない場合は空オブジェクトを返す
        }
        return response.json();
      })
      .then(function (data) {
        // 既存の構造（terms配列）を termId をキーとするオブジェクトに変換
        if (data.terms) {
          if (Array.isArray(data.terms)) {
            var result = {};
            data.terms.forEach(function (term) {
              if (term.id) {
                result[term.id] = term;
              }
            });
            return result;
          } else if (typeof data.terms === 'object') {
            // terms が既にオブジェクト形式の場合
            return data.terms;
          }
        }
        // 既に termId をキーとする構造の場合はそのまま返す
        return data || {};
      })
      .catch(function (error) {
        console.warn('Project glossary load failed:', error);
        return {};
      });
  }

  /**
   * ドメインGlossaryを読み込む
   * @param {string} domainName - ドメイン名（例: "psychology", "AI"）
   * @param {Object} opts - オプション（admin: true で相対パスを調整）
   * @returns {Promise<Object>} Glossaryオブジェクト（termIdをキーとする）
   */
  function loadDomainGlossary(domainName, opts) {
    var admin = opts && opts.admin;
    var base = getBasePath(admin);
    var path = base + 'glossary/domains/' + domainName + '.json';
    
    return fetch(path, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          return {}; // ファイルが存在しない場合は空オブジェクトを返す
        }
        return response.json();
      })
      .then(function (data) {
        // terms配列を termId をキーとするオブジェクトに変換
        if (data.terms && Array.isArray(data.terms)) {
          var result = {};
          data.terms.forEach(function (term) {
            if (term.id) {
              result[term.id] = term;
            }
          });
          return result;
        }
        return data || {};
      })
      .catch(function (error) {
        console.warn('Domain glossary load failed:', error);
        return {};
      });
  }

  /**
   * グローバルGlossaryを読み込む
   * @param {Object} opts - オプション（admin: true で相対パスを調整）
   * @returns {Promise<Object>} Glossaryオブジェクト（termIdをキーとする）
   */
  function loadGlobalGlossary(opts) {
    var admin = opts && opts.admin;
    var base = getBasePath(admin);
    var path = base + 'glossary/global.json';
    
    return fetch(path, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          return {}; // ファイルが存在しない場合は空オブジェクトを返す
        }
        return response.json();
      })
      .then(function (data) {
        // terms配列を termId をキーとするオブジェクトに変換
        if (data.terms && Array.isArray(data.terms)) {
          var result = {};
          data.terms.forEach(function (term) {
            if (term.id) {
              result[term.id] = term;
            }
          });
          return result;
        }
        return data || {};
      })
      .catch(function (error) {
        console.warn('Global glossary load failed:', error);
        return {};
      });
  }

  /**
   * 深いマージを行う（再帰的）
   * @param {Object} target - マージ先オブジェクト
   * @param {Object} source - マージ元オブジェクト
   * @returns {Object} マージ済みオブジェクト
   */
  function deepMerge(target, source) {
    if (!target) target = {};
    if (!source) return target;
    
    var result = Object.assign({}, target);
    
    Object.keys(source).forEach(function (key) {
      var sourceValue = source[key];
      var targetValue = result[key];
      
      // 配列の場合: 重複排除しつつ結合
      if (Array.isArray(sourceValue)) {
        if (Array.isArray(targetValue)) {
          // 既存の配列と結合し、重複を排除
          var combined = targetValue.slice();
          sourceValue.forEach(function (item) {
            if (combined.indexOf(item) === -1) {
              combined.push(item);
            }
          });
          result[key] = combined;
        } else {
          result[key] = sourceValue.slice();
        }
      }
      // オブジェクトの場合: 再帰的にマージ
      else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue);
        } else {
          result[key] = Object.assign({}, sourceValue);
        }
      }
      // プリミティブ値の場合: 上書き（未定義のフィールドは上書きしない）
      else if (sourceValue !== undefined && sourceValue !== null) {
        // ターゲットが未定義またはnullの場合のみ上書き
        if (targetValue === undefined || targetValue === null) {
          result[key] = sourceValue;
        } else {
          // 既に値がある場合は上書き（優先順位: project > domain > global）
          result[key] = sourceValue;
        }
      }
    });
    
    return result;
  }

  /**
   * 複数のGlossaryオブジェクトを統合する
   * 優先順位: project > domain > global
   * @param {Array<Object>} glossaryList - Glossaryオブジェクトの配列（優先順位の低い順）
   * @returns {Object} 統合済みGlossaryオブジェクト（termIdをキーとする）
   */
  function mergeGlossaries(glossaryList) {
    if (!glossaryList || !Array.isArray(glossaryList)) {
      return {};
    }
    
    var merged = {};
    
    // 優先順位の低い順（global → domain → project）にマージ
    glossaryList.forEach(function (glossary) {
      if (glossary && typeof glossary === 'object') {
        Object.keys(glossary).forEach(function (termId) {
          var term = glossary[termId];
          if (term && typeof term === 'object') {
            if (!merged[termId]) {
              merged[termId] = {};
            }
            // 深いマージを実行
            merged[termId] = deepMerge(merged[termId], term);
          }
        });
      }
    });
    
    return merged;
  }

  /**
   * プロジェクトのglossary_policyに基づいてGlossaryを読み込み・統合する
   * @param {string} projectId - プロジェクトID
   * @param {Object} glossaryPolicy - glossary_policy設定オブジェクト
   * @param {Object} opts - オプション（admin: true で相対パスを調整）
   * @returns {Promise<Object>} 統合済みGlossaryオブジェクト
   */
  function loadGlossaryByPolicy(projectId, glossaryPolicy, opts) {
    var mode = glossaryPolicy && glossaryPolicy.mode ? glossaryPolicy.mode : 'project';
    var domains = glossaryPolicy && glossaryPolicy.domains ? glossaryPolicy.domains : [];
    
    var promises = [];
    
    // mode = "project": プロジェクトのみ
    if (mode === 'project') {
      promises.push(loadProjectGlossary(projectId, opts));
    }
    // mode = "domain": プロジェクト + 指定ドメイン
    else if (mode === 'domain') {
      promises.push(loadProjectGlossary(projectId, opts));
      if (domains && Array.isArray(domains)) {
        domains.forEach(function (domainName) {
          if (domainName) {
            promises.push(loadDomainGlossary(domainName, opts));
          }
        });
      }
    }
    // mode = "global": global + domain + project（全て）
    else if (mode === 'global') {
      promises.push(loadGlobalGlossary(opts));
      if (domains && Array.isArray(domains)) {
        domains.forEach(function (domainName) {
          if (domainName) {
            promises.push(loadDomainGlossary(domainName, opts));
          }
        });
      }
      promises.push(loadProjectGlossary(projectId, opts));
    }
    
    // 全てのPromiseを解決してから統合
    return Promise.all(promises).then(function (glossaryList) {
      // 優先順位: project > domain > global なので、配列の順序を逆にする
      // （mergeGlossariesは配列の順序通りにマージするため、優先度の低い順に並べる）
      var reversedList = [];
      if (mode === 'project') {
        reversedList = [glossaryList[0]]; // project only
      } else if (mode === 'domain') {
        // domain, project の順（projectが最後なので優先される）
        reversedList = glossaryList.slice(1).concat([glossaryList[0]]);
      } else if (mode === 'global') {
        // global, domains..., project の順（projectが最後なので優先される）
        var globalGlossary = glossaryList[0];
        var domainGlossaries = glossaryList.slice(1, glossaryList.length - 1);
        var projectGlossary = glossaryList[glossaryList.length - 1];
        reversedList = [globalGlossary].concat(domainGlossaries).concat([projectGlossary]);
      }
      
      return mergeGlossaries(reversedList);
    });
  }

  // グローバルに公開
  global.GlossaryLoader = {
    loadProjectGlossary: loadProjectGlossary,
    loadDomainGlossary: loadDomainGlossary,
    loadGlobalGlossary: loadGlobalGlossary,
    mergeGlossaries: mergeGlossaries,
    loadGlossaryByPolicy: loadGlossaryByPolicy
  };

})(window);

