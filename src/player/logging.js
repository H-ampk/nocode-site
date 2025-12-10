/**
 * QuizLogging - プレイヤーの行動ログを記録する
 * 
 * 記録するデータ:
 * - questionId: 問題ID
 * - timestamp: 解答完了時刻
 * - clicks: choiceId とクリックタイム（相対秒）
 * - final_answer: 最終的に確定した選択肢
 * - correct: 正誤
 * - response_time: 最初の表示から最終回答までの秒数
 * - path: 選択肢遷移のシーケンス（迷いの流れ）
 */

(function (global) {
  'use strict';

  // 現在の問題のログ状態
  var currentLog = null;
  var questionStartTime = null;
  var quizLogs = []; // 複数問題のログを蓄積

  // 質問開始時刻を保存（ミリ秒単位）
  var questionStartTimeMs = null;

  /**
   * 問題の表示開始を記録
   * @param {string} questionId - 問題ID
   */
  function startQuestion(questionId) {
    questionStartTime = performance.now() / 1000; // 秒単位
    questionStartTimeMs = Date.now(); // ミリ秒単位（logAnswer用）
    currentLog = {
      questionId: questionId,
      timestamp: null,
      clicks: [],
      final_answer: null,
      correct: null,
      response_time: null,
      path: []
    };
  }

  /**
   * 質問開始時刻を記録（logAnswer用）
   */
  function startQuestionTimer() {
    questionStartTimeMs = Date.now();
  }

  /**
   * 選択肢のクリックを記録
   * @param {string} choiceId - 選択肢ID
   */
  function recordClick(choiceId) {
    if (!currentLog || !questionStartTime) {
      console.warn('Question not started. Call startQuestion() first.');
      return;
    }

    var currentTime = performance.now() / 1000;
    var relativeTime = currentTime - questionStartTime;

    currentLog.clicks.push({
      choiceId: choiceId,
      time: Math.round(relativeTime * 10) / 10 // 小数点第1位まで
    });

    // path に追加（重複排除はしない - 迷いの流れを記録）
    if (currentLog.path.indexOf(choiceId) === -1 || 
        currentLog.path[currentLog.path.length - 1] !== choiceId) {
      currentLog.path.push(choiceId);
    }
  }

  /**
   * 選択肢のホバー/フォーカスを記録（オプション）
   * @param {string} choiceId - 選択肢ID
   */
  function recordHover(choiceId) {
    // オプション機能: 将来の拡張用
    // 現在は実装しないが、インターフェースは用意
  }

  /**
   * 回答確定時にログを完成させる
   * @param {string} finalAnswerId - 最終的に確定した選択肢ID
   * @param {boolean} isCorrect - 正誤
   * @returns {Object} 完成したログオブジェクト
   */
  function finalizeAnswer(finalAnswerId, isCorrect) {
    if (!currentLog || !questionStartTime) {
      console.warn('Question not started. Call startQuestion() first.');
      return null;
    }

    var endTime = performance.now() / 1000;
    var responseTime = endTime - questionStartTime;

    currentLog.timestamp = new Date().toISOString();
    currentLog.final_answer = finalAnswerId;
    currentLog.correct = isCorrect;
    currentLog.response_time = Math.round(responseTime * 10) / 10; // 小数点第1位まで

    // 完成したログを配列に追加
    var completedLog = Object.assign({}, currentLog);
    quizLogs.push(completedLog);

    // 現在のログをリセット
    currentLog = null;
    questionStartTime = null;

    return completedLog;
  }

  /**
   * 現在の問題のログを取得（確定前でも）
   * @returns {Object|null} 現在のログオブジェクト
   */
  function getCurrentLog() {
    return currentLog ? Object.assign({}, currentLog) : null;
  }

  /**
   * 蓄積されたすべてのログを取得
   * @returns {Array} ログの配列
   */
  function getAllLogs() {
    return quizLogs.slice(); // コピーを返す
  }

  /**
   * 回答ログ保存（analysis.js用の形式）
   * @param {Object} question - 問題オブジェクト（id, concept プロパティを持つ）
   * @param {Object} selected - 選択された選択肢（id, correct, misconception, measure プロパティを持つ）
   * @returns {Object} ログエントリ
   */
  function logAnswer(question, selected) {
    const end = Date.now();
    const responseTime = questionStartTimeMs ? (end - questionStartTimeMs) : null;

    // 反応コスト（後で analysis.js が再計算するので暫定で保持）
    const responseCost = responseTime != null ? Math.log(1 + responseTime) : null;

    return {
      questionId: question.id,
      timestamp: end,
      question: { concept: question.concept || "その他" },

      selected: {
        id: selected.id,
        correct: selected.correct,
        misconception: selected.misconception || null,
        measure: selected.measure || []
      },

      response_time_ms: responseTime,
      response_cost: responseCost
    };
  }

  /**
   * ログをクリア
   */
  function clearLogs() {
    quizLogs = [];
    currentLog = null;
    questionStartTime = null;
    questionStartTimeMs = null;
  }

  /**
   * quiz_log.json としてダウンロード
   */
  function downloadLogs() {
    if (quizLogs.length === 0) {
      alert('保存するログがありません');
      return;
    }

    var logData = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      logs: quizLogs
    };

    var blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quiz_log.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // グローバルに公開
  global.QuizLogging = {
    startQuestion: startQuestion,
    startQuestionTimer: startQuestionTimer,
    recordClick: recordClick,
    recordHover: recordHover,
    finalizeAnswer: finalizeAnswer,
    logAnswer: logAnswer,
    getCurrentLog: getCurrentLog,
    getAllLogs: getAllLogs,
    clearLogs: clearLogs,
    downloadLogs: downloadLogs
  };
})(window);


