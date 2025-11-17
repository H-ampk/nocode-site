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
   * プロジェクト設定とGlossaryを読み込む
   */
  function loadProject() {
    currentProjectId = getProjectId();

    // プロジェクト設定を読み込む
    return ProjectConfig.load(currentProjectId)
      .then(function (config) {
        // timing_profile を取得
        timingProfile = config.timing_profile || {
          instant_threshold: 3,
          deliberate_threshold: 15,
          profile_name: 'default'
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
          instant_threshold: 3,
          deliberate_threshold: 15,
          profile_name: 'default'
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

