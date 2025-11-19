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
   * 指定されたデータセットファイルを読み込む（index.json方式）
   * @param {Object} dataset - データセット情報オブジェクト { file, dataset_name, type }
   * @returns {Promise<Object>} JSON データオブジェクト
   */
  function loadDataset(dataset) {
    if (!dataset || !dataset.file) {
      return Promise.reject(new Error('無効なデータセット情報です'));
    }

    // folder プロパティがある場合は ../students/${folder}/${file}、ない場合は ../students/${file}
    var folderPart = dataset.folder ? dataset.folder + '/' : '';
    var filePath = '../students/' + folderPart + dataset.file;

    return fetch(filePath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('ファイルの読み込みに失敗しました: ' + dataset.file + ' (' + response.status + ' ' + response.statusText + ')');
        }
        return response.json();
      })
      .then(function (data) {
        // 新しいフォーマット（dataset_name, type を含む）と旧フォーマットの両方に対応
        if (data.logs && Array.isArray(data.logs)) {
          // 新しいフォーマット: { dataset_name, type, logs, ... }
          return data;
        } else if (Array.isArray(data)) {
          // 配列形式の場合
          return { logs: data };
        } else if (data.version && data.logs) {
          // 既存の形式: { version, generated_at, logs }
          return data;
        } else {
          // それ以外の場合もそのまま返す
          return data;
        }
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

  // グローバルに公開
  global.DatasetLoader = {
    listDatasets: listDatasets,
    loadDataset: loadDataset,
    createNewDataset: createNewDataset,
    updateIndexJson: updateIndexJson,
    loadProject: loadProject
  };

})(window);


