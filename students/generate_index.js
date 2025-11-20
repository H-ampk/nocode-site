/**
 * GenerateIndex - students フォルダ内の JSON ファイルから index.json を自動生成
 * 
 * Node.js版: /students 内の全ての *.json をスキャンし、その情報から index.json を完全再構築する
 */

const fs = require("fs");
const path = require("path");

const dir = "./students";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json");

const index = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return {
        id: data.user_id || data.dataset_name || f.replace(".json", ""),
        session_id: data.session_id || null,
        file: f,
        last_update: data.generated_at || data.created_at || new Date().toISOString()
    };
});

fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify({ students: index }, null, 2));
console.log("index.json updated.");
