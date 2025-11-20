/**
 * Merge Student Logs - 複数の生徒ログファイルを統合する
 * 
 * 使用方法:
 *   node scripts/merge_student_logs.js file1.json file2.json file3.json ...
 * 
 * 出力:
 *   merged_student_log.json
 */

const fs = require("fs");
const path = require("path");

function mergeLogs(files) {
    const sessions = [];
    let user_id = null;

    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.warn(`ファイルが見つかりません: ${file}`);
            continue;
        }
        
        try {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            
            if (!user_id) {
                user_id = data.user_id || "merged_user";
            }
            
            // multi-session 構造の場合
            if (data.sessions && Array.isArray(data.sessions)) {
                sessions.push(...data.sessions);
            }
            // 単一セッション構造の場合
            else if (data.logs && Array.isArray(data.logs)) {
                sessions.push({
                    session_id: data.session_id || ("import_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)),
                    generated_at: data.generated_at || new Date().toISOString(),
                    logs: data.logs
                });
            }
            // 配列形式の場合
            else if (Array.isArray(data)) {
                sessions.push({
                    session_id: "import_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                    generated_at: new Date().toISOString(),
                    logs: data
                });
            }
        } catch (e) {
            console.error(`ファイルの読み込みに失敗しました: ${file}`, e.message);
        }
    }

    return { user_id, sessions };
}

// コマンドライン引数を取得
const input = process.argv.slice(2);

if (input.length === 0) {
    console.error("使用方法: node scripts/merge_student_logs.js file1.json file2.json ...");
    process.exit(1);
}

// ログをマージ
const result = mergeLogs(input);

if (!result || result.sessions.length === 0) {
    console.error("エラー: マージできるセッションが見つかりませんでした。");
    process.exit(1);
}

// 出力ファイルに書き込み
const outputFile = path.join(process.cwd(), "merged_student_log.json");
try {
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
} catch (e) {
    console.error(`エラー: ファイルの書き込みに失敗しました: ${e.message}`);
    process.exit(1);
}

console.log(`✅ ${input.length}個のファイルをマージしました`);
console.log(`   セッション数: ${result.sessions.length}`);
console.log(`   ユーザーID: ${result.user_id}`);
console.log(`   出力ファイル: ${outputFile}`);

