/**
 * GlossaryRecommendation - 誤答時のGlossary自動提示システム
 * 
 * 機能:
 * - 迷いパターン解析
 * - 選択肢タグと glossary を突合
 * - 最適解説の抽出
 */

(function (global) {
  'use strict';

  var glossary = null; // 統合済みGlossary（termIdをキーとするオブジェクト）

  /**
   * Glossaryを設定する
   * @param {Object} mergedGlossary - 統合済みGlossaryオブジェクト
   */
  function setGlossary(mergedGlossary) {
    glossary = mergedGlossary || {};
  }

  /**
   * 選択肢のタグから関連するGlossary用語を検索
   * @param {Array<string>} tags - 選択肢のタグ配列
   * @returns {Array<Object>} 関連するGlossary用語の配列
   */
  function findTermsByTags(tags) {
    if (!glossary || !tags || tags.length === 0) {
      return [];
    }

    var matchedTerms = [];

    Object.keys(glossary).forEach(function (termId) {
      var term = glossary[termId];
      
      // domains または tags フィールドと照合
      var termDomains = term.domains || [];
      var termTags = term.tags || [];
      var allTermLabels = termDomains.concat(termTags);

      // タグの一致を確認
      var hasMatch = tags.some(function (tag) {
        return allTermLabels.some(function (termLabel) {
          return termLabel.toLowerCase().indexOf(tag.toLowerCase()) !== -1 ||
                 tag.toLowerCase().indexOf(termLabel.toLowerCase()) !== -1;
        });
      });

      if (hasMatch) {
        matchedTerms.push(term);
      }
    });

    return matchedTerms;
  }

  /**
   * 迷いパターンを解析
   * @param {Object} log - ログオブジェクト
   * @returns {Object} 解析結果 { isQuickError, isLongHesitation, repeatedChoices, confusionPattern }
   */
  function analyzeHesitationPattern(log) {
    if (!log) {
      return {
        isQuickError: false,
        isLongHesitation: false,
        repeatedChoices: [],
        confusionPattern: null
      };
    }

    var responseTime = log.response_time || 0;
    var clicks = log.clicks || [];
    var path = log.path || [];

    // 反応時間が短い誤答（5秒未満）
    var isQuickError = !log.correct && responseTime < 5;

    // 反応時間が長い誤答（20秒以上）
    var isLongHesitation = !log.correct && responseTime >= 20;

    // 同じ選択肢を何度も選ぶパターン
    var choiceCounts = {};
    clicks.forEach(function (click) {
      var choiceId = click.choiceId;
      choiceCounts[choiceId] = (choiceCounts[choiceId] || 0) + 1;
    });
    var repeatedChoices = Object.keys(choiceCounts).filter(function (choiceId) {
      return choiceCounts[choiceId] >= 3;
    });

    // 概念混同パターン（特定の誤答を何度も選ぶ）
    var confusionPattern = null;
    if (repeatedChoices.length > 0 && !log.correct) {
      confusionPattern = {
        type: 'concept_confusion',
        repeatedChoiceId: repeatedChoices[0],
        count: choiceCounts[repeatedChoices[0]]
      };
    }

    return {
      isQuickError: isQuickError,
      isLongHesitation: isLongHesitation,
      repeatedChoices: repeatedChoices,
      confusionPattern: confusionPattern
    };
  }

  /**
   * 最適な解説を抽出
   * @param {Object} term - Glossary用語オブジェクト
   * @param {Object} pattern - 迷いパターン解析結果
   * @returns {Object} 解説オブジェクト { title, content, links }
   */
  function extractExplanation(term, pattern) {
    if (!term) {
      return null;
    }

    var explanation = {
      title: term.word || term.name || '用語解説',
      content: '',
      links: term.links || []
    };

    // 反応時間が短い誤答 → 簡易定義（definition）
    if (pattern.isQuickError) {
      explanation.content = term.definition || term.description || '';
      explanation.type = 'quick_reference';
    }
    // 反応時間が長い誤答 → 背景説明（domain_definition や links）
    else if (pattern.isLongHesitation) {
      explanation.content = term.domain_definition || term.definition || term.description || '';
      if (term.example) {
        explanation.content += '\n\n例: ' + term.example;
      }
      explanation.type = 'detailed_explanation';
    }
    // 概念混同 → 対となる用語も提示
    else if (pattern.confusionPattern) {
      explanation.content = term.definition || term.description || '';
      if (term.note) {
        explanation.content += '\n\n注意: ' + term.note;
      }
      explanation.type = 'concept_clarification';
    }
    // デフォルト
    else {
      explanation.content = term.definition || term.description || '';
      explanation.type = 'standard';
    }

    return explanation;
  }

  /**
   * タグの一致度を計算
   * @param {Array<string>} choiceTags - 選択肢のタグ
   * @param {Object} term - Glossary用語オブジェクト
   * @returns {number} 一致度スコア（0-1）
   */
  function calculateTagMatchScore(choiceTags, term) {
    if (!choiceTags || choiceTags.length === 0) {
      return 0;
    }

    var termDomains = term.domains || [];
    var termTags = term.tags || [];
    var allTermLabels = termDomains.concat(termTags);

    if (allTermLabels.length === 0) {
      return 0;
    }

    var matches = 0;
    choiceTags.forEach(function (choiceTag) {
      var lowerChoiceTag = choiceTag.toLowerCase();
      allTermLabels.forEach(function (termLabel) {
        var lowerTermLabel = termLabel.toLowerCase();
        if (lowerTermLabel.indexOf(lowerChoiceTag) !== -1 ||
            lowerChoiceTag.indexOf(lowerTermLabel) !== -1) {
          matches++;
        }
      });
    });

    return matches / Math.max(choiceTags.length, allTermLabels.length);
  }

  /**
   * 用語の深さレベルを判定
   * @param {Object} term - Glossary用語オブジェクト
   * @returns {string} 'basic' | 'intermediate' | 'deep'
   */
  function determineTermDepth(term) {
    var hasDefinition = !!(term.definition || term.description);
    var hasExample = !!term.example;
    var hasDomainDefinition = !!term.domain_definition;
    var hasLinks = !!(term.links && term.links.length > 0);
    var hasNote = !!term.note;

    if (hasDefinition && !hasExample && !hasDomainDefinition) {
      return 'basic';
    } else if (hasDefinition && (hasExample || hasNote)) {
      return 'intermediate';
    } else if (hasDomainDefinition || hasLinks) {
      return 'deep';
    }

    return 'basic';
  }

  /**
   * path（迷いの軌跡）を解析
   * @param {Array<string>} path - 選択肢遷移のシーケンス
   * @returns {Object} 解析結果 { uniqueCount, isOscillating, isDeepConfusion, pattern }
   */
  function analyzePath(path) {
    if (!path || path.length === 0) {
      return {
        uniqueCount: 0,
        isOscillating: false,
        isDeepConfusion: false,
        pattern: 'none'
      };
    }

    var uniqueCount = 0;
    var seen = {};
    path.forEach(function (choiceId) {
      if (!seen[choiceId]) {
        seen[choiceId] = true;
        uniqueCount++;
      }
    });

    // 往復パターンの検出（2-3選択肢間を往復）
    var isOscillating = false;
    if (uniqueCount >= 2 && uniqueCount <= 3 && path.length >= 4) {
      // 最後の数回の選択が往復しているか確認
      var recent = path.slice(-4);
      var recentUnique = {};
      recent.forEach(function (id) {
        recentUnique[id] = (recentUnique[id] || 0) + 1;
      });
      var uniqueInRecent = Object.keys(recentUnique).length;
      if (uniqueInRecent === 2 && recent.length >= 4) {
        isOscillating = true;
      }
    }

    // 深い混乱（4以上遷移）
    var isDeepConfusion = uniqueCount >= 4;

    var pattern = 'none';
    if (uniqueCount === 1) {
      pattern = 'immediate';
    } else if (isOscillating) {
      pattern = 'oscillating';
    } else if (isDeepConfusion) {
      pattern = 'deep_confusion';
    } else {
      pattern = 'moderate';
    }

    return {
      uniqueCount: uniqueCount,
      isOscillating: isOscillating,
      isDeepConfusion: isDeepConfusion,
      pattern: pattern
    };
  }

  /**
   * 反応時間による分類
   * @param {number} responseTime - 反応時間（秒）
   * @param {Object} timingProfile - timing_profile オブジェクト（オプション）
   * @returns {Object} { category, priority, thinkingType }
   */
  function classifyByResponseTime(responseTime, timingProfile) {
    // デフォルト値
    var instantThreshold = 3;
    var deliberateThreshold = 15;
    
    // timing_profile が指定されている場合はそれを使用
    if (timingProfile) {
      instantThreshold = timingProfile.instant_threshold || 3;
      deliberateThreshold = timingProfile.deliberate_threshold || 15;
    }
    
    var thinkingType = '';
    var category = '';
    var priority = '';
    var description = '';
    
    if (responseTime <= instantThreshold) {
      thinkingType = 'instant';
      category = 'quick';
      priority = 'definition';
      description = '直感ミス：基本定義を優先';
    } else if (responseTime < deliberateThreshold) {
      thinkingType = 'searching';
      category = 'medium';
      priority = 'example_note';
      description = '記憶検索：例や注意点を優先';
    } else {
      thinkingType = 'deliberate';
      category = 'long';
      priority = 'domain_links';
      description = '熟慮：背景説明やリンクを優先';
    }
    
    return {
      category: category,
      priority: priority,
      thinkingType: thinkingType,
      description: description
    };
  }

  /**
   * 同じ誤答パターンが複数回続くかチェック
   * @param {Object} log - 現在のログ
   * @param {Array<Object>} allLogs - すべてのログ
   * @returns {boolean} 同じ誤答パターンが続いているか
   */
  function hasRepeatedErrorPattern(log, allLogs) {
    if (!log || !allLogs || allLogs.length < 2) {
      return false;
    }

    // 最近の3つのログを確認
    var recentLogs = allLogs.slice(-3);
    var errorCount = 0;
    var sameFinalAnswer = 0;
    var finalAnswer = log.final_answer;

    recentLogs.forEach(function (l) {
      if (!l.correct) {
        errorCount++;
        if (l.final_answer === finalAnswer) {
          sameFinalAnswer++;
        }
      }
    });

    // 最近3問中2問以上が誤答で、同じ選択肢を選んでいる
    return errorCount >= 2 && sameFinalAnswer >= 2;
  }

  /**
   * 推論アルゴリズム：ログデータを解析して最適な用語解説を選ぶ
   * @param {Object} log - ログオブジェクト
   * @param {Array<Object>} choices - 選択肢の配列
   * @param {Object} glossary - 統合済みGlossaryオブジェクト
   * @param {Array<Object>} allLogs - すべてのログ（オプション）
   * @param {Object} timingProfile - timing_profile オブジェクト（オプション）
   * @returns {Object} { recommended_terms: [term objects], reason: "why this term was chosen" }
   */
  function analyze(log, choices, glossary, allLogs, timingProfile) {
    if (!log || log.correct) {
      return {
        recommended_terms: [],
        reason: '正解のため解説は不要です'
      };
    }

    if (!glossary || Object.keys(glossary).length === 0) {
      return {
        recommended_terms: [],
        reason: 'Glossaryが読み込まれていません'
      };
    }

    var recommendedTerms = [];
    var reasons = [];

    // 1. 反応時間による分類（timing_profile を使用）
    var responseTime = log.response_time || 0;
    var timeCategory = classifyByResponseTime(responseTime, timingProfile);
    reasons.push(timeCategory.description);

    // 2. path（迷いの軌跡）解析
    var path = log.path || [];
    var pathAnalysis = analyzePath(path);
    
    if (pathAnalysis.pattern === 'immediate') {
      reasons.push('即答型：基本定義のみ');
    } else if (pathAnalysis.pattern === 'oscillating') {
      reasons.push('概念混同：対概念の比較解説を提示');
    } else if (pathAnalysis.pattern === 'deep_confusion') {
      reasons.push('深い混乱：関連用語まとめを提示');
    }

    // 3. 誤答選択肢の conceptTag を取得
    var finalAnswerId = log.final_answer;
    var wrongChoice = choices.find(function (c) {
      var choiceId = c.id || ('c' + choices.indexOf(c));
      return choiceId === finalAnswerId;
    });

    if (!wrongChoice) {
      return {
        recommended_terms: [],
        reason: '誤答選択肢が見つかりません'
      };
    }

    var wrongChoiceTags = wrongChoice.tags || [];
    if (wrongChoiceTags.length === 0) {
      // タグがない場合は選択肢テキストからキーワードを抽出
      var choiceText = wrongChoice.text || '';
      wrongChoiceTags = choiceText.split(/\s+/).filter(function (word) {
        return word.length > 2;
      });
    }

    // 4. conceptTag と glossary.tags の一致度を計算
    var candidateTerms = [];
    Object.keys(glossary).forEach(function (termId) {
      var term = glossary[termId];
      var matchScore = calculateTagMatchScore(wrongChoiceTags, term);
      if (matchScore > 0) {
        candidateTerms.push({
          term: term,
          score: matchScore,
          depth: determineTermDepth(term)
        });
      }
    });

    // スコアでソート
    candidateTerms.sort(function (a, b) {
      return b.score - a.score;
    });

    // 5. 反応時間とpath解析に基づいて用語を選択（思考タイプに応じて）
    var selectedTerms = [];
    var thinkingType = timeCategory.thinkingType || 'searching';
    
    if (thinkingType === 'instant') {
      // 直感 → definition（基礎解説）を優先
      var basicTerms = candidateTerms.filter(function (c) {
        return c.depth === 'basic';
      });
      if (basicTerms.length > 0) {
        selectedTerms.push(basicTerms[0].term);
      } else if (candidateTerms.length > 0) {
        selectedTerms.push(candidateTerms[0].term);
      }
    } else if (thinkingType === 'searching') {
      // 探索的思考 → example / note（補足）を優先
      var intermediateTerms = candidateTerms.filter(function (c) {
        return c.depth === 'intermediate';
      });
      if (intermediateTerms.length > 0) {
        selectedTerms.push(intermediateTerms[0].term);
      } else if (candidateTerms.length > 0) {
        selectedTerms.push(candidateTerms[0].term);
      }
    } else if (thinkingType === 'deliberate') {
      // 熟慮 → domain_definition / links（深い背景）を優先
      var deepTerms = candidateTerms.filter(function (c) {
        return c.depth === 'deep';
      });
      if (deepTerms.length > 0) {
        selectedTerms.push(deepTerms[0].term);
      } else if (candidateTerms.length > 0) {
        selectedTerms.push(candidateTerms[0].term);
      }
    }

    // 6. path解析に基づく追加の用語選択
    if (pathAnalysis.pattern === 'oscillating') {
      // 概念混同 → 正答選択肢の用語も追加
      var correctChoice = choices.find(function (c) {
        return c.isCorrect || c.correct;
      });
      if (correctChoice) {
        var correctTags = correctChoice.tags || [];
        var correctTerms = findTermsByTags(correctTags);
        if (correctTerms.length > 0) {
          selectedTerms.push(correctTerms[0]);
        }
      }
    } else if (pathAnalysis.pattern === 'deep_confusion') {
      // 深い混乱 → 関連用語を複数追加（最大3つ）
      var relatedTerms = candidateTerms.slice(0, 3).map(function (c) {
        return c.term;
      });
      selectedTerms = selectedTerms.concat(relatedTerms);
    }

    // 7. 同じ誤答パターンが複数回続く場合
    if (hasRepeatedErrorPattern(log, allLogs || [])) {
      reasons.push('同じ誤答パターンが続いているため、学問間マッピングを優先');
      // links を持つ用語を優先
      var termsWithLinks = candidateTerms.filter(function (c) {
        return c.term.links && c.term.links.length > 0;
      });
      if (termsWithLinks.length > 0) {
        selectedTerms = [termsWithLinks[0].term].concat(selectedTerms);
      }
    }

    // 重複を除去
    var uniqueTerms = [];
    var seenIds = {};
    selectedTerms.forEach(function (term) {
      var termId = term.id;
      if (!seenIds[termId]) {
        seenIds[termId] = true;
        uniqueTerms.push(term);
      }
    });

    return {
      recommended_terms: uniqueTerms,
      reason: reasons.join(' / ')
    };
  }

  /**
   * 誤答時に最適なGlossary解説を推奨（既存関数、後方互換性のため保持）
   * @param {Object} log - ログオブジェクト
   * @param {Object} choice - 選択された選択肢オブジェクト（tags プロパティを持つ）
   * @param {Object} question - 問題オブジェクト（choices 配列を持つ）
   * @param {Object} timingProfile - timing_profile オブジェクト（オプション）
   * @returns {Object|null} 推奨解説オブジェクト
   */
  function recommendExplanation(log, choice, question, timingProfile) {
    if (!log || log.correct) {
      return null; // 正解の場合は解説を表示しない
    }

    if (!glossary || Object.keys(glossary).length === 0) {
      return null; // Glossaryが読み込まれていない
    }

    // analyze() 関数を使用（timing_profile を渡す）
    var choices = question && question.choices ? question.choices : [];
    var allLogs = QuizLogging ? QuizLogging.getAllLogs() : [];
    var analysis = analyze(log, choices, glossary, allLogs, timingProfile);

    if (analysis.recommended_terms.length === 0) {
      return null;
    }

    // 最初の推奨用語を使用
    var term = analysis.recommended_terms[0];
    var pattern = analyzeHesitationPattern(log);
    var explanation = extractExplanation(term, pattern);
    
    // 理由を追加
    explanation.reason = analysis.reason;

    // path解析を実行
    var path = log.path || [];
    var pathAnalysis = analyzePath(path);

    // 概念混同パターンの場合、対となる用語も検索
    if (pathAnalysis && pathAnalysis.pattern === 'oscillating' && question && question.choices) {
      var correctChoice = question.choices.find(function (c) {
        return c.isCorrect || c.correct;
      });
      if (correctChoice) {
        var correctTags = correctChoice.tags || [];
        var correctTerms = findTermsByTags(correctTags);
        if (correctTerms.length > 0) {
          explanation.relatedTerm = {
            title: correctTerms[0].word || correctTerms[0].name,
            content: correctTerms[0].definition || correctTerms[0].description
          };
        }
      }
    }

    return explanation;
  }

  // グローバルに公開
  global.GlossaryRecommendation = {
    setGlossary: setGlossary,
    findTermsByTags: findTermsByTags,
    analyzeHesitationPattern: analyzeHesitationPattern,
    extractExplanation: extractExplanation,
    recommendExplanation: recommendExplanation,
    analyze: analyze,
    analyzePath: analyzePath,
    classifyByResponseTime: classifyByResponseTime,
    calculateTagMatchScore: calculateTagMatchScore,
    determineTermDepth: determineTermDepth
  };

})(window);

