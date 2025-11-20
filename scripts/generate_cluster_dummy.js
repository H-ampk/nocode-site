/**
 * クラスタリング分析用のダミーデータを生成するスクリプト
 * 
 * 実行方法（Node.js環境）:
 * node scripts/generate_cluster_dummy.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const NUM_SESSIONS = Math.floor(Math.random() * 11) + 20; // 20〜30セッション
const QUESTIONS = ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008', 'q009', 'q010'];
const CHOICES = ['c1', 'c2', 'c3', 'c4'];

// ベクトル軸の定義
const VECTOR_AXES = ['logic', 'analysis', 'creativity', 'comprehension', 'application'];

/**
 * 指定範囲の乱数を生成
 */
function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * 指定範囲の整数を生成
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 配列からランダムに選択
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 配列から複数選択（重複なし）
 */
function randomSample(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 日時を生成（過去30日以内）
 */
function generateTimestamp(daysAgo = 0) {
  const now = new Date();
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const hours = randomInt(9, 18);
  const minutes = randomInt(0, 59);
  const seconds = randomInt(0, 59);
  date.setHours(hours, minutes, seconds);
  return date.toISOString();
}

/**
 * パス（選択肢遷移パターン）を生成
 */
function generatePath(questionId, correct, groundTruth) {
  const path = [];
  const numClicks = groundTruth === 1 ? randomInt(1, 2) : // クラスタ1: 素早い判断
                   groundTruth === 2 ? randomInt(2, 4) : // クラスタ2: 探索的
                   randomInt(3, 6); // クラスタ3: 慎重
  
  for (let i = 0; i < numClicks; i++) {
    if (i === numClicks - 1 && correct) {
      // 最後のクリックが正解の場合、正解の選択肢を追加
      path.push('c1'); // 簡略化: 常にc1が正解と仮定
    } else {
      path.push(randomChoice(CHOICES));
    }
  }
  
  return path;
}

/**
 * 反応時間を生成（ground_truthに基づいて現実的な値を生成）
 */
function generateReactionTime(groundTruth, pathLength) {
  // クラスタ1: 素早い判断（1-5秒）
  // クラスタ2: 探索的（5-15秒）
  // クラスタ3: 慎重（15-30秒）
  const baseTime = groundTruth === 1 ? randomFloat(1, 5) :
                   groundTruth === 2 ? randomFloat(5, 15) :
                   randomFloat(15, 30);
  
  // パスの長さに応じて調整
  return Math.round((baseTime + pathLength * 0.5) * 10) / 10;
}

/**
 * ベクトルサマリーを生成（-3〜+3の整数範囲）
 */
function generateVectorSummary(groundTruth) {
  const summary = {};
  
  VECTOR_AXES.forEach(axis => {
    // ground_truthに基づいて傾向を変える
    let value;
    if (groundTruth === 1) {
      // クラスタ1: 全体的に高い（1〜3）
      value = randomInt(1, 3);
    } else if (groundTruth === 2) {
      // クラスタ2: 中程度（-1〜1）
      value = randomInt(-1, 1);
    } else {
      // クラスタ3: 低い（-3〜-1）
      value = randomInt(-3, -1);
    }
    
    // ランダム性を追加（10%の確率で異なる値を生成）
    if (Math.random() < 0.1) {
      value = randomInt(-3, 3);
    }
    
    summary[axis] = value;
  });
  
  return summary;
}

/**
 * クラスタ特徴量を生成（[0,1]の連続値）
 */
function generateClusterFeatures(vectorSummary, reactionTime, correctRate, pathLength) {
  // ベクトルサマリーを正規化（-3〜+3 → 0〜1）
  const normalizedVector = Object.values(vectorSummary).map(v => (v + 3) / 6);
  
  // 反応時間を正規化（1〜30秒 → 0〜1）
  const normalizedRT = Math.min(reactionTime / 30, 1);
  
  // 正答率をそのまま使用（0〜1）
  const normalizedCorrect = correctRate;
  
  // パス長を正規化（1〜6 → 0〜1）
  const normalizedPath = Math.min((pathLength - 1) / 5, 1);
  
  // 特徴量ベクトルを結合
  return [
    ...normalizedVector,
    normalizedRT,
    normalizedCorrect,
    normalizedPath
  ];
}

/**
 * セッションを生成
 */
function generateSession(sessionIndex) {
  const groundTruth = (sessionIndex % 3) + 1; // 1, 2, 3 を循環
  const studentNum = Math.floor(sessionIndex / 3) + 1;
  const studentNumStr = ('000' + studentNum).slice(-3); // padStart の代替
  const userId = `student_${studentNumStr}`;
  const sessionId = `session_${Date.now()}_${sessionIndex}`;
  
  const daysAgo = randomInt(0, 30);
  const startTime = generateTimestamp(daysAgo);
  
  // セッション内の問題数（5〜10問）
  const numQuestions = randomInt(5, 10);
  const selectedQuestions = randomSample(QUESTIONS, numQuestions);
  
  const answerLogs = [];
  let totalReactionTime = 0;
  let correctCount = 0;
  let totalPathLength = 0;
  
  selectedQuestions.forEach((questionId, qIndex) => {
    // ground_truthに基づいて正答率を調整
    const correctProb = groundTruth === 1 ? 0.8 : // クラスタ1: 高正答率
                        groundTruth === 2 ? 0.6 : // クラスタ2: 中正答率
                        0.4; // クラスタ3: 低正答率
    
    const correct = Math.random() < correctProb;
    if (correct) correctCount++;
    
    const path = generatePath(questionId, correct, groundTruth);
    const pathLength = path.length;
    totalPathLength += pathLength;
    
    const reactionTime = generateReactionTime(groundTruth, pathLength);
    totalReactionTime += reactionTime;
    
    // タイムスタンプ（開始時刻から順次追加）
    const questionTime = new Date(startTime);
    questionTime.setSeconds(questionTime.getSeconds() + Math.floor(totalReactionTime));
    const timestamp = questionTime.toISOString();
    
    answerLogs.push({
      question_id: questionId,
      choice_id: path[path.length - 1], // 最後の選択肢が最終回答
      correct: correct,
      reaction_time: reactionTime,
      path: path,
      timestamp: timestamp
    });
  });
  
  // セッション統計
  const avgReactionTime = totalReactionTime / numQuestions;
  const correctRate = correctCount / numQuestions;
  const avgPathLength = totalPathLength / numQuestions;
  
  // ベクトルサマリーを生成
  const vectorSummary = generateVectorSummary(groundTruth);
  
  // クラスタ特徴量を生成
  const clusterFeatures = generateClusterFeatures(
    vectorSummary,
    avgReactionTime,
    correctRate,
    avgPathLength
  );
  
  // 終了時刻を計算
  const endTime = new Date(startTime);
  endTime.setSeconds(endTime.getSeconds() + Math.floor(totalReactionTime) + 10); // 余裕を持たせる
  
  return {
    user_id: userId,
    session_id: sessionId,
    timestamp_start: startTime,
    timestamp_end: endTime.toISOString(),
    answer_logs: answerLogs,
    vector_summary: vectorSummary,
    cluster_features: clusterFeatures,
    cluster_ground_truth: groundTruth,
    // メタデータ
    num_questions: numQuestions,
    correct_count: correctCount,
    correct_rate: correctRate,
    avg_reaction_time: Math.round(avgReactionTime * 10) / 10,
    avg_path_length: Math.round(avgPathLength * 10) / 10
  };
}

/**
 * メイン処理
 */
function main() {
  console.log('クラスタリング分析用ダミーデータを生成中...');
  
  const sessions = [];
  
  for (let i = 0; i < NUM_SESSIONS; i++) {
    const session = generateSession(i);
    sessions.push(session);
  }
  
  // データセットオブジェクトを構築
  const dataset = {
    dataset_name: 'cluster_dummy',
    type: 'class',
    created_at: new Date().toISOString(),
    description: 'クラスタリング分析用のダミーデータ（20〜30セッション）',
    sessions: sessions,
    metadata: {
      total_sessions: sessions.length,
      ground_truth_distribution: {
        cluster_1: sessions.filter(s => s.cluster_ground_truth === 1).length,
        cluster_2: sessions.filter(s => s.cluster_ground_truth === 2).length,
        cluster_3: sessions.filter(s => s.cluster_ground_truth === 3).length
      }
    }
  };
  
  // ファイルに保存
  const outputPath = path.join(__dirname, '..', 'students', 'cluster_dummy.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`✅ ${outputPath} に保存しました（${sessions.length}セッション）`);
  
  // index.json を更新
  const indexPath = path.join(__dirname, '..', 'students', 'index.json');
  let indexData = { datasets: [] };
  
  try {
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      indexData = JSON.parse(indexContent);
    }
  } catch (error) {
    console.warn('index.json の読み込みに失敗しました。新規作成します。', error.message);
  }
  
  // 既存のエントリを確認
  const existingIndex = indexData.datasets.findIndex(ds => ds.file === 'cluster_dummy.json');
  
  if (existingIndex >= 0) {
    // 既存のエントリを更新
    indexData.datasets[existingIndex] = {
      file: 'cluster_dummy.json',
      dataset_name: 'cluster_dummy',
      type: 'class'
    };
    console.log('✅ index.json の既存エントリを更新しました');
  } else {
    // 新しいエントリを追加
    indexData.datasets.push({
      file: 'cluster_dummy.json',
      dataset_name: 'cluster_dummy',
      type: 'class'
    });
    console.log('✅ index.json に新しいエントリを追加しました');
  }
  
  // index.json を保存
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`✅ ${indexPath} を更新しました`);
  
  // 統計情報を表示
  console.log('\n📊 生成されたデータの統計:');
  console.log(`  総セッション数: ${sessions.length}`);
  console.log(`  クラスタ1（素早い判断）: ${dataset.metadata.ground_truth_distribution.cluster_1}セッション`);
  console.log(`  クラスタ2（探索的）: ${dataset.metadata.ground_truth_distribution.cluster_2}セッション`);
  console.log(`  クラスタ3（慎重）: ${dataset.metadata.ground_truth_distribution.cluster_3}セッション`);
  console.log(`  平均問題数: ${Math.round(sessions.reduce((sum, s) => sum + s.num_questions, 0) / sessions.length)}問`);
  console.log(`  平均正答率: ${(sessions.reduce((sum, s) => sum + s.correct_rate, 0) / sessions.length * 100).toFixed(1)}%`);
  console.log(`  平均反応時間: ${(sessions.reduce((sum, s) => sum + s.avg_reaction_time, 0) / sessions.length).toFixed(1)}秒`);
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };

