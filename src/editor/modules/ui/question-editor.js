/**
 * 質問エディタUI
 * 
 * 通常の質問ノードの編集UIを表示する関数を提供します
 */

import { getGameData, setGameData } from '../core/state.js';
import { escapeHtml } from '../utils/data.js';

// 診断質問エディタをインポート（循環参照を避けるため条件付き）
let showDiagnosticQuestionEditor = null;
if (typeof window !== 'undefined' && typeof window.showDiagnosticQuestionEditor === 'function') {
    showDiagnosticQuestionEditor = window.showDiagnosticQuestionEditor;
}

/**
 * 質問エディタを表示
 * @param {Object} question - 質問オブジェクト
 */
export function showQuestionEditor(question) {
    // 診断質問の場合は診断エディタへ
    if (question.type === 'diagnostic_question') {
        if (typeof window.showDiagnosticQuestionEditor === 'function') {
            window.showDiagnosticQuestionEditor(question);
        }
        return;
    }
    
    const gameData = getGameData();
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;
    
    editorContent.innerHTML = `
        <div class="form-group" style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
            <h3 style="color: #2d3748; margin-bottom: 15px; font-size: 1.2rem;">📋 プロジェクト情報</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">サムネイル画像:</label>
                <input type="file" id="thumbnail-input" accept="image/*" style="margin-bottom: 10px;" />
                <img id="thumbnail-preview" style="max-width:200px; max-height:150px; margin-top:10px; display:none; border-radius:8px; border:2px solid #e2e8f0;" />
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">カテゴリ:</label>
                <input type="text" id="project-category" value="${escapeHtml(gameData.category || "")}" 
                       placeholder="例: 数学、英語、歴史" 
                       style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;"
                       onchange="(function(){ const gd = window.getGameData(); gd.category = this.value; window.setGameData(gd); })()" />
            </div>
            
            <div class="tag-editor" style="margin-bottom: 20px;">
                <h3 style="color: #2d3748; margin-bottom: 10px; font-size: 1.1rem;">🏷️ タグ</h3>
                <div id="tag-list" class="tag-list"></div>
                <input id="tag-input" placeholder="タグを入力し Enter で追加" 
                       style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; margin-top: 8px;" />
            </div>
        </div>
        
        <div class="form-group">
            <label>タイトル</label>
            <input type="text" id="questionTitle" value="${escapeHtml(question.title)}" 
                   onchange="updateQuestionProperty('${question.id}', 'title', this.value)">
        </div>
        
        <div class="form-group">
            <label>質問文</label>
            <textarea id="questionText" 
                      onchange="updateQuestionProperty('${question.id}', 'text', this.value)">${escapeHtml(question.text)}</textarea>
        </div>
        
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="enableGrading" ${question.enableGrading ? 'checked' : ''} onchange="toggleGrading('${question.id}', this.checked)">
                正誤判定を有効にする
            </label>
            <small style="color: #718096;">正解・不正解のフィードバックと正解管理ができるようになります。</small>
        </div>
        
        <div class="form-group" style="border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <h2 style="color: #2d3748; margin-bottom: 10px; font-size: 1.2rem;">🧩 理解分析（ベクトル設定）</h2>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 15px;">この質問が生徒の理解傾向に与える影響を設定します。Glossaryから評価軸を自動取得します。</p>
            <div id="vectorSettingArea"></div>
            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px; font-size: 0.9em; color: #555;">
                <strong>詳細表示（JSON）:</strong>
                <pre id="vectorSettingJson" style="margin-top: 8px; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85em; max-height: 200px; overflow-y: auto;"></pre>
            </div>
        </div>
        
        <div class="form-group" style="border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <h3 style="color: #2d3748; margin-bottom: 15px;">🎨 デザイン設定</h3>
            
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">背景の種類</label>
                <select id="backgroundType" onchange="updateQuestionStyle('${question.id}')" 
                        style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                    <option value="color" ${(question.backgroundType || 'color') === 'color' ? 'selected' : ''}>単色</option>
                    <option value="image" ${question.backgroundType === 'image' ? 'selected' : ''}>画像</option>
                    <option value="gradient" ${question.backgroundType === 'gradient' ? 'selected' : ''}>グラデーション</option>
                </select>
            </div>
            
            <div id="backgroundColorGroup" style="display: ${(question.backgroundType || 'color') === 'color' ? 'block' : 'none'}; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">背景色</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="color" id="backgroundColor" value="${question.backgroundColor || '#ffffff'}" 
                           onchange="document.getElementById('backgroundColorText').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="backgroundColorText" value="${question.backgroundColor || '#ffffff'}" 
                           onchange="document.getElementById('backgroundColor').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
            </div>
            
            <div id="backgroundImageGroup" style="display: ${question.backgroundType === 'image' ? 'block' : 'none'}; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">背景画像</label>
                
                <div style="margin-bottom: 15px; padding: 15px; background: #f7fafc; border-radius: 8px; border: 2px dashed #cbd5e0;">
                    <label style="font-weight: 600; margin-bottom: 10px; display: block; font-size: 0.9em;">📁 画像を追加</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button type="button" onclick="document.getElementById('imageFileInput').click()" 
                                style="flex: 1; padding: 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                            📂 ファイルを選択
                        </button>
                        <input type="file" id="imageFileInput" accept="image/*" multiple 
                               style="display: none;" onchange="handleImageFiles(event, '${question.id}')">
                    </div>
                    <div id="imageDropZone" 
                         style="padding: 20px; text-align: center; border: 2px dashed #cbd5e0; border-radius: 5px; background: white; cursor: pointer; transition: all 0.3s;"
                         ondrop="handleImageDrop(event, '${question.id}')" 
                         ondragover="event.preventDefault(); event.currentTarget.style.borderColor='#667eea'; event.currentTarget.style.background='#edf2f7';" 
                         ondragleave="event.currentTarget.style.borderColor='#cbd5e0'; event.currentTarget.style.background='white';">
                        <div style="color: #718096; font-size: 0.9em;">
                            🖼️ 画像をここにドラッグ&ドロップ<br>
                            <small>またはクリックしてファイルを選択</small>
                        </div>
                    </div>
                    <small style="color: #718096; display: block; margin-top: 8px;">JPEG、PNG、GIF形式の画像に対応</small>
                </div>
                
                <select id="backgroundImage" onchange="updateBackgroundImagePreview('${question.id}')" 
                        style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; margin-bottom: 10px;">
                    <option value="">画像を選択...</option>
                    <option value="data/game_back_forest.jpg" ${question.backgroundImage === 'data/game_back_forest.jpg' ? 'selected' : ''}>森の背景</option>
                    <option value="data/game_back_mountain.jpg" ${question.backgroundImage === 'data/game_back_mountain.jpg' ? 'selected' : ''}>山の背景</option>
                    <option value="data/game_back_space.jpg" ${question.backgroundImage === 'data/game_back_space.jpg' ? 'selected' : ''}>宇宙の背景</option>
                    <option value="data/game_back_stars.jpg" ${question.backgroundImage === 'data/game_back_stars.jpg' ? 'selected' : ''}>星空の背景</option>
                    ${typeof window.getCustomImageOptions === 'function' ? window.getCustomImageOptions(question.backgroundImage) : ''}
                </select>
                
                <div id="backgroundImagePreview" style="margin-top: 10px; ${question.backgroundImage ? '' : 'display: none;'}">
                    <label style="font-weight: 600; margin-bottom: 8px; display: block; font-size: 0.9em;">プレビュー:</label>
                    <img id="backgroundImagePreviewImg" 
                         src="${typeof window.getCustomImageUrl === 'function' ? window.getCustomImageUrl(question.backgroundImage || '') : (question.backgroundImage || '')}" 
                         alt="背景画像プレビュー"
                         style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                         onerror="this.style.display='none'; document.getElementById('backgroundImagePreview').style.display='none';">
                </div>
                <small style="color: #718096; display: block; margin-top: 5px;">dataフォルダ内の画像、または追加した画像を選択できます</small>
            </div>
            
            <div id="gradientGroup" style="display: ${question.backgroundType === 'gradient' ? 'block' : 'none'}; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">グラデーション色1</label>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                    <input type="color" id="gradientColor1" value="${question.gradientColor1 || '#667eea'}" 
                           onchange="document.getElementById('gradientColor1Text').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="gradientColor1Text" value="${question.gradientColor1 || '#667eea'}" 
                           onchange="document.getElementById('gradientColor1').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">グラデーション色2</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="color" id="gradientColor2" value="${question.gradientColor2 || '#764ba2'}" 
                           onchange="document.getElementById('gradientColor2Text').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="gradientColor2Text" value="${question.gradientColor2 || '#764ba2'}" 
                           onchange="document.getElementById('gradientColor2').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
            </div>
            
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">質問文のフォント</label>
                <select id="questionFont" onchange="updateQuestionStyle('${question.id}')" 
                        style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; margin-bottom: 10px;">
                    <option value="">デフォルト</option>
                    <option value="Arial, sans-serif" ${question.questionFont === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="メイリオ, Meiryo, sans-serif" ${question.questionFont === 'メイリオ, Meiryo, sans-serif' ? 'selected' : ''}>メイリオ</option>
                    <option value="游ゴシック, Yu Gothic, sans-serif" ${question.questionFont === '游ゴシック, Yu Gothic, sans-serif' ? 'selected' : ''}>游ゴシック</option>
                    <option value="MS ゴシック, MS Gothic, monospace" ${question.questionFont === 'MS ゴシック, MS Gothic, monospace' ? 'selected' : ''}>MS ゴシック</option>
                    <option value="Times New Roman, serif" ${question.questionFont === 'Times New Roman, serif' ? 'selected' : ''}>Times New Roman</option>
                </select>
                <label style="font-weight: 600; margin-bottom: 8px; display: block; margin-top: 10px;">フォントサイズ</label>
                <input type="range" id="questionFontSize" min="0.8" max="2.5" step="0.1" 
                       value="${parseFloat(question.questionFontSize || '1.3')}" 
                       oninput="document.getElementById('questionFontSizeValue').textContent = this.value + 'em'; updateQuestionStyle('${question.id}')"
                       style="width: 100%;">
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #718096; font-size: 0.9em;">0.8em</span>
                    <span id="questionFontSizeValue" style="color: #2d3748; font-weight: 600;">${question.questionFontSize || '1.3em'}</span>
                    <span style="color: #718096; font-size: 0.9em;">2.5em</span>
                </div>
                <label style="font-weight: 600; margin-bottom: 8px; display: block; margin-top: 10px;">文字色</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="color" id="questionTextColor" value="${question.questionTextColor || '#2d3748'}" 
                           onchange="document.getElementById('questionTextColorText').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="questionTextColorText" value="${question.questionTextColor || '#2d3748'}" 
                           onchange="document.getElementById('questionTextColor').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
            </div>
            
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">選択肢ボタンのフォント</label>
                <select id="choiceFont" onchange="updateQuestionStyle('${question.id}')" 
                        style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; margin-bottom: 10px;">
                    <option value="">デフォルト</option>
                    <option value="Arial, sans-serif" ${question.choiceFont === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="メイリオ, Meiryo, sans-serif" ${question.choiceFont === 'メイリオ, Meiryo, sans-serif' ? 'selected' : ''}>メイリオ</option>
                    <option value="游ゴシック, Yu Gothic, sans-serif" ${question.choiceFont === '游ゴシック, Yu Gothic, sans-serif' ? 'selected' : ''}>游ゴシック</option>
                    <option value="MS ゴシック, MS Gothic, monospace" ${question.choiceFont === 'MS ゴシック, MS Gothic, monospace' ? 'selected' : ''}>MS ゴシック</option>
                    <option value="Times New Roman, serif" ${question.choiceFont === 'Times New Roman, serif' ? 'selected' : ''}>Times New Roman</option>
                </select>
                <label style="font-weight: 600; margin-bottom: 8px; display: block; margin-top: 10px;">フォントサイズ</label>
                <input type="range" id="choiceFontSize" min="0.8" max="2.0" step="0.1" 
                       value="${parseFloat(question.choiceFontSize || '1.2')}" 
                       oninput="document.getElementById('choiceFontSizeValue').textContent = this.value + 'em'; updateQuestionStyle('${question.id}')"
                       style="width: 100%;">
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #718096; font-size: 0.9em;">0.8em</span>
                    <span id="choiceFontSizeValue" style="color: #2d3748; font-weight: 600;">${question.choiceFontSize || '1.2em'}</span>
                    <span style="color: #718096; font-size: 0.9em;">2.0em</span>
                </div>
                <label style="font-weight: 600; margin-bottom: 8px; display: block; margin-top: 10px;">ボタンの背景色</label>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                    <input type="color" id="choiceButtonColor" value="${question.choiceButtonColor || '#667eea'}" 
                           onchange="document.getElementById('choiceButtonColorText').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="choiceButtonColorText" value="${question.choiceButtonColor || '#667eea'}" 
                           onchange="document.getElementById('choiceButtonColor').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">ボタンの文字色</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="color" id="choiceButtonTextColor" value="${question.choiceButtonTextColor || '#ffffff'}" 
                           onchange="document.getElementById('choiceButtonTextColorText').value = this.value; updateQuestionStyle('${question.id}')"
                           style="width: 60px; height: 40px; border: 2px solid #e2e8f0; border-radius: 5px; cursor: pointer;">
                    <input type="text" id="choiceButtonTextColorText" value="${question.choiceButtonTextColor || '#ffffff'}" 
                           onchange="document.getElementById('choiceButtonTextColor').value = this.value; updateQuestionStyle('${question.id}')"
                           style="flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                </div>
            </div>
            
            <details style="margin-top: 15px;">
                <summary style="cursor: pointer; color: #667eea; font-weight: 600; padding: 10px; background: #f7fafc; border-radius: 5px;">
                    ⚙️ 上級者向け: カスタムCSSを直接編集
                </summary>
                <div style="margin-top: 10px;">
                    <textarea id="customCSS" 
                              placeholder="例: .container { border: 3px solid #ff0000; }"
                              onchange="updateQuestionProperty('${question.id}', 'customCSS', this.value)"
                              style="font-family: monospace; min-height: 100px; width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">${escapeHtml(question.customCSS || '')}</textarea>
                    <small style="color: #718096; display: block; margin-top: 5px;">.container クラスに対してスタイルを適用できます</small>
                </div>
            </details>
        </div>
        
        <div class="form-group">
            <label>選択肢</label>
            <div id="choicesList" class="choices-list"></div>
            <button class="btn" onclick="addChoice('${question.id}')" style="margin-top: 10px;">+ 選択肢を追加</button>
        </div>
        
        <div class="form-group">
            <button class="btn btn-danger" onclick="deleteNode('${question.id}')">🗑️ この質問を削除</button>
        </div>
    `;
    
    // 選択肢を表示
    if (typeof window.updateChoicesList === 'function') {
        window.updateChoicesList(question);
    }
    
    // タグUIを初期化
    if (typeof window.initTagEditor === 'function') {
        window.initTagEditor();
    }
    
    // サムネイル画像の処理
    const thumbInput = document.getElementById("thumbnail-input");
    const thumbPreview = document.getElementById("thumbnail-preview");
    
    if (thumbInput && thumbPreview) {
        const currentGameData = getGameData();
        // 既存のサムネイルを表示
        if (currentGameData.thumbnail) {
            thumbPreview.src = currentGameData.thumbnail;
            thumbPreview.style.display = "block";
        }
        
        thumbInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function() {
                const gd = getGameData();
                gd.thumbnail = reader.result;
                setGameData(gd);
                thumbPreview.src = reader.result;
                thumbPreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        });
    }
    
    // カテゴリの初期化
    const gd = getGameData();
    if (!gd.category) {
        gd.category = "";
        setGameData(gd);
    }
    
    // 理解分析（ベクトル設定）UIを表示
    setTimeout(function() {
        if (typeof window.renderVectorSettingsForQuestion === 'function') {
            window.renderVectorSettingsForQuestion(question);
        }
    }, 150);
    
    // 背景タイプの変更時に表示を切り替える
    setTimeout(() => {
        const backgroundTypeSelect = document.getElementById('backgroundType');
        if (backgroundTypeSelect) {
            backgroundTypeSelect.addEventListener('change', function() {
                const type = this.value;
                document.getElementById('backgroundColorGroup').style.display = type === 'color' ? 'block' : 'none';
                document.getElementById('backgroundImageGroup').style.display = type === 'image' ? 'block' : 'none';
                document.getElementById('gradientGroup').style.display = type === 'gradient' ? 'block' : 'none';
                if (typeof window.updateQuestionStyle === 'function') {
                    window.updateQuestionStyle(question.id);
                }
            });
        }
        
        // ドロップゾーンのクリックでファイル選択
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('imageFileInput');
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', function() {
                fileInput.click();
            });
        }
        
        // 背景画像の選択肢を更新
        if (typeof window.updateBackgroundImageSelect === 'function') {
            window.updateBackgroundImageSelect(question.id);
        }
    }, 100);
}

// 後方互換性のため window にも公開
if (typeof window !== 'undefined') {
    window.showQuestionEditor = showQuestionEditor;
}
