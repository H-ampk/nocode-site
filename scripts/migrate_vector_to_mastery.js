/**
 * migrate_vector_to_mastery.js
 * 
 * 既存のベクトル設定を理解階層モデルに移行するスクリプト
 * 
 * 使用方法:
 *   node scripts/migrate_vector_to_mastery.js [projectId]
 * 
 * 機能:
 *   - projects/*/quiz.json を走査
 *   - 各 question から vector/axes 関連プロパティを削除
 *   - measure が存在しない場合は [] を追加
 *   - options に correct / misconception がなければ default を挿入
 *   - バックアップを projects/[projectId]/backup に自動保存
 */

const fs = require('fs');
const path = require('path');

// 理解階層の定義
const MASTERY_LEVELS = ['識別', '説明', '適用', '区別', '転移', '構造化'];

/**
 * プロジェクトの quiz.json を移行
 * @param {string} projectId - プロジェクトID
 */
function migrateProject(projectId) {
  const quizPath = path.join(__dirname, '..', 'projects', projectId, 'quiz.json');
  const backupDir = path.join(__dirname, '..', 'projects', projectId, 'backup');
  const backupPath = path.join(backupDir, `quiz.json.backup.${Date.now()}`);

  // quiz.json が存在するか確認
  if (!fs.existsSync(quizPath)) {
    console.log(`⚠️  ${projectId}: quiz.json が見つかりません。スキップします。`);
    return false;
  }

  try {
    // quiz.json を読み込む
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));

    // バックアップディレクトリを作成
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // バックアップを保存
    fs.writeFileSync(backupPath, JSON.stringify(quizData, null, 2), 'utf8');
    console.log(`📦 ${projectId}: バックアップを保存しました: ${backupPath}`);

    let modified = false;

    // questions を処理
    if (Array.isArray(quizData.questions)) {
      quizData.questions.forEach(function(question) {
        // ベクトル関連プロパティを削除
        if (question.vector) {
          delete question.vector;
          modified = true;
        }
        if (question.vector_scores) {
          delete question.vector_scores;
          modified = true;
        }
        if (question.axes) {
          delete question.axes;
          modified = true;
        }
        if (question.ideal_vector) {
          delete question.ideal_vector;
          modified = true;
        }

        // measure が存在しない場合は空配列を追加
        if (!question.measure) {
          question.measure = [];
          modified = true;
        } else if (!Array.isArray(question.measure)) {
          // measure が配列でない場合は空配列に変換
          question.measure = [];
          modified = true;
        }

        // choices/options を処理
        const choices = question.choices || question.options || [];
        choices.forEach(function(choice) {
          // ベクトル関連プロパティを削除
          if (choice.vector) {
            delete choice.vector;
            modified = true;
          }

          // correct が存在しない場合は false を設定
          if (typeof choice.correct === 'undefined') {
            // 既存の isCorrect から変換
            if (typeof choice.isCorrect !== 'undefined') {
              choice.correct = Boolean(choice.isCorrect);
            } else {
              choice.correct = false;
            }
            modified = true;
          }

          // misconception が存在しない場合は null を設定
          if (typeof choice.misconception === 'undefined') {
            choice.misconception = null;
            modified = true;
          } else if (choice.misconception === '') {
            // 空文字列の場合は null に変換
            choice.misconception = null;
            modified = true;
          }
        });
      });
    }

    // 変更があった場合のみ保存
    if (modified) {
      fs.writeFileSync(quizPath, JSON.stringify(quizData, null, 2), 'utf8');
      console.log(`✅ ${projectId}: 移行が完了しました。`);
      return true;
    } else {
      console.log(`ℹ️  ${projectId}: 変更はありませんでした。`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${projectId}: エラーが発生しました:`, error.message);
    return false;
  }
}

/**
 * すべてのプロジェクトを移行
 */
function migrateAll() {
  const projectsDir = path.join(__dirname, '..', 'projects');

  if (!fs.existsSync(projectsDir)) {
    console.error('❌ projects ディレクトリが見つかりません。');
    process.exit(1);
  }

  const projectIds = fs.readdirSync(projectsDir).filter(function(item) {
    const itemPath = path.join(projectsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  if (projectIds.length === 0) {
    console.log('⚠️  プロジェクトが見つかりませんでした。');
    return;
  }

  console.log(`📋 ${projectIds.length} 個のプロジェクトを移行します...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  projectIds.forEach(function(projectId) {
    const result = migrateProject(projectId);
    if (result === true) {
      successCount++;
    } else if (result === false) {
      skipCount++;
    } else {
      errorCount++;
    }
  });

  console.log('\n📊 移行結果:');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ℹ️  スキップ: ${skipCount}`);
  console.log(`  ❌ エラー: ${errorCount}`);
}

// メイン処理
const projectId = process.argv[2];

if (projectId) {
  // 特定のプロジェクトを移行
  migrateProject(projectId);
} else {
  // すべてのプロジェクトを移行
  migrateAll();
}


