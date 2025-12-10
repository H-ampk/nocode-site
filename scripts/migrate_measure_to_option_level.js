/**
 * 移行スクリプト: 問題レベルの measure を選択肢レベルの measure に移行
 * 
 * 使用方法:
 *   node scripts/migrate_measure_to_option_level.js
 * 
 * 処理内容:
 *   1. projects/*/quiz.json を走査
 *   2. 旧 question.measure が存在したら、正解選択肢にその measure を移行
 *   3. すべての選択肢に measure 配列を初期化（存在しない場合）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..", "projects");

function migrate() {
  console.log("🔄 measure 移行スクリプトを開始します...");
  console.log("📁 プロジェクトディレクトリ:", root);

  if (!fs.existsSync(root)) {
    console.error("❌ プロジェクトディレクトリが見つかりません:", root);
    return;
  }

  const dirs = fs.readdirSync(root).filter(function(f) {
    const fullPath = path.join(root, f);
    return fs.lstatSync(fullPath).isDirectory();
  });

  if (dirs.length === 0) {
    console.log("⚠️  プロジェクトが見つかりませんでした");
    return;
  }

  console.log(`📦 ${dirs.length} 個のプロジェクトを処理します\n`);

  var migratedCount = 0;
  var errorCount = 0;

  dirs.forEach(function(project) {
    const quizFile = path.join(root, project, "quiz.json");
    
    if (!fs.existsSync(quizFile)) {
      console.log(`⏭️  ${project}: quiz.json が見つかりません（スキップ）`);
      return;
    }

    try {
      console.log(`📝 ${project} を処理中...`);
      
      const data = JSON.parse(fs.readFileSync(quizFile, "utf-8"));
      var hasChanges = false;

      if (!data.questions || !Array.isArray(data.questions)) {
        console.log(`   ⚠️  questions が存在しません（スキップ）`);
        return;
      }

      data.questions.forEach(function(q) {
        // 旧 question.measure が存在する場合
        if (q.measure && Array.isArray(q.measure) && q.measure.length > 0) {
          console.log(`   🔄 問題 "${q.id || q.title || '無題'}" の measure を選択肢に移行...`);
          
          // 正解選択肢に measure を移行
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach(function(opt) {
              if (opt.correct === true || opt.isCorrect === true) {
                opt.measure = [...q.measure];
                console.log(`      ✅ 正解選択肢 "${opt.id || opt.text || '選択肢'}" に measure を設定`);
              }
              // すべての選択肢に measure 配列を初期化
              if (!Array.isArray(opt.measure)) {
                opt.measure = [];
              }
            });
          } else if (q.choices && Array.isArray(q.choices)) {
            q.choices.forEach(function(choice) {
              if (choice.correct === true || choice.isCorrect === true) {
                choice.measure = [...q.measure];
                console.log(`      ✅ 正解選択肢 "${choice.id || choice.text || '選択肢'}" に measure を設定`);
              }
              // すべての選択肢に measure 配列を初期化
              if (!Array.isArray(choice.measure)) {
                choice.measure = [];
              }
            });
          }
          
          // 旧 question.measure を削除
          delete q.measure;
          hasChanges = true;
        } else {
          // measure が存在しない場合でも、選択肢に measure 配列を初期化
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach(function(opt) {
              if (!Array.isArray(opt.measure)) {
                opt.measure = [];
              }
            });
            hasChanges = true;
          } else if (q.choices && Array.isArray(q.choices)) {
            q.choices.forEach(function(choice) {
              if (!Array.isArray(choice.measure)) {
                choice.measure = [];
              }
            });
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        // バックアップを作成
        const backupFile = path.join(root, project, "quiz.json.backup");
        if (!fs.existsSync(backupFile)) {
          fs.copyFileSync(quizFile, backupFile);
          console.log(`   💾 バックアップを作成: quiz.json.backup`);
        }

        // quiz.json を保存
        fs.writeFileSync(quizFile, JSON.stringify(data, null, 2), "utf-8");
        console.log(`   ✅ ${project} の移行が完了しました\n`);
        migratedCount++;
      } else {
        console.log(`   ℹ️  変更はありませんでした\n`);
      }
    } catch (error) {
      console.error(`   ❌ ${project} の処理中にエラーが発生しました:`, error.message);
      errorCount++;
    }
  });

  console.log("\n" + "=".repeat(50));
  console.log("📊 移行結果:");
  console.log(`   ✅ 移行完了: ${migratedCount} プロジェクト`);
  console.log(`   ❌ エラー: ${errorCount} プロジェクト`);
  console.log("=".repeat(50));
}

// スクリプト実行
migrate();


