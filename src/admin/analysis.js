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

  // 古い分析関数は削除済み（理解階層ダッシュボードのみ使用）

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
   * 理解階層プロファイルを計算
   * @param {Array} logs - ログの配列
   * @returns {Object} 理解階層プロファイル（学習者ごと）
   */
  function computeMasteryProfiles(logs) {
    if (!logs || logs.length === 0) {
      return {};
    }
    
    var profiles = {};
    var MASTERY_LEVELS = window.MASTERY_LEVELS || ['識別', '説明', '適用', '区別', '転移', '構造化'];

    logs.forEach(function(log) {
      var studentId = log.student_id || log.user_id || 'unknown';
      if (!profiles[studentId]) {
        profiles[studentId] = {};
        MASTERY_LEVELS.forEach(function(level) {
          profiles[studentId][level] = 0;
        });
      }

      // ログに理解階層プロファイルが含まれている場合
      if (log.mastery_profile && typeof log.mastery_profile === 'object') {
        MASTERY_LEVELS.forEach(function(level) {
          if (log.mastery_profile.hasOwnProperty(level)) {
            profiles[studentId][level] = (profiles[studentId][level] || 0) + log.mastery_profile[level];
          }
        });
      }
    });

    return profiles;
  }

  // 古いレンダリング関数は削除済み（理解階層ダッシュボードのみ使用）

  /**
   * 理解階層分析ダッシュボードをレンダリング
   * @param {Array} logs - ログの配列
   * @param {Object} projectData - プロジェクト設定（オプション）
   */
  function renderMasteryDashboard(logs, projectData) {
    if (!logs || logs.length === 0) {
      console.warn('ログデータがありません');
      return;
    }

    // Analysis.js を使用して理解階層プロファイルを計算
    if (!window.Analysis || !window.Analysis.analyzeResponses) {
      console.error('Analysis.js が読み込まれていません');
      return;
    }

    // ログを理解階層分析用の形式に変換
    var analysisLog = logs.map(function(log) {
      // ログから question と selected を抽出
      var question = log.question || {};
      var selected = log.selected || {};
      
      // ログに question_id がある場合、プロジェクトデータから問題を取得
      if (!question.id && log.question_id && projectData && projectData.questions) {
        var foundQuestion = projectData.questions.find(function(q) {
          return q.id === log.question_id;
        });
        if (foundQuestion) {
          question = foundQuestion;
        }
      }
      
      // 選択肢から correct、misconception、measure を取得（選択肢レベルのmeasureを使用）
      if (log.final_answer && question.choices) {
        var choice = question.choices.find(function(c) {
          var choiceId = c.id || c.value || ('c' + question.choices.indexOf(c));
          return choiceId === log.final_answer || String(c.value) === String(log.final_answer);
        });
        if (choice) {
          selected.correct = choice.correct === true || choice.isCorrect === true;
          selected.misconception = choice.misconception || null;
          // 選択肢レベルのmeasureを取得
          if (Array.isArray(choice.measure)) {
            selected.measure = choice.measure;
          }
        }
      } else if (typeof log.correct === 'boolean') {
        // ログに直接 correct が含まれている場合
        selected.correct = log.correct;
        selected.misconception = log.misconception || null;
        // ログに直接 measure が含まれている場合
        if (Array.isArray(log.measure)) {
          selected.measure = log.measure;
        }
      }

      return {
        question: question,
        selected: selected
      };
    });

    // 理解階層プロファイルを計算
    var mastery = window.Analysis.analyzeResponses(analysisLog);

    // ダッシュボードデータを計算
    var dashboardData = window.Analysis.computeDashboardData(analysisLog, mastery);

    // 推薦問題を取得
    if (window.GlossaryRecommendation && window.GlossaryRecommendation.recommendQuestions) {
      // プロジェクトから問題一覧を取得
      var questions = [];
      if (projectData && projectData.questions) {
        questions = projectData.questions;
      } else if (window.currentProjectData && window.currentProjectData.questions) {
        questions = window.currentProjectData.questions;
      }

      if (questions.length > 0 && dashboardData.weakLevels && dashboardData.weakLevels.length > 0) {
        // 弱い理解階層に対応する問題を推薦
        dashboardData.recommendations = window.GlossaryRecommendation.recommendQuestions(
          questions,
          dashboardData.weakLevels
        );
      }
    }

    // KPIを更新
    updateKPI(dashboardData);

    // チャートを描画
    drawCharts(dashboardData);

    // 推薦問題リストを表示
    listRecommendations(dashboardData);
  }

  /**
   * KPIを更新
   * @param {Object} dashboardData - ダッシュボードデータ
   */
  function updateKPI(dashboardData) {
    var totalAnswersEl = document.getElementById('kpi-total-answers');
    var accuracyEl = document.getElementById('kpi-accuracy');
    var weakestLevelEl = document.getElementById('kpi-weakest-level');

    if (totalAnswersEl) {
      totalAnswersEl.textContent = dashboardData.totalAnswers || 0;
    }
    if (accuracyEl) {
      var accuracyPercent = (dashboardData.accuracy * 100).toFixed(1);
      accuracyEl.textContent = accuracyPercent + '%';
    }
    if (weakestLevelEl) {
      weakestLevelEl.textContent = dashboardData.weakestLevel || '-';
    }
  }

  /**
   * チャートを描画
   * @param {Object} d - ダッシュボードデータ（computeDashboardData の出力）
   */
  function drawCharts(d) {
    // 既存のチャートインスタンスを破棄
    Object.keys(chartInstances).forEach(function(key) {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
      }
    });
    chartInstances = {};

    // 理解階層の分布（円グラフ）
    if (d.masteryPieData && d.masteryPieData.labels.length > 0) {
      var masteryPieCtx = document.getElementById('masteryPie');
      if (masteryPieCtx && window.Chart) {
        chartInstances['masteryPie'] = new Chart(masteryPieCtx, {
          type: 'doughnut',
          data: d.masteryPieData,
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#fff'
                }
              }
            }
          }
        });
      }
    }

    // 概念別の理解スコア（棒グラフ）
    var conceptBarCtx = document.getElementById('conceptBar');
    if (conceptBarCtx && window.Chart && d.conceptBarData) {
      chartInstances['conceptBar'] = new Chart(conceptBarCtx, {
        type: 'bar',
        data: d.conceptBarData,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            x: {
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    // 誤概念ランキング（棒グラフ）
    var misconceptionBarCtx = document.getElementById('misconceptionBar');
    if (misconceptionBarCtx && window.Chart && d.misconceptionBarData) {
      chartInstances['misconceptionBar'] = new Chart(misconceptionBarCtx, {
        type: 'bar',
        data: d.misconceptionBarData,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            y: {
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    // 弱い理解階層TOP3（棒グラフ）
    var weakLevelsBarCtx = document.getElementById('weakLevelsBar');
    if (weakLevelsBarCtx && window.Chart && d.weakLevelsBarData) {
      chartInstances['weakLevelsBar'] = new Chart(weakLevelsBarCtx, {
        type: 'bar',
        data: d.weakLevelsBarData,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            x: {
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    // 誤概念 × 理解階層のクロス集計ヒートマップ（グループ化された棒グラフで実装）
    var misconceptionMasteryHeatCtx = document.getElementById('misconceptionMasteryHeat');
    if (misconceptionMasteryHeatCtx && window.Chart && d.misconceptionMastery && d.misconceptionMastery.labels.length > 0) {
      chartInstances['misconceptionMasteryHeat'] = new Chart(misconceptionMasteryHeatCtx, {
        type: 'bar',
        data: {
          labels: d.misconceptionMastery.labels,
          datasets: d.misconceptionMastery.datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            x: {
              stacked: false,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#fff',
                usePointStyle: true,
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + '回';
                }
              }
            }
          }
        }
      });
    }

    // 反応時間関連の可視化
    drawRTCharts(d);

    // 迷いトポロジーと安定度の可視化
    if (d.confusionTopology && Object.keys(d.confusionTopology).length > 0) {
      drawConfusionTopology(d.confusionTopology);
    }
    if (d.stability) {
      drawStabilityChart(d.stability);
    }
  }

  /**
   * 反応時間関連のチャートを描画
   * @param {Object} d - ダッシュボードデータ
   */
  function drawRTCharts(d) {
    // 反応時間の分布（ヒストグラム）
    var rtHistogramCtx = document.getElementById('rtHistogram');
    if (rtHistogramCtx && window.Chart && d.rtByLevel && d.rtByLevel.labels && d.rtByLevel.labels.length > 0) {
      chartInstances['rtHistogram'] = new Chart(rtHistogramCtx, {
        type: 'bar',
        data: {
          labels: d.rtByLevel.labels,
          datasets: [{
            label: '反応コスト（平均）',
            data: d.rtByLevel.means,
            backgroundColor: '#48dbfb'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            x: {
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return '反応コスト: ' + context.parsed.y.toFixed(3);
                }
              }
            }
          }
        }
      });
    }

    // 理解階層 × 反応コスト（ヒートマップ風の棒グラフ）
    var rtMasteryHeatCtx = document.getElementById('rtMasteryHeat');
    if (rtMasteryHeatCtx && window.Chart && d.rtByLevel && d.rtByLevel.labels && d.rtByLevel.labels.length > 0) {
      // ヒートマップ風の色付け用データを作成
      var heatData = d.rtByLevel.labels.map(function(label, i) {
        var mean = d.rtByLevel.means[i];
        // 正規化された値を色の強度に変換
        var intensity = Math.min(1, Math.abs(mean) / 2);
        return {
          x: i,
          y: 0,
          v: mean,
          intensity: intensity
        };
      });

      chartInstances['rtMasteryHeat'] = new Chart(rtMasteryHeatCtx, {
        type: 'bar',
        data: {
          labels: d.rtByLevel.labels,
          datasets: [{
            label: '反応コスト',
            data: d.rtByLevel.means,
            backgroundColor: function(context) {
              var dataIndex = context.dataIndex;
              var value = d.rtByLevel.means[dataIndex];
              var intensity = Math.min(1, Math.abs(value) / 2);
              // 正の値は青、負の値は赤で表示
              if (value >= 0) {
                return 'rgba(72, 219, 251, ' + intensity + ')';
              } else {
                return 'rgba(255, 107, 107, ' + intensity + ')';
              }
            },
            borderColor: function(context) {
              var dataIndex = context.dataIndex;
              var value = d.rtByLevel.means[dataIndex];
              var intensity = Math.min(1, Math.abs(value) / 2);
              if (value >= 0) {
                return 'rgba(72, 219, 251, ' + (intensity + 0.2) + ')';
              } else {
                return 'rgba(255, 107, 107, ' + (intensity + 0.2) + ')';
              }
            },
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            },
            y: {
              ticks: {
                color: '#fff'
              },
              grid: {
                color: '#3a3a3a'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  var label = d.rtByLevel.labels[context.dataIndex];
                  var value = context.parsed.x;
                  return label + ': ' + value.toFixed(3);
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * 迷いトポロジーのチャートを描画
   * @param {Object} topology - 迷いトポロジーのデータ
   */
  function drawConfusionTopology(topology) {
    var confusionTopoCtx = document.getElementById('confusionTopo');
    if (!confusionTopoCtx || !window.Chart) {
      return;
    }

    var labels = Object.keys(topology);
    if (labels.length === 0) {
      return;
    }

    var vorticity = labels.map(function(k) {
      return topology[k].vorticity || 0;
    });
    var turbulence = labels.map(function(k) {
      return topology[k].turbulence || 0;
    });

    chartInstances['confusionTopo'] = new Chart(confusionTopoCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '渦（vorticity）',
            data: vorticity,
            backgroundColor: '#ff7675'
          },
          {
            label: '乱流（turbulence）',
            data: turbulence,
            backgroundColor: '#74b9ff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: '#3a3a3a'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#fff'
            },
            grid: {
              color: '#3a3a3a'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
              }
            }
          }
        }
      }
    });
  }

  /**
   * 安定度のチャートを描画
   * @param {Object} stab - 安定度のデータ
   */
  function drawStabilityChart(stab) {
    var stabilityChartCtx = document.getElementById('stabilityChart');
    if (!stabilityChartCtx || !window.Chart) {
      return;
    }

    if (!stab || typeof stab.stability_index !== 'number') {
      return;
    }

    chartInstances['stabilityChart'] = new Chart(stabilityChartCtx, {
      type: 'bar',
      data: {
        labels: ['安定度（1=最高）'],
        datasets: [{
          label: 'stability_index',
          data: [stab.stability_index],
          backgroundColor: '#55efc4'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 1,
            ticks: {
              color: '#fff',
              callback: function(value) {
                return value.toFixed(2);
              }
            },
            grid: {
              color: '#3a3a3a'
            }
          },
          y: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: '#3a3a3a'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '安定度: ' + context.parsed.x.toFixed(3) + ' (分散: ' + (stab.variance || 0).toFixed(2) + ')';
              }
            }
          }
        }
      }
    });
  }

  /**
   * 推薦問題リストを表示
   * @param {Object} dashboardData - ダッシュボードデータ
   */
  function listRecommendations(dashboardData) {
    var ul = document.getElementById('recommendation-list');
    if (!ul) return;

    ul.innerHTML = '';

    if (!dashboardData.recommendations || dashboardData.recommendations.length === 0) {
      var li = document.createElement('li');
      li.textContent = '推薦問題はありません';
      li.style.opacity = '0.5';
      li.style.padding = '12px 15px';
      li.style.background = '#333';
      li.style.borderLeft = '4px solid #666';
      li.style.borderRadius = '6px';
      ul.appendChild(li);
      return;
    }

    dashboardData.recommendations.forEach(function(item, index) {
      var li = document.createElement('li');
      li.textContent = (index + 1) + '. ' + item;
      li.style.padding = '12px 15px';
      li.style.marginBottom = '8px';
      li.style.background = '#333';
      li.style.borderLeft = '4px solid #2196F3';
      li.style.borderRadius = '6px';
      li.style.transition = 'background 0.2s';
      li.addEventListener('mouseenter', function() {
        this.style.background = '#3a3a3a';
      });
      li.addEventListener('mouseleave', function() {
        this.style.background = '#333';
      });
      ul.appendChild(li);
    });
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
    // window.currentLogs をセット
    window.currentLogs = logs;
    
    // 理解階層分析ダッシュボードを表示
    renderMasteryDashboard(logs, projectData);
  }

  // 古い分析関数、クラスタリング関数は削除済み（理解階層ダッシュボードのみ使用）


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

  // 古いJSON diff関数は削除済み（理解階層ダッシュボードのみ使用）
  // クイズバージョン差分表示機能は admin/analysis.html のインラインスクリプトで実装
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
  
  // 古い因子分析関数は削除済み（理解階層ダッシュボードのみ使用）
  // 以下の関数は使用されていませんが、admin/analysis.htmlで参照される可能性があるため残しています
  function runFactorAnalysis(logs) {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      alert('ログデータがありません。先にデータセットを選択してください。');
      return;
    }

    if (typeof window.FactorAnalysis === 'undefined') {
      alert('因子分析モジュールが読み込まれていません。factor_analysis.js を確認してください。');
      return;
    }

    try {
      // 因子分析を実行
      const result = window.FactorAnalysis.run(logs);
      
      // プロジェクトIDを取得して結果に保存
      const projectId = localStorage.getItem('projectId') || 'default';
      result.projectId = projectId;
      
      // 因子ラベルを読み込んで結果に保存
      result.factorLabels = loadFactorLabels(projectId);
      
      // グローバル変数に保存（後でラベル更新時に使用）
      window.currentFactorAnalysisResult = result;
      window.currentFactorScores = result.factor_scores; // クラスタリング用に保存
      
      // 結果を表示
      renderFactorAnalysisResult(result);
    } catch (error) {
      console.error('Factor analysis error:', error);
      alert('因子分析の実行中にエラーが発生しました: ' + error.message);
    }
  }

  /**
   * 因子ラベルを読み込む（同期版：localStorageから）
   * @param {string} projectId - プロジェクトID（デフォルト: 'default'）
   * @returns {Object} 因子ラベルオブジェクト { F1: "ラベル1", F2: "ラベル2", ... }
   */
  function loadFactorLabels(projectId) {
    projectId = projectId || 'default';
    const labels = {};

    // localStorageから読み込み
    try {
      const localStorageKey = 'factor_labels_' + projectId;
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(labels, parsed);
      }
    } catch (e) {
      console.warn('Failed to load factor labels from localStorage:', e);
    }

    // プロジェクトファイルから読み込み（非同期、後で適用）
    // ファイルからの読み込みは非同期なので、後から適用される
    loadFactorLabelsFromFile(projectId).then(function(fileLabels) {
      if (fileLabels && Object.keys(fileLabels).length > 0) {
        // ファイルからのラベルをlocalStorageに保存
        try {
          const localStorageKey = 'factor_labels_' + projectId;
          localStorage.setItem(localStorageKey, JSON.stringify(fileLabels));
          
          // 現在表示中の因子分析結果があれば、ラベルを更新
          const container = document.getElementById('factor-analysis-result');
          if (container && container.innerHTML) {
            // 因子ラベル入力欄を更新
            Object.keys(fileLabels).forEach(function(factorKey) {
              const input = document.getElementById('factor-label-' + factorKey);
              if (input) {
                input.value = fileLabels[factorKey];
              }
            });
            
            // 表のヘッダーを更新（グローバル変数から結果を取得）
            if (window.currentFactorAnalysisResult) {
              window.currentFactorAnalysisResult.factorLabels = fileLabels;
              updateFactorTableHeaders(window.currentFactorAnalysisResult, fileLabels);
            }
          }
        } catch (e) {
          console.warn('Failed to save factor labels to localStorage:', e);
        }
      }
    }).catch(function(error) {
      console.warn('Failed to load factor labels from file:', error);
    });

    return labels;
  }

  /**
   * プロジェクトファイルから因子ラベルを読み込む
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<Object>} 因子ラベルオブジェクト
   */
  function loadFactorLabelsFromFile(projectId) {
    return new Promise(function(resolve, reject) {
      const path = '../../projects/' + projectId + '/analysis_labels.json';
      fetch(path)
        .then(function(response) {
          if (!response.ok) {
            resolve({}); // ファイルが存在しない場合は空オブジェクト
            return;
          }
          return response.json();
        })
        .then(function(data) {
          if (data && typeof data === 'object') {
            resolve(data);
          } else {
            resolve({});
          }
        })
        .catch(function(error) {
          resolve({}); // エラー時も空オブジェクトを返す
        });
    });
  }

  /**
   * 因子ラベルを保存する
   * @param {Object} labels - 因子ラベルオブジェクト { F1: "ラベル1", F2: "ラベル2", ... }
   * @param {string} projectId - プロジェクトID（デフォルト: 'default'）
   */
  function saveFactorLabels(labels, projectId) {
    projectId = projectId || 'default';

    // 1. localStorageに保存
    try {
      const localStorageKey = 'factor_labels_' + projectId;
      localStorage.setItem(localStorageKey, JSON.stringify(labels));
      console.log('Factor labels saved to localStorage:', labels);
    } catch (e) {
      console.warn('Failed to save factor labels to localStorage:', e);
    }

    // 2. プロジェクトファイルに保存（ダウンロード形式）
    try {
      const blob = new Blob([JSON.stringify(labels, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analysis_labels.json';
      // ダウンロードを促すメッセージを表示
      const message = '因子ラベルを保存しました。\n\n保存先: projects/' + projectId + '/analysis_labels.json\n\nファイルをダウンロードして、上記のパスに配置してください。';
      alert(message);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to save factor labels to file:', e);
    }
  }

  /**
   * 因子名を取得（ラベルがあればラベル、なければデフォルト名）
   * @param {number} factorIndex - 因子インデックス（0始まり）
   * @param {Object} labels - 因子ラベルオブジェクト
   * @returns {string} 因子名
   */
  function getFactorName(factorIndex, labels) {
    const factorKey = 'F' + (factorIndex + 1);
    if (labels && labels[factorKey]) {
      return labels[factorKey];
    }
    return '因子' + (factorIndex + 1);
  }

  /**
   * 因子分析結果を表示
   * @param {Object} result - 因子分析結果
   */
  function renderFactorAnalysisResult(result) {
    const container = document.getElementById('factor-analysis-result');
    if (!container) {
      console.warn('Factor analysis result container not found');
      return;
    }

    // プロジェクトIDを取得（結果オブジェクトから、またはlocalStorageから）
    const projectId = result.projectId || localStorage.getItem('projectId') || 'default';
    
    // 因子ラベルを読み込む（結果オブジェクトに既にある場合はそれを使用）
    const labels = result.factorLabels || loadFactorLabels(projectId);
    
    // 結果オブジェクトにラベルを保存（後で使用）
    result.factorLabels = labels;
    result.projectId = projectId;

    let html = '<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    html += '<h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">因子分析結果</h3>';

    // 固有値一覧表
    html += '<div style="margin-top: 20px;">';
    html += '<h4 style="color: #555; margin-bottom: 10px;">固有値一覧</h4>';
    html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">';
    html += '<thead><tr style="background: #f9f9f9;"><th style="padding: 10px;">因子</th><th style="padding: 10px;">固有値</th><th style="padding: 10px;">Kaiser基準</th></tr></thead>';
    html += '<tbody>';
    
    result.eigenvalues.forEach(function(eigenvalue, index) {
      const isSignificant = eigenvalue > 1;
      const color = isSignificant ? '#48bb78' : '#999';
      html += '<tr>';
      html += '<td style="padding: 10px; font-weight: 600;">因子' + (index + 1) + '</td>';
      html += '<td style="padding: 10px; color: ' + color + '; font-weight: 600;">' + eigenvalue.toFixed(3) + '</td>';
      html += '<td style="padding: 10px; color: ' + color + ';">' + (isSignificant ? '✓ 採用' : '× 除外') + '</td>';
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '<p style="color: #666; font-size: 0.9em;">採用因子数: <strong>' + result.num_factors + '</strong>（Kaiser基準: 固有値 > 1）</p>';
    html += '</div>';

    // 因子ラベル設定パネル
    if (result.num_factors > 0) {
      html += '<div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border: 2px solid #4a90e2; border-radius: 8px;">';
      html += '<h4 style="color: #333; margin-top: 0; margin-bottom: 15px;">🏷️ 因子ラベル設定</h4>';
      html += '<p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">各因子に意味のある名前を付けることができます。ラベルは因子スコア表と因子負荷量表に反映されます。</p>';
      html += '<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">';
      
      for (let i = 0; i < result.num_factors; i++) {
        const factorKey = 'F' + (i + 1);
        const currentLabel = labels[factorKey] || '';
        html += '<div style="display: flex; align-items: center; gap: 10px;">';
        html += '<label style="font-weight: 600; min-width: 50px; color: #333;">' + factorKey + ':</label>';
        html += '<input type="text" id="factor-label-' + factorKey + '" value="' + escapeHtml(currentLabel) + '" placeholder="例: 構造理解、転移性、..." style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 1em;">';
        html += '</div>';
      }
      
      html += '</div>';
      html += '<button id="save-factor-labels-btn" style="padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 600;">💾 ラベルを保存</button>';
      html += '<div id="factor-labels-status" style="margin-top: 10px; font-size: 0.9em; color: #666;"></div>';
      html += '</div>';
    }

    // 因子負荷量表
    if (result.num_factors > 0 && result.loadings) {
      html += '<div style="margin-top: 30px;">';
      html += '<h4 style="color: #555; margin-bottom: 10px;">因子負荷量表（Varimax回転後）</h4>';
      html += '<div style="overflow-x: auto;">';
      html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">';
      html += '<thead><tr style="background: #f9f9f9;">';
      html += '<th style="padding: 10px;">変数</th>';
      for (let i = 0; i < result.num_factors; i++) {
        const factorName = getFactorName(i, labels);
        html += '<th style="padding: 10px;">' + escapeHtml(factorName) + '</th>';
      }
      html += '</tr></thead>';
      html += '<tbody>';
      
      Object.keys(result.loadings).forEach(function(variable) {
        html += '<tr>';
        html += '<td style="padding: 10px; font-weight: 600;">' + escapeHtml(variable) + '</td>';
        result.loadings[variable].forEach(function(loading) {
          const absLoading = Math.abs(loading);
          const color = absLoading > 0.5 ? '#2d7bf4' : absLoading > 0.3 ? '#f6ad55' : '#999';
          html += '<td style="padding: 10px; color: ' + color + '; font-weight: ' + (absLoading > 0.5 ? '600' : 'normal') + ';">' + loading.toFixed(3) + '</td>';
        });
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      html += '</div>';
      html += '</div>';
    }

    // 生徒ごとの因子スコア表
    if (result.num_factors > 0 && result.factor_scores) {
      html += '<div style="margin-top: 30px;">';
      html += '<h4 style="color: #555; margin-bottom: 10px;">生徒ごとの因子スコア</h4>';
      html += '<div style="margin-bottom: 10px;">';
      html += '<button id="export-factor-scores-csv" style="padding: 8px 16px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">CSV エクスポート</button>';
      html += '</div>';
      html += '<div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">';
      html += '<table border="1" style="border-collapse: collapse; width: 100%;">';
      html += '<thead style="position: sticky; top: 0; background: #f9f9f9;"><tr>';
      html += '<th style="padding: 10px;">生徒ID</th>';
      for (let i = 0; i < result.num_factors; i++) {
        const factorName = getFactorName(i, labels);
        html += '<th style="padding: 10px;">' + escapeHtml(factorName) + '</th>';
      }
      html += '</tr></thead>';
      html += '<tbody>';
      
      Object.keys(result.factor_scores).forEach(function(studentId) {
        html += '<tr>';
        html += '<td style="padding: 10px; font-weight: 600;">' + escapeHtml(studentId) + '</td>';
        for (let i = 0; i < result.num_factors; i++) {
          const score = result.factor_scores[studentId]['F' + (i + 1)];
          html += '<td style="padding: 10px;">' + (score !== undefined ? score.toFixed(3) : '-') + '</td>';
        }
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      html += '</div>';
      html += '</div>';

      // CSVエクスポート機能
      setTimeout(function() {
        const exportBtn = document.getElementById('export-factor-scores-csv');
        if (exportBtn) {
          exportBtn.addEventListener('click', function() {
            exportFactorScoresToCSV(result);
          });
        }
      }, 100);
    }

    html += '</div>';
    container.innerHTML = html;

    // 因子分析実行後、クラスタリングセクションを表示
    if (result.num_factors > 0 && result.factor_scores) {
      const clusteringSection = document.getElementById('clustering-section');
      if (clusteringSection) {
        clusteringSection.style.display = 'block';
      }
    }

    // 問題貢献度セクションを表示
    if (result.num_factors > 0 && result.loadings) {
      renderProblemContributions(result, labels);
    }

    // Vector Mapを表示
    if (result.num_factors >= 2 && result.factor_scores && result.loadings) {
      const clusteringResult = window.currentClusteringResult || null;
      renderVectorMap(result.factor_scores, result.loadings, clusteringResult, labels, result.num_factors);
    }

    // 因子ラベル保存ボタンのイベントリスナー
    setTimeout(function() {
      const saveLabelsBtn = document.getElementById('save-factor-labels-btn');
      const statusDiv = document.getElementById('factor-labels-status');
      
      if (saveLabelsBtn) {
        saveLabelsBtn.addEventListener('click', function() {
          // 入力されたラベルを収集
          const newLabels = {};
          for (let i = 0; i < result.num_factors; i++) {
            const factorKey = 'F' + (i + 1);
            const input = document.getElementById('factor-label-' + factorKey);
            if (input && input.value.trim()) {
              newLabels[factorKey] = input.value.trim();
            }
          }

          // ラベルを保存
          saveFactorLabels(newLabels, projectId);

          // 結果オブジェクトを更新
          result.factorLabels = newLabels;
          if (window.currentFactorAnalysisResult) {
            window.currentFactorAnalysisResult.factorLabels = newLabels;
          }

          // ステータス表示
          if (statusDiv) {
            statusDiv.innerHTML = '<span style="color: #48bb78;">✓ ラベルを保存しました。表のヘッダーを更新しました。</span>';
          }

          // 因子スコア表と因子負荷量表のヘッダーを更新
          updateFactorTableHeaders(result, newLabels);
        });
      }
    }, 100);
  }

  /**
   * 因子スコア表と因子負荷量表のヘッダーを更新
   * @param {Object} result - 因子分析結果
   * @param {Object} labels - 因子ラベルオブジェクト
   */
  function updateFactorTableHeaders(result, labels) {
    // 因子負荷量表のヘッダーを更新
    const loadingsTable = document.querySelector('#factor-analysis-result table');
    if (loadingsTable) {
      const headerRow = loadingsTable.querySelector('thead tr');
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll('th');
        if (headerCells.length > 1) {
          for (let i = 1; i < headerCells.length && i <= result.num_factors; i++) {
            const factorName = getFactorName(i - 1, labels);
            headerCells[i].textContent = factorName;
          }
        }
      }
    }

    // 因子スコア表のヘッダーを更新
    const scoresTable = document.querySelectorAll('#factor-analysis-result table')[1];
    if (scoresTable) {
      const headerRow = scoresTable.querySelector('thead tr');
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll('th');
        if (headerCells.length > 1) {
          for (let i = 1; i < headerCells.length && i <= result.num_factors; i++) {
            const factorName = getFactorName(i - 1, labels);
            headerCells[i].textContent = factorName;
          }
        }
      }
    }
  }

  /**
   * 因子スコアをCSV形式でエクスポート
   * @param {Object} result - 因子分析結果
   */
  function exportFactorScoresToCSV(result) {
    if (!result.factor_scores || result.num_factors === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }

    // 因子ラベルを取得
    const labels = result.factorLabels || {};
    
    let csv = '生徒ID';
    for (let i = 0; i < result.num_factors; i++) {
      const factorName = getFactorName(i, labels);
      csv += ',' + escapeCsvValue(factorName);
    }
    csv += '\n';

    Object.keys(result.factor_scores).forEach(function(studentId) {
      csv += escapeCsvValue(studentId);
      for (let i = 0; i < result.num_factors; i++) {
        const score = result.factor_scores[studentId]['F' + (i + 1)];
        csv += ',' + (score !== undefined ? score.toFixed(3) : '');
      }
      csv += '\n';
    });

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'factor_scores_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * CSV値のエスケープ
   * @param {string} value - エスケープする値
   * @returns {string} エスケープ済み値
   */
  function escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * k-meansクラスタリングを実行
   * @param {Object} factorScores - 因子スコアオブジェクト
   * @param {number} k - クラスタ数
   * @returns {Object} クラスタリング結果
   */
  function runClustering(factorScores, k) {
    if (!factorScores || typeof factorScores !== 'object') {
      throw new Error('因子スコアが無効です');
    }

    if (typeof window.Clustering === 'undefined' || typeof window.Clustering.kmeans !== 'function') {
      throw new Error('クラスタリングモジュールが読み込まれていません。clustering.js を確認してください。');
    }

    try {
      const result = window.Clustering.kmeans(factorScores, k);
      return result;
    } catch (error) {
      console.error('Clustering error:', error);
      throw error;
    }
  }

  /**
   * クラスタリング結果を表示
   * @param {Object} clusteringResult - クラスタリング結果
   * @param {Object} factorLabels - 因子ラベルオブジェクト（オプション）
   */
  function renderClusteringResult(clusteringResult, factorLabels) {
    factorLabels = factorLabels || {};
    const container = document.getElementById('clustering-result');
    if (!container) {
      console.warn('Clustering result container not found');
      return;
    }

    let html = '<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    html += '<h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">クラスタリング結果（k=' + clusteringResult.k + '）</h3>';

    // クラスタごとの平均因子スコア
    html += '<div style="margin-top: 20px;">';
    html += '<h4 style="color: #555; margin-bottom: 10px;">クラスタごとの平均因子スコア</h4>';
    html += '<div style="overflow-x: auto;">';
    html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">';
    html += '<thead><tr style="background: #f9f9f9;">';
    html += '<th style="padding: 10px;">クラスタ</th>';
    
    const factorKeys = clusteringResult.factor_keys || [];
    factorKeys.forEach(function(factorKey) {
      const factorIndex = parseInt(factorKey.substring(1)) - 1;
      const factorName = getFactorName(factorIndex, factorLabels);
      html += '<th style="padding: 10px;">' + escapeHtml(factorName) + '</th>';
    });
    html += '<th style="padding: 10px;">生徒数</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    // クラスタごとの生徒数を計算
    const clusterCounts = {};
    Object.keys(clusteringResult.labels).forEach(function(studentId) {
      const clusterId = clusteringResult.labels[studentId];
      clusterCounts[clusterId] = (clusterCounts[clusterId] || 0) + 1;
    });

    // クラスタカラー（最大10クラスタまで）
    const clusterColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6'
    ];

    clusteringResult.cluster_centers.forEach(function(center, clusterId) {
      const color = clusterColors[clusterId % clusterColors.length];
      html += '<tr style="background: ' + color + '20;">';
      html += '<td style="padding: 10px; font-weight: 600; background: ' + color + '40;">クラスタ ' + clusterId + '</td>';
      
      factorKeys.forEach(function(factorKey) {
        const value = center[factorKey] || 0;
        html += '<td style="padding: 10px;">' + value.toFixed(3) + '</td>';
      });
      
      html += '<td style="padding: 10px; font-weight: 600;">' + (clusterCounts[clusterId] || 0) + '人</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';
    html += '</div>';

    // 生徒一覧 + クラスターID
    html += '<div style="margin-top: 30px;">';
    html += '<h4 style="color: #555; margin-bottom: 10px;">生徒一覧（クラスタ別）</h4>';
    html += '<div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">';
    html += '<table border="1" style="border-collapse: collapse; width: 100%;">';
    html += '<thead style="position: sticky; top: 0; background: #f9f9f9;"><tr>';
    html += '<th style="padding: 10px;">生徒ID</th>';
    html += '<th style="padding: 10px;">クラスタ</th>';
    factorKeys.forEach(function(factorKey) {
      const factorIndex = parseInt(factorKey.substring(1)) - 1;
      const factorName = getFactorName(factorIndex, factorLabels);
      html += '<th style="padding: 10px;">' + escapeHtml(factorName) + '</th>';
    });
    html += '</tr></thead>';
    html += '<tbody>';

    // クラスタごとにグループ化して表示
    const studentsByCluster = {};
    Object.keys(clusteringResult.labels).forEach(function(studentId) {
      const clusterId = clusteringResult.labels[studentId];
      if (!studentsByCluster[clusterId]) {
        studentsByCluster[clusterId] = [];
      }
      studentsByCluster[clusterId].push(studentId);
    });

    // クラスタID順にソート
    const sortedClusterIds = Object.keys(studentsByCluster).map(function(id) { return parseInt(id); }).sort(function(a, b) { return a - b; });

    sortedClusterIds.forEach(function(clusterId) {
      const color = clusterColors[clusterId % clusterColors.length];
      studentsByCluster[clusterId].forEach(function(studentId) {
        html += '<tr style="background: ' + color + '20;">';
        html += '<td style="padding: 10px; font-weight: 600;">' + escapeHtml(studentId) + '</td>';
        html += '<td style="padding: 10px; font-weight: 600; background: ' + color + '40;">クラスタ ' + clusterId + '</td>';
        
        // 因子スコアを表示（元のfactor_scoresから取得）
        const factorScores = window.currentFactorScores || {};
        const studentScores = factorScores[studentId] || {};
        factorKeys.forEach(function(factorKey) {
          const score = studentScores[factorKey];
          html += '<td style="padding: 10px;">' + (score !== undefined ? score.toFixed(3) : '-') + '</td>';
        });
        
        html += '</tr>';
      });
    });

    html += '</tbody></table>';
    html += '</div>';
    html += '</div>';

    // 2Dプロット（Canvas）
    html += '<div style="margin-top: 30px;">';
    html += '<h4 style="color: #555; margin-bottom: 10px;">2D散布図（F1-F2）</h4>';
    html += '<div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #fafafa;">';
    html += '<canvas id="clustering-plot" width="800" height="600" style="max-width: 100%; height: auto; background: white; border: 1px solid #ccc;"></canvas>';
    html += '<div id="clustering-legend" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 15px;"></div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // グローバル変数に保存（Vector Mapで使用）
    window.currentClusteringResult = clusteringResult;

    // Canvasで2Dプロットを描画
    setTimeout(function() {
      drawClusteringPlot(clusteringResult, factorLabels);
      
      // Vector Mapを更新（既に表示されている場合）
      if (window.currentVectorMapRenderer && window.currentFactorScores && window.currentFactorAnalysisResult) {
        const factorLabels = window.currentFactorAnalysisResult.factorLabels || {};
        window.currentVectorMapRenderer.setData(
          window.currentFactorScores,
          window.currentFactorAnalysisResult.loadings,
          clusteringResult,
          factorLabels
        );
        window.currentVectorMapRenderer.draw();
      }
    }, 100);
  }

  /**
   * クラスタリング結果を2Dプロットで描画
   * @param {Object} clusteringResult - クラスタリング結果
   * @param {Object} factorLabels - 因子ラベルオブジェクト（オプション）
   */
  function drawClusteringPlot(clusteringResult, factorLabels) {
    factorLabels = factorLabels || {};
    const canvas = document.getElementById('clustering-plot');
    if (!canvas) {
      console.warn('Clustering plot canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    // クリア
    ctx.clearRect(0, 0, width, height);

    // 因子キーを取得（F1, F2を使用）
    const factorKeys = clusteringResult.factor_keys || [];
    if (factorKeys.length < 2) {
      ctx.fillStyle = '#999';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('因子が2つ以上必要です', width / 2, height / 2);
      return;
    }

    const factorKey1 = factorKeys[0]; // F1
    const factorKey2 = factorKeys[1]; // F2

    // 因子スコアを取得
    const studentFactorScores = window.currentFactorScores || {};

    // データ範囲を計算（実際のデータ点から）
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.keys(clusteringResult.labels).forEach(function(studentId) {
      const scores = studentFactorScores[studentId];
      if (scores) {
        const x = scores[factorKey1] || 0;
        const y = scores[factorKey2] || 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });

    // データがない場合はクラスタ中心から範囲を計算
    if (minX === Infinity) {
      clusteringResult.cluster_centers.forEach(function(center) {
        const x = center[factorKey1] || 0;
        const y = center[factorKey2] || 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    }

    // マージンを追加
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    minX -= rangeX * 0.1;
    maxX += rangeX * 0.1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    // 座標変換関数
    function toCanvasX(value) {
      return padding + (value - minX) / (maxX - minX) * (width - 2 * padding);
    }

    function toCanvasY(value) {
      return height - padding - (value - minY) / (maxY - minY) * (height - 2 * padding);
    }

    // 背景を描画
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // グリッド線を描画
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // X軸のグリッド
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const x = minX + (maxX - minX) * (i / xSteps);
      const canvasX = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(canvasX, padding);
      ctx.lineTo(canvasX, height - padding);
      ctx.stroke();
    }

    // Y軸のグリッド
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = minY + (maxY - minY) * (i / ySteps);
      const canvasY = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(padding, canvasY);
      ctx.lineTo(width - padding, canvasY);
      ctx.stroke();
    }

    // 軸を描画
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // X軸
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y軸
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // 軸ラベル
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    const factorName1 = getFactorName(parseInt(factorKey1.substring(1)) - 1, factorLabels);
    const factorName2 = getFactorName(parseInt(factorKey2.substring(1)) - 1, factorLabels);
    
    ctx.fillText(factorName1, width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(factorName2, 0, 0);
    ctx.restore();

    // クラスタカラー
    const clusterColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6'
    ];

    // クラスタごとに点を描画
    const studentsByCluster = {};
    Object.keys(clusteringResult.labels).forEach(function(studentId) {
      const clusterId = clusteringResult.labels[studentId];
      if (!studentsByCluster[clusterId]) {
        studentsByCluster[clusterId] = [];
      }
      studentsByCluster[clusterId].push(studentId);
    });

    // 因子スコアを取得（元のデータから）
    // 注意: ここではクラスタリング結果から因子スコアを取得できないため、
    // グローバル変数から取得する必要がある
    const plotFactorScores = window.currentFactorScores || {};

    // 各クラスタの点を描画
    Object.keys(studentsByCluster).forEach(function(clusterIdStr) {
      const clusterId = parseInt(clusterIdStr);
      const color = clusterColors[clusterId % clusterColors.length];

      studentsByCluster[clusterIdStr].forEach(function(studentId) {
        const scores = plotFactorScores[studentId];
        if (scores) {
          const x = scores[factorKey1] || 0;
          const y = scores[factorKey2] || 0;

          // 点を描画
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(toCanvasX(x), toCanvasY(y), 6, 0, Math.PI * 2);
          ctx.fill();

          // 境界線（白）
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // クラスタ中心を描画
    clusteringResult.cluster_centers.forEach(function(center, clusterId) {
      const x = center[factorKey1] || 0;
      const y = center[factorKey2] || 0;
      const color = clusterColors[clusterId % clusterColors.length];

      // 中心点を描画（大きめの×印）
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      const size = 10;
      const cx = toCanvasX(x);
      const cy = toCanvasY(y);
      
      ctx.beginPath();
      ctx.moveTo(cx - size, cy - size);
      ctx.lineTo(cx + size, cy + size);
      ctx.moveTo(cx + size, cy - size);
      ctx.lineTo(cx - size, cy + size);
      ctx.stroke();
    });

    // 凡例を描画
    const legendDiv = document.getElementById('clustering-legend');
    if (legendDiv) {
      let legendHtml = '';
      Object.keys(studentsByCluster).forEach(function(clusterIdStr) {
        const clusterId = parseInt(clusterIdStr);
        const color = clusterColors[clusterId % clusterColors.length];
        const count = studentsByCluster[clusterIdStr].length;
        
        legendHtml += '<div style="display: flex; align-items: center; gap: 8px;">';
        legendHtml += '<div style="width: 20px; height: 20px; background: ' + color + '; border: 1px solid #333; border-radius: 4px;"></div>';
        legendHtml += '<span style="font-weight: 600;">クラスタ ' + clusterId + '</span>';
        legendHtml += '<span style="color: #666;">(' + count + '人)</span>';
        legendHtml += '</div>';
      });
      legendDiv.innerHTML = legendHtml;
    }
  }

  /**
   * 問題ごとの因子寄与度を表示
   * @param {Object} result - 因子分析結果
   * @param {Object} factorLabels - 因子ラベルオブジェクト（オプション）
   */
  function renderProblemContributions(result, factorLabels) {
    factorLabels = factorLabels || {};
    const container = document.getElementById('problem-contributions-section');
    if (!container) {
      console.warn('Problem contributions container not found');
      return;
    }

    if (!result.loadings || result.num_factors === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    let html = '<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    html += '<h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">📊 問題ごとの因子寄与度（Problem → Factor Loadings）</h3>';
    html += '<p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">各問題がどの因子に最も影響しているかを確認できます。支配因子は絶対値が最大の因子です。</p>';

    // CSVエクスポートボタン
    html += '<div style="margin-bottom: 15px;">';
    html += '<button id="export-problem-contributions-csv" style="padding: 8px 16px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">📥 問題貢献度をCSVとしてダウンロード</button>';
    html += '</div>';

    // 表を生成
    html += '<div style="overflow-x: auto;">';
    html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">';
    html += '<thead><tr style="background: #f9f9f9;">';
    html += '<th style="padding: 10px; text-align: left;">Question ID</th>';
    
    // 因子列のヘッダー
    for (let i = 0; i < result.num_factors; i++) {
      const factorName = getFactorName(i, factorLabels);
      html += '<th style="padding: 10px; text-align: center;">' + escapeHtml(factorName) + '</th>';
    }
    
    html += '<th style="padding: 10px; text-align: center;">支配因子</th>';
    html += '<th style="padding: 10px; text-align: center;">強度 (Strength)</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    // クラスタカラー（支配因子のハイライト用）
    const factorColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6'
    ];

    // 各問題を処理
    Object.keys(result.loadings).forEach(function(questionId) {
      const loadings = result.loadings[questionId];
      if (!loadings || loadings.length === 0) {
        return;
      }

      // 支配因子を計算（絶対値が最大の因子）
      let dominantFactorIndex = 0;
      let maxAbsLoading = Math.abs(loadings[0] || 0);
      
      for (let i = 1; i < result.num_factors && i < loadings.length; i++) {
        const absLoading = Math.abs(loadings[i] || 0);
        if (absLoading > maxAbsLoading) {
          maxAbsLoading = absLoading;
          dominantFactorIndex = i;
        }
      }

      const dominantFactorName = getFactorName(dominantFactorIndex, factorLabels);
      const dominantColor = factorColors[dominantFactorIndex % factorColors.length];

      html += '<tr>';
      html += '<td style="padding: 10px; font-weight: 600;">' + escapeHtml(questionId) + '</td>';

      // 各因子の負荷量を表示
      for (let i = 0; i < result.num_factors; i++) {
        const loading = loadings[i] || 0;
        const absLoading = Math.abs(loading);
        
        // 支配因子のセルを強調
        const isDominant = i === dominantFactorIndex;
        const cellStyle = isDominant 
          ? 'padding: 10px; text-align: center; background: ' + dominantColor + '40; font-weight: 600; border: 2px solid ' + dominantColor + ';'
          : 'padding: 10px; text-align: center;';
        
        // 色分け（絶対値に応じて）
        let textColor = '#999';
        if (absLoading > 0.5) {
          textColor = '#2d7bf4';
        } else if (absLoading > 0.3) {
          textColor = '#f6ad55';
        }
        
        html += '<td style="' + cellStyle + ' color: ' + textColor + ';">' + loading.toFixed(3) + '</td>';
      }

      // 支配因子
      html += '<td style="padding: 10px; text-align: center; background: ' + dominantColor + '40; font-weight: 600; border: 2px solid ' + dominantColor + ';">' + escapeHtml(dominantFactorName) + '</td>';
      
      // 強度
      html += '<td style="padding: 10px; text-align: center; font-weight: 600; color: ' + dominantColor + ';">' + maxAbsLoading.toFixed(3) + '</td>';
      
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // CSVエクスポートボタンのイベントリスナー
    setTimeout(function() {
      const exportBtn = document.getElementById('export-problem-contributions-csv');
      if (exportBtn) {
        exportBtn.addEventListener('click', function() {
          exportProblemContributionsToCSV(result, factorLabels);
        });
      }
    }, 100);
  }

  /**
   * 問題貢献度をCSV形式でエクスポート
   * @param {Object} result - 因子分析結果
   * @param {Object} factorLabels - 因子ラベルオブジェクト（オプション）
   */
  function exportProblemContributionsToCSV(result, factorLabels) {
    factorLabels = factorLabels || {};
    
    if (!result.loadings || result.num_factors === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }

    let csv = 'Question ID';
    
    // 因子列のヘッダー
    for (let i = 0; i < result.num_factors; i++) {
      const factorName = getFactorName(i, factorLabels);
      csv += ',' + escapeCsvValue(factorName);
    }
    
    csv += ',支配因子,強度 (Strength)\n';

    // 各問題を処理
    Object.keys(result.loadings).forEach(function(questionId) {
      const loadings = result.loadings[questionId];
      if (!loadings || loadings.length === 0) {
        return;
      }

      // 支配因子を計算
      let dominantFactorIndex = 0;
      let maxAbsLoading = Math.abs(loadings[0] || 0);
      
      for (let i = 1; i < result.num_factors && i < loadings.length; i++) {
        const absLoading = Math.abs(loadings[i] || 0);
        if (absLoading > maxAbsLoading) {
          maxAbsLoading = absLoading;
          dominantFactorIndex = i;
        }
      }

      const dominantFactorName = getFactorName(dominantFactorIndex, factorLabels);

      csv += escapeCsvValue(questionId);
      
      // 各因子の負荷量
      for (let i = 0; i < result.num_factors; i++) {
        const loading = loadings[i] || 0;
        csv += ',' + loading.toFixed(3);
      }
      
      csv += ',' + escapeCsvValue(dominantFactorName);
      csv += ',' + maxAbsLoading.toFixed(3);
      csv += '\n';
    });

    // CSVをダウンロード
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'problem_contributions.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 古いVector Map Rendererは削除済み（理解階層ダッシュボードのみ使用）
  // 以下の関数は使用されていませんが、admin/analysis.htmlで参照される可能性があるため残しています
  function VectorMapRenderer(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = canvasElement.width;
    this.height = canvasElement.height;
    this.padding = 80;
    
    // データ
    this.factorScores = null;
    this.loadings = null;
    this.clusteringResult = null;
    this.factorLabels = {};
    
    // 表示設定
    this.showProblemVectors = true;
    this.showStudentVectors = true;
    this.showClusterCenters = true;
    this.showAverageVector = true;
    
    // 軸設定
    this.xAxisFactor = 0; // F1
    this.yAxisFactor = 1; // F2
    
    // 座標範囲
    this.minX = -1;
    this.maxX = 1;
    this.minY = -1;
    this.maxY = 1;
  }

  /**
   * データを設定
   */
  VectorMapRenderer.prototype.setData = function(factorScores, loadings, clusteringResult, factorLabels) {
    this.factorScores = factorScores || {};
    this.loadings = loadings || {};
    this.clusteringResult = clusteringResult || null;
    this.factorLabels = factorLabels || {};
    
    // 座標範囲を計算
    this.calculateBounds();
  };

  /**
   * 座標範囲を計算
   */
  VectorMapRenderer.prototype.calculateBounds = function() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    const xKey = 'F' + (this.xAxisFactor + 1);
    const yKey = 'F' + (this.yAxisFactor + 1);
    
    // 因子スコアから範囲を計算
    if (this.factorScores) {
      Object.keys(this.factorScores).forEach(function(studentId) {
        const scores = this.factorScores[studentId];
        if (scores[xKey] !== undefined) {
          minX = Math.min(minX, scores[xKey]);
          maxX = Math.max(maxX, scores[xKey]);
        }
        if (scores[yKey] !== undefined) {
          minY = Math.min(minY, scores[yKey]);
          maxY = Math.max(maxY, scores[yKey]);
        }
      }.bind(this));
    }
    
    // 問題ベクトルから範囲を計算
    if (this.loadings) {
      Object.keys(this.loadings).forEach(function(questionId) {
        const loading = this.loadings[questionId];
        if (loading && loading[this.xAxisFactor] !== undefined) {
          minX = Math.min(minX, loading[this.xAxisFactor]);
          maxX = Math.max(maxX, loading[this.xAxisFactor]);
        }
        if (loading && loading[this.yAxisFactor] !== undefined) {
          minY = Math.min(minY, loading[this.yAxisFactor]);
          maxY = Math.max(maxY, loading[this.yAxisFactor]);
        }
      }.bind(this));
    }
    
    // クラスタ中心から範囲を計算
    if (this.clusteringResult && this.clusteringResult.cluster_centers) {
      this.clusteringResult.cluster_centers.forEach(function(center) {
        if (center[xKey] !== undefined) {
          minX = Math.min(minX, center[xKey]);
          maxX = Math.max(maxX, center[xKey]);
        }
        if (center[yKey] !== undefined) {
          minY = Math.min(minY, center[yKey]);
          maxY = Math.max(maxY, center[yKey]);
        }
      });
    }
    
    // マージンを追加
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    this.minX = minX - rangeX * 0.15;
    this.maxX = maxX + rangeX * 0.15;
    this.minY = minY - rangeY * 0.15;
    this.maxY = maxY + rangeY * 0.15;
  };

  /**
   * 座標変換（データ座標 → Canvas座標）
   */
  VectorMapRenderer.prototype.toCanvasX = function(value) {
    return this.padding + (value - this.minX) / (this.maxX - this.minX) * (this.width - 2 * this.padding);
  };

  VectorMapRenderer.prototype.toCanvasY = function(value) {
    return this.height - this.padding - (value - this.minY) / (this.maxY - this.minY) * (this.height - 2 * this.padding);
  };

  /**
   * 背景とグリッドを描画
   */
  VectorMapRenderer.prototype.drawBackground = function() {
    const ctx = this.ctx;
    
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // グリッド線
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // X軸のグリッド
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const x = this.minX + (this.maxX - this.minX) * (i / xSteps);
      const canvasX = this.toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(canvasX, this.padding);
      ctx.lineTo(canvasX, this.height - this.padding);
      ctx.stroke();
    }
    
    // Y軸のグリッド
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = this.minY + (this.maxY - this.minY) * (i / ySteps);
      const canvasY = this.toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(this.padding, canvasY);
      ctx.lineTo(this.width - this.padding, canvasY);
      ctx.stroke();
    }
    
    // 軸を描画
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X軸
    const zeroY = this.toCanvasY(0);
    ctx.beginPath();
    ctx.moveTo(this.padding, zeroY);
    ctx.lineTo(this.width - this.padding, zeroY);
    ctx.stroke();
    
    // Y軸
    const zeroX = this.toCanvasX(0);
    ctx.beginPath();
    ctx.moveTo(zeroX, this.padding);
    ctx.lineTo(zeroX, this.height - this.padding);
    ctx.stroke();
    
    // 軸ラベル
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    
    const xFactorName = getFactorName(this.xAxisFactor, this.factorLabels);
    const yFactorName = getFactorName(this.yAxisFactor, this.factorLabels);
    
    ctx.fillText(xFactorName, this.width / 2, this.height - 20);
    
    ctx.save();
    ctx.translate(20, this.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yFactorName, 0, 0);
    ctx.restore();
  };

  /**
   * 矢印を描画
   */
  VectorMapRenderer.prototype.drawArrow = function(x1, y1, x2, y2, color, lineWidth) {
    const ctx = this.ctx;
    color = color || '#333';
    lineWidth = lineWidth || 2;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    
    // 線を描画
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // 矢印の先端を描画
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - arrowAngle),
      y2 - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + arrowAngle),
      y2 - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();
  };

  /**
   * 問題ベクトルを描画
   */
  VectorMapRenderer.prototype.drawProblemVectors = function() {
    if (!this.showProblemVectors || !this.loadings) {
      return;
    }
    
    const ctx = this.ctx;
    const xKey = 'F' + (this.xAxisFactor + 1);
    const yKey = 'F' + (this.yAxisFactor + 1);
    
    Object.keys(this.loadings).forEach(function(questionId) {
      const loading = this.loadings[questionId];
      if (!loading || loading.length <= Math.max(this.xAxisFactor, this.yAxisFactor)) {
        return;
      }
      
      const x = loading[this.xAxisFactor] || 0;
      const y = loading[this.yAxisFactor] || 0;
      
      const canvasX = this.toCanvasX(x);
      const canvasY = this.toCanvasY(y);
      
      // 原点からベクトルを描画
      const originX = this.toCanvasX(0);
      const originY = this.toCanvasY(0);
      
      // 矢印を描画
      this.drawArrow(originX, originY, canvasX, canvasY, '#4ECDC4', 1.5);
      
      // 点を描画
      ctx.fillStyle = '#4ECDC4';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // 問題IDを表示（小さく）
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(questionId, canvasX, canvasY - 8);
    }.bind(this));
  };

  /**
   * 生徒ベクトルを描画
   */
  VectorMapRenderer.prototype.drawStudentVectors = function() {
    if (!this.showStudentVectors || !this.factorScores) {
      return;
    }
    
    const ctx = this.ctx;
    const xKey = 'F' + (this.xAxisFactor + 1);
    const yKey = 'F' + (this.yAxisFactor + 1);
    
    // クラスタカラー
    const clusterColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6'
    ];
    
    Object.keys(this.factorScores).forEach(function(studentId) {
      const scores = this.factorScores[studentId];
      if (!scores) {
        return;
      }
      
      const x = scores[xKey] || 0;
      const y = scores[yKey] || 0;
      
      const canvasX = this.toCanvasX(x);
      const canvasY = this.toCanvasY(y);
      
      // クラスタリング結果があれば色分け
      let color = '#666';
      if (this.clusteringResult && this.clusteringResult.labels) {
        const clusterId = this.clusteringResult.labels[studentId];
        if (clusterId !== undefined) {
          color = clusterColors[clusterId % clusterColors.length];
        }
      }
      
      // 点を描画
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 境界線
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }.bind(this));
  };

  /**
   * クラスター中心を描画
   */
  VectorMapRenderer.prototype.drawClusterCenters = function() {
    if (!this.showClusterCenters || !this.clusteringResult || !this.clusteringResult.cluster_centers) {
      return;
    }
    
    const ctx = this.ctx;
    const xKey = 'F' + (this.xAxisFactor + 1);
    const yKey = 'F' + (this.yAxisFactor + 1);
    
    const clusterColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6'
    ];
    
    this.clusteringResult.cluster_centers.forEach(function(center, clusterId) {
      const x = center[xKey] || 0;
      const y = center[yKey] || 0;
      
      const canvasX = this.toCanvasX(x);
      const canvasY = this.toCanvasY(y);
      const color = clusterColors[clusterId % clusterColors.length];
      
      // 大きな点を描画
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // 境界線
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // クラスタIDを表示
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('C' + clusterId, canvasX, canvasY - 15);
    }.bind(this));
  };

  /**
   * 平均ベクトルを描画
   */
  VectorMapRenderer.prototype.drawAverageVector = function() {
    if (!this.showAverageVector || !this.loadings) {
      return;
    }
    
    const ctx = this.ctx;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    
    Object.keys(this.loadings).forEach(function(questionId) {
      const loading = this.loadings[questionId];
      if (!loading || loading.length <= Math.max(this.xAxisFactor, this.yAxisFactor)) {
        return;
      }
      
      sumX += loading[this.xAxisFactor] || 0;
      sumY += loading[this.yAxisFactor] || 0;
      count++;
    }.bind(this));
    
    if (count === 0) {
      return;
    }
    
    const avgX = sumX / count;
    const avgY = sumY / count;
    
    const originX = this.toCanvasX(0);
    const originY = this.toCanvasY(0);
    const canvasX = this.toCanvasX(avgX);
    const canvasY = this.toCanvasY(avgY);
    
    // 太い矢印で描画
    this.drawArrow(originX, originY, canvasX, canvasY, '#FF6B6B', 3);
    
    // ラベル
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('平均', canvasX, canvasY - 10);
  };

  /**
   * クリア
   */
  VectorMapRenderer.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  };

  /**
   * 描画
   */
  VectorMapRenderer.prototype.draw = function() {
    this.clear();
    this.drawBackground();
    this.drawProblemVectors();
    this.drawStudentVectors();
    this.drawClusterCenters();
    this.drawAverageVector();
  };

  // 古いrenderVectorMap関数は削除済み（理解階層ダッシュボードのみ使用）
  // 以下の関数は使用されていませんが、admin/analysis.htmlで参照される可能性があるため残しています
  function renderVectorMap(factorScores, loadings, clusteringResult, factorLabels, numFactors) {
    const container = document.getElementById('vector-map-section');
    if (!container) {
      console.warn('Vector map container not found');
      return;
    }

    if (!factorScores || !loadings || numFactors < 2) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    let html = '<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    html += '<h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">🗺️ Vector Map（思考の可視化）</h3>';
    html += '<p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">因子分析とクラスタリング結果を2D座標空間で可視化します。</p>';

    // 表示切替チェックボックス
    html += '<div style="margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-radius: 4px;">';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">';
    html += '<label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">';
    html += '<input type="checkbox" id="vector-map-show-problems" checked>';
    html += '<span>問題ベクトル</span>';
    html += '</label>';
    html += '<label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">';
    html += '<input type="checkbox" id="vector-map-show-students" checked>';
    html += '<span>生徒ベクトル</span>';
    html += '</label>';
    html += '<label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">';
    html += '<input type="checkbox" id="vector-map-show-clusters" checked>';
    html += '<span>クラスター中心</span>';
    html += '</label>';
    html += '<label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">';
    html += '<input type="checkbox" id="vector-map-show-average" checked>';
    html += '<span>平均ベクトル</span>';
    html += '</label>';
    html += '</div>';
    html += '</div>';

    // 軸選択UI
    html += '<div style="margin-bottom: 15px; padding: 15px; background: #f9f9f9; border-radius: 4px;">';
    html += '<div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">';
    html += '<div style="display: flex; align-items: center; gap: 10px;">';
    html += '<label style="font-weight: 600;">X軸:</label>';
    html += '<select id="vector-map-x-axis" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px;">';
    for (let i = 0; i < numFactors; i++) {
      const factorName = getFactorName(i, factorLabels);
      html += '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + escapeHtml(factorName) + '</option>';
    }
    html += '</select>';
    html += '</div>';
    html += '<div style="display: flex; align-items: center; gap: 10px;">';
    html += '<label style="font-weight: 600;">Y軸:</label>';
    html += '<select id="vector-map-y-axis" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px;">';
    for (let i = 0; i < numFactors; i++) {
      const factorName = getFactorName(i, factorLabels);
      html += '<option value="' + i + '"' + (i === 1 ? ' selected' : '') + '>' + escapeHtml(factorName) + '</option>';
    }
    html += '</select>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Canvas
    html += '<div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #fafafa;">';
    html += '<canvas id="vector-map-canvas" width="800" height="600" style="max-width: 100%; height: auto; background: white; border: 1px solid #ccc;"></canvas>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // VectorMapRendererを初期化
    setTimeout(function() {
      const canvas = document.getElementById('vector-map-canvas');
      if (!canvas) {
        return;
      }

      const renderer = new VectorMapRenderer(canvas);
      renderer.setData(factorScores, loadings, clusteringResult, factorLabels);

      // 描画
      renderer.draw();

      // 表示切替チェックボックスのイベントリスナー
      const showProblems = document.getElementById('vector-map-show-problems');
      const showStudents = document.getElementById('vector-map-show-students');
      const showClusters = document.getElementById('vector-map-show-clusters');
      const showAverage = document.getElementById('vector-map-show-average');

      function updateDisplay() {
        renderer.showProblemVectors = showProblems.checked;
        renderer.showStudentVectors = showStudents.checked;
        renderer.showClusterCenters = showClusters.checked;
        renderer.showAverageVector = showAverage.checked;
        renderer.draw();
      }

      if (showProblems) showProblems.addEventListener('change', updateDisplay);
      if (showStudents) showStudents.addEventListener('change', updateDisplay);
      if (showClusters) showClusters.addEventListener('change', updateDisplay);
      if (showAverage) showAverage.addEventListener('change', updateDisplay);

      // 軸選択のイベントリスナー
      const xAxisSelect = document.getElementById('vector-map-x-axis');
      const yAxisSelect = document.getElementById('vector-map-y-axis');

      function updateAxes() {
        renderer.xAxisFactor = parseInt(xAxisSelect.value);
        renderer.yAxisFactor = parseInt(yAxisSelect.value);
        renderer.calculateBounds();
        renderer.draw();
      }

      if (xAxisSelect) xAxisSelect.addEventListener('change', updateAxes);
      if (yAxisSelect) yAxisSelect.addEventListener('change', updateAxes);

      // グローバル変数に保存（後で更新時に使用）
      window.currentVectorMapRenderer = renderer;
    }, 100);
  }

  // 理解階層ダッシュボードのみを公開
  Object.assign(global.AnalysisDashboard, {
    loadQuizLog: loadQuizLog,
    mergeAllSessions: mergeAllSessions,
    renderMasteryDashboard: renderMasteryDashboard,
    updateKPI: updateKPI,
    drawCharts: drawCharts,
    listRecommendations: listRecommendations,
    analyze: analyze,
    getQuizVersionsFromLogs: getQuizVersionsFromLogs,
    filterLogsByVersion: filterLogsByVersion,
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
