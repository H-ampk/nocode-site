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
   * すべての統計を計算してレンダリング
   */
  function renderAll(logs) {
    // すべてのチャートを破棄
    Object.keys(chartInstances).forEach(function(key) {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
      }
    });
    chartInstances = {};

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
   * ログデータを分析してダッシュボードを描画（外部から呼び出すための関数）
   * @param {Array} logs - ログの配列
   */
  function analyze(logs) {
    if (!logs || logs.length === 0) {
      console.warn('ログデータが空です');
      return;
    }
    renderAll(logs);
  }

  // グローバルに公開
  global.AnalysisDashboard = {
    loadQuizLog: loadQuizLog,
    computeOverallStats: computeOverallStats,
    computePerQuestionStats: computePerQuestionStats,
    computeConceptConfusions: computeConceptConfusions,
    computeResponseTimeProfile: computeResponseTimeProfile,
    computePathPatterns: computePathPatterns,
    computeGlossaryUsage: computeGlossaryUsage,
    renderOverallStats: renderOverallStats,
    renderQuestionStats: renderQuestionStats,
    renderConfusionStats: renderConfusionStats,
    renderResponseTimeStats: renderResponseTimeStats,
    renderPathStats: renderPathStats,
    renderGlossaryStats: renderGlossaryStats,
    renderAll: renderAll,
    analyze: analyze
  };

})(window);

