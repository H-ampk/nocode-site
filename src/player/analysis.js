/**
 * Analysis - 理解階層スコア更新ロジック
 * 
 * 学習者の回答ログから理解階層（識別・説明・適用・区別・転移・構造化）のスコアを計算します
 */

(function (global) {
  'use strict';

  // 理解階層のデフォルト値
  var DEFAULT_MASTERY = {
    '識別': 0,
    '説明': 0,
    '適用': 0,
    '区別': 0,
    '転移': 0,
    '構造化': 0
  };

  /**
   * 反応時間の正規化（z-score）
   * @param {Array} log - ログエントリの配列
   * @returns {Array} 正規化されたログエントリの配列
   */
  function normalizeResponseCost(log) {
    if (!Array.isArray(log) || log.length === 0) {
      return log;
    }

    var values = log.map(function(e) {
      return e.response_time_ms;
    }).filter(function(v) {
      return v != null && typeof v === 'number';
    });

    if (values.length === 0) {
      return log.map(function(e) {
        return Object.assign({}, e, { response_cost_norm: 0 });
      });
    }

    var sum = values.reduce(function(a, b) {
      return a + b;
    }, 0);
    var mean = sum / values.length;

    var variance = values.reduce(function(acc, val) {
      return acc + Math.pow(val - mean, 2);
    }, 0) / values.length;
    var std = Math.sqrt(variance);

    return log.map(function(e) {
      var normalized = 0;
      if (e.response_time_ms != null && typeof e.response_time_ms === 'number' && std > 0) {
        normalized = (e.response_time_ms - mean) / std;
      }
      return Object.assign({}, e, { response_cost_norm: normalized });
    });
  }

  /**
   * 選択肢レベルの理解階層スコアを更新
   * @param {Object} option - 選択された選択肢オブジェクト（correct, misconception, measure プロパティを持つ）
   * @param {Object} profile - 現在の理解階層プロファイル
   * @returns {Object} 更新された理解階層プロファイル
   */
  function updateMasteryOptionLevel(option, profile) {
    if (!option || !profile) {
      return profile || Object.assign({}, DEFAULT_MASTERY);
    }

    // プロファイルをコピー（元のオブジェクトを変更しない）
    var updatedProfile = Object.assign({}, profile);

    // 選択肢で測定する理解階層を取得（measure が存在しない場合は空配列）
    var measures = Array.isArray(option.measure) ? option.measure : [];

    // 正答の場合
    if (option.correct === true || option.isCorrect === true) {
      // 選択肢のmeasureに含まれるすべての理解階層のスコアを +1.0
      measures.forEach(function(level) {
        if (updatedProfile.hasOwnProperty(level)) {
          updatedProfile[level] = (updatedProfile[level] || 0) + 1.0;
        }
      });
    }
    // 誤答の場合
    else {
      // 誤概念がある場合
      if (option.misconception && option.misconception.trim() !== '') {
        // 「区別」階層のスコアを -1.0
        if (updatedProfile.hasOwnProperty('区別')) {
          updatedProfile['区別'] = (updatedProfile['区別'] || 0) - 1.0;
        }
      }
      // 無関連誤答の場合
      else {
        // 選択肢のmeasureに含まれるすべての理解階層のスコアを -0.4
        measures.forEach(function(level) {
          if (updatedProfile.hasOwnProperty(level)) {
            updatedProfile[level] = (updatedProfile[level] || 0) - 0.4;
          }
        });
      }
    }

    return updatedProfile;
  }

  /**
   * 回答ログから理解階層プロファイルを分析（選択肢レベルのmeasureを使用）
   * 反応コストを考慮した流体モデル的な更新
   * @param {Array} log - ログエントリの配列
   * @returns {Object} 理解階層プロファイル
   */
  function analyzeResponses(log) {
    if (!Array.isArray(log) || log.length === 0) {
      return Object.assign({}, DEFAULT_MASTERY);
    }

    // 反応コストを正規化
    var normalizedLog = normalizeResponseCost(log);
    var profile = Object.assign({}, DEFAULT_MASTERY);

    normalizedLog.forEach(function(entry) {
      if (entry && entry.selected) {
        var opt = entry.selected;
        var measures = Array.isArray(opt.measure) ? opt.measure : [];
        var costNorm = entry.response_cost_norm || 0;

        if (opt.correct === true || opt.isCorrect === true) {
          // 正答の場合
          measures.forEach(function(level) {
            if (profile.hasOwnProperty(level)) {
              profile[level] = (profile[level] || 0) + 1.0;
              // 遅い正解 → 流動抵抗が大きい → 少しだけ減衰
              profile[level] -= 0.1 * Math.max(0, costNorm);
            }
          });
        } else {
          // 誤答の場合
          if (opt.misconception && opt.misconception.trim() !== '') {
            // 誤概念がある場合
            // 「区別」階層のスコアを -1.0
            if (profile.hasOwnProperty('区別')) {
              profile['区別'] = (profile['区別'] || 0) - 1.0;
              // 遅い誤答 → 迷いの渦が強い → さらに減衰
              profile['区別'] -= 0.2 * Math.max(0, costNorm);
            }
          }
          // 無関連誤答の場合
          measures.forEach(function(level) {
            if (profile.hasOwnProperty(level)) {
              profile[level] = (profile[level] || 0) - 0.4;
              // 遅い誤答 → 迷いの渦が強い → さらに減衰
              profile[level] -= 0.2 * Math.max(0, costNorm);
            }
          });
        }
      }
    });

    return profile;
  }

  /**
   * 理解階層プロファイルを初期化
   * @returns {Object} 初期化された理解階層プロファイル
   */
  function createEmptyProfile() {
    return Object.assign({}, DEFAULT_MASTERY);
  }

  /**
   * 理解階層プロファイルを正規化（0-100の範囲に変換）
   * @param {Object} profile - 理解階層プロファイル
   * @returns {Object} 正規化されたプロファイル
   */
  function normalizeProfile(profile) {
    if (!profile) {
      return Object.assign({}, DEFAULT_MASTERY);
    }

    var normalized = {};
    var maxScore = Math.max.apply(null, Object.values(profile));
    var minScore = Math.min.apply(null, Object.values(profile));
    var range = maxScore - minScore;

    Object.keys(profile).forEach(function(level) {
      if (range === 0) {
        normalized[level] = 50; // すべて同じ値の場合は50に設定
      } else {
        // 0-100の範囲に正規化
        normalized[level] = ((profile[level] - minScore) / range) * 100;
      }
    });

    return normalized;
  }

  /**
   * 迷いトポロジー（Confusion Topology）を計算
   * 誤答のRT・誤答カテゴリ・RTの揺らぎをもとに、
   * 誤概念の強度・渦状性（vorticity）・乱流度を数値化
   * @param {Array} log - ログエントリの配列
   * @returns {Object} 迷いトポロジーのデータ
   */
  function computeConfusionTopology(log) {
    if (!Array.isArray(log) || log.length === 0) {
      return {};
    }

    var wrong = log.filter(function(e) {
      return e && e.selected && !e.selected.correct;
    });

    var result = {};

    wrong.forEach(function(e) {
      var key = (e.selected.misconception && e.selected.misconception.trim()) || "未分類";

      if (!result[key]) {
        result[key] = {
          count: 0,
          rt: [],
          rt_mean: 0,
          rt_var: 0,
          vorticity: 0,    // 渦の強さ（RT×誤答率）
          turbulence: 0    // 乱流度（RT分散 × 誤答の多様性）
        };
      }

      result[key].count += 1;
      if (e.response_time_ms != null && typeof e.response_time_ms === 'number') {
        result[key].rt.push(e.response_time_ms);
      }
    });

    // 測定値を算出
    for (var key in result) {
      var obj = result[key];
      if (obj.rt.length === 0) {
        continue;
      }

      var sum = obj.rt.reduce(function(a, b) {
        return a + b;
      }, 0);
      var mean = sum / obj.rt.length;
      
      var variance = obj.rt.reduce(function(acc, val) {
        return acc + Math.pow(val - mean, 2);
      }, 0) / obj.rt.length;

      obj.rt_mean = mean;
      obj.rt_var = variance;

      // 渦（vorticity）＝ 誤答頻度 × RT平均
      obj.vorticity = obj.count * mean;

      // 多様性（異なる誤答 measure の数）
      var wrongForKey = wrong.filter(function(w) {
        var wKey = (w.selected.misconception && w.selected.misconception.trim()) || "未分類";
        return wKey === key;
      });

      var measureStrings = wrongForKey.map(function(w) {
        var measures = Array.isArray(w.selected.measure) ? w.selected.measure : [];
        return measures.join("_") || "?";
      });

      var measureSet = new Set(measureStrings);
      var diversity = measureSet.size;

      // 乱流（turbulence）＝ RT分散 × 多様性
      obj.turbulence = variance * diversity;
    }

    return result;
  }

  /**
   * 安定度（RT variance）を計算
   * @param {Array} log - ログエントリの配列
   * @returns {Object} 安定度のデータ
   */
  function computeStabilityIndex(log) {
    if (!Array.isArray(log) || log.length === 0) {
      return {
        variance: 0,
        stability_index: 0
      };
    }

    var rt = log.map(function(e) {
      return e.response_time_ms;
    }).filter(function(v) {
      return v != null && typeof v === 'number';
    });

    if (rt.length === 0) {
      return {
        variance: 0,
        stability_index: 0
      };
    }

    var sum = rt.reduce(function(a, b) {
      return a + b;
    }, 0);
    var mean = sum / rt.length;
    
    var variance = rt.reduce(function(acc, val) {
      return acc + Math.pow(val - mean, 2);
    }, 0) / rt.length;

    // 安定度 = 1 / (1 + variance)
    // variance が大きい（＝認知が揺らいでいる）ほど小さくなる
    return {
      variance: variance,
      stability_index: 1 / (1 + variance)
    };
  }

  /**
   * ダッシュボード用データを計算
   * @param {Array} log - ログエントリの配列
   * @param {Object} mastery - 理解階層プロファイル
   * @returns {Object} ダッシュボードデータ
   */
  function computeDashboardData(log, mastery) {
    // 反応コストを正規化
    var normalizedLog = normalizeResponseCost(log);
    if (!Array.isArray(log) || log.length === 0) {
      return {
        totalAnswers: 0,
        accuracy: 0,
        weakestLevel: '-',
        masteryPieData: {
          labels: Object.keys(DEFAULT_MASTERY),
          datasets: [{
            data: Object.values(DEFAULT_MASTERY),
            backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#c8d6e5']
          }]
        },
        conceptBarData: {
          labels: [],
          datasets: []
        },
        misconceptionBarData: {
          labels: [],
          datasets: []
        },
        weakLevelsBarData: {
          labels: [],
          datasets: []
        },
        weakLevels: [],
        recommendations: []
      };
    }

    // 基本統計
    var totalAnswers = log.length;
    var correctCount = log.filter(function(entry) {
      return entry && entry.selected && entry.selected.correct === true;
    }).length;
    var accuracy = totalAnswers > 0 ? correctCount / totalAnswers : 0;

    // 理解階層の分布（円グラフ用）
    var masteryLabels = Object.keys(mastery);
    var masteryValues = Object.values(mastery);
    // 理解階層ごとの色を定義（measure色付けと統一）
    var masteryColorMap = {
      '識別': '#ff6b6b',
      '説明': '#feca57',
      '適用': '#48dbfb',
      '区別': '#1dd1a1',
      '転移': '#5f27cd',
      '構造化': '#c8d6e5'
    };
    var masteryColors = masteryLabels.map(function(label) {
      return masteryColorMap[label] || '#999';
    });

    // -----------------------------
    // 1. 概念別の理解スコア集計
    // -----------------------------
    var conceptScores = {}; // { "媒介変数": {score:0, count:0} }

    log.forEach(function(entry) {
      if (!entry || !entry.question) {
        return;
      }

      var concept = entry.question.concept || entry.question.conceptTag || 'その他';
      if (!conceptScores[concept]) {
        conceptScores[concept] = { score: 0, count: 0 };
      }

      // 概念スコアは選択肢の measure の平均で扱う
      // 選択肢レベルのmeasureを使用
      var measures = Array.isArray(entry.selected.measure) ? entry.selected.measure : [];
      if (measures.length > 0) {
        measures.forEach(function(level) {
          if (mastery.hasOwnProperty(level)) {
            conceptScores[concept].score += mastery[level] || 0;
          }
        });
        conceptScores[concept].count += 1;
      } else {
        // measure がない場合は、すべての階層の平均を使用
        var avgScore = Object.values(mastery).reduce(function(sum, val) {
          return sum + (val || 0);
        }, 0) / masteryLabels.length;
        conceptScores[concept].score += avgScore;
        conceptScores[concept].count += 1;
      }
    });

    var conceptLabels = Object.keys(conceptScores);
    var conceptValues = conceptLabels.map(function(c) {
      return conceptScores[c].count > 0 ? conceptScores[c].score / conceptScores[c].count : 0;
    });

    // -----------------------------
    // 2. 誤概念ランキング
    // -----------------------------
    var misconceptionCount = {}; // { "交絡因子": 12 }

    log.forEach(function(entry) {
      if (entry && entry.selected && !entry.selected.correct && entry.selected.misconception) {
        var m = entry.selected.misconception.trim();
        if (m) {
          misconceptionCount[m] = (misconceptionCount[m] || 0) + 1;
        }
      }
    });

    var misconceptionLabels = Object.keys(misconceptionCount).sort(function(a, b) {
      return misconceptionCount[b] - misconceptionCount[a];
    }).slice(0, 10); // 上位10件
    var misconceptionValues = misconceptionLabels.map(function(k) {
      return misconceptionCount[k];
    });

    // 誤概念がない場合は空のデータを返す
    if (misconceptionLabels.length === 0) {
      misconceptionLabels = ['誤概念なし'];
      misconceptionValues = [0];
    }

    // -----------------------------
    // 3. 弱い理解階層TOP3
    // -----------------------------
    var levelsSorted = Object.entries(mastery).sort(function(a, b) {
      return (a[1] || 0) - (b[1] || 0);
    }).slice(0, 3);

    var weakLabels = levelsSorted.map(function(x) {
      return x[0];
    });
    var weakValues = levelsSorted.map(function(x) {
      return x[1] || 0;
    });

    // 最も弱い理解階層を特定
    var weakestLevel = weakLabels.length > 0 ? weakLabels[0] : '-';

    // -----------------------------
    // 4. 誤概念 × 理解階層のクロス集計
    // -----------------------------
    var cross = {}; // cross[誤概念][level] = count
    var MASTERY_LEVELS = window.MASTERY_LEVELS || ['識別', '説明', '適用', '区別', '転移', '構造化'];

    log.forEach(function(entry) {
      if (entry && entry.selected && !entry.selected.correct && entry.selected.misconception) {
        var m = entry.selected.misconception.trim();
        if (m) {
          if (!cross[m]) {
            cross[m] = {};
          }
          // 選択肢のmeasureを使用
          var measures = Array.isArray(entry.selected.measure) ? entry.selected.measure : [];
          measures.forEach(function(level) {
            cross[m][level] = (cross[m][level] || 0) + 1;
          });
        }
      }
    });

    var misLabels = Object.keys(cross).sort(function(a, b) {
      // 出現回数の合計でソート
      var sumA = Object.values(cross[a]).reduce(function(s, v) { return s + v; }, 0);
      var sumB = Object.values(cross[b]).reduce(function(s, v) { return s + v; }, 0);
      return sumB - sumA;
    }).slice(0, 10); // 上位10件

    // ヒートマップ用データセット（理解階層ごとの色を使用）
    var heatDatasets = MASTERY_LEVELS.map(function(level) {
      return {
        label: level,
        data: misLabels.map(function(m) {
          return cross[m] && cross[m][level] ? cross[m][level] : 0;
        }),
        backgroundColor: masteryColorMap[level] || '#48dbfb'
      };
    });

    return {
      totalAnswers: totalAnswers,
      accuracy: accuracy,
      weakestLevel: weakestLevel,
      weakLevels: weakLabels,

      // 円グラフ（色付け対応）
      masteryPieData: {
        labels: masteryLabels,
        datasets: [{
          label: '理解階層',
          data: masteryValues,
          backgroundColor: masteryLabels.map(function(label) {
            // 理解階層ごとの色を設定
            var colorMap = {
              '識別': '#ff6b6b',
              '説明': '#feca57',
              '適用': '#48dbfb',
              '区別': '#1dd1a1',
              '転移': '#5f27cd',
              '構造化': '#c8d6e5'
            };
            return colorMap[label] || '#999';
          })
        }]
      },

      // 概念別スコア棒グラフ（色付け対応）
      conceptBarData: {
        labels: conceptLabels.length > 0 ? conceptLabels : ['データなし'],
        datasets: [{
          label: '概念ごとの理解スコア',
          data: conceptValues.length > 0 ? conceptValues : [0],
          backgroundColor: conceptLabels.map(function() {
            return '#48dbfb'; // 統一色
          })
        }]
      },

      // 誤概念ランキング棒グラフ
      misconceptionBarData: {
        labels: misconceptionLabels,
        datasets: [{
          label: '誤概念 出現回数',
          data: misconceptionValues,
          backgroundColor: '#ff6b6b'
        }]
      },

      // 弱い理解階層TOP3（色付け対応）
      weakLevelsBarData: {
        labels: weakLabels.length > 0 ? weakLabels : ['データなし'],
        datasets: [{
          label: '弱い階層',
          data: weakValues.length > 0 ? weakValues : [0],
          backgroundColor: weakLabels.length > 0 ? weakLabels.map(function(label) {
            return masteryColorMap[label] || '#feca57';
          }) : ['#feca57']
        }]
      },

      // 誤概念 × 理解階層のクロス集計
      misconceptionMastery: {
        labels: misLabels.length > 0 ? misLabels : ['誤概念なし'],
        datasets: misLabels.length > 0 ? heatDatasets : MASTERY_LEVELS.map(function(level) {
          return {
            label: level,
            data: [0],
            backgroundColor: masteryColorMap[level] || '#48dbfb'
          };
        })
      },

      recommendations: [], // recommendation.js で後で生成

      // 反応時間関連統計
      rtStats: (function() {
        var rtValues = normalizedLog.map(function(e) {
          return e.response_time_ms;
        }).filter(function(v) {
          return v != null && typeof v === 'number';
        });

        if (rtValues.length === 0) {
          return {
            avg: 0,
            min: 0,
            max: 0
          };
        }

        var sum = rtValues.reduce(function(a, b) {
          return a + b;
        }, 0);
        var avg = sum / rtValues.length;
        var min = Math.min.apply(null, rtValues);
        var max = Math.max.apply(null, rtValues);

        return {
          avg: avg,
          min: min,
          max: max
        };
      })(),

      // measure × 反応コスト
      rtByLevel: (function() {
        var rtByLevel = {};
        normalizedLog.forEach(function(entry) {
          var measures = Array.isArray(entry.selected && entry.selected.measure) 
            ? entry.selected.measure 
            : [];
          measures.forEach(function(level) {
            if (!rtByLevel[level]) {
              rtByLevel[level] = [];
            }
            if (entry.response_cost_norm != null) {
              rtByLevel[level].push(entry.response_cost_norm);
            }
          });
        });

        var rtLevelLabels = Object.keys(rtByLevel);
        var rtLevelMeans = rtLevelLabels.map(function(l) {
          var arr = rtByLevel[l];
          if (arr.length === 0) return 0;
          var sum = arr.reduce(function(a, b) {
            return a + b;
          }, 0);
          return sum / arr.length;
        });

        return {
          labels: rtLevelLabels,
          means: rtLevelMeans,
          data: rtByLevel
        };
      })(),

      // 迷いトポロジー
      confusionTopology: computeConfusionTopology(log),

      // 安定度
      stability: computeStabilityIndex(log)
    };
  }

  // グローバルに公開
  global.Analysis = {
    DEFAULT_MASTERY: DEFAULT_MASTERY,
    updateMastery: updateMasteryOptionLevel, // 後方互換性のためのエイリアス
    updateMasteryOptionLevel: updateMasteryOptionLevel,
    analyzeResponses: analyzeResponses,
    createEmptyProfile: createEmptyProfile,
    normalizeProfile: normalizeProfile,
    computeDashboardData: computeDashboardData,
    normalizeResponseCost: normalizeResponseCost
  };

})(window);

