/**
 * projects/index.json を自動生成するスクリプト
 * 
 * 使用方法: node projects/generate_index.js
 */

const fs = require("fs");
const path = require("path");

const base = __dirname;
const all = fs.readdirSync(base).filter(name => {
  const full = path.join(base, name);
  return fs.statSync(full).isDirectory();
});

const filtered = all.filter(name => !name.startsWith("_"));

// index.json の形式: { projects: [{ id: "folder_name" }] }
const indexData = {
  projects: filtered.map(id => ({ id }))
};

fs.writeFileSync(
  path.join(base, "index.json"),
  JSON.stringify(indexData, null, 2) + "\n"
);

console.log("✅ projects/index.json を生成しました:");
console.log("   プロジェクト数:", filtered.length);
console.log("   プロジェクトID:", filtered.join(", "));
