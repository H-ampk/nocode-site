/**
 * AnalysisDashboard - 教師向けデータ分析ダッシュボード
 * 
 * quiz_log.jsonを読み込み、学習者の理解・迷い・反応時間・誤答傾向を可視化する
 */

(function (global) {
  'use strict';

  // チャートインスタンスを保存（再描画時に破棄するため）
  var chartInstances = {};

  /**
   * quiz_log.jsonを読み込む
   * @param {Object} fileData - JSONパース済みのファイルデータ
   * @returns {Array} ログの配列
   */
  function loadQuizLog(fileData) {
    if (!fileData || typeof fileData !== 'object') {
      return [];
    }

    // バージョン1.0形式: { version, generated_at, logs: [...] }
    if (fileData.logs && Array.isArray(fileData.logs)) {
      return fileData.logs;
    }

    // 配列形式の場合
    if (Array.isArray(fileData)) {
      return fileData;
    }

    return [];
  }

  /**
   * ログから quiz_version の一覧を取得
   * @param {Array} logs - ログの配列
   * @returns {Array} quiz_version の一覧（重複なし）
   */
  function getQuizVersionsFromLogs(logs) {
    if (!logs || !Array.isArray(logs)) {
      return [];
    }
    
    var versions = new Set();
    logs.forEach(function(log) {
      if (log.quiz_version) {
        versions.add(log.quiz_version);
      }
    });
    
    return Array.from(versions).sort();
  }

  /**
   * ログを quiz_version でフィルタリング
   * @param {Array} logs - ログの配列
   * @param {string} version - フィルタリングするバージョン（null の場合は全件）
   * @returns {Array} フィルタリングされたログの配列
   */
  function filterLogsByVersion(logs, version) {
    if (!logs || !Array.isArray(logs)) {
      return [];
    }
    
    if (!version || version === 'all') {
      return logs;
    }
    
    return logs.filter(function(log) {
      return log.quiz_version === version;
    });
  }

  /**
   * 全体統計を計算
   * @param {Array} logs - ログの配列
   * @returns {Object} 統計データ
   */
  function computeOverallStats(logs) {
    if (!logs || logs.length === 0) {
      return {
        totalAnswers: 0,
        correctRate: 0,
        averageResponseTime: 0,
        thinkingTypeDistribution: { instant: 0, searching: 0, deliberate: 0 }
      };
    }

    var totalAnswers = logs.length;
    var correctCount = logs.filter(function(log) { return log.correct === true; }).length;
    var correctRate = (correctCount / totalAnswers) * 100;

    var totalResponseTime = logs.reduce(function(sum, log) {
      return sum + (log.response_time || 0);
    }, 0);
    var averageResponseTime = totalResponseTime / totalAnswers;

    // 思考タイプの分類（デフォルト閾値: instant=3, deliberate=15）
    var instantThreshold = 3;
    var deliberateThreshold = 15;
    var thinkingTypeDistribution = {
      instant: 0,
      searching: 0,
      deliberate: 0
    };

    logs.forEach(function(log) {
      var rt = log.response_time || 0;
      if (rt <= instantThreshold) {
        thinkingTypeDistribution.instant++;
      } else if (rt < deliberateThreshold) {
        thinkingTypeDistribution.searching++;
      } else {
        thinkingTypeDistribution.deliberate++;
      }
    });

    return {
      totalAnswers: totalAnswers,
      correctRate: correctRate,
      averageResponseTime: averageResponseTime,
      thinkingTypeDistribution: thinkingTypeDistribution
    };
  }

  /**
   * 問題別統計を計算
   * @param {Array} logs - ログの配列
   * @returns {Object} 問題IDをキーとする統計データ
   */
  function computePerQuestionStats(logs) {
    var questionStats = {};

    logs.forEach(function(log) {
      var questionId = log.questionId || 'unknown';
      
      if (!questionStats[questionId]) {
        questionStats[questionId] = {
          questionId: questionId,
          totalAnswers: 0,
          correctCount: 0,
          correctRate: 0,
          averageResponseTime: 0,
          responseTimes: [],
          wrongAnswers: {},
          clickCounts: []
        };
      }

      var stats = questionStats[questionId];
      stats.totalAnswers++;
      if (log.correct === true) {
        stats.correctCount++;
      }
      stats.responseTimes.push(log.response_time || 0);
      
      // 誤答の記録
      if (log.correct === false && log.final_answer) {
        var wrongAnswer = log.final_answer;
        stats.wrongAnswers[wrongAnswer] = (stats.wrongAnswers[wrongAnswer] || 0) + 1;
      }

      // クリック回数
      var clickCount = (log.clicks && log.clicks.length) || 1;
      stats.clickCounts.push(clickCount);
    });

    // 正答率と平均反応時間を計算
    Object.keys(questionStats).forEach(function(questionId) {
      var stats = questionStats[questionId];
      stats.correctRate = (stats.correctCount / stats.totalAnswers) * 100;
      
      var totalRt = stats.responseTimes.reduce(function(sum, rt) { return sum + rt; }, 0);
      stats.averageResponseTime = totalRt / stats.responseTimes.length;
    });

    return questionStats;
  }

  /**
   * 概念混同分析（conceptTag）
   * 注意: 現在のログにはconceptTagが直接含まれていないため、
   * 誤答の選択肢IDから推測する。将来、ログにtagsやconceptTagが含まれる場合はそれを使用
   * @param {Array} logs - ログの配列
   * @returns {Object} 混同分析データ
   */
  function computeConceptConfusions(logs) {
    var wrongAnswerTags = {};
    var confusionPairs = {};

    logs.filter(function(log) { return log.correct === false; }).forEach(function(log) {
      var wrongAnswer = log.final_answer;
      
      // 誤答選択肢IDをタグとして扱う（将来、tagsやconceptTagがあればそれを使用）
      if (wrongAnswer) {
        wrongAnswerTags[wrongAnswer] = (wrongAnswerTags[wrongAnswer] || 0) + 1;
      }

      // pathから混同パターンを推測（A→B→Aのような往復パターン）
      var path = log.path || [];
      if (path.length >= 2) {
        for (var i = 0; i < path.length - 1; i++) {
          var from = path[i];
          var to = path[i + 1];
          var pairKey = from + '→' + to;
          confusionPairs[pairKey] = (confusionPairs[pairKey] || 0) + 1;
        }
      }
    });

    // タグランキング
    var tagRanking = Object.keys(wrongAnswerTags)
      .map(function(tag) {
        return { tag: tag, count: wrongAnswerTags[tag] };
      })
      .sort(function(a, b) { return b.count - a.count; });

    // 混同ペアランキング
    var pairRanking = Object.keys(confusionPairs)
      .map(function(pair) {
        return { pair: pair, count: confusionPairs[pair] };
      })
      .sort(function(a, b) { return b.count - a.count; });

    return {
      wrongAnswerTagCounts: wrongAnswerTags,
      tagRanking: tagRanking,
      confusionPairs: confusionPairs,
      pairRanking: pairRanking
    };
  }

  /**
   * 反応時間プロファイル集計
   * @param {Array} logs - ログの配列
   * @returns {Object} 反応時間統計データ
   */
  function computeResponseTimeProfile(logs) {
    var responseTimes = logs.map(function(log) { return log.response_time || 0; }).filter(function(rt) { return rt >= 0; });
    
    if (responseTimes.length === 0) {
      return {
        histogram: [],
        mode: 0,
        median: 0,
        max: 0,
        min: 0
      };
    }

    // ヒストグラム用のビンを作成（0-50秒を1秒刻みで）
    var bins = {};
    var maxBin = 50;
    for (var i = 0; i <= maxBin; i++) {
      bins[i] = 0;
    }

    responseTimes.forEach(function(rt) {
      var bin = Math.floor(Math.min(rt, maxBin));
      bins[bin] = (bins[bin] || 0) + 1;
    });

    var histogram = Object.keys(bins).map(function(key) {
      return { time: parseInt(key), count: bins[key] };
    });

    // 最頻値（モード）
    var sortedBins = Object.keys(bins).map(function(key) {
      return { time: parseInt(key), count: bins[key] };
    }).sort(function(a, b) { return b.count - a.count; });
    var mode = sortedBins[0] ? sortedBins[0].time : 0;

    // 中央値
    var sortedTimes = responseTimes.slice().sort(function(a, b) { return a - b; });
    var median = sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
      : sortedTimes[Math.floor(sortedTimes.length / 2)];

    // 最大値・最小値
    var max = Math.max.apply(null, responseTimes);
    var min = Math.min.apply(null, responseTimes);

    return {
      histogram: histogram,
      mode: mode,
      median: median,
      max: max,
      min: min
    };
  }

  /**
   * 迷いパターン（path）分析
   * @param {Array} logs - ログの配列
   * @returns {Object} パス分析データ
   */
  function computePathPatterns(logs) {
    var pathPatterns = {};
    var stepCounts = [];

    logs.forEach(function(log) {
      var path = log.path || [];
      var pathString = path.join('→') || '(なし)';
      
      pathPatterns[pathString] = (pathPatterns[pathString] || 0) + 1;
      stepCounts.push(path.length);
    });

    // パターンランキング
    var patternRanking = Object.keys(pathPatterns)
      .map(function(pattern) {
        return { pattern: pattern, count: pathPatterns[pattern], steps: pattern.split('→').length };
      })
      .sort(function(a, b) { return b.count - a.count; });

    // 平均ステップ数
    var averageSteps = stepCounts.length > 0
      ? stepCounts.reduce(function(sum, count) { return sum + count; }, 0) / stepCounts.length
      : 0;

    return {
      pathPatterns: pathPatterns,
      patternRanking: patternRanking,
      stepCounts: stepCounts,
      averageSteps: averageSteps
    };
  }

  /**
   * Glossary提示履歴の集計
   * 注意: 現在のログにはglossary提示情報が含まれていない場合がある。
   * 将来、log.recommended_termsやlog.glossary_termsがあればそれを使用
   * @param {Array} logs - ログの配列
   * @returns {Object} Glossary使用統計データ
   */
  function computeGlossaryUsage(logs) {
    var termFrequency = {};
    var thinkingTypeTerms = {
      instant: {},
      searching: {},
      deliberate: {}
    };

    logs.forEach(function(log) {
      // recommended_termsがあれば使用（将来の拡張用）
      var recommendedTerms = log.recommended_terms || log.glossary_terms || [];
      
      if (recommendedTerms.length === 0) {
        return;
      }

      // 思考タイプを判定
      var rt = log.response_time || 0;
      var thinkingType = rt <= 3 ? 'instant' : (rt < 15 ? 'searching' : 'deliberate');

      recommendedTerms.forEach(function(term) {
        var termId = term.termId || term.id || term.word || term.name || 'unknown';
        
        termFrequency[termId] = (termFrequency[termId] || 0) + 1;
        thinkingTypeTerms[thinkingType][termId] = (thinkingTypeTerms[thinkingType][termId] || 0) + 1;
      });
    });

    // 頻度ランキング
    var termRanking = Object.keys(termFrequency)
      .map(function(termId) {
        return { termId: termId, count: termFrequency[termId] };
      })
      .sort(function(a, b) { return b.count - a.count; });

    return {
      termFrequency: termFrequency,
      thinkingTypeTerms: thinkingTypeTerms,
      termRanking: termRanking
    };
  }

  /**
   * 全セッションを合算する
   * @param {Object} studentData - 生徒データ（multi-session 構造）
   * @returns {Array} 合算されたログの配列
   */
  function mergeAllSessions(studentData) {
    if (!studentData || !studentData.sessions || !Array.isArray(studentData.sessions)) {
      return [];
    }
    var merged = [];
    studentData.sessions.forEach(function(s) {
      if (s.logs && Array.isArray(s.logs)) {
        merged = merged.concat(s.logs);
      }
    });
    return merged;
  }

  /**
   * ベクトル平均計算
   * @param {Array} logs - ログの配列
   * @returns {Object} ベクトル統計データ（軸ごとの平均値）
   */
  function computeVectorStats(logs) {
    if (!logs || logs.length === 0) {
      return {};
    }
    
    var sum = {};
    var count = 0;
    
    logs.forEach(function(item) {
      if (!item.vector || typeof item.vector !== 'object') {
        return;
      }
      
      for (var axis in item.vector) {
        if (item.vector.hasOwnProperty(axis)) {
          sum[axis] = (sum[axis] || 0) + (Number(item.vector[axis]) || 0);
        }
      }
      count++;
    });
    
    var avg = {};
    if (count > 0) {
      for (var axisKey in sum) {
        if (sum.hasOwnProperty(axisKey)) {
          avg[axisKey] = sum[axisKey] / count;
        }
      }
    }
    
    return avg;
  }

  /**
   * 全体統計をレンダリング
   */
  function renderOverallStats(stats) {
    var container = document.getElementById('overall-stats');
    if (!container) return;

    var html = '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="label">総回答数</div><div class="value">' + stats.totalAnswers + '</div></div>';
    html += '<div class="stat-card"><div class="label">正答率</div><div class="value">' + stats.correctRate.toFixed(1) + '%</div></div>';
    html += '<div class="stat-card"><div class="label">平均反応時間</div><div class="value">' + stats.averageResponseTime.toFixed(1) + '秒</div></div>';
    html += '</div>';

    html += '<h4>思考タイプ分布</h4>';
    html += '<div class="chart-container small"><canvas id="chart-thinking-type"></canvas></div>';

    container.innerHTML = html;

    // 円グラフを描画
    var ctx = document.getElementById('chart-thinking-type');
    if (ctx && window.Chart) {
      if (chartInstances['thinking-type']) {
        chartInstances['thinking-type'].destroy();
      }
      chartInstances['thinking-type'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['直感（instant）', '探索的（searching）', '熟慮（deliberate）'],
          datasets: [{
            data: [
              stats.thinkingTypeDistribution.instant,
              stats.thinkingTypeDistribution.searching,
              stats.thinkingTypeDistribution.deliberate
            ],
            backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }

  /**
   * 問題別統計をレンダリング
   */
  function renderQuestionStats(stats) {
    var container = document.getElementById('question-stats');
    if (!container) return;

    var questionIds = Object.keys(stats).sort();
    
    if (questionIds.length === 0) {
      container.innerHTML = '<p>問題データがありません。</p>';
      return;
    }

    var html = '<div class="chart-container"><canvas id="chart-question-correct-rate"></canvas></div>';
    html += '<div class="table-container"><table><thead><tr><th>問題ID</th><th>回答数</th><th>正答率</th><th>平均反応時間</th><th>よく選ばれた誤答</th></tr></thead><tbody>';

    questionIds.forEach(function(questionId) {
      var stat = stats[questionId];
      var wrongAnswersText = Object.keys(stat.wrongAnswers)
        .map(function(wrong) {
          return wrong + ' (' + stat.wrongAnswers[wrong] + '回)';
        })
        .join(', ') || '-';
      
      html += '<tr>';
      html += '<td>' + escapeHtml(questionId) + '</td>';
      html += '<td>' + stat.totalAnswers + '</td>';
      html += '<td>' + stat.correctRate.toFixed(1) + '%</td>';
      html += '<td>' + stat.averageResponseTime.toFixed(1) + '秒</td>';
      html += '<td>' + escapeHtml(wrongAnswersText) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    container.innerHTML = html;

    // 正答率の棒グラフ
    var ctx = document.getElementById('chart-question-correct-rate');
    if (ctx && window.Chart) {
      if (chartInstances['question-correct-rate']) {
        chartInstances['question-correct-rate'].destroy();
      }
      chartInstances['question-correct-rate'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: questionIds,
          datasets: [{
            label: '正答率 (%)',
            data: questionIds.map(function(id) { return stats[id].correctRate; }),
            backgroundColor: '#2196F3'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100 }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  /**
   * 概念混同分析をレンダリング
   */
  function renderConfusionStats(stats) {
    var container = document.getElementById('confusion-stats');
    if (!container) return;

    var html = '<h4>誤答タグランキング（誤答選択肢ID）</h4>';
    if (stats.tagRanking.length > 0) {
      html += '<div class="chart-container small"><canvas id="chart-wrong-tags"></canvas></div>';
      html += '<div class="table-container"><table><thead><tr><th>選択肢ID</th><th>誤答回数</th></tr></thead><tbody>';
      
      stats.tagRanking.slice(0, 10).forEach(function(item) {
        html += '<tr><td>' + escapeHtml(item.tag) + '</td><td>' + item.count + '</td></tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<p>誤答データがありません。</p>';
    }

    html += '<h4>混同ペアランキング（選択肢遷移パターン）</h4>';
    if (stats.pairRanking.length > 0) {
      html += '<div class="table-container"><table><thead><tr><th>遷移パターン</th><th>出現回数</th></tr></thead><tbody>';
      
      stats.pairRanking.slice(0, 15).forEach(function(item) {
        html += '<tr><td><span class="path-pattern">' + escapeHtml(item.pair) + '</span></td><td>' + item.count + '</td></tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<p>混同パターンデータがありません。</p>';
    }

    container.innerHTML = html;

    // 誤答タグランキングのバーグラフ
    if (stats.tagRanking.length > 0) {
      var ctx = document.getElementById('chart-wrong-tags');
      if (ctx && window.Chart) {
        if (chartInstances['wrong-tags']) {
          chartInstances['wrong-tags'].destroy();
        }
        var topTags = stats.tagRanking.slice(0, 10);
        chartInstances['wrong-tags'] = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: topTags.map(function(item) { return item.tag; }),
            datasets: [{
              label: '誤答回数',
              data: topTags.map(function(item) { return item.count; }),
              backgroundColor: '#F44336'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }
  }

  /**
   * 反応時間統計をレンダリング
   */
  function renderResponseTimeStats(stats) {
    var container = document.getElementById('response-time-stats');
    if (!container) return;

    var html = '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="label">最頻値（モード）</div><div class="value">' + stats.mode + '秒</div></div>';
    html += '<div class="stat-card"><div class="label">中央値</div><div class="value">' + stats.median.toFixed(1) + '秒</div></div>';
    html += '<div class="stat-card"><div class="label">最大値</div><div class="value">' + stats.max.toFixed(1) + '秒</div></div>';
    html += '<div class="stat-card"><div class="label">最小値</div><div class="value">' + stats.min.toFixed(1) + '秒</div></div>';
    html += '</div>';

    html += '<h4>反応時間の分布</h4>';
    html += '<div class="chart-container"><canvas id="chart-response-time"></canvas></div>';

    container.innerHTML = html;

    // ヒストグラム
    var ctx = document.getElementById('chart-response-time');
    if (ctx && window.Chart) {
      if (chartInstances['response-time']) {
        chartInstances['response-time'].destroy();
      }
      chartInstances['response-time'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: stats.histogram.map(function(bin) { return bin.time + '秒'; }),
          datasets: [{
            label: '回答数',
            data: stats.histogram.map(function(bin) { return bin.count; }),
            backgroundColor: '#9C27B0'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { title: { display: true, text: '反応時間（秒）' } },
            y: { beginAtZero: true, title: { display: true, text: '回答数' } }
          }
        }
      });
    }
  }

  /**
   * パス統計をレンダリング
   */
  function renderPathStats(stats) {
    var container = document.getElementById('path-stats');
    if (!container) return;

    var html = '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="label">平均迷いステップ数</div><div class="value">' + stats.averageSteps.toFixed(1) + '</div></div>';
    html += '</div>';

    html += '<h4>よく見られる迷いパターン</h4>';
    if (stats.patternRanking.length > 0) {
      html += '<div class="table-container"><table><thead><tr><th>パターン</th><th>ステップ数</th><th>出現回数</th></tr></thead><tbody>';
      
      stats.patternRanking.slice(0, 20).forEach(function(item) {
        html += '<tr>';
        html += '<td><span class="path-pattern">' + escapeHtml(item.pattern) + '</span></td>';
        html += '<td>' + item.steps + '</td>';
        html += '<td>' + item.count + '</td>';
        html += '</tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<p>パスデータがありません。</p>';
    }

    container.innerHTML = html;
  }

  /**
   * Glossary使用統計をレンダリング
   */
  function renderGlossaryStats(stats) {
    var container = document.getElementById('glossary-stats');
    if (!container) return;

    if (stats.termRanking.length === 0) {
      container.innerHTML = '<p>Glossary提示履歴が見つかりませんでした。<br>現在のログ形式には、Glossary提示情報が含まれていない可能性があります。</p>';
      return;
    }

    var html = '<h4>提示された用語の頻度</h4>';
    html += '<div class="table-container"><table><thead><tr><th>用語ID</th><th>提示回数</th></tr></thead><tbody>';
    
    stats.termRanking.forEach(function(item) {
      html += '<tr><td>' + escapeHtml(item.termId) + '</td><td>' + item.count + '</td></tr>';
    });
    
    html += '</tbody></table></div>';

    html += '<h4>思考タイプ別の用語提示頻度</h4>';
    html += '<div class="table-container"><table><thead><tr><th>思考タイプ</th><th>用語ID</th><th>提示回数</th></tr></thead><tbody>';
    
    ['instant', 'searching', 'deliberate'].forEach(function(thinkingType) {
      var terms = stats.thinkingTypeTerms[thinkingType];
      var termIds = Object.keys(terms).sort(function(a, b) { return terms[b] - terms[a]; });
      if (termIds.length > 0) {
        termIds.forEach(function(termId) {
          html += '<tr>';
          html += '<td>' + escapeHtml(thinkingType) + '</td>';
          html += '<td>' + escapeHtml(termId) + '</td>';
          html += '<td>' + terms[termId] + '</td>';
          html += '</tr>';
        });
      }
    });
    
    html += '</tbody></table></div>';

    container.innerHTML = html;
  }

  /**
   * ベクトル統計をレンダリング（computeVectorStats を使用）
   * @param {Object} projectData - プロジェクト設定（valuesを含む）
   * @param {Array} logs - ログの配列
   */
  function renderVectorStats(projectData, logs) {
    // VectorMath を使用（ES module 禁止、IIFE + window 形式）
    if (!window.VectorMath || !window.VectorMath.cosineSimilarity) {
      console.warn('VectorMath が読み込まれていません');
      return;
    }

    var container = document.getElementById('vector-analysis');
    if (!container) return;

    // computeVectorStats を使用してベクトル統計を計算
    var avg = computeVectorStats(logs);

    // 理想ベクトルと実績ベクトルを比較
    var idealValues = projectData.values || {};

    // 軸を統一（理想ベクトルと実績ベクトルの両方に存在する軸のみ）
    var allAxes = {};
    Object.keys(idealValues).forEach(function(axis) {
      allAxes[axis] = true;
    });
    Object.keys(avg).forEach(function(axis) {
      allAxes[axis] = true;
    });

    var axisList = Object.keys(allAxes).sort();
    var idealArr = axisList.map(function(axis) {
      return idealValues[axis] || 0;
    });
    var actualArr = axisList.map(function(axis) {
      return avg[axis] || 0;
    });

    // コサイン類似度を計算（vector_math.js を使用）
    var similarity = 0;
    if (idealArr.length > 0 && actualArr.length > 0) {
      var cosineSimilarity = window.VectorMath.cosineSimilarity;
      similarity = cosineSimilarity(idealArr, actualArr) * 100;
    }

    // UI 反映
    var similarityEl = document.getElementById('vector-similarity');
    if (similarityEl) {
      similarityEl.textContent = similarity.toFixed(1) + '%';
    }

    var ul = document.getElementById('vector-axis-list');
    if (ul) {
      ul.innerHTML = '';
      
      // 軸ごとにリストアイテムを生成
      axisList.forEach(function(axis) {
        var value = avg[axis] || 0;
        var li = document.createElement('li');
        li.style.padding = '0.5rem';
        li.style.marginBottom = '0.5rem';
        li.style.background = '#f9f9f9';
        li.style.borderRadius = '4px';
        li.textContent = axis + ': ' + value.toFixed(2);
        ul.appendChild(li);
      });

      if (axisList.length === 0) {
        var emptyLi = document.createElement('li');
        emptyLi.style.padding = '0.5rem';
        emptyLi.style.color = '#666';
        emptyLi.textContent = 'ベクトルデータがありません。ログに vector フィールドが含まれているか確認してください。';
        ul.appendChild(emptyLi);
      }
    }
  }

  /**
   * すべての統計を計算してレンダリング
   * @param {Array} logs - ログの配列
   * @param {Object} projectData - プロジェクト設定（オプション）
   */
  function renderAll(logs, projectData) {
    // すべてのチャートを破棄
    Object.keys(chartInstances).forEach(function(key) {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
      }
    });
    chartInstances = {};

    // window.currentLogs をセット（analysis-run タブなどで使用）
    window.currentLogs = logs;

    // 統計を計算
    var overallStats = computeOverallStats(logs);
    var questionStats = computePerQuestionStats(logs);
    var confusionStats = computeConceptConfusions(logs);
    var responseTimeStats = computeResponseTimeProfile(logs);
    var pathStats = computePathPatterns(logs);
    var glossaryStats = computeGlossaryUsage(logs);

    // レンダリング
    renderOverallStats(overallStats);
    renderQuestionStats(questionStats);
    renderConfusionStats(confusionStats);
    renderResponseTimeStats(responseTimeStats);
    renderPathStats(pathStats);
    renderGlossaryStats(glossaryStats);
    
    // 反応時間フィッティング分析を実行
    var responseTimes = logs.map(function(log) { return log.response_time || 0; }).filter(function(rt) { return rt > 0 && rt != null; });
    if (responseTimes.length > 0) {
      runRTFitting(responseTimes);
    }
    
    // ベクトル統計をレンダリング（projectDataがある場合）
    if (projectData) {
      renderVectorStats(projectData, logs);
    } else {
      // projectDataがない場合はデフォルトプロジェクトを読み込む
      if (window.DatasetLoader && window.DatasetLoader.loadProject) {
        window.DatasetLoader.loadProject('default')
          .then(function(project) {
            renderVectorStats(project, logs);
          })
          .catch(function(error) {
            console.warn('プロジェクト設定の読み込みに失敗しました:', error);
            renderVectorStats({}, logs);
          });
      } else {
        renderVectorStats({}, logs);
      }
    }
  }

  /**
   * HTMLエスケープ
   */
  function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 反応時間フィッティング分析（指数分布・正規分布）
   * @param {Array} responseTimeArray - 反応時間の配列
   */
  function runRTFitting(responseTimeArray) {
    if (!responseTimeArray || responseTimeArray.length === 0) {
      return;
    }

    // 1. 前処理（0 や null を除外）
    var validTimes = responseTimeArray.filter(function(rt) {
      return rt != null && rt > 0 && isFinite(rt);
    });

    if (validTimes.length === 0) {
      return;
    }

    // 2. 指数分布の λ を計算（λ = 1 / 平均値）
    var mean = validTimes.reduce(function(sum, rt) { return sum + rt; }, 0) / validTimes.length;
    var lambda = 1.0 / mean;

    // 3. 正規分布の μ（平均）・σ（標準偏差）を計算
    var variance = 0;
    if (validTimes.length > 1) {
      variance = validTimes.reduce(function(sum, rt) {
        return sum + Math.pow(rt - mean, 2);
      }, 0) / (validTimes.length - 1);
    }
    var sigma = Math.sqrt(variance);
    var mu = mean;

    // 4. 自然言語解釈を生成
    var interpretation = interpretRT(lambda, mu, sigma);

    // 5. 結果を表示
    var resultContainer = document.getElementById('rt-fitting-result');
    var section = document.getElementById('rt-fitting-section');
    if (resultContainer && section) {
      section.style.display = 'block';
      resultContainer.innerHTML = 
        '<strong>パラメータ:</strong><br>' +
        '指数分布 λ = ' + lambda.toFixed(6) + '<br>' +
        '正規分布 μ = ' + mu.toFixed(3) + '秒, σ = ' + sigma.toFixed(3) + '秒<br><br>' +
        '<strong>解釈:</strong><br>' +
        interpretation;
    }

    // 6. Chart.js でヒストグラム + フィット曲線を描画
    var canvas = document.getElementById('rt-fitting-chart');
    if (canvas && window.Chart) {
      // 既存のチャートを破棄
      if (chartInstances['rt-fitting']) {
        chartInstances['rt-fitting'].destroy();
      }

      // ヒストグラム用のビンを作成
      var minTime = Math.min.apply(null, validTimes);
      var maxTime = Math.max.apply(null, validTimes);
      var binCount = 20;
      var binWidth = (maxTime - minTime) / binCount;
      var bins = Array(binCount).fill(0);
      var binLabels = [];
      var binCenters = [];

      for (var i = 0; i < binCount; i++) {
        var binStart = minTime + i * binWidth;
        var binEnd = minTime + (i + 1) * binWidth;
        binLabels.push(binStart.toFixed(1) + '-' + binEnd.toFixed(1));
        binCenters.push((binStart + binEnd) / 2);
      }

      // データをビンに分配
      validTimes.forEach(function(rt) {
        var binIndex = Math.min(Math.floor((rt - minTime) / binWidth), binCount - 1);
        bins[binIndex]++;
      });

      // フィット曲線のデータをビンセンターにマッピング
      var sampleCount = validTimes.length;
      var expPdfData = [];
      var normalPdfData = [];
      
      binCenters.forEach(function(center) {
        // 指数分布のPDF値を計算
        var expVal = lambda * Math.exp(-lambda * center) * sampleCount * binWidth;
        expPdfData.push(expVal);
        
        // 正規分布のPDF値を計算
        var normalVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * 
          Math.exp(-0.5 * Math.pow((center - mu) / sigma, 2)) * sampleCount * binWidth;
        normalPdfData.push(normalVal);
      });

      // Chart.js で描画（混合チャート）
      chartInstances['rt-fitting'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: binLabels,
          datasets: [
            {
              label: '観測データ（ヒストグラム）',
              data: bins,
              backgroundColor: 'rgba(156, 39, 176, 0.6)',
              borderColor: 'rgba(156, 39, 176, 1)',
              borderWidth: 1,
              order: 3
            },
            {
              label: '指数分布フィット (λ=' + lambda.toFixed(4) + ')',
              data: expPdfData,
              type: 'line',
              borderColor: 'rgba(244, 67, 54, 1)',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              fill: false,
              order: 1,
              tension: 0.1
            },
            {
              label: '正規分布フィット (μ=' + mu.toFixed(2) + ', σ=' + sigma.toFixed(2) + ')',
              data: normalPdfData,
              type: 'line',
              borderColor: 'rgba(33, 150, 243, 1)',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              fill: false,
              order: 2,
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: true,
              text: '反応時間分布とフィッティング曲線'
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: '反応時間（秒）'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '頻度'
              }
            }
          }
        }
      });
    }
  }

  /**
   * 反応時間フィッティングの自然言語解釈を生成
   * @param {number} lambda - 指数分布パラメータ
   * @param {number} mu - 正規分布平均
   * @param {number} sigma - 正規分布標準偏差
   * @returns {string} 自然言語解釈テキスト
   */
  function interpretRT(lambda, mu, sigma) {
    var result = [];

    // λ interpretation
    if (lambda > 0.25) {
      result.push('反応が速く、直感的に判断する傾向があります。');
    } else if (lambda > 0.1) {
      result.push('やや慎重で、確認を挟んでから回答するタイプです。');
    } else {
      result.push('非常に慎重で、じっくり考えてから回答します。');
    }

    // μ interpretation
    if (mu < 5) {
      result.push('全体的に判断が速い学習者です。');
    } else if (mu < 10) {
      result.push('平均的な判断スピードです。');
    } else {
      result.push('丁寧に読み、確認してから回答する学習スタイルです。');
    }

    // σ interpretation
    if (sigma < 2) {
      result.push('思考スピードは安定しています。');
    } else if (sigma < 5) {
      result.push('問題によって迷いやすさに少し差が見られます。');
    } else {
      result.push('理解のムラが大きく、つまずき概念が存在する可能性があります。');
    }

    return result.join(' ');
  }

  /**
   * ログデータを分析してダッシュボードを描画（外部から呼び出すための関数）
   * @param {Array} logs - ログの配列
   * @param {Object} projectData - プロジェクト設定（オプション）
   */
  function analyze(logs, projectData) {
    if (!logs || logs.length === 0) {
      console.warn('ログデータが空です');
      return;
    }
    // window.currentLogs をセット（analysis-run タブなどで使用）
    window.currentLogs = logs;
    renderAll(logs, projectData);
  }

  /**
   * すべての統計を計算してレンダリング（projectData対応版）
   * @param {Array} logs - ログの配列
   * @param {Object} projectData - プロジェクト設定（オプション）
   */
  function renderAllWithProject(logs, projectData) {
    renderAll(logs, projectData);
    
    // renderAll 内で既に renderVectorStats が呼ばれるため、ここでは不要
    // （重複を避ける）
  }

  /**
   * クラスタリング分析を実行（Juliaスクリプトへの指示）
   * @param {Array} logs - ログの配列
   */
  function runClusterAnalysis(logs) {
    if (!logs || logs.length === 0) {
      alert('クラスタリング分析にはログデータが必要です');
      return;
    }
    
    // ログデータをCSV形式に変換
    const csv = convertLogsToCSV(logs);
    
    // CSVをダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    alert('クラスタリング分析用のCSVファイルをダウンロードしました。\n\n次のコマンドでJulia分析を実行してください:\njulia analysis/cluster_main.jl');
  }

  /**
   * A+B統合版クラスタリング分析システム
   * A: Julia の cluster_output.json / cluster_scatter.png を読み込んで UI 表示
   * B: 存在しない場合は JS fallback で k-means を自動実行
   * @param {Object} datasetData - データセットデータ（sessions または student_log を含む）
   * @param {string} projectId - プロジェクトID（オプション、デフォルト: 'default'）
   */
  function renderClusterAnalysis(datasetData, projectId) {
    projectId = projectId || 'default';
    console.log('[ClusterAnalysis] Starting cluster analysis...', datasetData);
    console.log('Cluster analysis executed');
    
    // cluster_features を抽出
    var clusterFeatures = [];
    var sessionInfo = [];
    
    // sessions または student_log.sessions から cluster_features を抽出
    var sessions = null;
    if (datasetData && datasetData.sessions && Array.isArray(datasetData.sessions)) {
      sessions = datasetData.sessions;
    } else if (datasetData && datasetData.student_log && datasetData.student_log.sessions && Array.isArray(datasetData.student_log.sessions)) {
      sessions = datasetData.student_log.sessions;
    } else if (datasetData && datasetData.vector_test_sessions) {
      // vector_test_sessions がオブジェクトの場合、その中の sessions 配列を使用
      if (datasetData.vector_test_sessions.sessions && Array.isArray(datasetData.vector_test_sessions.sessions)) {
        sessions = datasetData.vector_test_sessions.sessions;
      } else if (Array.isArray(datasetData.vector_test_sessions)) {
        // 配列の場合も対応
        sessions = datasetData.vector_test_sessions;
      }
    }
    
    if (!sessions || sessions.length === 0) {
      console.warn('[ClusterAnalysis] No sessions found with cluster_features');
      var debugEl = document.getElementById('clusterDebug');
      if (debugEl) {
        debugEl.textContent = 'エラー: cluster_features を含むセッションデータが見つかりませんでした。';
      }
      return;
    }
    
    // cluster_features を抽出
    sessions.forEach(function(session) {
      if (session.cluster_features && Array.isArray(session.cluster_features)) {
        clusterFeatures.push(session.cluster_features);
        sessionInfo.push({
          session_id: session.session_id || 'unknown',
          user_id: session.user_id || 'unknown',
          correct_rate: session.correct_rate || 0,
          avg_reaction_time: session.avg_reaction_time || 0,
          avg_path_length: session.avg_path_length || 0,
          cluster_ground_truth: session.cluster_ground_truth || null
        });
      }
    });
    
    if (clusterFeatures.length === 0) {
      console.warn('[ClusterAnalysis] No cluster_features found in sessions');
      var debugEl2 = document.getElementById('clusterDebug');
      if (debugEl2) {
        debugEl2.textContent = 'エラー: cluster_features が見つかりませんでした。';
      }
      return;
    }
    
    console.log('[ClusterAnalysis] Extracted', clusterFeatures.length, 'sessions with cluster_features');
    
    // === A: Julia 出力を優先的に読み込む ===
    var juliaOutputPath = '../../analysis/cluster_output.json';
    var juliaImagePath = '../../analysis/cluster_scatter.png';
    
    Promise.all([
      fetch(juliaOutputPath).then(function(res) { return res.ok ? res.json() : null; }).catch(function() { return null; }),
      fetch(juliaImagePath).then(function(res) { return res.ok ? juliaImagePath : null; }).catch(function() { return null; })
    ]).then(function(results) {
      var juliaOutput = results[0];
      var juliaImage = results[1];
      
      if (juliaOutput && juliaOutput.results) {
        // Julia 出力がある場合は優先使用
        console.log('[ClusterAnalysis] Using Julia output');
        renderClusterAnalysisWithJuliaOutput(juliaOutput, juliaImage, sessionInfo, clusterFeatures);
    } else {
        // === B: JS fallback で k-means を実行 ===
        console.log('[ClusterAnalysis] Julia output not found, using JS fallback');
        renderClusterAnalysisWithJSFallback(clusterFeatures, sessionInfo);
      }
    }).catch(function(error) {
      console.error('[ClusterAnalysis] Error loading Julia output:', error);
      // エラー時も JS fallback を実行
      renderClusterAnalysisWithJSFallback(clusterFeatures, sessionInfo);
    });
  }

  /**
   * Julia 出力を使用してクラスタリング分析結果を表示
   * @param {Object} juliaOutput - Julia の cluster_output.json の内容
   * @param {string} juliaImage - Julia の cluster_scatter.png のパス
   * @param {Array} sessionInfo - セッション情報の配列
   * @param {Array} clusterFeatures - クラスタ特徴量の配列（オプション、散布図描画用）
   */
  function renderClusterAnalysisWithJuliaOutput(juliaOutput, juliaImage, sessionInfo, clusterFeatures) {
    var results = juliaOutput.results || [];
    var clusterStats = juliaOutput.cluster_stats || [];
    
    // セッションID から sessionInfo をマッピング
    var sessionMap = {};
    sessionInfo.forEach(function(info) {
      sessionMap[info.session_id] = info;
    });
    
    // クラスタラベルを取得
    var labels = results.map(function(r) { return r.assigned_cluster || 0; });
    
    // 散布図を描画（Julia画像があれば使用、なければChart.jsで描画）
    if (juliaImage) {
      var scatterEl = document.getElementById('clusterScatter');
      if (scatterEl) {
        scatterEl.innerHTML = '<img src="' + juliaImage + '" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;">';
      }
    } else if (clusterFeatures && clusterFeatures.length > 0) {
      // Chart.js で散布図を描画（clusterFeatures が利用可能な場合）
      renderClusterScatter(clusterFeatures, labels, sessionInfo);
      } else {
      console.warn('[ClusterAnalysis] clusterFeatures not available, skipping scatter plot');
    }
    
    // クラスタテーブルを表示
    renderClusterTableWithJuliaOutput(results, sessionMap, clusterStats);
    
    // デバッグ情報
    var debugEl = document.getElementById('clusterDebug');
    if (debugEl) {
      debugEl.textContent = JSON.stringify({
        source: 'Julia',
        total_sessions: juliaOutput.total_sessions || 0,
        k: juliaOutput.k || 3,
        feature_dimension: juliaOutput.feature_dimension || 0,
        cluster_stats: clusterStats
      }, null, 2);
    }
  }

  /**
   * JS fallback で k-means クラスタリングを実行
   * @param {Array} clusterFeatures - クラスタ特徴量の配列
   * @param {Array} sessionInfo - セッション情報の配列
   */
  function renderClusterAnalysisWithJSFallback(clusterFeatures, sessionInfo) {
    console.log('[ClusterAnalysis] Running JS k-means fallback');
    
    // 簡易 k-means を実行（k=3）
    var k = 3;
    var labels = simpleKMeans(clusterFeatures, k);
    
    // 散布図を描画
    renderClusterScatter(clusterFeatures, labels, sessionInfo);
    
    // クラスタテーブルを表示
    renderClusterTable(labels, sessionInfo);
    
    // デバッグ情報
    var debugEl = document.getElementById('clusterDebug');
    if (debugEl) {
      debugEl.textContent = JSON.stringify({
        source: 'JS Fallback',
        total_sessions: clusterFeatures.length,
        k: k,
        feature_dimension: clusterFeatures.length > 0 ? clusterFeatures[0].length : 0,
        labels: labels
      }, null, 2);
    }
  }

  /**
   * 簡易 k-means クラスタリング（フロントエンド実装）
   * @param {Array} features - 特徴量の配列（各要素は数値配列）
   * @param {number} k - クラスタ数
   * @returns {Array} 各データポイントのクラスタラベル
   */
  function simpleKMeans(features, k) {
    if (!features || features.length === 0) {
      return [];
    }
    
    k = Math.min(k, features.length);
    var numFeatures = features[0].length;
    
    // 初期クラスタ中心をランダムに選択
    var centers = [];
    for (var i = 0; i < k; i++) {
      var randomIndex = Math.floor(Math.random() * features.length);
      centers.push(features[randomIndex].slice());
    }
    
    var labels = [];
    var maxIterations = 100;
    var converged = false;
    
    for (var iter = 0; iter < maxIterations && !converged; iter++) {
      var newLabels = [];
      
      // 各データポイントを最も近いクラスタに割り当て
      for (var i = 0; i < features.length; i++) {
        var minDist = Infinity;
        var closestCluster = 0;
        
        for (var j = 0; j < centers.length; j++) {
          var dist = euclideanDistance(features[i], centers[j]);
          if (dist < minDist) {
            minDist = dist;
            closestCluster = j;
          }
        }
        
        newLabels.push(closestCluster);
      }
      
      // 収束チェック
      converged = true;
      for (var i = 0; i < labels.length; i++) {
        if (labels[i] !== newLabels[i]) {
          converged = false;
          break;
        }
      }
      
      labels = newLabels;
      
      // クラスタ中心を更新
      for (var j = 0; j < centers.length; j++) {
        var clusterPoints = [];
        for (var i = 0; i < features.length; i++) {
          if (labels[i] === j) {
            clusterPoints.push(features[i]);
          }
        }
        
        if (clusterPoints.length > 0) {
          var newCenter = [];
          for (var dim = 0; dim < numFeatures; dim++) {
            var sum = 0;
            for (var p = 0; p < clusterPoints.length; p++) {
              sum += clusterPoints[p][dim];
            }
            newCenter.push(sum / clusterPoints.length);
          }
          centers[j] = newCenter;
        }
      }
    }
    
    return labels;
  }

  /**
   * ユークリッド距離を計算
   * @param {Array} a - ベクトルA
   * @param {Array} b - ベクトルB
   * @returns {number} ユークリッド距離
   */
  function euclideanDistance(a, b) {
    if (!a || !b || a.length !== b.length) {
      return Infinity;
    }
    
    var sum = 0;
    for (var i = 0; i < a.length; i++) {
      var diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  /**
   * クラスタ散布図を描画（Chart.js使用）
   * @param {Array} features - 特徴量の配列
   * @param {Array} labels - クラスタラベルの配列
   * @param {Array} sessionInfo - セッション情報の配列
   */
  function renderClusterScatter(features, labels, sessionInfo) {
    var canvas = document.getElementById('clusterScatter');
    if (!canvas) {
      console.warn('[ClusterAnalysis] clusterScatter canvas not found');
      return;
    }
    
    // 既存のチャートを破棄（完全にクリーンアップ）
    if (chartInstances['clusterScatter']) {
      chartInstances['clusterScatter'].destroy();
      chartInstances['clusterScatter'] = null;
    }
    // キャンバスの親要素（cluster-plot）のサイズを固定
    var plotContainer = document.getElementById('cluster-plot');
    if (plotContainer) {
      plotContainer.style.width = '100%';
      plotContainer.style.height = '450px';
      plotContainer.style.overflow = 'hidden';
    }
    
    if (!features || features.length === 0) {
      console.warn('[ClusterAnalysis] No features to render');
      return;
    }
    
    // 2D可視化のため、最初の2次元を使用
    var data2D = [];
    var colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      if (!Array.isArray(feature) || feature.length === 0) {
        continue;
      }
      var x = feature[0] || 0;
      var y = feature.length > 1 ? feature[1] : 0;
      
      data2D.push({
        x: x,
        y: y,
        label: 'Session ' + (i + 1),
        cluster: labels[i] || 0,
        index: i
      });
    }
    
    if (data2D.length === 0) {
      console.warn('[ClusterAnalysis] No valid 2D data points');
      return;
    }
    
    // クラスタごとにデータをグループ化
    var maxCluster = Math.max.apply(null, labels.length > 0 ? labels : [0]);
    var datasets = [];
    for (var k = 0; k <= maxCluster; k++) {
      var clusterData = data2D.filter(function(d) { return d.cluster === k; });
      if (clusterData.length > 0) {
        datasets.push({
          label: 'Cluster ' + (k + 1),
          data: clusterData.map(function(d) { return { x: d.x, y: d.y }; }),
          backgroundColor: colors[k % colors.length],
          borderColor: colors[k % colors.length],
          pointRadius: 6,
          pointHoverRadius: 8
        });
      }
    }
    
    if (window.Chart && typeof window.Chart === 'function') {
      try {
        chartInstances['clusterScatter'] = new Chart(canvas, {
          type: 'scatter',
          data: { datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            layout: {
              padding: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
              }
            },
            scales: {
              x: { 
                title: { display: true, text: 'Feature 1' },
                type: 'linear'
              },
              y: { 
                title: { display: true, text: 'Feature 2' },
                type: 'linear'
              }
            },
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    var point = context.raw;
                    var index = data2D.findIndex(function(d) {
                      return Math.abs(d.x - point.x) < 0.001 && Math.abs(d.y - point.y) < 0.001;
                    });
                    if (index >= 0 && sessionInfo && sessionInfo[index]) {
                      return 'Session: ' + sessionInfo[index].session_id + ', User: ' + sessionInfo[index].user_id;
                    }
                    return context.dataset.label + ': (' + point.x.toFixed(2) + ', ' + point.y.toFixed(2) + ')';
                  }
                }
              }
            }
          }
        });
        console.log('[ClusterAnalysis] Scatter plot rendered successfully');
      } catch (error) {
        console.error('[ClusterAnalysis] Error rendering scatter plot:', error);
        canvas.innerHTML = '<p style="color: #e53e3e;">散布図の描画に失敗しました: ' + escapeHtml(error.message) + '</p>';
      }
    } else {
      console.warn('[ClusterAnalysis] Chart.js not available');
      canvas.innerHTML = '<p style="color: #e53e3e;">Chart.js が読み込まれていません。</p>';
    }
  }

  /**
   * クラスタテーブルを表示（JS fallback用）
   * @param {Array} labels - クラスタラベルの配列
   * @param {Array} sessionInfo - セッション情報の配列
   */
  function renderClusterTable(labels, sessionInfo) {
    var tableEl = document.getElementById('clusterTable');
    if (!tableEl) return;
    
    var html = '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 0.9em;">';
    html += '<thead><tr style="background: #f9f9f9;">';
    html += '<th style="padding: 10px; text-align: left;">クラスタID</th>';
    html += '<th style="padding: 10px; text-align: left;">ユーザーID</th>';
    html += '<th style="padding: 10px; text-align: left;">セッションID</th>';
    html += '<th style="padding: 10px; text-align: left;">正答率</th>';
    html += '<th style="padding: 10px; text-align: left;">平均反応時間</th>';
    html += '<th style="padding: 10px; text-align: left;">平均パス長</th>';
    html += '</tr></thead><tbody>';
    
    for (var i = 0; i < labels.length && i < sessionInfo.length; i++) {
      var info = sessionInfo[i];
      var clusterId = labels[i] + 1; // 0-indexed を 1-indexed に変換
      
      html += '<tr>';
      html += '<td style="padding: 10px;">' + escapeHtml('Cluster ' + clusterId) + '</td>';
      html += '<td style="padding: 10px;">' + escapeHtml(info.user_id) + '</td>';
      html += '<td style="padding: 10px; font-family: monospace; font-size: 0.85em;">' + escapeHtml(info.session_id) + '</td>';
      html += '<td style="padding: 10px;">' + (info.correct_rate * 100).toFixed(1) + '%</td>';
      html += '<td style="padding: 10px;">' + (info.avg_reaction_time || 0).toFixed(2) + '秒</td>';
      html += '<td style="padding: 10px;">' + (info.avg_path_length || 0).toFixed(2) + '</td>';
      html += '</tr>';
    }
    
    html += '</tbody></table>';
    tableEl.innerHTML = html;
  }

  /**
   * クラスタテーブルを表示（Julia出力用）
   * @param {Array} results - Julia の結果配列
   * @param {Object} sessionMap - セッションID から sessionInfo へのマッピング
   * @param {Array} clusterStats - クラスタ統計情報
   */
  function renderClusterTableWithJuliaOutput(results, sessionMap, clusterStats) {
    var tableEl = document.getElementById('clusterTable');
    if (!tableEl) return;
    
    var html = '<h3 style="margin-bottom: 15px; color: #333;">クラスタ統計</h3>';
    
    // クラスタ統計を表示
    if (clusterStats && clusterStats.length > 0) {
      html += '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 0.9em; margin-bottom: 20px;">';
      html += '<thead><tr style="background: #f9f9f9;">';
      html += '<th style="padding: 10px; text-align: left;">クラスタID</th>';
      html += '<th style="padding: 10px; text-align: left;">セッション数</th>';
      html += '<th style="padding: 10px; text-align: left;">平均距離</th>';
      html += '<th style="padding: 10px; text-align: left;">Ground Truth分布</th>';
      html += '</tr></thead><tbody>';
      
      clusterStats.forEach(function(stat) {
        html += '<tr>';
        html += '<td style="padding: 10px;">' + escapeHtml('Cluster ' + stat.cluster_id) + '</td>';
        html += '<td style="padding: 10px;">' + (stat.num_sessions || 0) + '</td>';
        html += '<td style="padding: 10px;">' + (stat.avg_distance_to_center || 0).toFixed(4) + '</td>';
        html += '<td style="padding: 10px;">' + escapeHtml(JSON.stringify(stat.ground_truth_distribution || {})) + '</td>';
        html += '</tr>';
      });
      
      html += '</tbody></table>';
    }
    
    // セッション詳細を表示
    html += '<h3 style="margin-bottom: 15px; color: #333;">セッション詳細</h3>';
    html += '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 0.9em;">';
    html += '<thead><tr style="background: #f9f9f9;">';
    html += '<th style="padding: 10px; text-align: left;">クラスタID</th>';
    html += '<th style="padding: 10px; text-align: left;">ユーザーID</th>';
    html += '<th style="padding: 10px; text-align: left;">セッションID</th>';
    html += '<th style="padding: 10px; text-align: left;">距離</th>';
    html += '<th style="padding: 10px; text-align: left;">正答率</th>';
    html += '</tr></thead><tbody>';
    
    results.forEach(function(result) {
      var info = sessionMap[result.session_id] || {};
      var clusterId = result.assigned_cluster || 0;
      
      html += '<tr>';
      html += '<td style="padding: 10px;">' + escapeHtml('Cluster ' + (clusterId + 1)) + '</td>';
      html += '<td style="padding: 10px;">' + escapeHtml(info.user_id || 'unknown') + '</td>';
      html += '<td style="padding: 10px; font-family: monospace; font-size: 0.85em;">' + escapeHtml(result.session_id) + '</td>';
      html += '<td style="padding: 10px;">' + (result.distance || 0).toFixed(4) + '</td>';
      html += '<td style="padding: 10px;">' + ((info.correct_rate || 0) * 100).toFixed(1) + '%</td>';
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    tableEl.innerHTML = html;
  }

  /**
   * ログデータをCSV形式に変換
   * @param {Array} logs - ログの配列
   * @returns {string} CSV文字列
   */
  function convertLogsToCSV(logs) {
    if (!logs || logs.length === 0) {
      return '';
    }
    
    // ヘッダー行
    const headers = [
      'student_id',
      'question_id',
      'reaction_time',
      'error_flag',
      'vector_sum',
      'quiz_version',
      'response_time',
      'correct'
    ];
    
    let csv = headers.join(',') + '\n';
    
    // データ行
    logs.forEach(function(log) {
      const reactionTime = log.response_time || 0;
      const errorFlag = log.correct === false ? 1 : 0;
      
      // vector の合計を計算
      let vectorSum = 0;
      if (log.vector && typeof log.vector === 'object') {
        Object.values(log.vector).forEach(function(val) {
          if (typeof val === 'number') {
            vectorSum += val;
          }
        });
      }
      
      const row = [
        log.user_id || 'unknown',
        log.questionId || 'unknown',
        reactionTime,
        errorFlag,
        vectorSum,
        log.quiz_version || 'unknown',
        log.response_time || 0,
        log.correct ? 1 : 0
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  /**
   * JSON diff を計算（再帰的）
   * @param {*} oldObj - 旧オブジェクト
   * @param {*} newObj - 新オブジェクト
   * @param {string} path - 現在のパス（再帰用）
   * @returns {Object} diff オブジェクト
   */
  function computeJSONDiff(oldObj, newObj, path) {
    path = path || '';
    var diff = {};
    
    // 両方が null/undefined の場合は差分なし
    if (oldObj === null && newObj === null) {
      return {};
    }
    if (oldObj === undefined && newObj === undefined) {
      return {};
    }
    
    // 型が異なる場合は変更
    if (typeof oldObj !== typeof newObj) {
      return {
        type: 'change',
        old: oldObj,
        new: newObj,
        path: path
      };
    }
    
    // プリミティブ型の場合は直接比較
    if (oldObj === null || newObj === null || typeof oldObj !== 'object' || typeof newObj !== 'object') {
      if (oldObj !== newObj) {
        return {
          type: 'change',
          old: oldObj,
          new: newObj,
          path: path
        };
      }
      return {};
    }
    
    // 配列の場合
    if (Array.isArray(oldObj) || Array.isArray(newObj)) {
      if (!Array.isArray(oldObj)) {
        return {
          type: 'change',
          old: oldObj,
          new: newObj,
          path: path
        };
      }
      if (!Array.isArray(newObj)) {
        return {
          type: 'change',
          old: oldObj,
          new: newObj,
          path: path
        };
      }
      
      var maxLen = Math.max(oldObj.length, newObj.length);
      var arrayDiff = {};
      
      for (var i = 0; i < maxLen; i++) {
        var itemPath = path + '[' + i + ']';
        if (i >= oldObj.length) {
          // 追加
          arrayDiff[itemPath] = {
            type: 'add',
            old: null,
            new: newObj[i],
            path: itemPath
          };
        } else if (i >= newObj.length) {
          // 削除
          arrayDiff[itemPath] = {
            type: 'delete',
            old: oldObj[i],
            new: null,
            path: itemPath
          };
        } else {
          // 再帰的に比較
          var itemDiff = computeJSONDiff(oldObj[i], newObj[i], itemPath);
          if (Object.keys(itemDiff).length > 0 && itemDiff.type) {
            arrayDiff[itemPath] = itemDiff;
          } else if (Object.keys(itemDiff).length > 0) {
            // オブジェクトの場合はマージ
            Object.assign(arrayDiff, itemDiff);
          }
        }
      }
      
      return arrayDiff;
    }
    
    // オブジェクトの場合
    var allKeys = new Set();
    if (oldObj) {
      Object.keys(oldObj).forEach(function(k) { allKeys.add(k); });
    }
    if (newObj) {
      Object.keys(newObj).forEach(function(k) { allKeys.add(k); });
    }
    
    allKeys.forEach(function(key) {
      var keyPath = path ? path + '.' + key : key;
      var oldVal = oldObj && oldObj.hasOwnProperty(key) ? oldObj[key] : undefined;
      var newVal = newObj && newObj.hasOwnProperty(key) ? newObj[key] : undefined;
      
      if (oldVal === undefined && newVal !== undefined) {
        // 追加
        diff[keyPath] = {
          type: 'add',
          old: null,
          new: newVal,
          path: keyPath
        };
      } else if (oldVal !== undefined && newVal === undefined) {
        // 削除
        diff[keyPath] = {
          type: 'delete',
          old: oldVal,
          new: null,
          path: keyPath
        };
      } else {
        // 再帰的に比較
        var valDiff = computeJSONDiff(oldVal, newVal, keyPath);
        if (Object.keys(valDiff).length > 0 && valDiff.type) {
          diff[keyPath] = valDiff;
        } else if (Object.keys(valDiff).length > 0) {
          // オブジェクトの場合はマージ
          Object.assign(diff, valDiff);
        }
      }
    });
    
    return diff;
  }

  /**
   * JSON diff をHTMLで描画
   * @param {Object} diff - diff オブジェクト
   * @param {string} containerId - コンテナID
   */
  function renderJSONDiff(diff, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    
    var diffKeys = Object.keys(diff);
    if (diffKeys.length === 0) {
      container.innerHTML = '<p style="color: #48bb78; padding: 15px; background: #f0fff4; border-radius: 6px;">✅ 差分はありません</p>';
      container.style.display = 'block';
      return;
    }
    
    var html = '<h3 style="margin-bottom: 15px; color: #333;">差分結果（' + diffKeys.length + '件の変更）</h3>';
    html += '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 0.9em;">';
    html += '<thead><tr style="background: #f9f9f9;">';
    html += '<th style="padding: 10px; text-align: left; width: 30%;">パス</th>';
    html += '<th style="padding: 10px; text-align: left; width: 10%;">タイプ</th>';
    html += '<th style="padding: 10px; text-align: left; width: 30%;">旧値</th>';
    html += '<th style="padding: 10px; text-align: left; width: 30%;">新値</th>';
    html += '</tr></thead><tbody>';
    
    diffKeys.sort().forEach(function(key) {
      var item = diff[key];
      if (!item || !item.type) return;
      
      var type = item.type;
      var bgColor = type === 'add' ? '#c2f7c2' : // green
                   type === 'delete' ? '#f7c2c2' : // red
                   '#fff8b3'; // yellow
      
      var typeLabel = type === 'add' ? '追加' :
                     type === 'delete' ? '削除' :
                     '変更';
      
      var oldValStr = item.old === null || item.old === undefined ? '(なし)' : 
                     typeof item.old === 'object' ? JSON.stringify(item.old, null, 2) : 
                     String(item.old);
      var newValStr = item.new === null || item.new === undefined ? '(なし)' : 
                     typeof item.new === 'object' ? JSON.stringify(item.new, null, 2) : 
                     String(item.new);
      
      html += '<tr style="background: ' + bgColor + ';">';
      html += '<td style="padding: 10px; font-weight: 600; font-family: monospace;">' + escapeHtml(key) + '</td>';
      html += '<td style="padding: 10px; font-weight: 600;">' + escapeHtml(typeLabel) + '</td>';
      html += '<td style="padding: 10px; font-family: monospace; font-size: 0.85em; word-break: break-all;">' + escapeHtml(oldValStr) + '</td>';
      html += '<td style="padding: 10px; font-family: monospace; font-size: 0.85em; word-break: break-all;">' + escapeHtml(newValStr) + '</td>';
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    container.style.display = 'block';
  }

  // グローバルに公開（1度だけ定義）
  if (typeof global.AnalysisDashboard === 'undefined') {
    global.AnalysisDashboard = {};
  }
  
  // 既存のプロパティをマージ（重複を避ける）
  Object.assign(global.AnalysisDashboard, {
    loadQuizLog: loadQuizLog,
    mergeAllSessions: mergeAllSessions,
    computeOverallStats: computeOverallStats,
    computePerQuestionStats: computePerQuestionStats,
    computeConceptConfusions: computeConceptConfusions,
    computeResponseTimeProfile: computeResponseTimeProfile,
    computePathPatterns: computePathPatterns,
    computeGlossaryUsage: computeGlossaryUsage,
    computeVectorStats: computeVectorStats,
    renderOverallStats: renderOverallStats,
    renderQuestionStats: renderQuestionStats,
    renderConfusionStats: renderConfusionStats,
    renderResponseTimeStats: renderResponseTimeStats,
    renderPathStats: renderPathStats,
    renderGlossaryStats: renderGlossaryStats,
    renderVectorStats: renderVectorStats,
    renderAll: renderAll,
    renderAllWithProject: renderAllWithProject,
    analyze: analyze,
    getQuizVersionsFromLogs: getQuizVersionsFromLogs,
    filterLogsByVersion: filterLogsByVersion,
    runClusterAnalysis: runClusterAnalysis,
    convertLogsToCSV: convertLogsToCSV,
    renderClusterAnalysis: renderClusterAnalysis,
    computeJSONDiff: computeJSONDiff,
    renderJSONDiff: renderJSONDiff,
    escapeHtml: escapeHtml
  });

})(window);

// ----------------------
// 📊 分析タブ 初期化（IIFE外の関数 - analysis-run タブ専用）
// ----------------------
// 注意: これらの関数は analysis-run タブ専用で、IIFE外に配置されています
// 重複読み込みを防ぐため、既に定義されている場合はスキップ
(function() {
  'use strict';
  
  // 既に定義されている場合はスキップ
  if (window.AnalysisRunHelper && window.AnalysisRunHelper.loadStudentListForAnalysis) {
    return;
  }

function loadStudentListForAnalysis() {
    // DatasetLoader を使用して他のタブと同じ方法でデータセット一覧を取得
    if (typeof DatasetLoader === 'undefined') {
        console.error('DatasetLoader is not available');
        const selectEl = document.getElementById('analysis-student-file');
        if (selectEl) {
            selectEl.innerHTML = '<option value="">DatasetLoader が読み込まれていません</option>';
        }
        return;
    }
    
    DatasetLoader.listDatasets()
        .then(function(datasets) {
            const selectEl = document.getElementById('analysis-student-file');
            if (!selectEl) return;
            
            selectEl.innerHTML = "";
            
            if (!datasets || datasets.length === 0) {
                selectEl.innerHTML = '<option value="">データセットが見つかりませんでした</option>';
                return;
            }
            
            // データセットを選択肢として追加（dataset オブジェクト全体を value に保存）
            datasets.forEach(function(dataset) {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(dataset); // dataset オブジェクト全体をJSON文字列として保存
                opt.textContent = dataset.dataset_name + ' (' + dataset.type + ')';
                selectEl.appendChild(opt);
            });
        })
        .catch(function(error) {
            console.error('Error loading student files:', error);
            const selectEl = document.getElementById('analysis-student-file');
            if (selectEl) {
                selectEl.innerHTML = '<option value="">ファイルの読み込みに失敗しました</option>';
            }
        });
}
  // 初期化（DOMContentLoaded の前に実行される可能性があるため、ガードを追加）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
if (document.getElementById('analysis-student-file')) {
    loadStudentListForAnalysis();
      }
    });
  } else {
    // DOMContentLoaded が既に発火している場合
    if (document.getElementById('analysis-student-file')) {
      loadStudentListForAnalysis();
    }
  }

  // タブ切り替え時に学生ファイル一覧を読み込む（重複登録を防ぐ）
  if (!window._analysisRunTabListenerAdded) {
    window._analysisRunTabListenerAdded = true;
document.addEventListener('DOMContentLoaded', function() {
    const analysisRunTab = document.querySelector('[data-tab="analysis-run"]');
    if (analysisRunTab) {
        analysisRunTab.addEventListener('click', function() {
          if (window.AnalysisRunHelper && window.AnalysisRunHelper.loadStudentListForAnalysis) {
            window.AnalysisRunHelper.loadStudentListForAnalysis();
          }
        });
    }
});
  }

// ----------------------
// 📊 Julia 分析関数（クライアント側での簡易分析）
// ----------------------
function runJuliaAnalysis(studentData) {
    return new Promise(function(resolve, reject) {
        try {
            // ログデータを取得
            var logs = [];
            if (studentData.logs && Array.isArray(studentData.logs)) {
                logs = studentData.logs;
            } else if (Array.isArray(studentData)) {
                logs = studentData;
            }

            if (logs.length === 0) {
                return resolve({ error: 'ログデータが見つかりませんでした' });
            }

            // 簡易分析（Julia 分析の代替として、基本的な統計を計算）
            var totalAnswers = logs.length;
            var correctCount = logs.filter(function(log) { return log.correct === true; }).length;
            var correctRate = totalAnswers > 0 ? (correctCount / totalAnswers * 100).toFixed(2) : 0;
            
            var responseTimes = logs.map(function(log) { return log.response_time || 0; }).filter(function(rt) { return rt >= 0; });
            var avgResponseTime = responseTimes.length > 0 
                ? (responseTimes.reduce(function(sum, rt) { return sum + rt; }, 0) / responseTimes.length).toFixed(2)
                : 0;

            var conceptTags = [];
            logs.forEach(function(log) {
                if (log.conceptTags && Array.isArray(log.conceptTags)) {
                    log.conceptTags.forEach(function(tag) {
                        if (conceptTags.indexOf(tag) === -1) {
                            conceptTags.push(tag);
                        }
                    });
                }
            });

            // 反応時間の分布フィッティング（簡易版）
            var rtFitting = null;
            if (responseTimes.length > 0) {
                // 基本統計量
                var mean_rt = parseFloat(avgResponseTime);
                var std_rt = 0;
                var variance = 0;
                if (responseTimes.length > 1) {
                    variance = responseTimes.reduce(function(sum, rt) {
                        return sum + Math.pow(rt - mean_rt, 2);
                    }, 0) / (responseTimes.length - 1);
                    std_rt = Math.sqrt(variance);
                }

                // 指数分布のパラメータ推定（λ = 1 / mean）
                var lambda = mean_rt > 0 ? 1.0 / mean_rt : 0;

                // 正規分布のパラメータ推定（μ = mean, σ = std）
                var mu = mean_rt;
                var sigma = std_rt;

                rtFitting = {
                    lambda: lambda,
                    mu: mu,
                    sigma: sigma,
                    mean: mean_rt,
                    median: responseTimes.length > 0 ? 
                        (responseTimes.slice().sort(function(a, b) { return a - b; })[Math.floor(responseTimes.length / 2)]) : 0,
                    std: std_rt,
                    min: Math.min.apply(null, responseTimes),
                    max: Math.max.apply(null, responseTimes),
                    graph: null // Julia分析で生成されるグラフのパス
                };
            }

            var result = {
                totalAnswers: totalAnswers,
                correctCount: correctCount,
                correctRate: parseFloat(correctRate),
                avgResponseTime: parseFloat(avgResponseTime),
                uniqueConcepts: conceptTags.length,
                rtFitting: rtFitting,
                message: 'クライアント側での簡易分析結果（Julia 分析はサーバー側で実行する必要があります）'
            };

            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

// ----------------------
// 📊 サーバー側Julia分析実行（オプション）
// ----------------------
function runServerSideJuliaAnalysis(studentData, basicResult) {
    return new Promise(function(resolve) {
        // サーバー側APIが利用可能かチェック
        // エラーが発生した場合は、クライアント側の結果をそのまま返す
        if (!studentData) {
            resolve(basicResult);
            return;
        }

        // サーバー側のJulia分析エンドポイントを呼び出し（エラー時はフォールバック）
        fetch('/analyze/reaction-time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        })
        .then(function(res) {
            if (!res.ok) {
                throw new Error('サーバー側分析に失敗しました: ' + res.status);
            }
            return res.json();
        })
        .then(function(rtResult) {
            // Julia分析の結果を統合
            if (rtResult && rtResult.lambda !== undefined) {
                basicResult.rtFitting = {
                    lambda: rtResult.lambda,
                    mu: rtResult.mu,
                    sigma: rtResult.sigma,
                    mean: rtResult.mean || basicResult.avgResponseTime,
                    median: rtResult.median || basicResult.avgResponseTime,
                    std: rtResult.std || 0,
                    min: rtResult.min || 0,
                    max: rtResult.max || 0,
                    graph: rtResult.plot ? 'data:image/png;base64,' + rtResult.plot : null
                };
            }
            resolve(basicResult);
        })
        .catch(function(error) {
            // サーバー側分析が失敗した場合は、クライアント側の結果をそのまま返す
            console.warn('サーバー側Julia分析が利用できません:', error.message);
            resolve(basicResult);
        });
    });
}

// ----------------------
  // 📊 分析実行（重複登録を防ぐ）
// ----------------------
  if (!window._runAnalysisBtnListenerAdded) {
    window._runAnalysisBtnListenerAdded = true;
document.addEventListener('DOMContentLoaded', function() {
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', function() {
            const selectedValue = document.getElementById('analysis-student-file').value;
            if (!selectedValue) {
                alert('生徒データを選択してください');
                return;
            }

            // 選択されたデータセット情報をパース
            let selectedDataset;
            try {
                selectedDataset = JSON.parse(selectedValue);
            } catch (error) {
                alert('データセット情報の解析に失敗しました');
                return;
            }

            // ローディング表示
            runAnalysisBtn.disabled = true;
            runAnalysisBtn.textContent = '分析中...';

            // DatasetLoader を使用して他のタブと同じ方法でデータを読み込む
            var loadedStudentData = null;
            DatasetLoader.loadDataset(selectedDataset)
                .then(function(studentData) {
                    loadedStudentData = studentData;
                    // まずクライアント側で簡易分析を実行
                    return runJuliaAnalysis(studentData);
                })
                .then(function(basicResult) {
                    // サーバー側でJulia分析を実行（オプション）
                    // サーバー側APIが利用可能な場合は、分布フィッティンググラフを取得
                    return runServerSideJuliaAnalysis(loadedStudentData, basicResult);
                })
                .then(function(result) {
                    if (result.error) {
                        alert('分析エラー: ' + result.error);
                        runAnalysisBtn.disabled = false;
                        runAnalysisBtn.textContent = '📊 このデータを分析する';
                        return;
                    }
                    const bannerEl = document.getElementById('analysis-banner');
                    if (bannerEl) {
                        bannerEl.classList.remove('hidden');
                    }
                    window.latestAnalysisResult = result;
                    runAnalysisBtn.disabled = false;
                    runAnalysisBtn.textContent = '📊 このデータを分析する';
                })
                .catch(function(error) {
                    console.error('Error running analysis:', error);
                    alert('分析の実行に失敗しました: ' + error.message);
                    runAnalysisBtn.disabled = false;
                    runAnalysisBtn.textContent = '📊 このデータを分析する';
                });
        });
    }
});
  }

// ----------------------
// 📊 結果表示（学術レポート形式）
// ----------------------
function renderAnalysisReport(result) {
    if (!result) return '';
    
    var html = '';
    
    // 1. 正答率セクション
    html += '<div class="report-card">';
    html += '<h3>📊 正答率分析</h3>';
    html += '<div class="report-stats">';
    html += '<div class="report-stat-item">';
    html += '<div class="report-stat-label">総回答数</div>';
    html += '<div class="report-stat-value">' + (result.totalAnswers || 0) + '</div>';
    html += '</div>';
    html += '<div class="report-stat-item">';
    html += '<div class="report-stat-label">正答数</div>';
    html += '<div class="report-stat-value" style="color:#4CAF50;">' + (result.correctCount || 0) + '</div>';
    html += '</div>';
    html += '<div class="report-stat-item">';
    html += '<div class="report-stat-label">正答率</div>';
    html += '<div class="report-number" style="color:#2196F3;">' + (result.correctRate || 0).toFixed(1) + '<span style="font-size:1rem;">%</span></div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="report-comment">';
    var correctComment = '';
    if (result.correctRate >= 80) {
        correctComment = '優秀な成績です。理解度が高いことを示しています。';
    } else if (result.correctRate >= 60) {
        correctComment = '良好な成績です。さらなる向上の余地があります。';
    } else if (result.correctRate >= 40) {
        correctComment = '基礎的な理解が不足している可能性があります。復習を推奨します。';
    } else {
        correctComment = '集中的な支援が必要です。基本的な概念から見直すことを推奨します。';
    }
    html += correctComment;
    html += '</div>';
    html += '</div>';
    
    // 2. 反応時間セクション
    html += '<div class="report-card">';
    html += '<h3>⏱️ 反応時間分析</h3>';
    html += '<div style="text-align:center;">';
    html += '<div class="report-number" style="color:#FF9800;">' + (result.avgResponseTime || 0).toFixed(2) + '<span style="font-size:1rem;">秒</span></div>';
    html += '<div style="color:#666;margin-top:5px;">平均反応時間</div>';
    html += '</div>';
    html += '<div class="report-comment">';
    var responseTimeComment = '';
    if (result.avgResponseTime < 3) {
        responseTimeComment = '非常に素早い反応を示しています。直感的な理解ができている可能性があります。';
    } else if (result.avgResponseTime < 10) {
        responseTimeComment = '適切な反応時間です。考える時間を確保しながら効率的に回答しています。';
    } else if (result.avgResponseTime < 20) {
        responseTimeComment = 'やや時間がかかっています。問題の理解や解法の選択に時間を使っている可能性があります。';
    } else {
        responseTimeComment = '反応に時間がかかっています。問題の難易度や理解度を確認し、適切な支援を検討してください。';
    }
    html += responseTimeComment;
    html += '</div>';
    html += '</div>';
    
    // 3. 概念使用セクション
    html += '<div class="report-card">';
    html += '<h3>🧩 概念使用分析</h3>';
    html += '<div style="text-align:center;">';
    html += '<div class="report-number" style="color:#9C27B0;">' + (result.uniqueConcepts || 0) + '<span style="font-size:1rem;">個</span></div>';
    html += '<div style="color:#666;margin-top:5px;">使用されたユニークな概念タグ数</div>';
    html += '</div>';
    html += '<div class="report-comment">';
    var conceptComment = '';
    if (result.uniqueConcepts === 0) {
        conceptComment = '概念タグが記録されていません。学習ログの記録方法を確認してください。';
    } else if (result.uniqueConcepts < 3) {
        conceptComment = '限られた概念のみが使用されています。学習範囲の拡大を検討してください。';
    } else if (result.uniqueConcepts < 10) {
        conceptComment = '適切な範囲の概念が使用されています。多様な学習状況が記録されています。';
    } else {
        conceptComment = '広範囲の概念が使用されています。包括的な学習が行われていることが示されています。';
    }
    html += conceptComment;
    html += '</div>';
    html += '</div>';
    
    // 4. 反応時間分布フィッティングセクション
    if (result.rtFitting) {
        html += '<div class="report-card">';
        html += '<h3>📈 反応時間分布フィッティング（指数分布・正規分布）</h3>';
        html += '<div class="report-rt-block">';
        html += '<div class="report-stats">';
        html += '<div class="report-stat-item">';
        html += '<div class="report-stat-label">指数分布パラメータ λ</div>';
        html += '<div class="report-number" style="color:#E91E63;">' + result.rtFitting.lambda.toFixed(6) + '</div>';
        html += '</div>';
        html += '<div class="report-stat-item">';
        html += '<div class="report-stat-label">正規分布平均 μ</div>';
        html += '<div class="report-number" style="color:#2196F3;">' + result.rtFitting.mu.toFixed(3) + '</div>';
        html += '</div>';
        html += '<div class="report-stat-item">';
        html += '<div class="report-stat-label">正規分布標準偏差 σ</div>';
        html += '<div class="report-number" style="color:#4CAF50;">' + result.rtFitting.sigma.toFixed(3) + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="report-comment">';
        html += '指数分布パラメータ λ = ' + result.rtFitting.lambda.toFixed(6) + '（平均反応時間の逆数）<br>';
        html += '正規分布パラメータ μ = ' + result.rtFitting.mu.toFixed(3) + '秒, σ = ' + result.rtFitting.sigma.toFixed(3) + '秒（最尤推定）';
        html += '</div>';
        
        // グラフ表示エリア
        if (result.rtFitting.graph) {
            html += '<div style="margin-top:20px;text-align:center;">';
            html += '<img src="' + escapeHtml(result.rtFitting.graph) + '" alt="反応時間分布グラフ" style="max-width:100%;border:1px solid #ddd;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">';
            html += '</div>';
        } else {
            html += '<div class="report-comment" style="margin-top:15px;background:#fff3cd;border-left-color:#ffc107;">';
            html += '⚠️ 分布グラフはJulia分析で生成されます。サーバー側でJulia分析を実行すると、ヒストグラムとフィッティング曲線を含むグラフが表示されます。';
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
    }
    
    // 5. Notes（メッセージ）セクション
    if (result.message) {
        html += '<div class="report-notes">';
        html += '<h4>📝 注意事項</h4>';
        html += '<p>' + escapeHtml(result.message) + '</p>';
        html += '</div>';
    }
    
    return html;
}

  // escapeHtml は既に AnalysisDashboard に定義されているため、重複定義を削除
  
  // AnalysisRunHelper として公開（重複読み込みを防ぐ）
  window.AnalysisRunHelper = {
    loadStudentListForAnalysis: loadStudentListForAnalysis,
    runJuliaAnalysis: runJuliaAnalysis,
    runServerSideJuliaAnalysis: runServerSideJuliaAnalysis,
    renderAnalysisReport: renderAnalysisReport
  };
  
  // DOMContentLoaded イベントリスナー（重複登録を防ぐ）
  if (!window._analysisResultOpenListenerAdded) {
    window._analysisResultOpenListenerAdded = true;

document.addEventListener('DOMContentLoaded', function() {
    const analysisOpen = document.getElementById('analysis-open');
    if (analysisOpen) {
        analysisOpen.addEventListener('click', function() {
            const area = document.getElementById('analysis-result-area');
            if (!area || !window.latestAnalysisResult) return;
            
            // JSON の生表示ではなく、学術レポート形式で表示
          if (window.AnalysisRunHelper && window.AnalysisRunHelper.renderAnalysisReport) {
            area.innerHTML = window.AnalysisRunHelper.renderAnalysisReport(window.latestAnalysisResult);
          } else {
            area.innerHTML = '<pre>' + JSON.stringify(window.latestAnalysisResult, null, 2) + '</pre>';
          }
            area.scrollIntoView({behavior:'smooth'});
        });
    }
});
  }
})();
