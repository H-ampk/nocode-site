/**
 * Quiz Log 読み込み機能
 */

/**
 * クイズログを読み込む
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Array>} ログの配列
 */
export async function loadQuizLog(projectId) {
  const path = `../../projects/${projectId}/quiz_log.json`;
  
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.warn('Quiz log load failed:', error);
    return [];
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

