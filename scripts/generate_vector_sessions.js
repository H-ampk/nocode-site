/**
 * vector_test_sessions 用のダミーデータを生成するスクリプト
 * 50セッション分のランダムデータを生成
 * 
 * 実行方法:
 * node scripts/generate_vector_sessions.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const TOTAL_SESSIONS = 50;
const QUESTIONS = ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008', 'q009', 'q010'];
const CHOICES = ['c1', 'c2', 'c3', 'c4'];

// conceptTags の候補
const CONCEPT_TAGS = [
  'gravity',
  'astronomy',
  'fluid',
  'pressure',
  'creativity',
  'problem-solving',
  'logic',
  'analysis',
  'memory',
  'cognition'
];

// glossaryShown の候補
const GLOSSARY_TERMS = [
  'concept.gravity.basic',
  'concept.gravity.deep',
  'concept.pressure.intro',
  'concept.creativity.basic',
  'concept.logic.intro',
  'concept.analysis.basic',
  'concept.memory.working',
  'concept.cognition.metacognition'
];

// ベクトル軸の候補
const VECTOR_AXES = ['logic', 'analysis', 'creativity'];

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
  const shuffled = array.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * 反応時間を生成
 */
function generateResponseTime() {
  const rand = Math.random();
  if (rand < 0.3) {
    return randomFloat(0.5, 2.0); // instant
  } else if (rand < 0.7) {
    return randomFloat(3.0, 12.0); // searching
  } else {
    return randomFloat(15.0, 40.0); // deliberate
  }
}

/**
 * path（迷いパターン）を生成
 */
function generatePath() {
  const steps = randomInt(1, 4);
  const path = [];
  
  for (let i = 0; i < steps; i++) {
    const choice = randomChoice(CHOICES);
    if (path.length === 0 || path[path.length - 1] !== choice) {
      path.push(choice);
    } else if (i < steps - 1) {
      const otherChoices = CHOICES.filter(c => c !== choice);
      if (otherChoices.length > 0) {
        path.push(randomChoice(otherChoices));
      } else {
        path.push(choice);
      }
    }
  }
  
  return path;
}

/**
 * ベクトルを生成
 */
function generateVector() {
  const vector = {};
  VECTOR_AXES.forEach(axis => {
    // -1, 0, 1 のいずれかをランダムに設定
    const value = randomInt(-1, 1);
    vector[axis] = value;
  });
  return vector;
}

/**
 * 1つのログエントリを生成
 */
function generateLog(sessionStartTime, logIndex) {
  const questionId = randomChoice(QUESTIONS);
  const isCorrect = Math.random() < 0.6; // 60%の確率で正解
  const responseTime = generateResponseTime();
  const path = generatePath();
  const finalAnswer = path[path.length - 1];
  
  // timestamp を生成（セッション開始時刻から順次）
  const timestamp = new Date(sessionStartTime.getTime() + logIndex * 60000); // 1分間隔
  
  const log = {
    questionId: questionId,
    timestamp: timestamp.toISOString(),
    final_answer: finalAnswer,
    correct: isCorrect,
    response_time: responseTime,
    path: path,
    conceptTags: randomChoices(CONCEPT_TAGS, randomInt(1, 3)),
    glossaryShown: Math.random() < 0.7 ? randomChoices(GLOSSARY_TERMS, randomInt(0, 2)) : [],
    vector: generateVector()
  };
  
  return log;
}

/**
 * 1つのセッションを生成
 */
function generateSession(sessionIndex, baseDate) {
  const sessionId = `session_${String(sessionIndex).padStart(3, '0')}`;
  
  // セッション開始時刻を生成（baseDateからランダムに過去へ）
  const daysAgo = Math.random() * 30; // 過去30日以内
  const sessionStartTime = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  // セッション内のログ数をランダムに生成（3〜10件）
  const logCount = randomInt(3, 10);
  const logs = [];
  
  for (let i = 0; i < logCount; i++) {
    logs.push(generateLog(sessionStartTime, i));
  }
  
  return {
    session_id: sessionId,
    generated_at: sessionStartTime.toISOString(),
    logs: logs
  };
}

/**
 * メイン処理
 */
function main() {
  console.log('vector_test_sessions 用のダミーデータ生成を開始...');
  
  const baseDate = new Date('2025-11-20T12:00:00.000Z');
  const sessions = [];
  
  for (let i = 1; i <= TOTAL_SESSIONS; i++) {
    sessions.push(generateSession(i, baseDate));
  }
  
  const vectorTestSessions = {
    user_id: 'dummy_student',
    generated_at: baseDate.toISOString(),
    sessions: sessions
  };
  
  // 既存の quiz_log_dummy.json を読み込む
  const filePath = path.join(__dirname, '..', 'students', 'quiz_log_dummy.json');
  let existingData = {};
  
  try {
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      console.warn(`警告: ${filePath} が見つかりません。新規作成します。`);
      existingData = {
        dataset_name: 'quiz_log_dummy',
        type: 'class',
        created_at: baseDate.toISOString(),
        logs: []
      };
    }
  } catch (e) {
    console.error(`エラー: ${filePath} のJSON解析に失敗しました: ${e.message}`);
    return null;
  }
  
  // vector_test_sessions を更新（既存の logs を保持）
  existingData.vector_test_sessions = vectorTestSessions;
  
  // ファイルに保存
  try {
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
  } catch (e) {
    console.error(`エラー: ファイルの書き込みに失敗しました: ${e.message}`);
    return null;
  }
  
  const totalLogs = sessions.reduce((sum, s) => sum + s.logs.length, 0);
  console.log(`\n✅ 完了: ${TOTAL_SESSIONS}セッション分のデータを生成しました`);
  console.log(`   総ログ数: ${totalLogs}件`);
  console.log(`   ファイル: ${filePath}`);
  
  return vectorTestSessions;
}

// Node.js環境で実行
if (require.main === module) {
  main();
}

module.exports = { main, generateSession, generateLog };

