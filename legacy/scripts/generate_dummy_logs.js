/**
 * ダミー quiz_log.json を生成するスクリプト
 * 
 * 実行方法（Node.js環境）:
 * node scripts/generate_dummy_logs.js
 */

(function() {
  'use strict';

  // 設定
  var TOTAL_LOGS = 50;
  var QUESTIONS = ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008', 'q009', 'q010'];
  var CHOICES = ['c1', 'c2', 'c3', 'c4'];
  
  // conceptTags の候補
  var CONCEPT_TAGS = [
    '短期記憶',
    '作業記憶',
    '注意',
    '条件づけ',
    '認知負荷',
    'メタ認知'
  ];
  
  // recommended_terms の候補
  var RECOMMENDED_TERMS = [
    '短期記憶',
    '作業記憶',
    '注意制御',
    '長期記憶',
    '二重過程理論',
    'ワーキングメモリ'
  ];

  /**
   * 指定範囲の乱数を生成
   */
  function randomFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  }

  /**
   * 指定範囲の整数を生成
   */
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 配列からランダムに要素を取得
   */
  function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 配列からランダムに複数要素を取得（重複なし）
   */
  function randomChoices(array, count) {
    var shuffled = array.slice().sort(function() { return 0.5 - Math.random(); });
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * 反応時間の分類を取得
   */
  function getResponseTimeCategory() {
    var rand = Math.random();
    // 分布: instant 30%, searching 40%, deliberate 30%
    if (rand < 0.3) {
      return 'instant'; // 0.5〜2秒
    } else if (rand < 0.7) {
      return 'searching'; // 3〜12秒
    } else {
      return 'deliberate'; // 15〜40秒
    }
  }

  /**
   * 反応時間を生成
   */
  function generateResponseTime(category) {
    switch (category) {
      case 'instant':
        return randomFloat(0.5, 2.0);
      case 'searching':
        return randomFloat(3.0, 12.0);
      case 'deliberate':
        return randomFloat(15.0, 40.0);
      default:
        return randomFloat(0.5, 40.0);
    }
  }

  /**
   * path（迷いパターン）を生成
   */
  function generatePath(responseTime) {
    var steps = randomInt(1, 4);
    var path = [];
    
    if (steps === 1) {
      // 即答型: 1つの選択肢のみ
      path = [randomChoice(CHOICES)];
    } else {
      // 迷いパターン: 複数の選択肢間を遷移
      for (var i = 0; i < steps; i++) {
        var choice = randomChoice(CHOICES);
        // 前の選択肢と異なる場合は追加
        if (path.length === 0 || path[path.length - 1] !== choice) {
          path.push(choice);
        } else if (i < steps - 1) {
          // 同じ選択肢が続く場合は別の選択肢を選ぶ
          var otherChoices = CHOICES.filter(function(c) { return c !== choice; });
          if (otherChoices.length > 0) {
            path.push(randomChoice(otherChoices));
          } else {
            path.push(choice);
          }
        }
      }
    }
    
    return path;
  }

  /**
   * clicks を生成（path と整合性を保つ）
   */
  function generateClicks(path, responseTime) {
    var clicks = [];
    var cumulativeTime = 0;
    
    for (var i = 0; i < path.length; i++) {
      var choiceId = path[i];
      var time;
      
      if (i === path.length - 1) {
        // 最後のクリックは response_time に近い値
        time = Math.max(0.1, responseTime - cumulativeTime - 0.5);
        time = Math.min(time, responseTime - cumulativeTime);
      } else {
        // 中間のクリックは均等に分散
        var remainingTime = responseTime - cumulativeTime;
        var remainingClicks = path.length - i;
        var averageInterval = remainingTime / remainingClicks;
        time = randomFloat(averageInterval * 0.5, averageInterval * 1.5);
        time = Math.min(time, responseTime - cumulativeTime - 0.5);
      }
      
      cumulativeTime += time;
      clicks.push({
        choiceId: choiceId,
        time: Math.round(cumulativeTime * 10) / 10
      });
    }
    
    // 最後のクリック時間を response_time に合わせる
    if (clicks.length > 0) {
      clicks[clicks.length - 1].time = Math.round(responseTime * 10) / 10;
    }
    
    return clicks;
  }

  /**
   * 1つのログエントリを生成
   */
  function generateLog(index) {
    var questionId = randomChoice(QUESTIONS);
    var isCorrect = Math.random() < 0.5; // 50%の確率で正解
    var category = getResponseTimeCategory();
    var responseTime = generateResponseTime(category);
    var path = generatePath(responseTime);
    var clicks = generateClicks(path, responseTime);
    var finalAnswer = path[path.length - 1];
    
    // timestamp を生成（現在時刻からランダムに過去へ）
    var now = new Date();
    var daysAgo = Math.random() * 30; // 過去30日以内
    var timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    var log = {
      questionId: questionId,
      timestamp: timestamp.toISOString(),
      clicks: clicks,
      final_answer: finalAnswer,
      correct: isCorrect,
      response_time: Math.round(responseTime * 10) / 10,
      path: path
    };
    
    // 誤答の場合は conceptTags と recommended_terms を追加
    if (!isCorrect) {
      // conceptTags: 1〜2個をランダムに付与
      var tagCount = randomInt(1, 2);
      log.conceptTags = randomChoices(CONCEPT_TAGS, tagCount);
      
      // recommended_terms: 1〜3個をランダムに生成
      var termCount = randomInt(1, 3);
      log.recommended_terms = randomChoices(RECOMMENDED_TERMS, termCount);
    }
    
    return log;
  }

  /**
   * メイン処理
   */
  function main() {
    console.log('ダミーログ生成を開始...');
    
    var logs = [];
    for (var i = 0; i < TOTAL_LOGS; i++) {
      logs.push(generateLog(i));
    }
    
    var logData = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      logs: logs
    };
    
    console.log('生成完了: ' + TOTAL_LOGS + '件のログ');
    console.log('正答率: ' + (logs.filter(function(l) { return l.correct; }).length / logs.length * 100).toFixed(1) + '%');
    
    // 分類別の統計
    var instantCount = logs.filter(function(l) { return l.response_time <= 2; }).length;
    var searchingCount = logs.filter(function(l) { return l.response_time > 2 && l.response_time < 15; }).length;
    var deliberateCount = logs.filter(function(l) { return l.response_time >= 15; }).length;
    
    console.log('反応時間分類:');
    console.log('  instant (0.5-2秒): ' + instantCount + '件');
    console.log('  searching (3-12秒): ' + searchingCount + '件');
    console.log('  deliberate (15-40秒): ' + deliberateCount + '件');
    
    console.log('\nJSONデータ:');
    console.log(JSON.stringify(logData, null, 2));
    
    // Node.js環境の場合はファイルに保存
    if (typeof require !== 'undefined' && require.main === module) {
      var fs = require('fs');
      var path = require('path');
      
      var outputPath = path.join(__dirname, '..', '..', 'students', 'quiz_log_dummy.json');
      fs.writeFileSync(outputPath, JSON.stringify(logData, null, 2), 'utf8');
      console.log('\nファイルに保存しました: ' + outputPath);
    }
    
    return logData;
  }

  // Node.js環境で実行
  if (typeof require !== 'undefined' && require.main === module) {
    main();
  }

  // ブラウザ環境でも利用可能にする
  if (typeof window !== 'undefined') {
    window.generateDummyLogs = main;
  }

})();





