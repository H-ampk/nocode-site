/**
 * Quiz Log 読み込み機能
 */

/**
 * データセットを読み込む（A4: 統一ローダー）
 * @param {string} datasetName - データセット名（dataset_index.jsonのid）
 * @returns {Promise<Object>} { logs: Array, sessions: Array, metadata: Object }
 */
export async function loadDataset(datasetName) {
  try {
    // students/index.json からメタ情報を取得
    const indexResponse = await fetch('/students/index.json', { cache: 'no-store' });
    if (!indexResponse.ok) {
      throw new Error('students/index.json が見つかりません');
    }
    const indexData = await indexResponse.json();
    
    const dataset = indexData.datasets.find(ds => ds.id === datasetName || ds.name === datasetName);
    if (!dataset) {
      throw new Error(`データセットが見つかりません: ${datasetName}`);
    }
    
    // 実データを読み込む
    const dataResponse = await fetch(`/students/${dataset.file}`, { cache: 'no-store' });
    if (!dataResponse.ok) {
      throw new Error(`データファイルが見つかりません: ${dataset.file}`);
    }
    const data = await dataResponse.json();
    
    // ログ配列を抽出（統一形式）
    let logs = [];
    let sessions = [];
    
    if (data.logs && Array.isArray(data.logs)) {
      // ログベース形式
      logs = data.logs;
      sessions = [{
        session_id: data.session_id || 'session_0',
        logs: logs
      }];
    } else if (data.sessions && Array.isArray(data.sessions)) {
      // セッションベース形式
      sessions = data.sessions;
      // 全セッションのログを統合
      data.sessions.forEach(session => {
        if (session.logs && Array.isArray(session.logs)) {
          logs = logs.concat(session.logs);
        }
      });
    }
    
    return {
      logs: logs,
      sessions: sessions,
      metadata: {
        id: dataset.id,
        name: dataset.name,
        type: dataset.type,
        file: dataset.file,
        logCount: logs.length,
        sessionCount: sessions.length
      }
    };
  } catch (error) {
    console.error('Dataset load failed:', error);
    throw error;
  }
}

/**
 * クイズログを読み込む（後方互換性のため保持）
 * @param {string} projectId - プロジェクトID（またはデータセット名）
 * @returns {Promise<Array>} ログの配列
 */
export async function loadQuizLog(projectId) {
  // まず dataset_index.json をチェック（データセット名として扱う）
  try {
    const datasetData = await loadDataset(projectId);
    return datasetData.logs;
  } catch (error) {
    // フォールバック: プロジェクトフォルダから読み込む（旧方式）
    const path = `../../projects/${projectId}/quiz_log.json`;
    
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.logs || [];
    } catch (err) {
      console.warn('Quiz log load failed:', err);
      return [];
    }
  }
}

/**
 * クイズデータを読み込む
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Object>} クイズデータ（questions配列を含む）
 */
export async function loadQuiz(projectId) {
  const path = `../../projects/${projectId}/quiz.json`;
  
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return { questions: [] };
    }
    return await response.json();
  } catch (error) {
    console.warn('Quiz load failed:', error);
    return { questions: [] };
  }
}

