#!/usr/bin/env node
/**
 * 依存関係解析スクリプト
 * 
 * No-code教材エディタ全体の依存関係（JS, HTML, 読み込み順, 関数呼び出し）を自動解析
 * 
 * 出力:
 * - analysis/dependencies.json: 全ファイルの依存グラフ
 * - analysis/dependency_map.html: 可視化された依存ツリー
 * - analysis/dependency_map.md: 人間可読の一覧性ある依存図
 */

const fs = require('fs');
const path = require('path');

// 解析結果を格納するオブジェクト
const analysis = {
    files: {},           // ファイルごとの情報
    dependencies: [],    // 依存関係のリスト
    functions: {},      // 関数定義のマップ
    windowExports: {},  // window への export
    callGraph: {},      // 関数呼び出しグラフ
    loadOrder: {},      // HTML からの読み込み順序
    circularDeps: []    // 循環依存
};

// 除外パス
const EXCLUDE_PATTERNS = [
    'node_modules',
    'archive',
    'legacy',
    '.git'
];

/**
 * パスが除外対象かどうかをチェック
 */
function shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * ディレクトリを再帰的に探索
 */
function walkDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (shouldExclude(filePath)) {
            continue;
        }
        
        if (stat.isDirectory()) {
            walkDirectory(filePath, fileList);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

/**
 * HTMLファイルからscriptタグを抽出
 */
function extractScriptsFromHTML(htmlPath, content) {
    const scripts = [];
    const scriptRegex = /<script\s+src=["']([^"']+)["']/gi;
    let match;
    
    while ((match = scriptRegex.exec(content)) !== null) {
        const scriptSrc = match[1];
        // 相対パスを絶対パスに変換
        const scriptPath = path.resolve(path.dirname(htmlPath), scriptSrc);
        scripts.push({
            src: scriptSrc,
            path: scriptPath,
            exists: fs.existsSync(scriptPath)
        });
    }
    
    return scripts;
}

/**
 * JavaScriptファイルから関数定義を抽出
 */
function extractFunctions(jsPath, content) {
    const functions = [];
    
    // function 宣言
    const functionDeclRegex = /function\s+(\w+)\s*\(/g;
    let match;
    while ((match = functionDeclRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            type: 'function',
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // 関数式（const/let/var functionName = function）
    const functionExprRegex = /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(/g;
    while ((match = functionExprRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            type: 'function_expression',
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // アロー関数（const/let/var functionName = () =>）
    const arrowFuncRegex = /(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
    while ((match = arrowFuncRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            type: 'arrow_function',
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // window への export
    const windowExportRegex = /window\.(\w+)\s*=\s*(?:function|\(|async\s+function)/g;
    while ((match = windowExportRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            type: 'window_export',
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    // window への代入
    const windowAssignRegex = /window\.(\w+)\s*=\s*(\w+)/g;
    while ((match = windowAssignRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            type: 'window_assign',
            assignedTo: match[2],
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    return functions;
}

/**
 * JavaScriptファイルからwindow名前空間を抽出
 */
function extractWindowExports(jsPath, content) {
    const exports = [];
    
    // window.xxx = ...
    const windowExportRegex = /window\.(\w+)\s*=/g;
    let match;
    while ((match = windowExportRegex.exec(content)) !== null) {
        exports.push({
            name: match[1],
            line: content.substring(0, match.index).split('\n').length
        });
    }
    
    return exports;
}

/**
 * JavaScriptファイルから関数呼び出しを抽出
 */
function extractFunctionCalls(jsPath, content) {
    const calls = [];
    
    // 関数呼び出しパターン: functionName(, functionName.method(, object.method(
    const callRegex = /(\w+(?:\.\w+)*)\s*\(/g;
    let match;
    while ((match = callRegex.exec(content)) !== null) {
        const callName = match[1];
        // キーワードや予約語を除外
        if (!['if', 'for', 'while', 'switch', 'catch', 'typeof', 'instanceof'].includes(callName.split('.')[0])) {
            calls.push({
                name: callName,
                line: content.substring(0, match.index).split('\n').length
            });
        }
    }
    
    return calls;
}

/**
 * HTMLファイルを解析
 */
function analyzeHTML(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const scripts = extractScriptsFromHTML(filePath, content);
    
    analysis.files[filePath] = {
        type: 'html',
        scripts: scripts,
        scriptCount: scripts.length
    };
    
    // 読み込み順序を記録
    analysis.loadOrder[filePath] = scripts.map(s => s.path);
    
    return scripts;
}

/**
 * JavaScriptファイルを解析
 */
function analyzeJS(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const functions = extractFunctions(filePath, content);
    const windowExports = extractWindowExports(filePath, content);
    const calls = extractFunctionCalls(filePath, content);
    
    analysis.files[filePath] = {
        type: 'javascript',
        functions: functions,
        windowExports: windowExports,
        calls: calls,
        functionCount: functions.length,
        exportCount: windowExports.length,
        callCount: calls.length
    };
    
    // 関数定義をマップに追加
    functions.forEach(func => {
        if (!analysis.functions[func.name]) {
            analysis.functions[func.name] = [];
        }
        analysis.functions[func.name].push({
            file: filePath,
            type: func.type,
            line: func.line
        });
    });
    
    // window exports をマップに追加
    windowExports.forEach(exp => {
        if (!analysis.windowExports[exp.name]) {
            analysis.windowExports[exp.name] = [];
        }
        analysis.windowExports[exp.name].push({
            file: filePath,
            line: exp.line
        });
    });
    
    // 関数呼び出しグラフを構築
    calls.forEach(call => {
        const callName = call.name.split('.')[0]; // 最初の部分のみ
        if (!analysis.callGraph[callName]) {
            analysis.callGraph[callName] = [];
        }
        analysis.callGraph[callName].push({
            file: filePath,
            line: call.line
        });
    });
}

/**
 * 依存関係を構築
 */
function buildDependencies() {
    // HTML から JS への依存
    Object.keys(analysis.loadOrder).forEach(htmlPath => {
        analysis.loadOrder[htmlPath].forEach(jsPath => {
            if (fs.existsSync(jsPath)) {
                analysis.dependencies.push({
                    from: htmlPath,
                    to: jsPath,
                    type: 'script_load'
                });
            }
        });
    });
    
    // JS ファイル間の依存（require, import など）
    Object.keys(analysis.files).forEach(filePath => {
        if (analysis.files[filePath].type === 'javascript') {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // require() の抽出
            const requireRegex = /require\(["']([^"']+)["']\)/g;
            let match;
            while ((match = requireRegex.exec(content)) !== null) {
                const requiredPath = match[1];
                const resolvedPath = resolveModulePath(filePath, requiredPath);
                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    analysis.dependencies.push({
                        from: filePath,
                        to: resolvedPath,
                        type: 'require'
                    });
                }
            }
            
            // import の抽出
            const importRegex = /import\s+.*from\s+["']([^"']+)["']/g;
            while ((match = importRegex.exec(content)) !== null) {
                const importedPath = match[1];
                const resolvedPath = resolveModulePath(filePath, importedPath);
                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    analysis.dependencies.push({
                        from: filePath,
                        to: resolvedPath,
                        type: 'import'
                    });
                }
            }
        }
    });
}

/**
 * モジュールパスを解決
 */
function resolveModulePath(fromPath, modulePath) {
    // 相対パスの場合
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        return path.resolve(path.dirname(fromPath), modulePath);
    }
    
    // 絶対パスの場合
    if (path.isAbsolute(modulePath)) {
        return modulePath;
    }
    
    // node_modules の場合（簡易実装）
    if (!modulePath.startsWith('.')) {
        const nodeModulesPath = path.resolve(path.dirname(fromPath), 'node_modules', modulePath);
        if (fs.existsSync(nodeModulesPath)) {
            return nodeModulesPath;
        }
    }
    
    return null;
}

/**
 * 循環依存を検出
 */
function detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    
    function dfs(node, path) {
        if (recursionStack.has(node)) {
            // 循環依存を発見
            const cycleStart = path.indexOf(node);
            const cycle = path.slice(cycleStart).concat(node);
            analysis.circularDeps.push(cycle);
            return;
        }
        
        if (visited.has(node)) {
            return;
        }
        
        visited.add(node);
        recursionStack.add(node);
        
        // このノードから出る依存関係を探索
        analysis.dependencies.forEach(dep => {
            if (dep.from === node) {
                dfs(dep.to, path.concat(node));
            }
        });
        
        recursionStack.delete(node);
    }
    
    // すべてのノードからDFSを開始
    const allNodes = new Set();
    analysis.dependencies.forEach(dep => {
        allNodes.add(dep.from);
        allNodes.add(dep.to);
    });
    
    allNodes.forEach(node => {
        if (!visited.has(node)) {
            dfs(node, []);
        }
    });
}

/**
 * JSON形式で出力
 */
function outputJSON() {
    const output = {
        summary: {
            totalFiles: Object.keys(analysis.files).length,
            htmlFiles: Object.keys(analysis.files).filter(f => analysis.files[f].type === 'html').length,
            jsFiles: Object.keys(analysis.files).filter(f => analysis.files[f].type === 'javascript').length,
            totalFunctions: Object.keys(analysis.functions).length,
            totalWindowExports: Object.keys(analysis.windowExports).length,
            totalDependencies: analysis.dependencies.length,
            circularDependencies: analysis.circularDeps.length
        },
        files: analysis.files,
        dependencies: analysis.dependencies,
        functions: analysis.functions,
        windowExports: analysis.windowExports,
        callGraph: analysis.callGraph,
        loadOrder: analysis.loadOrder,
        circularDependencies: analysis.circularDeps
    };
    
    const outputPath = path.join(__dirname, '..', 'analysis', 'dependencies.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✓ JSON output: ${outputPath}`);
}

/**
 * Markdown形式で出力
 */
function outputMarkdown() {
    let md = '# 依存関係マップ\n\n';
    
    md += '## サマリー\n\n';
    md += `- 総ファイル数: ${Object.keys(analysis.files).length}\n`;
    md += `- HTMLファイル: ${Object.keys(analysis.files).filter(f => analysis.files[f].type === 'html').length}\n`;
    md += `- JavaScriptファイル: ${Object.keys(analysis.files).filter(f => analysis.files[f].type === 'javascript').length}\n`;
    md += `- 関数定義数: ${Object.keys(analysis.functions).length}\n`;
    md += `- window exports: ${Object.keys(analysis.windowExports).length}\n`;
    md += `- 依存関係数: ${analysis.dependencies.length}\n`;
    md += `- 循環依存: ${analysis.circularDeps.length}\n\n`;
    
    md += '## HTML ファイルと読み込み順序\n\n';
    Object.keys(analysis.loadOrder).forEach(htmlPath => {
        md += `### ${path.relative(process.cwd(), htmlPath)}\n\n`;
        md += '読み込み順序:\n';
        analysis.loadOrder[htmlPath].forEach((scriptPath, index) => {
            const exists = fs.existsSync(scriptPath) ? '✓' : '✗';
            md += `${index + 1}. ${exists} ${path.relative(process.cwd(), scriptPath)}\n`;
        });
        md += '\n';
    });
    
    md += '## window 名前空間\n\n';
    Object.keys(analysis.windowExports).sort().forEach(name => {
        md += `### window.${name}\n\n`;
        analysis.windowExports[name].forEach(exp => {
            md += `- 定義: ${path.relative(process.cwd(), exp.file)}:${exp.line}\n`;
        });
        md += '\n';
    });
    
    md += '## 関数定義一覧\n\n';
    Object.keys(analysis.functions).sort().forEach(funcName => {
        md += `### ${funcName}\n\n`;
        analysis.functions[funcName].forEach(func => {
            md += `- 定義: ${path.relative(process.cwd(), func.file)}:${func.line} (${func.type})\n`;
        });
        
        // 呼び出し元
        if (analysis.callGraph[funcName]) {
            md += '  呼び出し元:\n';
            analysis.callGraph[funcName].forEach(call => {
                md += `  - ${path.relative(process.cwd(), call.file)}:${call.line}\n`;
            });
        }
        md += '\n';
    });
    
    md += '## 依存関係グラフ\n\n';
    const depsByType = {};
    analysis.dependencies.forEach(dep => {
        if (!depsByType[dep.type]) {
            depsByType[dep.type] = [];
        }
        depsByType[dep.type].push(dep);
    });
    
    Object.keys(depsByType).forEach(type => {
        md += `### ${type}\n\n`;
        depsByType[type].forEach(dep => {
            md += `- ${path.relative(process.cwd(), dep.from)} → ${path.relative(process.cwd(), dep.to)}\n`;
        });
        md += '\n';
    });
    
    if (analysis.circularDeps.length > 0) {
        md += '## 循環依存\n\n';
        analysis.circularDeps.forEach((cycle, index) => {
            md += `### 循環依存 ${index + 1}\n\n`;
            cycle.forEach(node => {
                md += `- ${path.relative(process.cwd(), node)}\n`;
            });
            md += '\n';
        });
    }
    
    const outputPath = path.join(__dirname, '..', 'analysis', 'dependency_map.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`✓ Markdown output: ${outputPath}`);
}

/**
 * HTML形式で出力（可視化）
 */
function outputHTML() {
    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>依存関係マップ</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2d3748;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #4a5568;
            margin-top: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .summary-card {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
            font-size: 0.9em;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .mermaid {
            margin: 20px 0;
            background: white;
            padding: 20px;
            border-radius: 8px;
        }
        .file-list {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
        .file-list ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .circular {
            color: #e53e3e;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 依存関係マップ</h1>
        
        <div class="summary">
            <div class="summary-card">
                <h3>総ファイル数</h3>
                <div class="value">${Object.keys(analysis.files).length}</div>
            </div>
            <div class="summary-card">
                <h3>HTMLファイル</h3>
                <div class="value">${Object.keys(analysis.files).filter(f => analysis.files[f].type === 'html').length}</div>
            </div>
            <div class="summary-card">
                <h3>JavaScriptファイル</h3>
                <div class="value">${Object.keys(analysis.files).filter(f => analysis.files[f].type === 'javascript').length}</div>
            </div>
            <div class="summary-card">
                <h3>関数定義数</h3>
                <div class="value">${Object.keys(analysis.functions).length}</div>
            </div>
            <div class="summary-card">
                <h3>window exports</h3>
                <div class="value">${Object.keys(analysis.windowExports).length}</div>
            </div>
            <div class="summary-card">
                <h3>依存関係数</h3>
                <div class="value">${analysis.dependencies.length}</div>
            </div>
            <div class="summary-card">
                <h3>循環依存</h3>
                <div class="value ${analysis.circularDeps.length > 0 ? 'circular' : ''}">${analysis.circularDeps.length}</div>
            </div>
        </div>
        
        <h2>依存関係グラフ</h2>
        <div class="mermaid">
graph TD
`;
    
    // 依存関係をMermaid形式で出力
    const nodeMap = new Map();
    let nodeId = 0;
    
    analysis.dependencies.forEach(dep => {
        const fromId = getNodeId(dep.from, nodeMap, nodeId);
        if (fromId.new) nodeId++;
        const toId = getNodeId(dep.to, nodeMap, nodeId);
        if (toId.new) nodeId++;
        
        const fromLabel = path.basename(dep.from);
        const toLabel = path.basename(dep.to);
        html += `    ${fromId.id}["${fromLabel}"] --> ${toId.id}["${toLabel}"]\n`;
    });
    
    html += `</div>
        
        <h2>window 名前空間</h2>
        <div class="file-list">
            <ul>
`;
    
    Object.keys(analysis.windowExports).sort().forEach(name => {
        html += `                <li><strong>window.${name}</strong> - `;
        analysis.windowExports[name].forEach((exp, index) => {
            if (index > 0) html += ', ';
            html += `${path.basename(exp.file)}:${exp.line}`;
        });
        html += `</li>\n`;
    });
    
    html += `            </ul>
        </div>
        
        <h2>関数定義一覧</h2>
        <div class="file-list">
            <ul>
`;
    
    Object.keys(analysis.functions).sort().slice(0, 50).forEach(funcName => {
        html += `                <li><strong>${funcName}</strong> - `;
        analysis.functions[funcName].forEach((func, index) => {
            if (index > 0) html += ', ';
            html += `${path.basename(func.file)}:${func.line}`;
        });
        html += `</li>\n`;
    });
    
    html += `            </ul>
            <p><em>（最初の50件のみ表示）</em></p>
        </div>
`;
    
    if (analysis.circularDeps.length > 0) {
        html += `
        <h2 class="circular">⚠️ 循環依存</h2>
        <div class="file-list">
`;
        analysis.circularDeps.forEach((cycle, index) => {
            html += `            <h3>循環依存 ${index + 1}</h3>
            <ul>
`;
            cycle.forEach(node => {
                html += `                <li>${path.relative(process.cwd(), node)}</li>\n`;
            });
            html += `            </ul>
`;
        });
        html += `        </div>
`;
    }
    
    html += `    </div>
    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>`;
    
    const outputPath = path.join(__dirname, '..', 'analysis', 'dependency_map.html');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✓ HTML output: ${outputPath}`);
}

/**
 * ノードIDを取得（Mermaid用）
 */
function getNodeId(filePath, nodeMap, currentId) {
    if (nodeMap.has(filePath)) {
        return { id: nodeMap.get(filePath), new: false };
    }
    const id = `N${currentId}`;
    nodeMap.set(filePath, id);
    return { id: id, new: true };
}

/**
 * メイン処理
 */
function main() {
    console.log('🔍 依存関係解析を開始...\n');
    
    const projectRoot = path.join(__dirname, '..');
    const files = walkDirectory(projectRoot);
    
    console.log(`📁 ${files.length} ファイルを発見\n`);
    
    // 各ファイルを解析
    files.forEach(filePath => {
        try {
            if (filePath.endsWith('.html')) {
                analyzeHTML(filePath);
            } else if (filePath.endsWith('.js')) {
                analyzeJS(filePath);
            }
        } catch (error) {
            console.error(`⚠️  エラー: ${filePath} - ${error.message}`);
        }
    });
    
    console.log('📊 依存関係を構築中...\n');
    buildDependencies();
    
    console.log('🔄 循環依存を検出中...\n');
    detectCircularDependencies();
    
    console.log('💾 結果を出力中...\n');
    outputJSON();
    outputMarkdown();
    outputHTML();
    
    console.log('\n✅ 解析完了！');
    console.log(`\n📈 サマリー:`);
    console.log(`   - 総ファイル数: ${Object.keys(analysis.files).length}`);
    console.log(`   - 関数定義数: ${Object.keys(analysis.functions).length}`);
    console.log(`   - window exports: ${Object.keys(analysis.windowExports).length}`);
    console.log(`   - 依存関係数: ${analysis.dependencies.length}`);
    console.log(`   - 循環依存: ${analysis.circularDeps.length}`);
}

// スクリプト実行
if (require.main === module) {
    main();
}

module.exports = { main, analysis };

