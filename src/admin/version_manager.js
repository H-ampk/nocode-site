/**
 * VersionManager - クイズバージョン管理機能
 * 
 * 機能:
 * - バージョン一覧の表示
 * - バージョンの削除（将来サーバー版で自動化）
 * - バージョン間の差分表示
 */

(function (global) {
  'use strict';

  var currentProjectId = 'default';

  /**
   * プロジェクトIDを取得
   */
  function getProjectId() {
    try {
      return localStorage.getItem('projectId') || 'default';
    } catch (e) {
      return 'default';
    }
  }

  /**
   * バージョン一覧を読み込む
   */
  async function loadVersions() {
    currentProjectId = getProjectId();
    const container = document.getElementById('versionList');
    
    try {
      // quiz.json を読み込んで情報を取得
      const quizPath = `../projects/${currentProjectId}/quiz.json`;
      const quizResponse = await fetch(quizPath);
      
      let quizInfo = null;
      if (quizResponse.ok) {
        quizInfo = await quizResponse.json();
      }
      
      // 注意: ブラウザから直接ディレクトリ一覧を取得することはできないため、
      // localStorage に保存されたバージョン履歴を使用
      const historyKey = `quiz_versions_${currentProjectId}`;
      let versions = [];
      
      try {
        const saved = localStorage.getItem(historyKey);
        if (saved) {
          versions = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to load version history:', e);
      }
      
      // quiz.json が存在する場合は先頭に追加
      if (quizInfo && quizInfo.version) {
        versions.unshift({
          filename: 'quiz.json',
          version: quizInfo.version,
          date: quizInfo.version_date,
          author: quizInfo.author,
          isCurrent: true
        });
      }
      
      renderVersions(versions, container);
    } catch (error) {
      console.error('Failed to load versions:', error);
      container.innerHTML = '<div class="empty-state">エラー: バージョン一覧の読み込みに失敗しました</div>';
    }
  }

  /**
   * バージョン一覧を表示
   */
  function renderVersions(versions, container) {
    if (!versions || versions.length === 0) {
      container.innerHTML = '<div class="empty-state">バージョンファイルが見つかりません</div>';
      return;
    }
    
    container.innerHTML = '';
    
    versions.forEach(function(version) {
      const div = document.createElement('div');
      div.className = 'version-item';
      
      const dateStr = version.date ? new Date(version.date).toLocaleString('ja-JP') : 'N/A';
      const isCurrent = version.isCurrent || version.filename === 'quiz.json';
      
      div.innerHTML = `
        <div class="version-info">
          <div class="version-name">
            ${escapeHtml(version.filename)}
            ${isCurrent ? '<span style="color: #2d7bf4; margin-left: 8px;">(現在のクイズ)</span>' : ''}
          </div>
          <div class="version-meta">
            バージョン: ${escapeHtml(version.version || version.filename)} | 
            作成日時: ${dateStr} | 
            作成者: ${escapeHtml(version.author || 'N/A')}
          </div>
        </div>
        <div class="version-actions">
          <button class="btn-view" onclick="viewVersion('${escapeHtml(version.filename)}')">表示</button>
          ${!isCurrent ? `<button class="btn-diff" onclick="diffVersion('${escapeHtml(version.filename)}')">差分</button>` : ''}
          ${!isCurrent ? `<button class="btn-delete" onclick="deleteVersion('${escapeHtml(version.filename)}')">削除</button>` : ''}
        </div>
      `;
      
      container.appendChild(div);
    });
  }

  /**
   * バージョンを表示
   */
  async function viewVersion(filename) {
    try {
      // quiz.json の場合は直接読み込み、それ以外は quiz_versions/ から読み込み
      const path = filename === 'quiz.json'
        ? `../projects/${currentProjectId}/quiz.json`
        : `../projects/${currentProjectId}/quiz_versions/${filename}`;
      const response = await fetch(path);
      
      if (!response.ok) {
        alert('バージョンファイルの読み込みに失敗しました');
        return;
      }
      
      const data = await response.json();
      const jsonStr = JSON.stringify(data, null, 2);
      
      // 新しいウィンドウで表示
      const newWindow = window.open('', '_blank');
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #f5f5f5; }
            pre { background: white; padding: 20px; border-radius: 8px; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>${filename}</h1>
          <pre>${escapeHtml(jsonStr)}</pre>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Failed to view version:', error);
      alert('バージョンの表示に失敗しました');
    }
  }

  /**
   * バージョンを削除
   */
  async function deleteVersion(filename) {
    if (filename === 'quiz.json') {
      alert('⚠️ quiz.json は削除できません（現在のクイズファイルです）');
      return;
    }
    
    if (!confirm(`本当に "${filename}" を削除しますか？\n\n⚠️ ローカル開発環境のため、削除はファイルを手動で消してください。\n将来サーバー版で自動化します。`)) {
      return;
    }
    
    // ローカルストレージから履歴を削除
    try {
      const historyKey = `quiz_versions_${currentProjectId}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const versions = JSON.parse(saved);
        const filtered = versions.filter(function(v) {
          return v.filename !== filename;
        });
        localStorage.setItem(historyKey, JSON.stringify(filtered));
      }
      
      alert('ローカルストレージから履歴を削除しました。\n実際のファイルは手動で削除してください。');
      loadVersions();
    } catch (e) {
      console.error('Failed to delete version:', e);
      alert('削除に失敗しました');
    }
  }

  /**
   * バージョン間の差分を表示
   */
  async function diffVersion(filename) {
    try {
      const modal = document.getElementById('diffModal');
      const content = document.getElementById('diffContent');
      
      content.innerHTML = '<div class="loading">読み込み中...</div>';
      modal.classList.add('active');
      
      // quiz.json と対象バージョンを読み込む
      const quizPath = `../projects/${currentProjectId}/quiz.json`;
      const versionPath = `../projects/${currentProjectId}/quiz_versions/${filename}`;
      
      const [quizResponse, targetResponse] = await Promise.all([
        fetch(quizPath),
        fetch(versionPath)
      ]);
      
      if (!quizResponse.ok || !targetResponse.ok) {
        content.innerHTML = '<div class="empty-state">バージョンファイルの読み込みに失敗しました</div>';
        return;
      }
      
      const base = await quizResponse.json();
      const target = await targetResponse.json();
      
      const diff = diffJSON(base, target);
      
      if (Object.keys(diff).length === 0) {
        content.innerHTML = '<div class="empty-state">差分はありません</div>';
        return;
      }
      
      let html = '';
      for (const key in diff) {
        html += `
          <div class="diff-item">
            <div class="diff-key">${escapeHtml(key)}</div>
            <div class="diff-old">
              <strong>旧:</strong><br>
              ${escapeHtml(JSON.stringify(diff[key].old, null, 2))}
            </div>
            <div class="diff-new">
              <strong>新:</strong><br>
              ${escapeHtml(JSON.stringify(diff[key].new, null, 2))}
            </div>
          </div>
        `;
      }
      
      content.innerHTML = html;
    } catch (error) {
      console.error('Failed to diff versions:', error);
      document.getElementById('diffContent').innerHTML = '<div class="empty-state">差分の取得に失敗しました</div>';
    }
  }

  /**
   * JSONオブジェクトの差分を計算
   */
  function diffJSON(a, b) {
    const diff = {};
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    
    allKeys.forEach(function(key) {
      const aVal = a[key];
      const bVal = b[key];
      
      // 値が異なる場合
      if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
        diff[key] = {
          old: aVal,
          new: bVal
        };
      }
    });
    
    return diff;
  }

  /**
   * 差分モーダルを閉じる
   */
  function closeDiffModal() {
    document.getElementById('diffModal').classList.remove('active');
  }

  /**
   * HTMLエスケープ
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // グローバルに公開
  global.VersionManager = {
    loadVersions: loadVersions,
    viewVersion: viewVersion,
    deleteVersion: deleteVersion,
    diffVersion: diffVersion,
    closeDiffModal: closeDiffModal
  };

  // グローバル関数としても公開（HTMLから直接呼び出せるように）
  window.viewVersion = viewVersion;
  window.deleteVersion = deleteVersion;
  window.diffVersion = diffVersion;
  window.closeDiffModal = closeDiffModal;

  // ページ読み込み時に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVersions);
  } else {
    loadVersions();
  }

})(window);

