/**
 * DatasetLoader - データセット一覧取得・読み込み機能
 * 
 * /students/index.json をマスターファイルとして採用し、
 * そこに記述されたデータセット一覧に従ってデータをロードする（A方式：index.json方式）
 */

(function (global) {
  'use strict';

  /**
   * /students/index.json からデータセット一覧を取得
   * @returns {Promise<Array<Object>>} データセット情報の配列 [{ file, dataset_name, type }, ...]
   */
  function listDatasets() {
    return fetch('../students/index.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('index.json の取得に失敗しました: ' + response.status + ' ' + response.statusText);
        }
        return response.json();
      })
      .then(function (data) {
        // index.json の構造: { datasets: [...] }
        if (!data.datasets || !Array.isArray(data.datasets)) {
          console.warn('index.json に datasets 配列が見つかりません');
          return [];
        }
        
        return data.datasets;
      })
      .catch(function (error) {
        console.error('データセット一覧の取得に失敗しました:', error);
        // Fallback: 空の配列を返す
        return [];
      });
  }

  /**
   * 生徒ログファイルを読み込む（localStorageから multi-session 構造を読み込む）
   * @param {string} studentId - 生徒ID
   * @returns {Promise<Object>} 生徒ログデータ（multi-session 構造）
   */
  function loadStudentLogForId(studentId) {
    if (!studentId) {
      return Promise.resolve({ error: "no_student_id" });
    }
    
    try {
      var key = 'student_' + studentId;
      var raw = localStorage.getItem(key);
      if (!raw) {
        return Promise.resolve({ error: "no_data" });
      }
      var data = JSON.parse(raw);
      return Promise.resolve(data);
    } catch (e) {
      console.error('Failed to load student log:', e);
      return Promise.resolve({ error: "parse_error" });
    }
  }

  /**
   * 生徒ログファイルを読み込む（ファイルから）
   * @param {string} userId - ユーザーID
   * @param {string} sessionId - セッションID
   * @returns {Promise<Object>} 生徒ログデータ
   */
  async function loadStudentLog(userId, sessionId) {
    if (!userId || !sessionId) {
      return Promise.resolve(null);
    }
    
    // ファイル名を生成: {userId}_{sessionId}.json
    var fileName = userId + '_' + sessionId + '.json';
    var filePath = '../students/' + fileName;
    
    return fetch(filePath)
      .then(function (response) {
        if (!response.ok) {
          // ファイルが存在しない場合はnullを返す
          return null;
        }
        return response.json();
      })
      .catch(function (error) {
        console.warn('生徒ログの読み込みに失敗しました:', error);
        return null;
      });
  }

  /**
   * 指定されたデータセットファイルを読み込む（index.json方式）
   * @param {Object} dataset - データセット情報オブジェクト { file, dataset_name, type }
   * @param {Object} config - オプション設定 { student_id, session_id }
   * @returns {Promise<Object>} JSON データオブジェクト
   */
  function loadDataset(dataset, config) {
    if (!dataset || !dataset.file) {
      return Promise.reject(new Error('無効なデータセット情報です'));
    }

    // folder プロパティがある場合は ../students/${folder}/${file}、ない場合は ../students/${file}
    // config.dataset_folder を優先し、なければ dataset.folder を使用
    var folderPart = '';
    if (config && config.dataset_folder) {
      folderPart = config.dataset_folder.replace(/\/?$/, '/');
    } else if (dataset.folder) {
      folderPart = dataset.folder.replace(/\/?$/, '/');
    }
    var filePath = '../students/' + folderPart + dataset.file;
    console.log('[DatasetLoader] loading:', filePath);

    return fetch(filePath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('ファイルの読み込みに失敗しました: ' + dataset.file + ' (' + response.status + ' ' + response.statusText + ')');
        }
        return response.json();
      })
      .then(function (data) {
        // 新しいフォーマット（dataset_name, type を含む）と旧フォーマットの両方に対応
        var result;
        if (data.logs && Array.isArray(data.logs)) {
          // 新しいフォーマット: { dataset_name, type, logs, ... }
          result = data;
        } else if (Array.isArray(data)) {
          // 配列形式の場合
          result = { logs: data };
        } else if (data.version && data.logs) {
          // 既存の形式: { version, generated_at, logs }
          result = data;
        } else {
          // それ以外の場合もそのまま返す
          result = data;
        }
        
        // vector_test_sessions がある場合は student_log として設定
        if (result.vector_test_sessions) {
          result.student_log = result.vector_test_sessions;
        }
        
        // studentLogsを読み込む（configが提供されている場合）
        if (config && config.student_id) {
          return loadStudentLogForId(config.student_id)
            .then(function (studentLog) {
              // vector_test_sessions が既に設定されている場合は上書きしない
              if (!result.student_log) {
                result.student_log = studentLog;
              }
              return result;
            });
        }
        
        return result;
      })
      .catch(function (error) {
        console.error('データセットの読み込みに失敗しました:', error);
        throw error;
      });
  }

  /**
   * index.json を更新（新しいデータセットを追加）
   * @param {string} fileName - ファイル名（例: "classA_2025.json"）
   * @param {string} datasetName - データセット名（例: "classA_2025"）
   * @param {string} type - タイプ（"class" または "student"）
   * @returns {Promise<boolean>} 成功した場合 true
   */
  function updateIndexJson(fileName, datasetName, type) {
    return fetch('../students/index.json')
      .then(function (response) {
        if (!response.ok) {
          // index.json が存在しない場合は新規作成
          return { datasets: [] };
        }
        return response.json();
      })
      .then(function (data) {
        if (!data.datasets) {
          data.datasets = [];
        }

        // 既に存在するか確認
        var exists = data.datasets.some(function (ds) {
          return ds.file === fileName || ds.dataset_name === datasetName;
        });

        if (!exists) {
          // 新しいエントリを追加
          data.datasets.push({
            file: fileName,
            dataset_name: datasetName,
            type: type
          });
        }

        // index.json を更新（ダウンロードとして提供）
        var jsonStr = JSON.stringify(data, null, 2);
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'index.json';
        a.click();
        URL.revokeObjectURL(url);

        return true;
      })
      .catch(function (error) {
        console.error('index.json の更新に失敗しました:', error);
        return false;
      });
  }

  /**
   * 新しいデータセットファイルを作成（A方式：/students/ 直下）
   * @param {string} datasetName - データセット名（例: "classA_2025"）
   * @param {string} type - タイプ（"class" または "student"）
   * @returns {Object} データセットオブジェクト
   */
  function createNewDataset(datasetName, type) {
    if (type !== 'class' && type !== 'student') {
      throw new Error('無効なタイプです: ' + type + ' (class または student を指定してください)');
    }

    var today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 形式

    return {
      dataset_name: datasetName,
      type: type,
      created_at: today,
      logs: []
    };
  }

  /**
   * プロジェクト設定を読み込む（project.json）
   * @param {string} projectId - プロジェクトID（デフォルト: 'default'）
   * @returns {Promise<Object>} プロジェクト設定オブジェクト
   */
  function loadProject(projectId) {
    projectId = projectId || 'default';
    var projectPath = '../projects/' + projectId + '/project.json';
    
    return fetch(projectPath)
      .then(function (response) {
        if (!response.ok) {
          // project.jsonが存在しない場合は空のオブジェクトを返す
          console.warn('project.json が見つかりません: ' + projectPath);
          return {};
        }
        return response.json();
      })
      .then(function (data) {
        // values（理想ベクトル）を含むプロジェクト設定を返す
        return {
          project_id: data.project_id || projectId,
          values: data.values || {},
          // その他のプロジェクト設定も含める
          access_mode: data.access_mode,
          pin_code: data.pin_code
        };
      })
      .catch(function (error) {
        console.error('プロジェクト設定の読み込みに失敗しました:', error);
        // エラー時も空のオブジェクトを返す（後方互換性のため）
        return {};
      });
  }

  /**
   * プロジェクトフォルダからクイズバージョン一覧を取得
   * @param {string} projectId - プロジェクトID（デフォルト: 'default'）
   * @returns {Promise<Array<string>>} バージョンファイル名の配列
   */
  function listQuizVersions(projectId) {
    projectId = projectId || 'default';
    var versionsPath = '../projects/' + projectId + '/quiz_versions/';
    
    // ディレクトリリストを取得するため、index.html のようなファイルを試行
    // 実際の実装では、サーバー側でディレクトリリストを返すAPIが必要
    // ここでは、latest.json と localStorage から取得した履歴を使用
    return fetch(versionsPath + 'latest.json')
      .then(function (response) {
        if (!response.ok) {
          return [];
        }
        return response.json();
      })
      .then(function (latest) {
        var versions = ['latest.json'];
        
        // localStorage からバージョン履歴を取得
        try {
          var historyKey = 'quiz_versions_' + projectId;
          var saved = localStorage.getItem(historyKey);
          if (saved) {
            var history = JSON.parse(saved);
            history.forEach(function (v) {
              if (v.filename && v.filename !== 'latest.json' && versions.indexOf(v.filename) === -1) {
                versions.push(v.filename);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to load version history:', e);
        }
        
        return versions;
      })
      .catch(function (error) {
        console.error('バージョン一覧の取得に失敗しました:', error);
        return [];
      });
  }

  // グローバルに公開
  global.DatasetLoader = {
    listDatasets: listDatasets,
    loadDataset: loadDataset,
    loadStudentLog: loadStudentLog,
    loadStudentLogForId: loadStudentLogForId,
    createNewDataset: createNewDataset,
    updateIndexJson: updateIndexJson,
    loadProject: loadProject,
    listQuizVersions: listQuizVersions
  };

})(window);


