/**
 * QuizPlayer - クイズプレイヤーのメインロジック
 * 
 * 機能:
 * - クイズデータの読み込み
 * - 問題表示と選択肢の処理
 * - 理解ログの記録
 * - Glossary自動提示
 */

(function (global) {
  'use strict';

  var currentProjectId = 'default';
  var quizData = null;
  var currentQuestionIndex = 0;
  var currentQuestion = null;
  var glossary = null;
  var timingProfile = null;
  var shownGlossaryTerms = []; // 現在の問題で表示されたGlossary用語を記録

  /**
   * プロジェクトIDを取得
   */
  function getProjectId() {
    try {
      var stored = localStorage.getItem('projectId');
      return stored || 'default';
    } catch (e) {
      return 'default';
    }
  }

  /**
   * 現在のクイズバージョンを取得
   * @returns {Promise<string>} クイズバージョン文字列
   */
  async function getCurrentQuizVersion() {
    try {
      const projectId = getProjectId();
      const response = await fetch(`../../projects/${projectId}/quiz_versions/latest.json`);
      if (response.ok) {
        const data = await response.json();
        return data.version || data.version_date || "unknown";
      }
    } catch (e) {
      console.warn('Failed to load quiz version:', e);
    }
    return "unknown";
  }

  /**
   * プロジェクト設定とGlossaryを読み込む
   */
  function loadProject() {
    currentProjectId = getProjectId();

    // プロジェクト設定を読み込む
    return ProjectConfig.load(currentProjectId)
      .then(function (config) {
        // timing_profile を取得
        timingProfile = config.timing_profile || {
          preset: 'profileB',
          instant_threshold: 3,
          deliberate_threshold: 15
        };
        
        // Glossaryを読み込む
        var glossaryPolicy = config.glossary_policy || { mode: 'project', domains: [] };
        return GlossaryLoader.loadGlossaryByPolicy(currentProjectId, glossaryPolicy, {})
          .then(function (mergedGlossary) {
            glossary = mergedGlossary;
            GlossaryRecommendation.setGlossary(mergedGlossary);
            return config;
          });
      })
      .catch(function (error) {
        console.warn('Failed to load project or glossary:', error);
        glossary = {};
        GlossaryRecommendation.setGlossary({});
        timingProfile = {
          preset: 'profileB',
          instant_threshold: 3,
          deliberate_threshold: 15
        };
        return { glossary_policy: { mode: 'project', domains: [] } };
      });
  }

  /**
   * クイズデータを読み込む
   * @param {string} quizPath - クイズJSONファイルのパス
   */
  function loadQuiz(quizPath) {
    return fetch(quizPath, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load quiz data');
        }
        return response.json();
      })
      .then(function (data) {
        quizData = data;
        
        // ロギングマネージャー初期化
        if (typeof StudentLogManager !== 'undefined') {
          const userId = window.PlayerConfig?.user_id || "student";
          StudentLogManager.init(userId);
          StudentLogManager.startSession();
        }
        
        return data;
      });
  }

  /**
   * 問題を表示する
   * @param {number} questionIndex - 問題のインデックス
   * @param {Function} renderCallback - レンダリングコールバック関数
   */
  function showQuestion(questionIndex, renderCallback) {
    if (!quizData || !quizData.questions) {
      console.error('Quiz data not loaded');
      return;
    }

    if (questionIndex >= quizData.questions.length) {
      // すべての問題が終了
      showResult(renderCallback);
      return;
    }

    currentQuestionIndex = questionIndex;
    currentQuestion = quizData.questions[questionIndex];
    
    // Glossary表示履歴をリセット
    shownGlossaryTerms = [];

    // ログ記録を開始
    QuizLogging.startQuestion(currentQuestion.id || ('q' + questionIndex));

    // レンダリング
    if (renderCallback) {
      renderCallback(currentQuestion, questionIndex, quizData.questions.length);
    }
  }

  /**
   * 選択肢をクリックしたときの処理
   * @param {string} choiceId - 選択肢ID
   * @param {Object} choice - 選択肢オブジェクト
   * @param {Function} renderCallback - レンダリングコールバック関数
   */
  function handleChoiceClick(choiceId, choice, renderCallback) {
    // クリックを記録
    QuizLogging.recordClick(choiceId);

    // 選択肢の表示を更新（視覚的フィードバック）
    if (renderCallback) {
      renderCallback('choice_selected', { choiceId: choiceId, choice: choice });
    }
  }

  /**
   * 回答を確定する
   * @param {string} choiceId - 選択された選択肢ID
   * @param {Object} choice - 選択肢オブジェクト
   * @param {Function} renderCallback - レンダリングコールバック関数
   */
  function confirmAnswer(choiceId, choice, renderCallback) {
    if (!currentQuestion) {
      return;
    }

    // 正誤判定
    var isCorrect = false;
    if (choice.isCorrect !== undefined) {
      isCorrect = choice.isCorrect;
    } else if (choice.correct !== undefined) {
      isCorrect = choice.correct;
    } else if (currentQuestion.correctAnswer) {
      isCorrect = currentQuestion.correctAnswer === choiceId;
    }

    // ログを完成
    var log = QuizLogging.finalizeAnswer(choiceId, isCorrect);
    
    // ベクトルを回答ログに付与
    if (log && choice) {
      // 選択肢オブジェクトからvectorを取得
      log.vector = choice.vector || {};
      
      // ログ形式を統一: questionId, final_answer, correct, response_time, path, vector
      log.questionId = currentQuestion.questionId || currentQuestion.id || ('q' + currentQuestionIndex);
      log.final_answer = choiceId;
      log.correct = isCorrect;
      
      // pathは既にQuizLoggingで設定されているが、確実に設定
      if (!log.path) {
        var clickHistory = QuizLogging.getCurrentLog();
        log.path = clickHistory && clickHistory.path ? clickHistory.path : [choiceId];
      }
    }
    
    // StudentLogManagerに記録
    if (typeof StudentLogManager !== 'undefined' && log) {
      // 選択肢 vector のコピー
      const selected = currentQuestion.choices.find(function(c) { return c.choiceId === choiceId || c.id === choiceId; });
      const vector = selected?.vector || choice?.vector || {};
      
      // クイズバージョンを取得（非同期）
      getCurrentQuizVersion().then(function(quizVersion) {
        // ログ記録
        StudentLogManager.record({
          questionId: log.questionId,
          final_answer: choiceId,
          correct: isCorrect,
          response_time: log.response_time,
          path: log.path || [choiceId],
          vector: vector,
          glossaryShown: shownGlossaryTerms || [],
          conceptTags: currentQuestion.tags || currentQuestion.conceptTags || [],
          quiz_version: quizVersion
        });
      }).catch(function(e) {
        // バージョン取得に失敗してもログは記録
        console.warn('Failed to get quiz version, recording without it:', e);
        StudentLogManager.record({
          questionId: log.questionId,
          final_answer: choiceId,
          correct: isCorrect,
          response_time: log.response_time,
          path: log.path || [choiceId],
          vector: vector,
          glossaryShown: shownGlossaryTerms || [],
          conceptTags: currentQuestion.tags || currentQuestion.conceptTags || [],
          quiz_version: "unknown"
        });
      });
    }

    // 誤答の場合はGlossary解説を推奨
    var explanation = null;
    var recommendation = null;
    if (!isCorrect && log && glossary) {
      // analyze() 関数を使用して推奨用語を取得（timing_profile を渡す）
      var choices = currentQuestion.choices || [];
      var allLogs = QuizLogging.getAllLogs();
      recommendation = GlossaryRecommendation.analyze(log, choices, glossary, allLogs, timingProfile);
      
      // 既存の recommendExplanation() も使用（後方互換性、timing_profile を渡す）
      explanation = GlossaryRecommendation.recommendExplanation(log, choice, currentQuestion, timingProfile);
      
      // recommendation の結果を explanation に統合
      if (recommendation && recommendation.recommended_terms.length > 0) {
        explanation = explanation || {};
        explanation.recommended_terms = recommendation.recommended_terms;
        explanation.reason = recommendation.reason;
        
        // Glossary表示履歴を記録
        shownGlossaryTerms = recommendation.recommended_terms.map(function(term) {
          return term.termId || term.id || term.word || term.name || term;
        });
      }
    }

    // 結果を表示
    if (renderCallback) {
      renderCallback('answer_confirmed', {
        choiceId: choiceId,
        choice: choice,
        isCorrect: isCorrect,
        explanation: explanation,
        recommendation: recommendation,
        log: log
      });
    }
  }

  /**
   * 結果を表示する
   * @param {Function} renderCallback - レンダリングコールバック関数
   */
  function showResult(renderCallback) {
    // ローカルに保存（analysis ダッシュボードで参照)
    if (typeof StudentLogManager !== 'undefined') {
      StudentLogManager.pushSession();
      StudentLogManager.saveToLocal();
      StudentLogManager.download();
    }
    
    if (renderCallback) {
      renderCallback('result', {
        logs: QuizLogging.getAllLogs()
      });
    } else {
      // デフォルトの結果表示
      console.log('Quiz completed. Logs:', QuizLogging.getAllLogs());
    }
  }

  /**
   * 次の問題に進む
   * @param {Function} renderCallback - レンダリングコールバック関数（question, index, total を受け取る）
   */
  function nextQuestion(renderCallback) {
    var nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= (quizData && quizData.questions ? quizData.questions.length : 0)) {
      // すべての問題が終了
      showResult(renderCallback);
      return;
    }
    showQuestion(nextIndex, renderCallback);
  }

  /**
   * クイズをリセット
   */
  function resetQuiz() {
    QuizLogging.clearLogs();
    currentQuestionIndex = 0;
    currentQuestion = null;
  }

  /**
   * 学習ログをダウンロード
   */
  function downloadLogs() {
    QuizLogging.downloadLogs();
  }

  // グローバルに公開
  global.QuizPlayer = {
    getProjectId: getProjectId,
    loadProject: loadProject,
    loadQuiz: loadQuiz,
    showQuestion: showQuestion,
    handleChoiceClick: handleChoiceClick,
    confirmAnswer: confirmAnswer,
    showResult: showResult,
    nextQuestion: nextQuestion,
    resetQuiz: resetQuiz,
    downloadLogs: downloadLogs
  };

})(window);

