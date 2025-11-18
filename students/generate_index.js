/**
 * GenerateIndex - students フォルダ内の JSON ファイルから index.json を自動生成
 * 
 * /students 内の全ての *.json をスキャンし、その情報から index.json を完全再構築する
 */

(function (global) {
  'use strict';

  /**
   * HTML の directory listing を解析して JSON ファイル一覧を取得
   * @param {string} html - HTML テキスト
   * @returns {Array<string>} JSON ファイル名の配列
   */
  function parseDirectoryListing(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    
    var files = [];
    var links = doc.querySelectorAll('a');
    
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      var text = link.textContent.trim();
      
      // index.json はスキップ
      if (text === 'index.json') {
        return;
      }
      
      // ディレクトリ（末尾が /）はスキップ
      if (href && href.endsWith('/')) {
        return;
      }
      
      // JSON ファイルのみを取得
      if (href && href.endsWith('.json') && text.endsWith('.json')) {
        files.push(text);
      }
    });
    
    return files;
  }

  /**
   * JSON ファイルを読み込んで dataset_name と type を取得
   * @param {string} fileName - ファイル名
   * @returns {Promise<Object>} { file, dataset_name, type }
   */
  function loadDatasetInfo(fileName) {
    // students/ フォルダからの相対パス（admin/analysis.html からの相対パス）
    var filePath = '../students/' + fileName;
    
    return fetch(filePath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('ファイルの読み込みに失敗: ' + fileName);
        }
        return response.json();
      })
      .then(function (data) {
        // dataset_name を取得（未定義の場合はファイル名から推測）
        var datasetName = data.dataset_name;
        if (!datasetName) {
          datasetName = fileName.replace('.json', '');
        }
        
        // type を取得（未定義の場合はデフォルト "class"）
        var type = data.type || 'class';
        
        // type の検証
        if (type !== 'class' && type !== 'student') {
          // ファイル名から推測
          var lowerFileName = fileName.toLowerCase();
          if (lowerFileName.indexOf('student') !== -1 || lowerFileName.indexOf('個人') !== -1) {
            type = 'student';
          } else {
            type = 'class';
          }
        }
        
        return {
          file: fileName,
          dataset_name: datasetName,
          type: type
        };
      })
      .catch(function (error) {
        console.warn('ファイル情報の取得に失敗:', fileName, error);
        // エラーが発生した場合でも基本情報を返す
        return {
          file: fileName,
          dataset_name: fileName.replace('.json', ''),
          type: 'class'
        };
      });
  }

  /**
   * index.json を生成する
   * @returns {Promise<Object>} 生成された index.json のデータ
   */
  function generateIndex() {
    // students/ フォルダのディレクトリリストを取得（admin/analysis.html からの相対パス）
    var studentsPath = '../students/';
    
    return fetch(studentsPath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('students ディレクトリの取得に失敗しました: ' + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        // directory listing から JSON ファイル一覧を取得
        var jsonFiles = parseDirectoryListing(html);
        
        if (jsonFiles.length === 0) {
          console.warn('JSON ファイルが見つかりませんでした');
          return { datasets: [] };
        }
        
        // 各ファイルの情報を取得
        var filePromises = jsonFiles.map(function (fileName) {
          return loadDatasetInfo(fileName);
        });
        
        return Promise.all(filePromises);
      })
      .then(function (datasets) {
        // dataset_name でソート
        datasets.sort(function (a, b) {
          return a.dataset_name.localeCompare(b.dataset_name);
        });
        
        // index.json の構造を生成
        return {
          datasets: datasets
        };
      })
      .catch(function (error) {
        console.error('index.json の生成に失敗しました:', error);
        // エラー時は空の datasets を返す
        return { datasets: [] };
      });
  }

  /**
   * index.json をダウンロードする
   * @param {Object} indexData - index.json のデータ
   */
  function downloadIndexJson(indexData) {
    var jsonStr = JSON.stringify(indexData, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'index.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * メイン処理（外部から呼び出す）
   * @returns {Promise<Object>} 生成された index.json のデータ
   */
  function main() {
    console.log('index.json の生成を開始...');
    
    return generateIndex()
      .then(function (indexData) {
        console.log('index.json の生成が完了しました:', indexData);
        
        // ダウンロード
        downloadIndexJson(indexData);
        
        return indexData;
      })
      .catch(function (error) {
        console.error('index.json の生成に失敗しました:', error);
        throw error;
      });
  }

  // グローバルに公開
  global.GenerateIndex = {
    generateIndex: generateIndex,
    main: main,
    downloadIndexJson: downloadIndexJson
  };

})(window);

