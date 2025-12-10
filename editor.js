// ⭐ editor.js loaded (Legacy/Backward Compatibility Wrapper)
// 
// 注意: このファイルは後方互換性のために残されています。
// 新しいコードでは editor_main.js と modules/* を使用してください。
//
// モジュール化された関数は src/editor/editor_main.js から読み込まれます:
// - showQuestionEditor → src/editor/modules/ui/question-editor.js
// - showDiagnosticQuestionEditor → src/editor/modules/ui/diagnostic-editor.js
// - showResultEditor → src/editor/modules/ui/result-editor.js
// - updateUI, renderNodes → src/editor/modules/ui/editor.js
//
console.log("⭐ editor.js loaded (legacy wrapper)");

// ==========================================================
// 初期化の二重発火を防ぐ（editor_main.js と統合）
// ==========================================================
if (window.__editor_initialized) {
    console.warn("[Editor] initialization skipped (already initialized)");
    return;
}
window.__editor_initialized = true;
window.addEventListener("DOMContentLoaded", () => {
    if (window.__EDITOR_INIT__ || window.__editor_initialized) {
        console.log("⚠️ Editor初期化は既に完了しています（二重発火防止）");
        return;
    }
    window.__EDITOR_INIT__ = true;
    
    // project_id パラメータの自動読み込み（editor_main.jsの補完）
    const params = new URLSearchParams(location.search);
    const pid = params.get("project_id");
    
    if (!pid) {
        console.log("📁 Editor: no project_id provided");
        return;
    }
    
    console.log("📁 Editor: loading project", pid);
    
    if (typeof window.loadProjectFromId === "function") {
        window.loadProjectFromId(pid);
    } else {
        console.error("loadProjectFromId が未定義です");
    }
});

// Glossaryテンプレート定義（エディタ内で使用）
const GLOSSARY_TEMPLATES = {
    learning_science: {
        terms: {
            "learning.understanding": {
                id: "learning.understanding",
                name: "理解度",
                definition: "概念同士の関係性を理解しているか。",
                example: "関連する概念の違いや繋がりを説明できる。",
                tags: ["learning"]
            },
            "learning.transfer": {
                id: "learning.transfer",
                name: "転移可能性",
                definition: "学んだ内容を新しい状況に応用できる力。",
                example: "既習事項を使って別の問題を解ける。",
                tags: ["learning"]
            },
            "learning.metacognition": {
                id: "learning.metacognition",
                name: "メタ認知",
                definition: "自分の理解状態を把握し調整できる力。",
                example: "どこがわかっていないか言語化できる。",
                tags: ["learning"]
            },
            "learning.strategy": {
                id: "learning.strategy",
                name: "学習方略",
                definition: "有効な学習方法を使えるか。",
                example: "重要部分を要約して整理する。",
                tags: ["learning"]
            }
        }
    },
    psychology: {
        terms: {
            "cognition.attention": {
                id: "cognition.attention",
                name: "注意",
                definition: "必要な情報に焦点を合わせる能力。",
                example: "重要箇所に集中する。",
                tags: ["cognition"]
            },
            "cognition.memory": {
                id: "cognition.memory",
                name: "記憶",
                definition: "学習内容を保持・想起する能力。",
                example: "キーワードの意味を正確に覚えている。",
                tags: ["cognition"]
            },
            "cognition.reasoning": {
                id: "cognition.reasoning",
                name: "推論",
                definition: "情報を組み合わせて結論を導く能力。",
                example: "因果関係を説明できる。",
                tags: ["cognition"]
            },
            "cognition.processing": {
                id: "cognition.processing",
                name: "処理速度",
                definition: "情報処理の速さと効率。",
                example: "短時間で内容を理解する。",
                tags: ["cognition"]
            }
        }
    },
    ai_literacy: {
        terms: {
            "ai.critical": {
                id: "ai.critical",
                name: "批判的思考",
                definition: "AIの出力を鵜呑みにせず検証する力。",
                example: "AIの回答の妥当性を判断する。",
                tags: ["ai"]
            },
            "ai.data_reason": {
                id: "ai.data_reason",
                name: "データ思考",
                definition: "データから意味を読み取る力。",
                example: "グラフを読み取り傾向を説明する。",
                tags: ["ai"]
            },
            "ai.meta": {
                id: "ai.meta",
                name: "AI時代のメタ認知",
                definition: "AIと人間の役割を使い分ける力。",
                example: "AIに依存せず、自分の理解限界を判断する。",
                tags: ["ai"]
            },
            "ai.collaboration": {
                id: "ai.collaboration",
                name: "AI協働",
                definition: "AIを利用して問題解決を進める能力。",
                example: "AIの提案を人間の判断で改善する。",
                tags: ["ai"]
            }
        }
    }
};

// ゲームデータ構造
// gameData は window.gameData に統一
if (!window.gameData) {
    window.gameData = {
        version: 2,
        startNode: null,
        questions: [],
        results: [],
        tags: [],
        category: "",
        thumbnail: null
    };
}

let selectedNodeId = null;
let nodeIdCounter = 0;

window.gameData = normalizeGameData(window.gameData);

function normalizeGameData(data) {
    if (!data || typeof data !== 'object') {
        return {
            version: 2,
            startNode: null,
            questions: [],
            results: [],
            tags: [],
            category: "",
            thumbnail: null
        };
    }
    const normalized = {
        version: data.version || 1,
        startNode: data.startNode || null,
        questions: Array.isArray(data.questions) ? data.questions : [],
        results: Array.isArray(data.results) ? data.results : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category || "",
        thumbnail: data.thumbnail || null
    };
    if (normalized.version < 2) {
        normalized.version = 2;
    }
    normalized.questions.forEach(question => {
        if (!question.type) {
            question.type = 'question';
        }
        if (question.type === 'diagnostic_question') {
            question.question_text = question.question_text || question.title || question.text || '';
            question.question_type = question.question_type || 'single_choice';
            question.choices = Array.isArray(question.choices) ? question.choices : [];
            question.scoring = Array.isArray(question.scoring) ? question.scoring : [];
            question.next = question.next || {};
            question.scale = question.scale || { min: 0, max: 10, step: 1 };
        } else {
            question.enableGrading = Boolean(question.enableGrading);
            question.choices = Array.isArray(question.choices) ? question.choices : [];
            question.choices.forEach((choice, index) => {
                if (typeof choice.isCorrect !== 'boolean') {
                    choice.isCorrect = false;
                }
                if (typeof choice.value === 'undefined') {
                    choice.value = index;
                }
            });
        }
    });
    return normalized;
}

const TEMPLATE_PROJECTS = {
    quiz: {
        name: '選択式クイズ',
        description: '歴史と科学の二問構成のクイズテンプレート',
        category: 'クイズ',
        settings: {
            background: 'gradient',
            questionFont: 'メイリオ, Meiryo, sans-serif',
            choiceFont: 'メイリオ, Meiryo, sans-serif'
        },
        gameData: {
            startNode: 'q_quiz_0',
            questions: [
                {
                    id: 'q_quiz_0',
                    type: 'question',
                    title: '歴史クイズ',
                    text: 'ルネサンスが本格的に始まった都市はどこ？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'gradient',
                    backgroundColor: '#ffffff',
                    backgroundImage: '',
                    gradientColor1: '#667eea',
                    gradientColor2: '#764ba2',
                    questionFontSize: '1.3em',
                    questionTextColor: '#1a202c',
                    choiceFontSize: '1.05em',
                    choiceButtonColor: '#667eea',
                    choiceButtonTextColor: '#ffffff',
                    choices: [
                        { text: 'フィレンツェ', value: 0, nextId: 'r_quiz_correct' },
                        { text: 'ローマ', value: 1, nextId: 'r_quiz_retry' },
                        { text: '次の問題に進む', value: 2, nextId: 'q_quiz_1' }
                    ]
                },
                {
                    id: 'q_quiz_1',
                    type: 'question',
                    title: '科学クイズ',
                    text: '水の化学式として正しいものは？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'color',
                    backgroundColor: '#f7fafc',
                    backgroundImage: '',
                    gradientColor1: '#667eea',
                    gradientColor2: '#764ba2',
                    questionFontSize: '1.3em',
                    questionTextColor: '#1a202c',
                    choiceFontSize: '1.1em',
                    choiceButtonColor: '#48bb78',
                    choiceButtonTextColor: '#ffffff',
                    choices: [
                        { text: 'H₂O', value: 0, nextId: 'r_quiz_correct' },
                        { text: 'CO₂', value: 1, nextId: 'r_quiz_retry' }
                    ]
                }
            ],
            results: [
                {
                    id: 'r_quiz_correct',
                    type: 'result',
                    title: '正解！',
                    text: '素晴らしい！この調子で次の学習も進めましょう。',
                    image: '',
                    url: '',
                    buttonText: ''
                },
                {
                    id: 'r_quiz_retry',
                    type: 'result',
                    title: 'あと少し！',
                    text: 'もう一度教科書を振り返ってみましょう。ヒントは教科書の序盤です。',
                    image: '',
                    url: '',
                    buttonText: ''
                }
            ]
        }
    },
    flashcard: {
        name: '復習カード',
        description: '暗記カード形式で前面と裏面を切り替えるテンプレート',
        category: '復習',
        settings: {
            background: 'color',
            questionFont: 'メイリオ, Meiryo, sans-serif',
            choiceFont: 'メイリオ, Meiryo, sans-serif'
        },
        gameData: {
            startNode: 'q_card_0',
            questions: [
                {
                    id: 'q_card_0',
                    type: 'question',
                    title: '英単語カード 1',
                    text: '"sustain" の意味は？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'color',
                    backgroundColor: '#fffaf0',
                    backgroundImage: '',
                    gradientColor1: '#f6ad55',
                    gradientColor2: '#ed8936',
                    questionFontSize: '1.25em',
                    questionTextColor: '#2d3748',
                    choiceFontSize: '1em',
                    choiceButtonColor: '#f6ad55',
                    choiceButtonTextColor: '#2d3748',
                    choices: [
                        { text: '答えを見る', value: 0, nextId: 'q_card_0_back' },
                        { text: '次のカードへ', value: 1, nextId: 'q_card_1' }
                    ]
                },
                {
                    id: 'q_card_0_back',
                    type: 'question',
                    title: '答え',
                    text: 'sustain = （〜を）維持する／持続させる',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'color',
                    backgroundColor: '#fff5eb',
                    backgroundImage: '',
                    gradientColor1: '#f6ad55',
                    gradientColor2: '#ed8936',
                    questionFontSize: '1.2em',
                    questionTextColor: '#2d3748',
                    choiceFontSize: '1em',
                    choiceButtonColor: '#ecc94b',
                    choiceButtonTextColor: '#2d3748',
                    choices: [
                        { text: '次のカードへ', value: 0, nextId: 'q_card_1' }
                    ]
                },
                {
                    id: 'q_card_1',
                    type: 'question',
                    title: '英単語カード 2',
                    text: '"derive" の意味は？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'gradient',
                    backgroundColor: '#ffffff',
                    backgroundImage: '',
                    gradientColor1: '#63b3ed',
                    gradientColor2: '#3182ce',
                    questionFontSize: '1.25em',
                    questionTextColor: '#1a202c',
                    choiceFontSize: '1em',
                    choiceButtonColor: '#4299e1',
                    choiceButtonTextColor: '#ffffff',
                    choices: [
                        { text: '答えを見る', value: 0, nextId: 'q_card_1_back' },
                        { text: '復習を完了する', value: 1, nextId: 'r_card_finish' }
                    ]
                },
                {
                    id: 'q_card_1_back',
                    type: 'question',
                    title: '答え',
                    text: 'derive = （〜から）引き出す／由来する',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'color',
                    backgroundColor: '#ebf8ff',
                    backgroundImage: '',
                    gradientColor1: '#63b3ed',
                    gradientColor2: '#3182ce',
                    questionFontSize: '1.2em',
                    questionTextColor: '#1a202c',
                    choiceFontSize: '1em',
                    choiceButtonColor: '#63b3ed',
                    choiceButtonTextColor: '#1a202c',
                    choices: [
                        { text: '復習を完了する', value: 0, nextId: 'r_card_finish' }
                    ]
                }
            ],
            results: [
                {
                    id: 'r_card_finish',
                    type: 'result',
                    title: 'お疲れさま！',
                    text: '2枚のカードを復習しました。忘れないうちにもう一度挑戦してみましょう。',
                    image: '',
                    url: '',
                    buttonText: ''
                }
            ]
        }
    },
    diagnosis: {
        name: '理解度チェック診断',
        description: 'YES/NOで理解度を確認するシンプル診断テンプレート',
        category: '診断',
        settings: {
            background: 'gradient',
            questionFont: 'メイリオ, Meiryo, sans-serif',
            choiceFont: 'メイリオ, Meiryo, sans-serif'
        },
        gameData: {
            startNode: 'q_diag_0',
            questions: [
                {
                    id: 'q_diag_0',
                    type: 'question',
                    title: '勉強スタイル診断',
                    text: '授業で学んだ内容を復習するタイミングはどちらが多いですか？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'gradient',
                    backgroundColor: '#ffffff',
                    backgroundImage: '',
                    gradientColor1: '#48bb78',
                    gradientColor2: '#38a169',
                    questionFontSize: '1.3em',
                    questionTextColor: '#1a202c',
                    choiceFontSize: '1.1em',
                    choiceButtonColor: '#48bb78',
                    choiceButtonTextColor: '#ffffff',
                    choices: [
                        { text: '授業直後にすぐ復習する', value: 0, nextId: 'r_diag_focus' },
                        { text: '夜にまとめて復習する', value: 1, nextId: 'q_diag_1' }
                    ]
                },
                {
                    id: 'q_diag_1',
                    type: 'question',
                    title: '夜型さん向けの質問',
                    text: '復習をするとき、集中を高めるために何か工夫をしていますか？',
                    questionFont: 'メイリオ, Meiryo, sans-serif',
                    choiceFont: 'メイリオ, Meiryo, sans-serif',
                    customCSS: '',
                    backgroundType: 'color',
                    backgroundColor: '#1a202c',
                    backgroundImage: '',
                    gradientColor1: '#667eea',
                    gradientColor2: '#764ba2',
                    questionFontSize: '1.25em',
                    questionTextColor: '#f7fafc',
                    choiceFontSize: '1.05em',
                    choiceButtonColor: '#ed8936',
                    choiceButtonTextColor: '#1a202c',
                    choices: [
                        { text: 'はい。BGMやタイマーを使う', value: 0, nextId: 'r_diag_balance' },
                        { text: 'いいえ。特に決まった方法はない', value: 1, nextId: 'r_diag_relax' }
                    ]
                }
            ],
            results: [
                {
                    id: 'r_diag_focus',
                    type: 'result',
                    title: '集中即復習タイプ',
                    text: '素早い復習で定着率抜群！そのままのリズムで進めましょう。',
                    image: '',
                    url: '',
                    buttonText: ''
                },
                {
                    id: 'r_diag_relax',
                    type: 'result',
                    title: 'ゆったり復習タイプ',
                    text: '無理せず復習できるペースです。軽い目標を決めるとさらに効果的！',
                    image: '',
                    url: '',
                    buttonText: ''
                },
                {
                    id: 'r_diag_balance',
                    type: 'result',
                    title: 'バランス復習タイプ',
                    text: '工夫しながら集中できています。学習ログをつけて振り返るとより効果的です。',
                    image: '',
                    url: '',
                    buttonText: ''
                }
            ]
        }
    }
};

function cloneTemplateData(data) {
    return JSON.parse(JSON.stringify(data));
}

function calculateNextNodeIdCounterFromData(data) {
    const nodes = [...(data.questions || []), ...(data.results || [])];
    let maxIdNumber = -1;
    nodes.forEach(node => {
        const match = node.id.match(/_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) {
                maxIdNumber = Math.max(maxIdNumber, num);
            }
        }
    });
    return maxIdNumber + 1 < 0 ? 0 : maxIdNumber + 1;
}

function loadTemplate(templateKey) {
    const template = TEMPLATE_PROJECTS[templateKey];
    if (!template) {
        alert('テンプレートが見つかりません。');
        return;
    }
    window.gameData = cloneTemplateData(template.gameData);
    selectedNodeId = window.gameData.startNode || (window.gameData.questions[0] ? window.gameData.questions[0].id : null);
    nodeIdCounter = calculateNextNodeIdCounterFromData(window.gameData);
    updateUI();
    showPreview();
    alert(`${template.name}テンプレートを読み込みました！`);
}

function createTemplateButtons() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('templateButtonsSection')) return;
    const templateSection = document.createElement('div');
    templateSection.className = 'sidebar-section';
    templateSection.id = 'templateButtonsSection';
    templateSection.innerHTML = '<h3 style="margin-bottom: 10px; font-size: 1em;">テンプレート</h3>';
    Object.entries(TEMPLATE_PROJECTS).forEach(([key, template]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = `📦 ${template.name}`;
        button.title = template.description;
        button.addEventListener('click', () => loadTemplate(key));
        templateSection.appendChild(button);
    });
    sidebar.insertBefore(templateSection, sidebar.children[1] || null);
}

window.loadTemplate = loadTemplate;

// カスタム画像を保存（localStorage）
function saveCustomImage(name, base64Data) {
    try {
        const customImages = JSON.parse(localStorage.getItem('customBackgroundImages') || '{}');
        customImages[name] = base64Data;
        localStorage.setItem('customBackgroundImages', JSON.stringify(customImages));
        return true;
    } catch (e) {
        console.error('画像の保存に失敗しました:', e);
        return false;
    }
}

// カスタム画像を取得
function getCustomImages() {
    try {
        return JSON.parse(localStorage.getItem('customBackgroundImages') || '{}');
    } catch (e) {
        return {};
    }
}

// カスタム画像のオプションを生成
function getCustomImageOptions(currentValue) {
    const customImages = getCustomImages();
    let options = '';
    for (const [name, data] of Object.entries(customImages)) {
        const value = `custom:${name}`;
        options += `<option value="${escapeHtml(value)}" ${currentValue === value ? 'selected' : ''}>${escapeHtml(name)}</option>`;
    }
    return options;
}

// カスタム画像のURLを取得
function getCustomImageUrl(value) {
    if (value && value.startsWith('custom:')) {
        const name = value.substring(7);
        const customImages = getCustomImages();
        return customImages[name] || '';
    }
    return value || '';
}

// 画像ファイルを処理
function handleImageFiles(event, questionId) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                const fileName = file.name;
                if (saveCustomImage(fileName, base64Data)) {
                    // 選択肢を更新
                    updateBackgroundImageSelect(questionId);
                    // 自動的に選択
                    const select = document.getElementById('backgroundImage');
                    if (select) {
                        select.value = `custom:${fileName}`;
                        updateBackgroundImagePreview(questionId);
                    }
                    alert(`画像「${fileName}」を追加しました！`);
                } else {
                    alert('画像の保存に失敗しました。');
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert(`「${file.name}」は画像ファイルではありません。`);
        }
    });
    
    // 入力値をリセット（同じファイルを再度選択できるように）
    event.target.value = '';
}

// ドラッグ&ドロップで画像を処理
function handleImageDrop(event, questionId) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = event.currentTarget;
    dropZone.style.borderColor = '#cbd5e0';
    dropZone.style.background = 'white';
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                const fileName = file.name;
                if (saveCustomImage(fileName, base64Data)) {
                    // 選択肢を更新
                    updateBackgroundImageSelect(questionId);
                    // 自動的に選択
                    const select = document.getElementById('backgroundImage');
                    if (select) {
                        select.value = `custom:${fileName}`;
                        updateBackgroundImagePreview(questionId);
                    }
                    alert(`画像「${fileName}」を追加しました！`);
                } else {
                    alert('画像の保存に失敗しました。');
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert(`「${file.name}」は画像ファイルではありません。`);
        }
    });
}

// 背景画像の選択肢を更新
function updateBackgroundImageSelect(questionId) {
    const select = document.getElementById('backgroundImage');
    if (!select) return;
    
    const currentValue = select.value || '';
    
    // デフォルトオプションを定義
    const defaultOptions = [
        { value: '', text: '画像を選択...' },
        { value: 'data/game_back_forest.jpg', text: '森の背景' },
        { value: 'data/game_back_mountain.jpg', text: '山の背景' },
        { value: 'data/game_back_space.jpg', text: '宇宙の背景' },
        { value: 'data/game_back_stars.jpg', text: '星空の背景' }
    ];
    
    // 選択肢を再構築
    select.innerHTML = '';
    
    // デフォルトオプションを追加
    defaultOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.value === currentValue) option.selected = true;
        select.appendChild(option);
    });
    
    // カスタム画像を追加
    const customImages = getCustomImages();
    for (const [name, data] of Object.entries(customImages)) {
        const value = `custom:${name}`;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        if (value === currentValue) option.selected = true;
        select.appendChild(option);
    }
}

// ドロップゾーンのクリックでファイル選択
// 注意: このイベントリスナーは editor_init.js で統合管理されるため、
// ここでは削除しないが、editor_init.js が優先される
if (window.__editor_initialized) {
    console.warn("[Editor] initialization skipped (already initialized)");
} else {
    window.__editor_initialized = true;
}
document.addEventListener('DOMContentLoaded', function() {
    console.log("⭐ DOMContentLoaded #1: ドロップゾーン初期化 (legacy, may be overridden by editor_init.js)");
    // ドロップゾーンのクリックイベントは動的に追加する必要があるため、
    // showQuestionEditor内で設定する
});

// 質問ノードを追加
function addQuestion() {
    console.log("⭐ addQuestion called");
    try {
    const questionId = `q_${nodeIdCounter++}`;
    const question = {
        id: questionId,
        type: 'question',
        title: `質問 ${window.gameData.questions.length + 1}`,
        text: '',
        questionFont: '',
        choiceFont: '',
        customCSS: '',
        // GUI設定
        backgroundType: 'color', // 'color', 'image', 'gradient'
        backgroundColor: '#ffffff',
        backgroundImage: '',
        gradientColor1: '#667eea',
        gradientColor2: '#764ba2',
        questionFontSize: '1.3em',
        questionTextColor: '#2d3748',
        choiceFontSize: '1.2em',
        choiceButtonColor: '#667eea',
        choiceButtonTextColor: '#ffffff',
        enableGrading: false,
        choices: [
            { text: '選択肢1', value: 0, nextId: null, isCorrect: false },
            { text: '選択肢2', value: 1, nextId: null, isCorrect: false }
        ]
    };
    
    window.gameData.questions.push(question);
    
    // 最初の質問の場合はスタートノードに設定
    if (window.gameData.questions.length === 1 && !window.gameData.startNode) {
        window.gameData.startNode = questionId;
    }
    
    updateUI();
    selectNode(questionId);
        console.log("⭐ addQuestion: Question added successfully");
    } catch (e) {
        console.error("⭐ addQuestion: Error adding question:", e);
        alert("質問の追加中にエラーが発生しました。");
    }
}

function addDiagnosticQuestion() {
    console.log("⭐ addDiagnosticQuestion called");
    try {
    const questionId = `dq_${nodeIdCounter++}`;
    const question = {
        id: questionId,
        type: 'diagnostic_question',
        question_text: `診断質問 ${window.gameData.questions.filter(q => q.type === 'diagnostic_question').length + 1}`,
        description: '',
        question_type: 'single_choice',
        choices: [
            { id: 'a', text: '選択肢A' },
            { id: 'b', text: '選択肢B' }
        ],
        scoring: [
            { choice_id: 'a', vector: { logic: 1 } },
            { choice_id: 'b', vector: { logic: -1 } }
        ],
        next: {},
        scale: { min: 0, max: 10, step: 1 }
    };
    
    window.gameData.questions.push(question);
    
    if (!window.gameData.startNode) {
        window.gameData.startNode = questionId;
    }
    
    updateUI();
    selectNode(questionId);
        console.log("⭐ addDiagnosticQuestion: Diagnostic question added successfully");
    } catch (e) {
        console.error("⭐ addDiagnosticQuestion: Error adding diagnostic question:", e);
        alert("診断質問の追加中にエラーが発生しました。");
    }
}

// 結果ノードを追加
function addResult() {
    console.log("⭐ addResult called");
    const resultId = `r_${nodeIdCounter++}`;
    const result = {
        id: resultId,
        type: 'result',
        title: `結果 ${window.gameData.results.length + 1}`,
        text: '',
        image: '',
        url: '',
        buttonText: ''
    };
    
    window.gameData.results.push(result);
    updateUI();
    selectNode(resultId);
}

// ノードを選択
function selectNode(nodeId) {
    selectedNodeId = nodeId;
    updateUI();
    showPreview();
}

// UIを更新
function updateUI() {
    updateNodeList();
    updateEditor();
}

// ノードリストを更新
function updateNodeList() {
    const nodeList = document.getElementById('nodeList');
    nodeList.innerHTML = '';
    
    // スタートノード
    if (window.gameData.startNode) {
        const startNode = window.gameData.questions.find(q => q.id === window.gameData.startNode);
        if (startNode) {
            const node = createListNode(startNode, 'start');
            nodeList.appendChild(node);
        }
    }
    
    // 質問ノード
    window.gameData.questions.forEach(question => {
        const node = createListNode(question, question.type || 'question');
        nodeList.appendChild(node);
    });
    
    // 結果ノード
    window.gameData.results.forEach(result => {
        const node = createListNode(result, 'result');
        nodeList.appendChild(node);
    });
}

// リスト表示用のノード要素を作成
function createListNode(data, type) {
    const div = document.createElement('div');
    div.className = `node ${selectedNodeId === data.id ? 'selected' : ''}`;
    
    const typeLabels = {
        'start': '🚀 スタート',
        'question': '❓ 質問',
        'diagnostic_question': '🧠 診断',
        'result': '✅ 結果'
    };
    
    const displayTitle = data.title || data.question_text || data.text || '無題';
    
    div.innerHTML = `
        <div class="node-title">${escapeHtml(displayTitle)}</div>
        <div class="node-type">${typeLabels[type] || type}</div>
    `;
    
    // クリックハンドラを設定（モジュール版のselectNodeを使用、フォールバックあり）
    div.onclick = function() {
        const nodeId = data.id;
        if (typeof window.selectNode === 'function') {
            window.selectNode(nodeId);
        } else if (typeof selectNode === 'function') {
            selectNode(nodeId);
        } else {
            // フォールバック: 直接selectedNodeIdを更新してupdateEditorを呼ぶ
            selectedNodeId = nodeId;
            updateEditor();
            updateNodeList(); // 選択状態を更新
        }
    };
    
    return div;
}

// エディタを表示
function updateEditor() {
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;
    
    if (!selectedNodeId) {
        editorContent.innerHTML = `
            <div class="empty-state">
                <h2>👋 ノードを選択</h2>
                <p style="margin-top: 20px;">左側のノードをクリックして編集してください。</p>
            </div>
        `;
        return;
    }
    
    const question = window.gameData.questions.find(q => q.id === selectedNodeId);
    const result = window.gameData.results.find(r => r.id === selectedNodeId);
    
    if (question) {
        // グローバル関数を使用（モジュール版またはレガジー版）
        if (question.type === 'diagnostic_question') {
            if (typeof window.showDiagnosticQuestionEditor === 'function') {
                window.showDiagnosticQuestionEditor(question);
            } else if (typeof showDiagnosticQuestionEditor === 'function') {
                showDiagnosticQuestionEditor(question);
            }
        } else {
            if (typeof window.showQuestionEditor === 'function') {
                window.showQuestionEditor(question);
            } else if (typeof showQuestionEditor === 'function') {
                showQuestionEditor(question);
            }
        }
    } else if (result) {
        if (typeof window.showResultEditor === 'function') {
            window.showResultEditor(result);
        } else if (typeof showResultEditor === 'function') {
            showResultEditor(result);
        }
    }
}

// 質問エディタを表示
function showQuestionEditor(question) {
    if (question.type === 'diagnostic_question') {
        showDiagnosticQuestionEditor(question);
        return;
    }
    const editorContent = document.getElementById('editorContent');
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
                <input type="text" id="project-category" value="${escapeHtml(window.gameData.category || "")}" 
                       placeholder="例: 数学、英語、歴史" 
                       style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;"
                       onchange="window.gameData.category = this.value;" />
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
                    ${getCustomImageOptions(question.backgroundImage)}
                </select>
                
                <div id="backgroundImagePreview" style="margin-top: 10px; ${question.backgroundImage ? '' : 'display: none;'}">
                    <label style="font-weight: 600; margin-bottom: 8px; display: block; font-size: 0.9em;">プレビュー:</label>
                    <img id="backgroundImagePreviewImg" 
                         src="${getCustomImageUrl(question.backgroundImage || '')}" 
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
    updateChoicesList(question);
    
    // タグUIを初期化
    initTagEditor();
    
    // サムネイル画像の処理
    const thumbInput = document.getElementById("thumbnail-input");
    const thumbPreview = document.getElementById("thumbnail-preview");
    
    if (thumbInput && thumbPreview) {
        // 既存のサムネイルを表示
        if (window.gameData.thumbnail) {
            thumbPreview.src = window.gameData.thumbnail;
            thumbPreview.style.display = "block";
        }
        
        thumbInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function() {
                window.gameData.thumbnail = reader.result;
                thumbPreview.src = reader.result;
                thumbPreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        });
    }
    
    // カテゴリの初期化
    if (!window.gameData.category) window.gameData.category = "";
    
    // 理解分析（ベクトル設定）UIを表示
    setTimeout(function() {
        renderVectorSettingsForQuestion(question);
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
                updateQuestionStyle(question.id);
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
        updateBackgroundImageSelect(question.id);
    }, 100);
}

function showDiagnosticQuestionEditor(question) {
    const editorContent = document.getElementById('editorContent');
    const questionType = question.question_type || 'single_choice';
    const showChoices = ['single_choice', 'multiple_choice', 'yes_no'].includes(questionType);
    const showScale = questionType === 'scale';
    
    editorContent.innerHTML = `
        <div class="form-group">
            <label>質問ID: ${question.id}</label>
        </div>
        <div class="form-group">
            <label>質問文</label>
            <textarea onchange="updateDiagnosticQuestionProperty('${question.id}', 'question_text', this.value)">${escapeHtml(question.question_text || '')}</textarea>
        </div>
        <div class="form-group">
            <label>説明（任意）</label>
            <textarea onchange="updateDiagnosticQuestionProperty('${question.id}', 'description', this.value)">${escapeHtml(question.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>質問形式</label>
            <select id="diagQuestionType" onchange="updateDiagnosticQuestionProperty('${question.id}', 'question_type', this.value)">
                <option value="single_choice" ${questionType === 'single_choice' ? 'selected' : ''}>単一選択</option>
                <option value="multiple_choice" ${questionType === 'multiple_choice' ? 'selected' : ''}>複数選択</option>
                <option value="yes_no" ${questionType === 'yes_no' ? 'selected' : ''}>YES/NO</option>
                <option value="scale" ${questionType === 'scale' ? 'selected' : ''}>スケール（数値）</option>
                <option value="text" ${questionType === 'text' ? 'selected' : ''}>自由記述</option>
            </select>
        </div>
        <div class="form-group" id="diagnosticScaleSettings" style="display: ${showScale ? 'block' : 'none'};">
            <label>スケール設定</label>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <small>最小値</small>
                    <input type="number" value="${question.scale?.min ?? 0}" onchange="updateDiagnosticScale('${question.id}', 'min', this.value)">
                </div>
                <div style="flex: 1;">
                    <small>最大値</small>
                    <input type="number" value="${question.scale?.max ?? 10}" onchange="updateDiagnosticScale('${question.id}', 'max', this.value)">
                </div>
                <div style="flex: 1;">
                    <small>ステップ</small>
                    <input type="number" value="${question.scale?.step ?? 1}" onchange="updateDiagnosticScale('${question.id}', 'step', this.value)">
                </div>
            </div>
        </div>
        <div class="form-group" id="diagnosticChoicesGroup" style="display: ${showChoices ? 'block' : 'none'};">
            <label>選択肢</label>
            <div id="diagnosticChoicesList"></div>
            <button class="btn" type="button" style="margin-top: 10px;" onclick="addDiagnosticChoice('${question.id}')">+ 選択肢を追加</button>
        </div>
        <div class="form-group">
            <label>スコアリング設定</label>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 10px;">各選択肢で影響する評価軸を設定します。Glossaryから評価軸を自動取得します。</p>
            <div id="diagnosticScoringList"></div>
            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px; font-size: 0.9em; color: #555;">
                <strong>詳細表示（JSON）:</strong>
                <pre id="diagnosticScoringJson" style="margin-top: 8px; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85em; max-height: 200px; overflow-y: auto;"></pre>
            </div>
        </div>
        <div class="form-group">
            <label>分岐設定</label>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 10px;">回答キー（選択肢ID / yes / no / 任意のキー）ごとに次のノードを指定できます。</p>
            <div id="diagnosticNextList"></div>
            <button class="btn" type="button" style="margin-top: 10px;" onclick="addDiagnosticNext('${question.id}')">+ 分岐ルールを追加</button>
        </div>
        <div class="form-group">
            <button class="btn btn-danger" onclick="deleteNode('${question.id}')">🗑️ この診断質問を削除</button>
        </div>
    `;
    
    renderDiagnosticChoicesList(question);
    renderDiagnosticNextList(question);
    // スコアリングUIは選択肢の後に表示（選択肢IDが必要なため）
    setTimeout(function() {
        renderDiagnosticScoringList(question);
    }, 100);
}

function renderDiagnosticChoicesList(question) {
    const container = document.getElementById('diagnosticChoicesList');
    if (!container) return;
    if (!Array.isArray(question.choices) || question.choices.length === 0) {
        container.innerHTML = `<div style="padding: 10px; background: #edf2f7; border-radius: 8px;">選択肢がありません。</div>`;
        return;
    }
    container.innerHTML = question.choices.map((choice, index) => `
        <div class="choice-item" style="flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 10px;">
                <div style="flex: 0 0 120px;">
                    <small>ID</small>
                    <input type="text" value="${escapeHtml(choice.id || '')}" onchange="updateDiagnosticChoice('${question.id}', ${index}, 'id', this.value)">
                </div>
                <div style="flex: 1;">
                    <small>テキスト</small>
                    <input type="text" value="${escapeHtml(choice.text || '')}" onchange="updateDiagnosticChoice('${question.id}', ${index}, 'text', this.value)">
                </div>
            </div>
            <div style="text-align: right;">
                <button type="button" onclick="removeDiagnosticChoice('${question.id}', ${index})">削除</button>
            </div>
        </div>
    `).join('');
}

// Glossaryから評価軸を取得してスコアリングUIを表示
let cachedGlossary = null;

function loadGlossaryForScoring() {
    // window.currentGlossary から直接取得（iframe 前提を完全撤廃）
    // 同期関数として実装（非同期処理は不要）
    if (window.currentGlossary?.terms) {
        return window.currentGlossary.terms;
    }
    return {};
}

// ベクトル設定UIを更新（テンプレート読み込み時に呼び出される）
// 引数なし：window.currentGlossary から直接取得
window.refreshVectorAxis = function() {
    const terms = window.currentGlossary?.terms;
    if (!terms) return;
    
    // キャッシュをクリア
    cachedGlossary = null;
    
    // 現在編集中の質問がある場合は、ベクトル設定UIを再描画
    const question = window.gameData.questions.find(function(q) { return q.id === selectedNodeId; });
    if (!question) return;
    
    setTimeout(function() {
        if (question.type === 'diagnostic_question') {
            renderDiagnosticScoringList(question);
        } else {
            renderVectorSettingsForQuestion(question);
        }
    }, 100);
};

function renderDiagnosticScoringList(question) {
    const container = document.getElementById('diagnosticScoringList');
    if (!container) return;
    
    // デバッグログ: テンプレートGlossaryの使用状況を確認
    console.log('[Diagnostic] Using Glossary terms:', window.currentGlossary);
    
    // 選択肢がない場合はメッセージを表示
    if (!Array.isArray(question.choices) || question.choices.length === 0) {
        container.innerHTML = `<div style="padding: 10px; background: #edf2f7; border-radius: 8px;">まず選択肢を追加してください。</div>`;
        updateScoringJson(question);
        return;
    }
    
    // テンプレート選択UIを表示
    const templateSelectHtml = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f0f7ff; border: 2px solid #4a90e2; border-radius: 8px;">
            <h3 style="margin-top: 0; margin-bottom: 12px; color: #2d3748; font-size: 1.1rem;">📚 評価軸テンプレートを選択</h3>
            <p style="margin-bottom: 12px; color: #555; font-size: 0.95rem;">診断クイズの評価軸を設定するためのテンプレートを選択してください。</p>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <select id="glossaryTemplateSelect-diagnostic-${question.id}" 
                        style="flex: 1; min-width: 250px; padding: 8px 12px; border: 2px solid #4a90e2; border-radius: 6px; font-size: 1rem; background: white;">
                    <option value="">テンプレートを選択してください</option>
                    <option value="learning_science">① 教育学（学習科学：理解度・転移・メタ認知・学習方略）</option>
                    <option value="psychology">② 心理学（認知：注意・記憶・推論・処理速度）</option>
                    <option value="ai_literacy">③ AIリテラシー（批判的思考・データ思考・AI協働）</option>
                </select>
                <button onclick="loadGlossaryTemplateForQuestion('${question.id}')" 
                        style="padding: 8px 20px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; white-space: nowrap;">
                    テンプレートを読み込む
                </button>
            </div>
            <div id="templateStatus-diagnostic-${question.id}" style="margin-top: 10px; font-size: 0.9rem; color: #666;"></div>
        </div>
    `;
    
    container.innerHTML = templateSelectHtml;
    
    // Glossaryを読み込んで評価軸UIを表示
    // window.currentGlossary から直接取得（最新の状態を確実に反映）
    const glossaryTerms = loadGlossaryForScoring();
    
    if (!glossaryTerms || Object.keys(glossaryTerms).length === 0) {
        const statusDiv = document.getElementById(`templateStatus-diagnostic-${question.id}`);
        if (statusDiv) {
            statusDiv.innerHTML = '<span style="color: #e53e3e;">⚠️ 評価軸テンプレートが読み込まれていません。上記からテンプレートを選択して読み込んでください。</span>';
        }
        updateScoringJson(question);
        return;
    }
    
    // 各選択肢ごとに評価軸UIを表示
    const scoringHtml = question.choices.map(function(choice) {
        const choiceId = choice.id || '';
        if (!choiceId) return '';
        
        const existingRule = (question.scoring || []).find(function(r) { return r.choice_id === choiceId; });
        const existingVector = existingRule ? existingRule.vector : {};
        
        return `
            <div class="score-setting" style="margin-bottom: 25px; padding: 15px; background: #fafafa; border: 1px solid #ddd; border-radius: 8px;">
                <h3 style="margin-top: 0; margin-bottom: 15px; color: #333; font-size: 1.1rem;">選択肢「${escapeHtml(choice.text || choiceId)}」（ID: ${escapeHtml(choiceId)}）</h3>
                <div id="scoreAxisList-${escapeHtml(choiceId)}" data-choice-id="${escapeHtml(choiceId)}"></div>
            </div>
        `;
    }).join('');
    
    // テンプレート選択UIの後に評価軸UIを追加
    container.innerHTML = templateSelectHtml + scoringHtml;
    
    // ステータスを更新
    const statusDiv = document.getElementById(`templateStatus-diagnostic-${question.id}`);
    if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: #48bb78;">✓ 評価軸テンプレートが読み込まれています</span>';
    }
    
    // 各選択肢の評価軸UIを描画
    question.choices.forEach(function(choice) {
        const choiceId = choice.id || '';
        if (!choiceId) return;
        
        const existingRule = (question.scoring || []).find(function(r) { return r.choice_id === choiceId; });
        const existingVector = existingRule ? existingRule.vector : {};
        
        renderAxisUI(glossaryTerms, choiceId, question.id, existingVector);
    });
    
    updateScoringJson(question);
}

// 評価軸UIを描画
function renderAxisUI(glossaryTerms, choiceId, questionId, existingVector) {
    const container = document.getElementById(`scoreAxisList-${choiceId}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!glossaryTerms || Object.keys(glossaryTerms).length === 0) {
        container.innerHTML = '<div style="padding: 10px; background: #fff3cd; border-radius: 8px;">評価軸が見つかりません。</div>';
        return;
    }
    
    Object.values(glossaryTerms).forEach(function(term) {
        if (!term || !term.id) return;
        
        // term.idから評価軸キーを取得（例: "concept.logic" → "logic"）
        const key = term.id.split('.').pop();
        const currentValue = existingVector[key] !== undefined ? existingVector[key] : 0;
        
        const card = document.createElement('div');
        card.className = 'score-axis-card';
        card.setAttribute('data-axis', key);
        
        const termName = escapeHtml(term.name || key);
        const definition = escapeHtml(term.definition || '（説明なし）');
        
        card.innerHTML = `
            <div class="axis-title">${termName} (${escapeHtml(key)})</div>
            <div class="axis-desc">${definition}</div>
            <div class="score-radio-group">
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="-1" ${currentValue === -1 ? 'checked' : ''} 
                           onchange="updateAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', -1)">
                    <span>-1 弱まる</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="0" ${currentValue === 0 ? 'checked' : ''} 
                           onchange="updateAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', 0)">
                    <span>0 影響なし</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="1" ${currentValue === 1 ? 'checked' : ''} 
                           onchange="updateAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', 1)">
                    <span>+1 強まる</span>
                </label>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// 評価軸のスコアを更新
function updateAxisScore(questionId, choiceId, axis, value) {
    const question = gameData.questions.find(function(q) { return q.id === questionId && q.type === 'diagnostic_question'; });
    if (!question) return;
    
    question.scoring = Array.isArray(question.scoring) ? question.scoring : [];
    
    let rule = question.scoring.find(function(r) { return r.choice_id === choiceId; });
    if (!rule) {
        rule = { choice_id: choiceId, vector: {} };
        question.scoring.push(rule);
    }
    
    if (!rule.vector) {
        rule.vector = {};
    }
    
    if (value === 0) {
        // 0の場合は削除（影響なし）
        delete rule.vector[axis];
    } else {
        rule.vector[axis] = value;
    }
    
    // 空のvectorの場合は削除
    if (Object.keys(rule.vector).length === 0) {
        const index = question.scoring.indexOf(rule);
        if (index >= 0) {
            question.scoring.splice(index, 1);
        }
    }
    
    updateScoringJson(question);
    updateUI();
    showPreview();
}

// スコアリングJSONを更新（詳細表示用）
function updateScoringJson(question) {
    const jsonContainer = document.getElementById('diagnosticScoringJson');
    if (!jsonContainer) return;
    
    const scoring = Array.isArray(question.scoring) ? question.scoring : [];
    jsonContainer.textContent = JSON.stringify(scoring, null, 2);
}

// スコアベクトルを収集（既存の関数を置き換え）
function collectScoreVector(choiceId) {
    const container = document.getElementById(`scoreAxisList-${choiceId}`);
    if (!container) return {};
    
    const cards = container.querySelectorAll('.score-axis-card');
    const result = {};
    
    cards.forEach(function(card) {
        const axis = card.getAttribute('data-axis');
        const selected = card.querySelector(`input[name="${choiceId}-${axis}"]:checked`);
        if (selected) {
            const value = Number(selected.value);
            if (value !== 0) {
                result[axis] = value;
            }
        }
    });
    
    return result;
}

// 通常クイズ用のベクトル設定UIを表示
// ベクトル設定UIは削除されました（理解階層設定UIに置き換え）
function renderVectorSettingsForQuestion(question) {
    // この関数は非推奨です。理解階層設定UIを使用してください。
    return;
    
    // 選択肢がない場合はメッセージを表示
    if (!Array.isArray(question.choices) || question.choices.length === 0) {
        area.innerHTML = '<div style="padding: 10px; background: #edf2f7; border-radius: 8px;">まず選択肢を追加してください。</div>';
        updateVectorJson(question);
        return;
    }
    
    // テンプレート選択UIを表示
    const templateSelectHtml = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f0f7ff; border: 2px solid #4a90e2; border-radius: 8px;">
            <h3 style="margin-top: 0; margin-bottom: 12px; color: #2d3748; font-size: 1.1rem;">📚 評価軸テンプレートを選択</h3>
            <p style="margin-bottom: 12px; color: #555; font-size: 0.95rem;">理解ベクトルを設定するための評価軸テンプレートを選択してください。</p>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <select id="glossaryTemplateSelect-${question.id}" 
                        style="flex: 1; min-width: 250px; padding: 8px 12px; border: 2px solid #4a90e2; border-radius: 6px; font-size: 1rem; background: white;">
                    <option value="">テンプレートを選択してください</option>
                    <option value="learning_science">① 教育学（学習科学：理解度・転移・メタ認知・学習方略）</option>
                    <option value="psychology">② 心理学（認知：注意・記憶・推論・処理速度）</option>
                    <option value="ai_literacy">③ AIリテラシー（批判的思考・データ思考・AI協働）</option>
                </select>
                <button onclick="loadGlossaryTemplateForQuestion('${question.id}')" 
                        style="padding: 8px 20px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; white-space: nowrap;">
                    テンプレートを読み込む
                </button>
            </div>
            <div id="templateStatus-${question.id}" style="margin-top: 10px; font-size: 0.9rem; color: #666;"></div>
        </div>
    `;
    
    area.innerHTML = templateSelectHtml;
    
    // 既にGlossaryが読み込まれている場合は評価軸UIを表示
    // window.currentGlossary から直接取得（最新の状態を確実に反映）
    const glossaryTerms = loadGlossaryForScoring();
    
    if (!glossaryTerms || Object.keys(glossaryTerms).length === 0) {
        const statusDiv = document.getElementById(`templateStatus-${question.id}`);
        if (statusDiv) {
            statusDiv.innerHTML = '<span style="color: #e53e3e;">⚠️ 評価軸テンプレートが読み込まれていません。上記からテンプレートを選択して読み込んでください。</span>';
        }
        updateVectorJson(question);
        return;
    }
    
    // Glossaryが読み込まれている場合は評価軸UIを表示
    try {
        // 既存のベクトル設定を取得（新形式: vector、旧形式: vector_scores）
        const existingVectors = question.vector || question.vector_scores || {};
        
        // 各選択肢ごとに評価軸UIを表示
        const vectorHtml = question.choices.map(function(choice, index) {
            // 選択肢IDを生成（既存のid、value、またはインデックスベース）
            let choiceId = choice.id || choice.value;
            if (!choiceId) {
                choiceId = `choice_${index}`;
                choice.id = choiceId;
            }
            
            // 既存のベクトル値を取得（新形式と旧形式の両方に対応）
            let existingVector = existingVectors[choiceId] || {};
            
            // 旧形式（vector_scores）から新形式（vector）に変換
            if (question.vector_scores && question.vector_scores[choiceId] && !question.vector) {
                const oldVector = question.vector_scores[choiceId];
                const newVector = {};
                Object.keys(oldVector).forEach(function(axisId) {
                    const value = oldVector[axisId];
                    if (typeof value === 'number') {
                        // 旧形式: -1/0/+1 → 新形式: {x: value, y: 0}
                        newVector[axisId] = { x: value, y: 0 };
                    } else if (typeof value === 'object' && value.x !== undefined) {
                        // 既に新形式の場合
                        newVector[axisId] = value;
                    }
                });
                if (Object.keys(newVector).length > 0) {
                    if (!question.vector) question.vector = {};
                    question.vector[choiceId] = newVector;
                    existingVector = newVector;
                }
            }
            
            return `
                <div style="margin-bottom: 25px; padding: 15px; background: #fafafa; border: 1px solid #ddd; border-radius: 8px;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; color: #333; font-size: 1.1rem;">選択肢「${escapeHtml(choice.text || choiceId)}」（ID: ${escapeHtml(choiceId)}）</h3>
                    <div id="vectorAxisList-${escapeHtml(choiceId)}" data-choice-id="${escapeHtml(choiceId)}"></div>
                </div>
            `;
        }).join('');
        
        // テンプレート選択UIの後に評価軸UIを追加
        area.innerHTML = templateSelectHtml + vectorHtml;
        
        // ステータスを更新
        const statusDiv = document.getElementById(`templateStatus-${question.id}`);
        if (statusDiv) {
            statusDiv.innerHTML = '<span style="color: #48bb78;">✓ 評価軸テンプレートが読み込まれています</span>';
        }
        
        // 各選択肢の評価軸UIを描画
        question.choices.forEach(function(choice, index) {
            // 選択肢IDを生成（既存のid、value、またはインデックスベース）
            let choiceId = choice.id || choice.value;
            if (!choiceId) {
                choiceId = `choice_${index}`;
                choice.id = choiceId;
            }
            
            // 既存のベクトル値を取得（新形式を優先）
            let existingVector = (question.vector || question.vector_scores || {})[choiceId] || {};
            
            // 旧形式から新形式への変換（必要に応じて）
            if (question.vector_scores && question.vector_scores[choiceId] && !question.vector) {
                const oldVector = question.vector_scores[choiceId];
                const newVector = {};
                Object.keys(oldVector).forEach(function(axisId) {
                    const value = oldVector[axisId];
                    if (typeof value === 'number') {
                        newVector[axisId] = { x: value, y: 0 };
                    }
                });
                if (Object.keys(newVector).length > 0) {
                    if (!question.vector) question.vector = {};
                    question.vector[choiceId] = newVector;
                    existingVector = newVector;
                }
            }
            
            renderVectorAxisUI(glossaryTerms, choiceId, question.id, existingVector);
        });
        
        updateVectorJson(question);
    } catch (error) {
        console.warn('Glossary読み込みエラー:', error);
        const statusDiv = document.getElementById(`templateStatus-${question.id}`);
        if (statusDiv) {
            statusDiv.innerHTML = `<span style="color: #e53e3e;">⚠️ 評価軸の読み込みに失敗しました: ${escapeHtml(error.message || '不明なエラー')}</span>`;
        }
        updateVectorJson(question);
    }
}

// ベクトル設定UIは削除されました（理解階層設定UIに置き換え）
function loadGlossaryTemplateForQuestion(questionId) {
    // この関数は非推奨です。理解階層設定UIを使用してください。
    return;
    // 通常クイズと診断クイズの両方のセレクトを確認
    const select = document.getElementById(`glossaryTemplateSelect-${questionId}`) || 
                   document.getElementById(`glossaryTemplateSelect-diagnostic-${questionId}`);
    if (!select) {
        console.warn('[Editor] テンプレート選択UIが見つかりません:', questionId);
        return;
    }
    
    const selected = select.value;
    if (!selected) {
        alert('テンプレートを選択してください。');
        return;
    }
    
    const template = GLOSSARY_TEMPLATES[selected];
    if (!template) {
        alert('テンプレートが見つかりません。');
        return;
    }
    
    // window.currentGlossary に設定
    const glossaryData = { terms: template.terms || template };
    window.currentGlossary = glossaryData;
    console.log('[Editor] テンプレートを読み込みました:', selected, glossaryData);
    
    // localStorage に保存
    try {
        localStorage.setItem('currentGlossary', JSON.stringify(glossaryData));
        console.log('[Editor] localStorage に保存しました');
    } catch (e) {
        console.warn('[Editor] localStorage への保存に失敗しました:', e);
    }
    
    // キャッシュをクリア（重要：新しいテンプレートを確実に反映）
    cachedGlossary = null;
    
    // 評価軸UIを再描画（少し遅延させて確実に更新）
    const question = window.gameData.questions.find(function(q) { return q.id === questionId; });
    if (question) {
        setTimeout(function() {
            if (question.type === 'diagnostic_question') {
                renderDiagnosticScoringList(question);
            } else {
                renderVectorSettingsForQuestion(question);
            }
        }, 50);
    }
    
    // refreshVectorAxis も呼び出す（他の質問にも反映）
    if (typeof window.refreshVectorAxis === 'function') {
        setTimeout(function() {
            window.refreshVectorAxis();
        }, 100);
    }
    
    // 成功メッセージ
    const statusDiv = document.getElementById(`templateStatus-${questionId}`) || 
                      document.getElementById(`templateStatus-diagnostic-${questionId}`);
    if (statusDiv) {
        statusDiv.innerHTML = '<span style="color: #48bb78;">✓ テンプレート「' + selected + '」を読み込みました。評価軸UIを更新しています...</span>';
    }
}

// ベクトル設定UIは削除されました（理解階層設定UIに置き換え）
function buildVectorMapUI(axisId, term, choiceId, questionId, existingVector) {
    // この関数は非推奨です。理解階層設定UIを使用してください。
    return null;
    const card = document.createElement('div');
    card.className = 'vector-map-card';
    card.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #fafafa; border: 1px solid #ddd; border-radius: 8px;';
    card.setAttribute('data-axis', axisId);
    card.setAttribute('data-choice', choiceId);
    
    const termName = escapeHtml(term.name || axisId);
    const definition = escapeHtml(term.definition || '（説明なし）');
    
    // 既存のベクトル値を取得（互換性: vector_scores または vector）
    let currentX = 0;
    let currentY = 0;
    if (existingVector && existingVector[axisId]) {
        const vec = existingVector[axisId];
        if (typeof vec === 'object' && vec.x !== undefined && vec.y !== undefined) {
            currentX = Math.max(-1, Math.min(1, vec.x));
            currentY = Math.max(-1, Math.min(1, vec.y));
        } else if (typeof vec === 'number') {
            // 旧形式（-1/0/+1）の互換性
            currentX = vec;
            currentY = 0;
        }
    }
    
    // SVGサイズ
    const size = 200;
    const center = size / 2;
    const scale = center - 20; // マージン20px
    
    // SVG座標から論理座標への変換
    const svgX = center + currentX * scale;
    const svgY = center - currentY * scale; // Y軸は反転
    
    const uniqueId = `${questionId}-${choiceId}-${axisId}`.replace(/[^a-zA-Z0-9-]/g, '_');
    
    card.innerHTML = `
        <div style="margin-bottom: 10px;">
            <div style="font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 4px;">${termName}</div>
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 8px;">${definition}</div>
            <div style="font-size: 0.85rem; color: #888;">
                座標: (<span id="coord-x-${uniqueId}">${currentX.toFixed(2)}</span>, <span id="coord-y-${uniqueId}">${currentY.toFixed(2)}</span>)
            </div>
        </div>
        <div style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
            <svg id="vector-map-${uniqueId}" width="${size}" height="${size}" style="display: block;">
                <!-- グリッド線 -->
                <line x1="${center}" y1="0" x2="${center}" y2="${size}" stroke="#ddd" stroke-width="1"/>
                <line x1="0" y1="${center}" x2="${size}" y2="${center}" stroke="#ddd" stroke-width="1"/>
                <!-- 象限の境界線 -->
                <line x1="0" y1="${center - scale}" x2="${size}" y2="${center - scale}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <line x1="0" y1="${center + scale}" x2="${size}" y2="${center + scale}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <line x1="${center - scale}" y1="0" x2="${center - scale}" y2="${size}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <line x1="${center + scale}" y1="0" x2="${center + scale}" y2="${size}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <!-- 軸ラベル -->
                <text x="${size - 5}" y="${center - 5}" text-anchor="end" font-size="10" fill="#666">強まる</text>
                <text x="5" y="${center - 5}" text-anchor="start" font-size="10" fill="#666">弱まる</text>
                <text x="${center + 5}" y="15" text-anchor="start" font-size="10" fill="#666">深まる</text>
                <text x="${center + 5}" y="${size - 5}" text-anchor="start" font-size="10" fill="#666">浅まる</text>
                <!-- ドラッグ可能な点 -->
                <circle id="vector-point-${uniqueId}" 
                        cx="${svgX}" cy="${svgY}" 
                        r="8" 
                        fill="#4a90e2" 
                        stroke="#2d5aa0" 
                        stroke-width="2"
                        style="cursor: move;"
                        data-axis="${axisId}"
                        data-choice="${choiceId}"
                        data-question="${questionId}"/>
            </svg>
        </div>
    `;
    
    return card;
}

// ベクトル設定UIは削除されました（理解階層設定UIに置き換え）
function renderVectorAxisUI(glossaryTerms, choiceId, questionId, existingVector) {
    // この関数は非推奨です。理解階層設定UIを使用してください。
    return;
    const container = document.getElementById(`vectorAxisList-${choiceId}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!glossaryTerms || Object.keys(glossaryTerms).length === 0) {
        container.innerHTML = '<div style="padding: 10px; background: #fff3cd; border-radius: 8px;">評価軸が見つかりません。</div>';
        return;
    }
    
    Object.values(glossaryTerms).forEach(function(term) {
        if (!term || !term.id) return;
        
        // term.idから評価軸キーを取得（例: "concept.logic" → "logic"）
        const axisId = term.id.split('.').pop();
        
        const card = buildVectorMapUI(axisId, term, choiceId, questionId, existingVector);
        container.appendChild(card);
        
        // ドラッグイベントを設定
        setupVectorMapDrag(questionId, choiceId, axisId);
    });
}

// 2Dベクトル地図のドラッグ操作を設定
function setupVectorMapDrag(questionId, choiceId, axisId) {
    const uniqueId = `${questionId}-${choiceId}-${axisId}`.replace(/[^a-zA-Z0-9-]/g, '_');
    const pointId = `vector-point-${uniqueId}`;
    const svgId = `vector-map-${uniqueId}`;
    
    // 少し遅延させてDOM要素が確実に存在するようにする
    setTimeout(function() {
        const point = document.getElementById(pointId);
        const svg = document.getElementById(svgId);
        if (!point || !svg) {
            console.warn('Vector map elements not found:', pointId, svgId);
            return;
        }
        
        const size = 200;
        const center = size / 2;
        const scale = center - 20;
        
        let isDragging = false;
        
        // 座標変換: SVG座標 → 論理座標 (-1〜+1)
        function svgToLogical(svgX, svgY) {
            const x = (svgX - center) / scale;
            const y = (center - svgY) / scale; // Y軸は反転
            return {
                x: Math.max(-1, Math.min(1, x)),
                y: Math.max(-1, Math.min(1, y))
            };
        }
        
        // 座標変換: 論理座標 → SVG座標
        function logicalToSvg(logicalX, logicalY) {
            return {
                x: center + logicalX * scale,
                y: center - logicalY * scale
            };
        }
        
        // マウスダウン
        point.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isDragging = true;
            point.style.cursor = 'grabbing';
        });
        
        // マウスムーブ
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const rect = svg.getBoundingClientRect();
            const svgX = e.clientX - rect.left;
            const svgY = e.clientY - rect.top;
            
            const logical = svgToLogical(svgX, svgY);
            
            // 点の位置を更新
            const svgPos = logicalToSvg(logical.x, logical.y);
            point.setAttribute('cx', svgPos.x);
            point.setAttribute('cy', svgPos.y);
            
            // 座標表示を更新
            const coordX = document.getElementById(`coord-x-${uniqueId}`);
            const coordY = document.getElementById(`coord-y-${uniqueId}`);
            if (coordX) coordX.textContent = logical.x.toFixed(2);
            if (coordY) coordY.textContent = logical.y.toFixed(2);
            
            // ベクトル値を更新
            updateVectorMapValue(questionId, choiceId, axisId, logical.x, logical.y);
        }
        
        // マウスアップ
        function handleMouseUp() {
            if (isDragging) {
                isDragging = false;
                point.style.cursor = 'move';
            }
        }
        
        // グローバルイベントリスナー
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // SVG全体をクリックしてもドラッグできるようにする（オプション）
        svg.addEventListener('click', function(e) {
            if (e.target === svg || e.target.tagName === 'line' || e.target.tagName === 'text') {
                const rect = svg.getBoundingClientRect();
                const svgX = e.clientX - rect.left;
                const svgY = e.clientY - rect.top;
                
                const logical = svgToLogical(svgX, svgY);
                const svgPos = logicalToSvg(logical.x, logical.y);
                
                point.setAttribute('cx', svgPos.x);
                point.setAttribute('cy', svgPos.y);
                
                const coordX = document.getElementById(`coord-x-${uniqueId}`);
                const coordY = document.getElementById(`coord-y-${uniqueId}`);
                if (coordX) coordX.textContent = logical.x.toFixed(2);
                if (coordY) coordY.textContent = logical.y.toFixed(2);
                
                updateVectorMapValue(questionId, choiceId, axisId, logical.x, logical.y);
            }
        });
    }, 100);
}

// 2Dベクトル地図の値を更新
function updateVectorMapValue(questionId, choiceId, axisId, x, y) {
    const question = window.gameData.questions.find(function(q) { return q.id === questionId; });
    if (!question) return;
    
    // vector オブジェクトを初期化（vector_scores との互換性も保つ）
    if (!question.vector) {
        question.vector = {};
    }
    if (!question.vector[choiceId]) {
        question.vector[choiceId] = {};
    }
    
    // 値が (0, 0) の場合は削除（影響なし）
    if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) {
        delete question.vector[choiceId][axisId];
    } else {
        question.vector[choiceId][axisId] = { x: x, y: y };
    }
    
    // 空のvectorの場合は削除
    if (Object.keys(question.vector[choiceId]).length === 0) {
        delete question.vector[choiceId];
    }
    
    // 空のvectorの場合は削除
    if (Object.keys(question.vector).length === 0) {
        delete question.vector;
    }
    
    // 互換性: vector_scores も更新（旧形式）
    if (!question.vector_scores) {
        question.vector_scores = {};
    }
    if (!question.vector_scores[choiceId]) {
        question.vector_scores[choiceId] = {};
    }
    
    // x値のみを vector_scores に保存（後方互換性）
    if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) {
        delete question.vector_scores[choiceId][axisId];
    } else {
        // x値を -1/0/+1 に丸める（旧形式との互換性）
        const roundedX = Math.round(x);
        question.vector_scores[choiceId][axisId] = roundedX;
    }
    
    updateVectorJson(question);
    if (typeof updateUI === 'function') {
    updateUI();
    }
    if (typeof showPreview === 'function') {
    showPreview();
    }
}

// 通常クイズ用の評価軸スコアを更新（後方互換性のため残す）
function updateVectorAxisScore(questionId, choiceId, axis, value) {
    // 旧形式（-1/0/+1）から新形式（{x, y}）に変換
    updateVectorMapValue(questionId, choiceId, axis, value, 0);
}

// 通常クイズ用のベクトルJSONを更新（詳細表示用）
function updateVectorJson(question) {
    const jsonContainer = document.getElementById('vectorSettingJson');
    if (!jsonContainer) return;
    
    // 新形式（vector）を優先表示、なければ旧形式（vector_scores）
    const vectorData = question.vector || question.vector_scores || {};
    jsonContainer.textContent = JSON.stringify(vectorData, null, 2);
}

// 通常クイズ用のベクトルスコアを収集
function collectVectorScores(choices) {
    const result = {};
    
    choices.forEach(function(choice) {
        const choiceId = choice.id || choice.value || '';
        if (!choiceId) return;
        
        const container = document.getElementById(`vectorAxisList-${choiceId}`);
        if (!container) return;
        
        const cards = container.querySelectorAll('.score-axis-card');
        const vector = {};
        
        cards.forEach(function(card) {
            const axis = card.getAttribute('data-axis');
            const selected = card.querySelector(`input[name="${choiceId}-${axis}"]:checked`);
            if (selected) {
                const value = Number(selected.value);
                if (value !== 0) {
                    vector[axis] = value;
                }
            }
        });
        
        if (Object.keys(vector).length > 0) {
            result[choiceId] = vector;
        }
    });
    
    return result;
}

function renderDiagnosticNextList(question) {
    const container = document.getElementById('diagnosticNextList');
    if (!container) return;
    const nextEntries = Object.entries(question.next || {});
    if (nextEntries.length === 0) {
        container.innerHTML = `<div style="padding: 10px; background: #edf2f7; border-radius: 8px;">分岐が設定されていません（設定しない場合は自動で次の質問へ進みます）。</div>`;
        return;
    }
    container.innerHTML = nextEntries.map(([key, value]) => {
        const encodedKey = encodeURIComponent(key);
        return `
            <div class="choice-item" style="flex-direction: column; gap: 6px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="flex: 0 0 180px;">
                        <small>回答キー</small>
                        <input type="text" value="${escapeHtml(key)}" onchange="updateDiagnosticNextKey('${question.id}', '${encodedKey}', this.value)">
                    </div>
                    <div style="flex: 1;">
                        <small>遷移先</small>
                        <select onchange="updateDiagnosticNextValue('${question.id}', '${encodedKey}', this.value)" style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            ${getNextNodeOptions(value)}
                        </select>
                    </div>
                    <div>
                        <button type="button" onclick="removeDiagnosticNext('${question.id}', '${encodedKey}')">削除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 結果エディタを表示
function showResultEditor(result) {
    const editorContent = document.getElementById('editorContent');
    editorContent.innerHTML = `
        <div class="form-group">
            <label>タイトル</label>
            <input type="text" id="resultTitle" value="${escapeHtml(result.title)}" 
                   onchange="updateResultProperty('${result.id}', 'title', this.value)">
        </div>
        
        <div class="form-group">
            <label>結果テキスト</label>
            <textarea id="resultText" 
                      onchange="updateResultProperty('${result.id}', 'text', this.value)">${escapeHtml(result.text)}</textarea>
        </div>
        
        <div class="form-group">
            <label>画像ファイル名（オプション）</label>
            <input type="text" id="resultImage" value="${escapeHtml(result.image)}" 
                   placeholder="例: attention_type.png"
                   onchange="updateResultProperty('${result.id}', 'image', this.value)">
        </div>
        
        <div class="form-group">
            <label>URL（オプション）</label>
            <input type="text" id="resultUrl" value="${escapeHtml(result.url)}" 
                   placeholder="例: https://example.com"
                   onchange="updateResultProperty('${result.id}', 'url', this.value)">
        </div>
        
        <div class="form-group">
            <label>ボタンテキスト（URLがある場合）</label>
            <input type="text" id="resultButtonText" value="${escapeHtml(result.buttonText)}" 
                   placeholder="例: 公式サイトを見る"
                   onchange="updateResultProperty('${result.id}', 'buttonText', this.value)">
        </div>
        
        <div class="form-group">
            <button class="btn btn-danger" onclick="deleteNode('${result.id}')">🗑️ この結果を削除</button>
        </div>
    `;
}

// 統合選択肢カードUIを表示
// 単一の選択肢をレンダリングする関数
function renderChoice(choice) {
    const div = document.createElement("div");
    div.className = "choice-card";

    // measure色帯を決定（最初のmeasureが優先、なければ識別をデフォルト）
    const choiceMeasure = Array.isArray(choice.measure) ? choice.measure : [];
    const firstMeasure = choiceMeasure.length > 0 ? choiceMeasure[0] : '識別';
    // CSSクラス名を生成（日本語measure名から）
    const measureClassMap = {
        '識別': 'measure-identify',
        '説明': 'measure-explain',
        '適用': 'measure-apply',
        '区別': 'measure-differentiate',
        '転移': 'measure-transfer',
        '構造化': 'measure-structure'
    };
    const measureClass = measureClassMap[firstMeasure] || 'measure-identify';

    const bar = document.createElement("div");
    bar.className = "choice-measure " + measureClass;
    div.appendChild(bar);

    const text = document.createElement("div");
    text.innerText = choice.text || '';
    div.appendChild(text);

    return div;
}

function renderChoices(question) {
    const container = document.getElementById('choicesContainer');
    if (!container) {
        // フォールバック: 既存のchoicesListもサポート
        if (typeof updateChoicesList === 'function') {
            return updateChoicesList(question);
        }
        return;
    }
    
    container.innerHTML = '';
    
    if (!Array.isArray(question.choices)) {
        question.choices = [];
    }
    
    const masteryLevels = window.MASTERY_LEVELS || ['識別', '説明', '適用', '区別', '転移', '構造化'];
    
    question.choices.forEach((choice, index) => {
        const choiceId = choice.id || choice.value || `choice_${index}`;
        if (!choice.id && !choice.value) {
            choice.id = choiceId;
        }
        
        const choiceMeasure = Array.isArray(choice.measure) ? choice.measure : [];
        const isCorrect = choice.correct === true || choice.isCorrect === true;
        const misconception = choice.misconception || '';
        
        const div = document.createElement('div');
        div.className = 'choice-card';
        div.dataset.index = index;
        div.dataset.choiceId = choiceId;
        
        // measure色帯を決定（最初のmeasureが優先、なければ識別をデフォルト）
        const firstMeasure = choiceMeasure.length > 0 ? choiceMeasure[0] : '識別';
        // CSSクラス名を生成（日本語measure名から）
        const measureClassMap = {
            '識別': 'measure-identify',
            '説明': 'measure-explain',
            '適用': 'measure-apply',
            '区別': 'measure-differentiate',
            '転移': 'measure-transfer',
            '構造化': 'measure-structure'
        };
        const measureClass = measureClassMap[firstMeasure] || 'measure-identify';
        
        div.innerHTML = `
            <div class="choice-measure-tag ${measureClass}"></div>
            <div class="choice-card-header">
                <span class="choice-handle" title="ドラッグして並び替え">≡</span>
                <input class="choice-text" type="text"
                       placeholder="選択肢${index + 1}"
                       value="${escapeHtml(choice.text || '')}">
                <button class="btn btn-danger delete-choice-btn">削除</button>
            </div>
            
            <div class="mt-2">
                <label style="display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" class="choice-correct" ${isCorrect ? 'checked' : ''}>
                    正解
                </label>
            </div>
            
            <div class="mt-2">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #2d3748;">誤概念タグ：</label>
                <input class="choice-misconception" type="text"
                       placeholder="例：交絡因子"
                       value="${escapeHtml(misconception)}">
            </div>
            
            <div class="mt-2">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">理解階層（measure）:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${masteryLevels.map(k => `
                        <label class="measure-tag m${k}" style="display: inline-flex; align-items: center; gap: 4px;">
                            <input type="checkbox"
                                   class="choice-measure"
                                   data-measure="${k}"
                                   ${choiceMeasure.includes(k) ? 'checked' : ''}>
                            ${k}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    // イベント設定
    activateChoiceEvents(question);
    
    // ドラッグ&ドロップで並び替え
    if (typeof Sortable !== 'undefined') {
        // 既存のSortableインスタンスを破棄
        if (container._sortable) {
            container._sortable.destroy();
        }
        
        container._sortable = new Sortable(container, {
            handle: '.choice-handle',
            animation: 150,
            onEnd: function(evt) {
                const moved = question.choices.splice(evt.oldIndex, 1)[0];
                question.choices.splice(evt.newIndex, 0, moved);
                renderChoices(question);
                if (typeof updateUI === 'function') updateUI();
                if (typeof showPreview === 'function') showPreview();
            }
        });
    }
    
    // 理解階層設定UIを再描画（通常クイズの場合のみ）
    if (question.type !== 'diagnostic_question') {
        setTimeout(function() {
            if (typeof window.updateChoiceMasteryList === 'function') {
                window.updateChoiceMasteryList(question);
            }
        }, 100);
    }
}

// 選択肢カードのイベントを設定
function activateChoiceEvents(question) {
    const container = document.getElementById('choicesContainer');
    if (!container) return;
    
    // 削除ボタン
    container.querySelectorAll('.delete-choice-btn').forEach((btn, i) => {
        btn.onclick = function() {
            question.choices.splice(i, 1);
            renderChoices(question);
            if (typeof updateUI === 'function') updateUI();
            if (typeof showPreview === 'function') showPreview();
        };
    });
    
    // テキスト編集
    container.querySelectorAll('.choice-text').forEach((input, i) => {
        input.oninput = function(e) {
            if (question.choices[i]) {
                question.choices[i].text = e.target.value;
                if (typeof updateUI === 'function') updateUI();
                if (typeof showPreview === 'function') showPreview();
            }
        };
    });
    
    // 正解チェックボックス
    container.querySelectorAll('.choice-correct').forEach((input, i) => {
        input.onchange = function(e) {
            if (question.choices[i]) {
                question.choices[i].correct = e.target.checked;
                question.choices[i].isCorrect = e.target.checked; // 後方互換性
                if (typeof updateUI === 'function') updateUI();
                if (typeof showPreview === 'function') showPreview();
            }
        };
    });
    
    // 誤概念タグ
    container.querySelectorAll('.choice-misconception').forEach((input, i) => {
        input.oninput = function(e) {
            if (question.choices[i]) {
                const value = e.target.value.trim();
                question.choices[i].misconception = value || null;
                if (typeof updateUI === 'function') updateUI();
                if (typeof showPreview === 'function') showPreview();
            }
        };
    });
    
    // measureチェックボックス
    container.querySelectorAll('.choice-measure').forEach((input) => {
        input.onchange = function(e) {
            const card = e.target.closest('.choice-card');
            if (!card) return;
            const idx = parseInt(card.dataset.index, 10);
            if (isNaN(idx) || !question.choices[idx]) return;
            
            const measure = e.target.dataset.measure;
            const choice = question.choices[idx];
            
            if (!Array.isArray(choice.measure)) {
                choice.measure = [];
            }
            
            if (e.target.checked) {
                if (!choice.measure.includes(measure)) {
                    choice.measure.push(measure);
                }
            } else {
                choice.measure = choice.measure.filter(m => m !== measure);
            }
            
            if (typeof updateUI === 'function') updateUI();
            if (typeof showPreview === 'function') showPreview();
        };
    });
}

// 選択肢リストを更新（後方互換性のため残す）
function updateChoicesList(question) {
    // 新しい統合UIを優先
    const container = document.getElementById('choicesContainer');
    if (container && typeof renderChoices === 'function') {
        return renderChoices(question);
    }
    
    const choicesList = document.getElementById('choicesList');
    if (!choicesList) return;
    choicesList.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-item';
        
        // 選択肢IDを生成（既存のid、value、またはインデックスベース）
        const choiceId = choice.id || choice.value || `choice_${index}`;
        if (!choice.id && !choice.value) {
            choice.id = choiceId;
        }
        
        // 選択肢のmeasureを取得（既存のmeasureまたは空配列）
        const choiceMeasure = Array.isArray(choice.measure) ? choice.measure : [];
        const masteryLevels = window.MASTERY_LEVELS || ['識別', '説明', '適用', '区別', '転移', '構造化'];
        
        choiceDiv.setAttribute('data-choice-index', index);
        choiceDiv.setAttribute('data-choice-id', choiceId);
        choiceDiv.innerHTML = `
            <span class="drag-handle" title="ドラッグして並び替え">☰</span>
            <input type="text" value="${escapeHtml(choice.text)}" 
                   placeholder="選択肢 ${index + 1}"
                   class="choice-text"
                   onchange="updateChoice('${question.id}', ${index}, 'text', this.value)">
            <select onchange="updateChoiceNext('${question.id}', ${index}, this.value)" 
                    style="padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; flex: 1;">
                ${getNextNodeOptions(choice.nextId)}
            </select>
            ${question.enableGrading ? `
            <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px; background: #f7fafc; border-radius: 8px; margin-top: 10px;">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" ${choice.isCorrect || choice.correct ? 'checked' : ''} 
                           onchange="updateChoiceCorrect('${question.id}', ${index}, this.checked)">
                    正解
                </label>
                <label style="display: flex; flex-direction: column; gap: 5px;">
                    <span style="font-size: 0.9em; color: #4a5568;">誤概念タグ:</span>
                    <input type="text" 
                           value="${escapeHtml(choice.misconception || '')}" 
                           placeholder="例: 交絡因子"
                           class="choice-misconception"
                           onchange="updateChoiceMisconception('${question.id}', ${index}, this.value)"
                           style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px;">
                </label>
                <div class="choice-measure" style="display: flex; flex-direction: column; gap: 5px;">
                    <span style="font-size: 0.9em; color: #4a5568; font-weight: 600;">理解階層:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${masteryLevels.map(level => `
                            <label class="measure-tag m${level}" style="display: inline-flex; align-items: center; gap: 4px;">
                                <input type="checkbox" 
                                       data-level="${level}"
                                       ${choiceMeasure.includes(level) ? 'checked' : ''}
                                       onchange="updateChoiceMeasure('${question.id}', ${index}, '${level}', this.checked)">
                                ${level}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>` : ''}
            <button onclick="removeChoice('${question.id}', ${index})">削除</button>
        `;
        choicesList.appendChild(choiceDiv);
    });
    
    // ドラッグ＆ドロップで並び替え可能にする
    if (typeof Sortable !== 'undefined') {
        // 既存のSortableインスタンスを破棄
        if (choicesList._sortable) {
            choicesList._sortable.destroy();
        }
        
        new Sortable(choicesList, {
            animation: 150,
            handle: '.drag-handle',
            onEnd: function(evt) {
                // 並び順が変わったら選択肢の順序を更新
                const items = Array.from(choicesList.children);
                const newChoices = [];
                
                // 各アイテムから選択肢データを取得
                items.forEach(function(item) {
                    const choiceId = item.getAttribute('data-choice-id');
                    if (choiceId) {
                        // 既存の選択肢から該当するものを検索
                        const existingChoice = question.choices.find(function(c) {
                            return (c.id === choiceId) || (c.value && String(c.value) === choiceId) || 
                                   (c.id && c.id === choiceId);
                        });
                        if (existingChoice) {
                            newChoices.push(existingChoice);
                        }
                    }
                });
                
                // 選択肢の順序を更新
                if (newChoices.length === question.choices.length) {
                    question.choices = newChoices;
                    
                    // UIを再描画
                    updateChoicesList(question);
                    updateUI();
                    showPreview();
                }
            }
        });
    }
    
    // 理解階層設定UIを再描画（通常クイズの場合のみ）
    if (question.type !== 'diagnostic_question') {
        setTimeout(function() {
            if (typeof window.updateChoiceMasteryList === 'function') {
                window.updateChoiceMasteryList(question);
            }
        }, 100);
    }
}

// 次のノードオプションを取得
function getNextNodeOptions(currentNextId) {
    let options = '';
    
    // 「なし」オプションを最初に追加
    options += `<option value="" ${!currentNextId ? 'selected' : ''}>（なし）</option>`;
    
    // 質問ノード（現在のノードは除外）
    gameData.questions.forEach(q => {
        if (q.id === selectedNodeId) return; // 現在編集中のノードは除外
        const selected = q.id === currentNextId ? 'selected' : '';
        const displayText = q.text || q.title || '無題';
        options += `<option value="${q.id}" ${selected}>❓ 質問: ${escapeHtml(displayText.substring(0, 30))}</option>`;
    });
    
    // 結果ノード
    gameData.results.forEach(r => {
        const selected = r.id === currentNextId ? 'selected' : '';
        const displayText = r.text || r.title || '無題';
        options += `<option value="${r.id}" ${selected}>✅ 結果: ${escapeHtml(displayText.substring(0, 30))}</option>`;
    });
    
    return options;
}

// 質問プロパティを更新
function updateQuestionProperty(questionId, property, value) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (question) {
        question[property] = value;
        updateUI();
        showPreview();
    }
}

function toggleGrading(questionId, enabled) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question) return;
    question.enableGrading = Boolean(enabled);
    if (question.enableGrading) {
        question.choices = Array.isArray(question.choices) ? question.choices : [];
        if (question.choices.length === 0) {
            question.choices.push({ text: '選択肢1', value: 0, nextId: null, isCorrect: true });
        } else if (!question.choices.some(choice => choice.isCorrect)) {
            question.choices[0].isCorrect = true;
        }
    } else {
        question.choices.forEach(choice => choice.isCorrect = false);
    }
    updateUI();
    showPreview();
}

function updateChoiceCorrect(questionId, index, isCorrect) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question || !Array.isArray(question.choices) || !question.choices[index]) return;
    const choice = question.choices[index];
    choice.isCorrect = Boolean(isCorrect);
    choice.correct = Boolean(isCorrect); // 後方互換性のため両方設定
    updateUI();
    showPreview();
}

// 選択肢の誤概念タグを更新
function updateChoiceMisconception(questionId, index, misconception) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question || !Array.isArray(question.choices) || !question.choices[index]) return;
    const choice = question.choices[index];
    choice.misconception = misconception && misconception.trim() ? misconception.trim() : null;
    updateUI();
    showPreview();
}

// 選択肢の理解階層measureを更新
function updateChoiceMeasure(questionId, index, level, checked) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question || !Array.isArray(question.choices) || !question.choices[index]) return;
    const choice = question.choices[index];
    
    // measure配列を初期化（存在しない場合）
    if (!Array.isArray(choice.measure)) {
        choice.measure = [];
    }
    
    if (checked) {
        // 追加（重複チェック）
        if (!choice.measure.includes(level)) {
            choice.measure.push(level);
        }
    } else {
        // 削除
        const levelIndex = choice.measure.indexOf(level);
        if (levelIndex !== -1) {
            choice.measure.splice(levelIndex, 1);
        }
    }
    
    updateUI();
    showPreview();
}

function updateDiagnosticQuestionProperty(questionId, property, value) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question) return;
    
    if (property === 'question_type') {
        question.question_type = value;
        if (value === 'yes_no') {
            question.choices = [
                { id: 'yes', text: 'はい' },
                { id: 'no', text: 'いいえ' }
            ];
        } else if (value === 'single_choice' || value === 'multiple_choice') {
            if (!Array.isArray(question.choices) || question.choices.length === 0) {
                question.choices = [
                    { id: 'a', text: '選択肢A' },
                    { id: 'b', text: '選択肢B' }
                ];
            }
        } else {
            question.choices = [];
        }
        if (value === 'scale') {
            question.scale = question.scale || { min: 0, max: 10, step: 1 };
        }
    } else {
        question[property] = value;
    }
    
    updateUI();
    showPreview();
}

function updateDiagnosticScale(questionId, field, value) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question) return;
    question.scale = question.scale || { min: 0, max: 10, step: 1 };
    question.scale[field] = Number(value);
    updateUI();
    showPreview();
}

function addDiagnosticChoice(questionId) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question) return;
    question.choices = Array.isArray(question.choices) ? question.choices : [];
    const nextLabel = String.fromCharCode(97 + question.choices.length);
    question.choices.push({ id: nextLabel, text: `選択肢 ${question.choices.length + 1}` });
    
    // スコアリングUIを再描画
    setTimeout(function() {
        renderDiagnosticScoringList(question);
    }, 100);
    
    updateUI();
    showPreview();
}

function updateDiagnosticChoice(questionId, index, field, value) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !Array.isArray(question.choices) || !question.choices[index]) return;
    question.choices[index][field] = value;
    
    // choice_idが変更された場合はスコアリングUIを再描画
    if (field === 'id') {
        setTimeout(function() {
            renderDiagnosticScoringList(question);
        }, 100);
    }
    
    updateUI();
    showPreview();
}

function removeDiagnosticChoice(questionId, index) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !Array.isArray(question.choices) || !question.choices[index]) return;
    const choiceId = question.choices[index].id;
    question.choices.splice(index, 1);
    
    // 関連するスコアリングルールも削除
    if (Array.isArray(question.scoring)) {
        question.scoring = question.scoring.filter(r => r.choice_id !== choiceId);
    }
    
    // スコアリングUIを再描画
    setTimeout(function() {
        renderDiagnosticScoringList(question);
    }, 100);
    
    updateUI();
    showPreview();
}

function addDiagnosticScoring(questionId) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question) return;
    question.scoring = Array.isArray(question.scoring) ? question.scoring : [];
    question.scoring.push({
        choice_id: '',
        vector: { logic: 0 }
    });
    updateUI();
    showPreview();
}

function updateDiagnosticScoring(questionId, index, field, value) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !Array.isArray(question.scoring) || !question.scoring[index]) return;
    question.scoring[index][field] = value;
    updateUI();
    showPreview();
}

function updateDiagnosticScoringVector(questionId, index, jsonText) {
    try {
        const vector = JSON.parse(jsonText);
        updateDiagnosticScoring(questionId, index, 'vector', vector);
    } catch (error) {
        alert('ベクトルのJSON形式が正しくありません。');
    }
}

function removeDiagnosticScoring(questionId, index) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !Array.isArray(question.scoring) || !question.scoring[index]) return;
    question.scoring.splice(index, 1);
    updateUI();
    showPreview();
}

function addDiagnosticNext(questionId) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question) return;
    question.next = question.next || {};
    const key = `key_${Object.keys(question.next).length + 1}`;
    question.next[key] = '';
    updateUI();
    showPreview();
}

function updateDiagnosticNextKey(questionId, encodedOldKey, newKey) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !question.next) return;
    const oldKey = decodeURIComponent(encodedOldKey);
    if (newKey === oldKey) return;
    if (!newKey) {
        alert('キーは空にできません。');
        return;
    }
    if (question.next[newKey]) {
        alert('同じキーが既に存在します。');
        return;
    }
    question.next[newKey] = question.next[oldKey];
    delete question.next[oldKey];
    updateUI();
    showPreview();
}

function updateDiagnosticNextValue(questionId, encodedKey, nextId) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !question.next) return;
    const key = decodeURIComponent(encodedKey);
    question.next[key] = nextId || '';
    updateUI();
    showPreview();
}

function removeDiagnosticNext(questionId, encodedKey) {
    const question = gameData.questions.find(q => q.id === questionId && q.type === 'diagnostic_question');
    if (!question || !question.next) return;
    const key = decodeURIComponent(encodedKey);
    delete question.next[key];
    updateUI();
    showPreview();
}

// 背景画像プレビューを更新
function updateBackgroundImagePreview(questionId) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const select = document.getElementById('backgroundImage');
    const previewDiv = document.getElementById('backgroundImagePreview');
    const previewImg = document.getElementById('backgroundImagePreviewImg');
    
    if (select && select.value) {
        question.backgroundImage = select.value;
        const imageUrl = getCustomImageUrl(select.value);
        if (previewImg) {
            previewImg.src = imageUrl;
            previewImg.onerror = function() {
                this.style.display = 'none';
                if (previewDiv) previewDiv.style.display = 'none';
            };
            previewImg.onload = function() {
                this.style.display = 'block';
                if (previewDiv) previewDiv.style.display = 'block';
            };
        }
        if (previewDiv) previewDiv.style.display = 'block';
    } else {
        question.backgroundImage = '';
        if (previewDiv) previewDiv.style.display = 'none';
    }
    
    updateQuestionStyle(questionId);
}

// 質問スタイルを更新（GUI設定から自動的にCSSを生成）
function updateQuestionStyle(questionId) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // 背景タイプを取得（questionオブジェクトから、またはUIから）
    let backgroundType = question.backgroundType || 'color';
    const backgroundTypeEl = document.getElementById('backgroundType');
    if (backgroundTypeEl) {
        backgroundType = backgroundTypeEl.value;
        question.backgroundType = backgroundType;
        
        const backgroundColorGroup = document.getElementById('backgroundColorGroup');
        const backgroundImageGroup = document.getElementById('backgroundImageGroup');
        const gradientGroup = document.getElementById('gradientGroup');
        
        if (backgroundColorGroup) backgroundColorGroup.style.display = backgroundType === 'color' ? 'block' : 'none';
        if (backgroundImageGroup) backgroundImageGroup.style.display = backgroundType === 'image' ? 'block' : 'none';
        if (gradientGroup) gradientGroup.style.display = backgroundType === 'gradient' ? 'block' : 'none';
    }
    
    // 各設定値を取得
    const backgroundColorEl = document.getElementById('backgroundColor');
    if (backgroundColorEl) {
        question.backgroundColor = backgroundColorEl.value || question.backgroundColor || '#ffffff';
        const backgroundColorTextEl = document.getElementById('backgroundColorText');
        if (backgroundColorTextEl) backgroundColorTextEl.value = question.backgroundColor;
    }
    
    const backgroundImageEl = document.getElementById('backgroundImage');
    if (backgroundImageEl) {
        question.backgroundImage = backgroundImageEl.value || '';
    }
    
    const gradientColor1El = document.getElementById('gradientColor1');
    if (gradientColor1El) {
        question.gradientColor1 = gradientColor1El.value || question.gradientColor1 || '#667eea';
        const gradientColor1TextEl = document.getElementById('gradientColor1Text');
        if (gradientColor1TextEl) gradientColor1TextEl.value = question.gradientColor1;
    }
    
    const gradientColor2El = document.getElementById('gradientColor2');
    if (gradientColor2El) {
        question.gradientColor2 = gradientColor2El.value || question.gradientColor2 || '#764ba2';
        const gradientColor2TextEl = document.getElementById('gradientColor2Text');
        if (gradientColor2TextEl) gradientColor2TextEl.value = question.gradientColor2;
    }
    
    question.questionFont = document.getElementById('questionFont').value || '';
    question.questionFontSize = document.getElementById('questionFontSize').value + 'em';
    question.questionTextColor = document.getElementById('questionTextColor').value || question.questionTextColor || '#2d3748';
    document.getElementById('questionTextColorText').value = question.questionTextColor;
    document.getElementById('questionTextColor').value = question.questionTextColor;
    
    question.choiceFont = document.getElementById('choiceFont').value || '';
    question.choiceFontSize = document.getElementById('choiceFontSize').value + 'em';
    question.choiceButtonColor = document.getElementById('choiceButtonColor').value || question.choiceButtonColor || '#667eea';
    document.getElementById('choiceButtonColorText').value = question.choiceButtonColor;
    document.getElementById('choiceButtonColor').value = question.choiceButtonColor;
    
    question.choiceButtonTextColor = document.getElementById('choiceButtonTextColor').value || question.choiceButtonTextColor || '#ffffff';
    document.getElementById('choiceButtonTextColorText').value = question.choiceButtonTextColor;
    document.getElementById('choiceButtonTextColor').value = question.choiceButtonTextColor;
    
    // CSSを自動生成
    let css = '';
    
    // 背景設定
    if (backgroundType === 'color') {
        css += `.container { background: ${question.backgroundColor}; }\n`;
    } else if (backgroundType === 'image' && question.backgroundImage) {
        const imageUrl = getCustomImageUrl(question.backgroundImage);
        css += `.container { background-image: url('${imageUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat; }\n`;
    } else if (backgroundType === 'gradient') {
        css += `.container { background: linear-gradient(135deg, ${question.gradientColor1} 0%, ${question.gradientColor2} 100%); }\n`;
    }
    
    // 質問文のスタイル
    if (question.questionFont || question.questionFontSize || question.questionTextColor) {
        css += `.question-text { `;
        if (question.questionFont) css += `font-family: ${question.questionFont}; `;
        if (question.questionFontSize) css += `font-size: ${question.questionFontSize}; `;
        if (question.questionTextColor) css += `color: ${question.questionTextColor}; `;
        css += `}\n`;
    }
    
    // 選択肢ボタンのスタイル
    if (question.choiceFont || question.choiceFontSize || question.choiceButtonColor || question.choiceButtonTextColor) {
        css += `button { `;
        if (question.choiceFont) css += `font-family: ${question.choiceFont}; `;
        if (question.choiceFontSize) css += `font-size: ${question.choiceFontSize}; `;
        if (question.choiceButtonColor) css += `background: ${question.choiceButtonColor}; `;
        if (question.choiceButtonTextColor) css += `color: ${question.choiceButtonTextColor}; `;
        css += `}\n`;
    }
    
    question.customCSS = css;
    
    updateUI();
    showPreview();
}

// 結果プロパティを更新
function updateResultProperty(resultId, property, value) {
    const result = gameData.results.find(r => r.id === resultId);
    if (result) {
        result[property] = value;
        updateUI();
    }
}

// 選択肢を追加
// measure の初期値（v2.0仕様）
const defaultMeasure = {
    "識別": 0,
    "説明": 0,
    "適用": 0,
    "区別": 0,
    "転移": 0,
    "構造化": 0
};

// 新規問題作成（v2.0仕様）
function createNewQuestion() {
    const now = new Date().toISOString();
    return {
        id: "q_" + Date.now(),
        question: "",
        type: "single",
        choices: [],
        measure: { ...defaultMeasure },
        meta: {
            difficulty: "medium",
            rt_expected: 1500,
            created_at: now,
            updated_at: now
        }
    };
}

// UI生成：選択肢（v2.0仕様）
function addChoice(questionId, text = "") {
    const question = (window.gameData || gameData).questions.find(q => q.id === questionId);
    if (question) {
        if (!Array.isArray(question.choices)) {
            question.choices = [];
        }
        const nextValue = question.choices.length;
        const choiceId = "c" + Math.random().toString(36).slice(2);  // v2.0: ランダムID
        question.choices.push({
            id: choiceId,  // v2.0: id必須
            text: text || `選択肢${nextValue + 1}`,
            tags: [],  // v2.0: tags追加
            is_correct: false,  // v2.0: is_correct（旧isCorrect/correctから変更）
            value: nextValue,  // 互換性のため残す
            nextId: null,  // 互換性のため残す
            isCorrect: false,  // 互換性のため残す
            correct: false,  // 互換性のため残す
            misconception: null,  // 互換性のため残す
            measure: [] // 選択肢ごとの理解階層measure
        });
        
        // 新しい統合UIを使用
        if (typeof renderChoices === 'function') {
            renderChoices(question);
        } else {
            updateUI();
        }
        if (typeof showPreview === 'function') showPreview();
        
        // 理解階層設定UIを更新
        if (question.type !== 'diagnostic_question' && typeof window.updateChoiceMasteryList === 'function') {
            setTimeout(() => window.updateChoiceMasteryList(question), 100);
        }
    }
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
    window.renderChoices = renderChoices;
    window.activateChoiceEvents = activateChoiceEvents;
    window.addChoice = addChoice;
    window.updateChoicesList = updateChoicesList; // 後方互換性のため残す
}

// 選択肢を更新
function updateChoice(questionId, choiceIndex, property, value) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (question && question.choices[choiceIndex]) {
        question.choices[choiceIndex][property] = value;
        updateUI();
        showPreview();
    }
}

// 選択肢の次ノードを更新
function updateChoiceNext(questionId, choiceIndex, nextId) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (question && question.choices[choiceIndex]) {
        question.choices[choiceIndex].nextId = nextId || null;
        updateUI();
        showPreview();
    }
}

// 選択肢を削除
function removeChoice(questionId, choiceIndex) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (question && question.choices[choiceIndex]) {
        question.choices.splice(choiceIndex, 1);
        // 値を再割り当て
        question.choices.forEach((choice, index) => {
            choice.value = index;
        });
        updateUI();
        showPreview();
        // 理解階層設定UIを更新
        if (question.type !== 'diagnostic_question' && typeof window.updateChoiceMasteryList === 'function') {
            setTimeout(() => window.updateChoiceMasteryList(question), 100);
        }
    }
}

// ノードを削除
function deleteNode(nodeId) {
    if (!confirm('このノードを削除してもよろしいですか？')) {
        return;
    }
    
    // 質問ノードを削除
    const questionIndex = gameData.questions.findIndex(q => q.id === nodeId);
    if (questionIndex !== -1) {
        // スタートノードの場合はnullに
        if (gameData.startNode === nodeId) {
            gameData.startNode = gameData.questions.length > 1 ? gameData.questions[0].id : null;
        }
        gameData.questions.splice(questionIndex, 1);
    }
    
    // 結果ノードを削除
    const resultIndex = gameData.results.findIndex(r => r.id === nodeId);
    if (resultIndex !== -1) {
        gameData.results.splice(resultIndex, 1);
    }
    
    // 他のノードからの参照を削除
    gameData.questions.forEach(q => {
        q.choices.forEach(choice => {
            if (choice.nextId === nodeId) {
                choice.nextId = null;
            }
        });
    });
    
    selectedNodeId = null;
    updateUI();
}

// プレビューを表示
function showPreview() {
    const previewContent = document.getElementById('previewContent');
    
    if (!selectedNodeId) {
        previewContent.innerHTML = '<div class="empty-state" style="color: #718096;"><p>ノードを選択するとプレビューが表示されます</p></div>';
        return;
    }
    
    const question = gameData.questions.find(q => q.id === selectedNodeId);
    const result = gameData.results.find(r => r.id === selectedNodeId);
    
    if (question) {
        if (question.type === 'diagnostic_question') {
            const diagTypeLabels = {
                'single_choice': '単一選択',
                'multiple_choice': '複数選択',
                'yes_no': 'YES/NO',
                'scale': 'スケール',
                'text': '自由記述'
            };
            const choicesHtml = Array.isArray(question.choices) && question.choices.length > 0
                ? `
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${question.choices.map(choice => `
                            <li><strong>${escapeHtml(choice.id || '')}</strong>: ${escapeHtml(choice.text || '')}</li>
                        `).join('')}
                    </ul>
                `
                : '<p style="color: #718096; margin-top: 5px;">選択肢は設定されていません</p>';
            const scoringHtml = Array.isArray(question.scoring) && question.scoring.length > 0
                ? `
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${question.scoring.map(rule => `
                            <li><strong>${escapeHtml(rule.choice_id || '')}</strong>: ${escapeHtml(JSON.stringify(rule.vector || {}))}</li>
                        `).join('')}
                    </ul>
                `
                : '<p style="color: #718096; margin-top: 5px;">スコア設定はありません</p>';
            const nextEntries = Object.entries(question.next || {});
            const nextHtml = nextEntries.length > 0
                ? `
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${nextEntries.map(([key, value]) => {
                            const targetNode = value ? (gameData.questions.find(q => q.id === value) || gameData.results.find(r => r.id === value)) : null;
                            const targetLabel = targetNode ? (targetNode.type === 'diagnostic_question' ? '🧠 診断' : targetNode.type === 'question' ? '❓ 質問' : '✅ 結果') : '未設定';
                            const targetText = targetNode ? (targetNode.question_text || targetNode.title || targetNode.text || targetNode.id) : (value || '未設定');
                            return `<li><strong>${escapeHtml(key)}</strong> → ${targetLabel}: ${escapeHtml(String(targetText))}</li>`;
                        }).join('')}
                    </ul>
                `
                : '<p style="color: #718096; margin-top: 5px;">分岐設定はありません（次の質問へ自動遷移）</p>';
        
        previewContent.innerHTML = `
            <div class="question-node">
                    <div class="node-title">診断質問プレビュー</div>
                <div style="margin-top: 15px;">
                        <strong>${escapeHtml(question.question_text || '診断質問')}</strong>
                        ${question.description ? `<p style="margin-top: 10px;">${escapeHtml(question.description)}</p>` : ''}
                        <p style="margin-top: 10px;"><strong>質問形式:</strong> ${diagTypeLabels[question.question_type] || question.question_type}</p>
                        ${question.question_type === 'scale' ? `<p>スケール: ${question.scale?.min ?? 0} 〜 ${question.scale?.max ?? 10}（ステップ: ${question.scale?.step ?? 1}）</p>` : ''}
                    <div style="margin-top: 15px;">
                            <strong>選択肢</strong>
                            ${choicesHtml}
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>スコアベクトル</strong>
                            ${scoringHtml}
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>分岐設定</strong>
                            ${nextHtml}
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        // 背景スタイルを生成
        let containerStyle = 'background: #2d3748; padding: 20px; border-radius: 10px; min-height: 200px;';
        if (question.backgroundType === 'color') {
            containerStyle = `background: ${question.backgroundColor || '#ffffff'}; padding: 20px; border-radius: 10px; min-height: 200px;`;
        } else if (question.backgroundType === 'image' && question.backgroundImage) {
            const imageUrl = getCustomImageUrl(question.backgroundImage);
            containerStyle = `background-image: url('${escapeHtml(imageUrl)}'); background-size: cover; background-position: center; background-repeat: no-repeat; padding: 20px; border-radius: 10px; min-height: 200px;`;
        } else if (question.backgroundType === 'gradient') {
            containerStyle = `background: linear-gradient(135deg, ${question.gradientColor1 || '#667eea'} 0%, ${question.gradientColor2 || '#764ba2'} 100%); padding: 20px; border-radius: 10px; min-height: 200px;`;
        }
        
        // 質問文のスタイル
        let questionTextStyle = '';
        if (question.questionFont) questionTextStyle += `font-family: ${escapeHtml(question.questionFont)}; `;
        if (question.questionFontSize) questionTextStyle += `font-size: ${escapeHtml(question.questionFontSize)}; `;
        if (question.questionTextColor) questionTextStyle += `color: ${escapeHtml(question.questionTextColor)}; `;
        
        // 選択肢ボタンのスタイル
        let choiceButtonStyle = '';
        if (question.choiceFont) choiceButtonStyle += `font-family: ${escapeHtml(question.choiceFont)}; `;
        if (question.choiceFontSize) choiceButtonStyle += `font-size: ${escapeHtml(question.choiceFontSize)}; `;
        if (question.choiceButtonColor) choiceButtonStyle += `background: ${escapeHtml(question.choiceButtonColor)}; `;
        if (question.choiceButtonTextColor) choiceButtonStyle += `color: ${escapeHtml(question.choiceButtonTextColor)}; `;
        
        // 選択肢ボタンのHTMLを生成
        const choiceButtons = question.choices.map((choice, i) => {
                            const nextNode = choice.nextId ? 
                                (gameData.questions.find(q => q.id === choice.nextId) || 
                                 gameData.results.find(r => r.id === choice.nextId)) : null;
                            const nextType = nextNode ? (nextNode.type === 'question' ? '❓ 質問' : '✅ 結果') : '';
            const nextText = nextNode ? (nextNode.text || nextNode.title || '無題').substring(0, 20) : '';
            const correctBadge = question.enableGrading && choice.isCorrect ? '<span style="margin-right: 6px; font-size: 0.75em; background: #48bb78; color: white; padding: 2px 6px; border-radius: 999px;">正解</span>' : '';
                            
                            return `
                <div style="margin-bottom: 10px;">
                    <button disabled style="${choiceButtonStyle}padding: 12px 24px; border: none; border-radius: 8px; cursor: default; width: 100%; text-align: center; font-weight: 600; opacity: 0.9;">
                        ${correctBadge}${escapeHtml(choice.text || `選択肢${i+1}`)}
                    </button>
                                    ${choice.nextId ? 
                        `<div style="margin-top: 5px; font-size: 0.75em; color: #48bb78; text-align: center;">
                                            → ${nextType}: ${escapeHtml(nextText)}
                                        </div>` : 
                        '<div style="margin-top: 5px; font-size: 0.75em; color: #e53e3e; text-align: center;">⚠️ 次のノード未設定</div>'
                    }
                </div>
            `;
        }).join('');
        
        // カスタムCSSを適用するためのスタイル要素を追加
        const styleId = 'preview-custom-style';
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = question.customCSS || '';
        
        previewContent.innerHTML = `
            <div style="margin-bottom: 15px; padding: 10px; background: #4a5568; border-radius: 8px; text-align: center; font-weight: 600;">
                質問プレビュー
                    </div>
            <div class="preview-container" style="${containerStyle}">
                <h3 style="margin-bottom: 15px; ${questionTextStyle}">
                    ${escapeHtml(question.title || '無題')}
                </h3>
                <p class="question-text" style="margin-bottom: 20px; ${questionTextStyle}">
                    ${escapeHtml(question.text || '(質問文が未入力)')}
                </p>
                <div style="margin-top: 20px;">
                    ${choiceButtons}
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #2d3748; border-radius: 8px; font-size: 0.85em; color: #a0aec0;">
                <div style="margin-bottom: 5px;"><strong>設定情報:</strong></div>
                <div>背景: ${question.backgroundType === 'color' ? '単色' : question.backgroundType === 'image' ? '画像' : question.backgroundType === 'gradient' ? 'グラデーション' : '未設定'}</div>
                <div>正誤判定: ${question.enableGrading ? '有効' : '無効'}</div>
                ${question.questionFont ? `<div>質問フォント: ${escapeHtml(question.questionFont)}</div>` : ''}
                ${question.choiceFont ? `<div>選択肢フォント: ${escapeHtml(question.choiceFont)}</div>` : ''}
            </div>
        `;
    } else if (result) {
        previewContent.innerHTML = `
            <div style="margin-bottom: 15px; padding: 10px; background: #48bb78; border-radius: 8px; text-align: center; font-weight: 600;">
                結果プレビュー
                </div>
            <div style="background: #2d3748; padding: 20px; border-radius: 10px; min-height: 200px;">
                <h3 style="margin-bottom: 15px; color: white;">${escapeHtml(result.title || '無題')}</h3>
                <p style="margin: 10px 0; color: #e2e8f0;">${escapeHtml(result.text || '(結果テキストが未入力)')}</p>
                ${result.image ? `<p style="margin-top: 10px; color: #a0aec0;">🖼️ 画像: ${escapeHtml(result.image)}</p>` : ''}
                ${result.url ? `<p style="margin-top: 10px; color: #a0aec0;">🔗 URL: ${escapeHtml(result.url)}</p>` : ''}
                ${result.buttonText ? `<p style="margin-top: 10px; color: #a0aec0;">ボタン: ${escapeHtml(result.buttonText)}</p>` : ''}
            </div>
        `;
    }
}

// プロジェクトを保存
function saveProject() {
    // 保存前に選択肢のvectorを設定
    gameData.questions.forEach(function(question) {
        if (question.vector_scores && Array.isArray(question.choices)) {
            question.choices.forEach(function(choice) {
                const choiceId = choice.id || choice.value;
                if (choiceId && question.vector_scores[choiceId]) {
                    // 選択肢オブジェクトにvectorを追加
                    choice.vector = question.vector_scores[choiceId];
                } else {
                    // vector_scoresにない場合は空オブジェクトまたは既存のvectorを保持
                    choice.vector = choice.vector || {};
                }
            });
        } else if (Array.isArray(question.choices)) {
            // vector_scoresがない場合でも、既存のvectorを保持
            question.choices.forEach(function(choice) {
                choice.vector = choice.vector || {};
            });
        }
    });
    
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'game_project.json';
    link.click();
    URL.revokeObjectURL(url);
}

// ============================
// 名前を付けて保存（Save As）
// ============================
window.saveProjectAs = function() {
    console.log("⭐ saveProjectAs called");
    try {
        // 保存前に選択肢のvectorを設定（saveProject()と同じ処理）
        if (!gameData || !gameData.questions) {
            console.warn("⭐ saveProjectAs: No gameData or questions found");
            alert("保存可能なプロジェクトデータが存在しません。");
            return;
        }
        console.log("⭐ saveProjectAs: gameData found, proceeding with save");
        
        gameData.questions.forEach(function(question) {
            if (question.vector_scores && Array.isArray(question.choices)) {
                question.choices.forEach(function(choice) {
                    const choiceId = choice.id || choice.value;
                    if (choiceId && question.vector_scores[choiceId]) {
                        choice.vector = question.vector_scores[choiceId];
                    } else {
                        choice.vector = choice.vector || {};
                    }
                });
            } else if (Array.isArray(question.choices)) {
                question.choices.forEach(function(choice) {
                    choice.vector = choice.vector || {};
                });
            }
        });
        
        const defaultName = "project.json";
        const fileName = prompt("保存するファイル名を入力してください", defaultName);

        if (!fileName) return;

        // tags を確実に含める
        if (!gameData.tags) gameData.tags = [];
        const data = JSON.stringify(gameData, null, 2);

        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        const finalFileName = fileName.endsWith(".json") ? fileName : fileName + ".json";
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
        
        // localStorage に保存
        try {
            // Zero-Project Mode対応: projectIdを使って保存
            const projectId = window.projectId || localStorage.getItem("project_id") || "temp_project";
            
            const projectMeta = {
                name: gameData.title || finalFileName.replace(".json", ""),
                filename: finalFileName,
                updated_at: new Date().toISOString(),
                tags: gameData.tags || [],
                category: gameData.category || "",
                thumbnail: gameData.thumbnail || null,
                data: gameData
            };

            const saved = JSON.parse(localStorage.getItem("projects") || "[]");
            // 同名ファイルは上書き
            const filtered = saved.filter(p => p.filename !== projectMeta.filename);
            filtered.push(projectMeta);

            localStorage.setItem("projects", JSON.stringify(filtered));
            // project_{projectId} としても保存
            localStorage.setItem(`project_${projectId}`, JSON.stringify(gameData));
            console.log("[Editor] プロジェクトを localStorage に保存しました:", projectMeta.name, "(projectId:", projectId + ")");
        } catch (storageError) {
            console.warn("[Editor] localStorage への保存に失敗しました:", storageError);
        }
    } catch (e) {
        console.error("SaveAs Error:", e);
        alert("保存中にエラーが発生しました。");
    }
};

// quiz.json をバージョン管理方式で保存する関数
async function saveQuiz() {
    console.log("⭐ saveQuiz called");
    try {
        // 1. project_id の取得
        const projectId = localStorage.getItem('projectId') || 'default';
        console.log("⭐ saveQuiz: projectId =", projectId);
        let projectConfig = null;
        
        try {
            const projectPath = `../../projects/${projectId}/project.json`;
            const response = await fetch(projectPath);
            if (response.ok) {
                projectConfig = await response.json();
            }
        } catch (e) {
            console.warn('Failed to load project.json:', e);
        }
        
        const finalProjectId = (projectConfig && projectConfig.project_id) || projectId;
        
        // 2. 生成者名を取得
        const author = localStorage.getItem("quiz_author") || "unknown";
        
        // 3. 日付（YYYYMMDD-HHmm）を生成
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace(/[-:T]/g, "");
        
        // 4. バージョンファイル名を生成
        const versionFile = `${dateStr}-${author}-quiz.json`;
        
        // 5. editor UI から currentQuiz を構築
        const quizData = buildQuizDataFromEditor();
        
        // 6. バージョン情報を追加
        quizData.version = versionFile;
        quizData.version_date = now.toISOString();
        quizData.author = author;
        quizData.project_id = finalProjectId;
        
        // 7. Glossary を統合
        if (typeof GlossaryLoader !== 'undefined' && GlossaryLoader.getCurrentGlossaryForQuiz) {
            const glossaryTerms = GlossaryLoader.getCurrentGlossaryForQuiz();
            quizData.glossary_vector = glossaryTerms;
        } else if (window.currentGlossary && window.currentGlossary.terms) {
            quizData.glossary_vector = window.currentGlossary.terms;
        } else {
            quizData.glossary_vector = {};
        }
        
        // 8. バージョンファイルをダウンロード
        downloadJSON(quizData, versionFile);
        
        // 9. latest.json をダウンロード（最新版として）
        downloadJSON(quizData, "latest.json");
        
        // 10. 自動バックアップ（backup/ フォルダ用）
        const backupName = `backup_${dateStr}-${author}-quiz.json`;
        downloadJSON(quizData, backupName);
        
        // 11. バージョン履歴を localStorage に保存
        try {
            const historyKey = `quiz_versions_${finalProjectId}`;
            let history = [];
            const saved = localStorage.getItem(historyKey);
            if (saved) {
                history = JSON.parse(saved);
            }
            
            // 新しいバージョンを履歴に追加（重複チェック）
            const existingIndex = history.findIndex(v => v.filename === versionFile);
            if (existingIndex >= 0) {
                history[existingIndex] = {
                    filename: versionFile,
                    version: versionFile,
                    date: quizData.version_date,
                    author: author
                };
            } else {
                history.unshift({
                    filename: versionFile,
                    version: versionFile,
                    date: quizData.version_date,
                    author: author
                });
            }
            
            // 最新50件のみ保持
            history = history.slice(0, 50);
            localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (e) {
            console.warn('Failed to save version history:', e);
        }
        
        // 12. localStorage にプロジェクトデータを保存（savedProjects / project_<id>）
        try {
            // gameDataを取得（既存の変数を使用）
            let gameDataToSave = null;
            if (typeof window.getGameData === 'function') {
                gameDataToSave = window.getGameData();
            } else if (typeof window.gameData !== 'undefined') {
                gameDataToSave = window.gameData;
            } else {
                // quizDataからgameData形式に変換
                gameDataToSave = {
                    id: finalProjectId,
                    title: quizData.title || '',
                    description: quizData.description || '',
                    questions: quizData.questions || [],
                    results: quizData.results || [],
                    tags: quizData.tags || [],
                    category: quizData.category || '',
                    thumbnail: quizData.thumbnail || null,
                    startNode: quizData.startNode || null
                };
            }
            
            // project_<id> として保存
            if (gameDataToSave) {
                gameDataToSave.id = finalProjectId; // IDを確実に設定
                localStorage.setItem("project_" + finalProjectId, JSON.stringify(gameDataToSave));
                console.log("✅ プロジェクトデータをlocalStorageに保存:", finalProjectId);
            }
            
            // メタデータをsavedProjectsに保存
            if (typeof window.saveProjectMetadata === 'function') {
                window.saveProjectMetadata({
                    id: finalProjectId,
                    title: gameDataToSave?.title || quizData.title || '無題',
                    tags: gameDataToSave?.tags || quizData.tags || [],
                    updated_at: new Date().toLocaleString()
                });
            }
        } catch (e) {
            console.warn('Failed to save project to localStorage:', e);
        }
        
        alert(`バージョン保存しました:\n${versionFile}\nプロジェクトID: ${finalProjectId}\n保存先: projects/${finalProjectId}/quiz_versions/\n\nlatest.json も更新されました。`);
    } catch (error) {
        console.error("保存エラー:", error);
        alert("バージョン保存中にエラーが発生しました: " + error.message);
    }
}

// editor の現在状態から quiz.json を構築
function buildQuizDataFromEditor() {
    // gameData から quiz.json 形式に変換
    const gameData = window.gameData || {};
    const quizData = {
        version: gameData.version || 1,
        startNode: gameData.startNode || null,
        questions: [],
        results: []
    };
    
    // questions を変換
    if (Array.isArray(gameData.questions)) {
        quizData.questions = gameData.questions.map(function(question) {
            const q = {
                id: question.id,
                type: question.type || 'question',
                title: question.title || '',
                question_text: question.question_text || question.text || '',
                choices: []
            };
            
            // 選択肢を変換
            if (Array.isArray(question.choices)) {
                q.choices = question.choices.map(function(choice) {
                    const c = {
                        id: choice.id || choice.value,
                        text: choice.text || '',
                        nextId: choice.nextId || null,
                        isCorrect: choice.isCorrect || choice.correct || false,
                        correct: choice.correct !== undefined ? choice.correct : (choice.isCorrect || false)
                    };
                    
                    // 誤概念タグを追加
                    if (choice.misconception) {
                        c.misconception = choice.misconception;
                    }
                    
                    // 理解階層measureを追加（選択肢レベル）
                    if (Array.isArray(choice.measure) && choice.measure.length > 0) {
                        c.measure = choice.measure;
                    }
                    
                    // vector がある場合は追加
                    if (choice.vector && typeof choice.vector === 'object') {
                        c.vector = choice.vector;
                    }
                    
                    // value がある場合は追加
                    if (typeof choice.value !== 'undefined') {
                        c.value = choice.value;
                    }
                    
                    return c;
                });
            }
            
            // 旧 question.measure を削除（選択肢レベルに移行済みのため）
            if (q.measure) {
                delete q.measure;
            }
            
            // その他のプロパティを保持
            if (question.enableGrading !== undefined) {
                q.enableGrading = question.enableGrading;
            }
            if (question.question_type) {
                q.question_type = question.question_type;
            }
            if (question.scoring) {
                q.scoring = question.scoring;
            }
            if (question.scale) {
                q.scale = question.scale;
            }
            if (question.next) {
                q.next = question.next;
            }
            
            // 2Dベクトル地図のデータを保存（新形式: vector）
            if (question.vector && typeof question.vector === 'object') {
                q.vector = question.vector;
            }
            
            // 後方互換性のため vector_scores も保存
            if (question.vector_scores && typeof question.vector_scores === 'object') {
                q.vector_scores = question.vector_scores;
            }
            
            return q;
        });
    }
    
    // results を変換
    if (Array.isArray(gameData.results)) {
        quizData.results = gameData.results.map(function(result) {
            const r = {
                id: result.id,
                type: result.type || 'result',
                text: result.text || result.title || ''
            };
            
            if (result.url) {
                r.url = result.url;
            }
            if (result.buttonText) {
                r.buttonText = result.buttonText;
            }
            if (result.image) {
                r.image = result.image;
            }
            
            return r;
        });
    }
    
    return quizData;
}

// JSON をダウンロードするヘルパー関数
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    
    // filename に backup が含まれていたら prefix を付与
    if (filename.includes("backup")) {
        a.download = `backup_${filename.replace("backup_", "")}`;
    } else {
        a.download = filename;
    }
    
    a.click();
    
    URL.revokeObjectURL(url);
}

// プロジェクトを読み込み
function loadProject() {
    document.getElementById('fileInput').click();
}

// プロジェクトデータを直接読み込む（本棚UIから呼び出される）
window.loadProjectData = function(projectData) {
    try {
        if (!projectData) {
            alert("プロジェクトデータが提供されていません。");
            return;
        }
        
        // Ensure tags, category, thumbnail exists
        if (!projectData.tags) projectData.tags = [];
        if (!projectData.category) projectData.category = "";
        if (!projectData.thumbnail) projectData.thumbnail = null;
        
        gameData = normalizeGameData(projectData);
        selectedNodeId = null;
        updateUI();
        showPreview();
        
        console.log("[Editor] プロジェクトを読み込みました:", projectData.title || "無題");
    } catch (error) {
        console.error("Failed to load project data:", error);
        alert('エラー: プロジェクトの読み込みに失敗しました。');
    }
};

function handleFileLoad(event) {
    console.log("⭐ handleFileLoad called");
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loaded = JSON.parse(e.target.result);
            // Ensure tags, category, thumbnail exists
            if (!loaded.tags) loaded.tags = [];
            if (!loaded.category) loaded.category = "";
            if (!loaded.thumbnail) loaded.thumbnail = null;
            gameData = normalizeGameData(loaded);
            selectedNodeId = null;
            updateUI();
            showPreview();
            alert('プロジェクトを読み込みました！');
        } catch (error) {
            alert('エラー: ファイルの読み込みに失敗しました。');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// CSV形式でエクスポート
function exportCSV() {
    console.log("⭐ exportCSV called");
    let csv = '';
    
    // スタートノードがあればStart行を追加
    if (gameData.startNode) {
        const startQuestion = gameData.questions.find(q => q.id === gameData.startNode);
        if (startQuestion) {
            csv += `Start,"${startQuestion.title || startQuestion.text || '開始'}"\n`;
        }
    }
    
    // 質問を出力
    gameData.questions.forEach((question, index) => {
        if (question.id === gameData.startNode && index === 0) {
            // スタートノードは既に出力済み
            return;
        }
        
        csv += `Selection,"${question.text || question.title}","`;
        csv += question.choices.map(c => c.text).join('","');
        csv += '"\n';
    });
    
    // 結果を出力
    gameData.results.forEach(result => {
        if (result.url && result.buttonText) {
            csv += `Result_URL,0,"${result.text || result.title}","${result.buttonText}","${result.url}"\n`;
        } else if (result.image) {
            csv += `Result,0,"${result.text || result.title}","${result.image}"\n`;
        } else {
            csv += `Result,0,"${result.text || result.title}",""\n`;
        }
    });
    
    csv += 'End\n';
    
    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'game_data.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

// HTML形式でエクスポート
function exportHTML() {
    console.log("⭐ exportHTML called");
    alert('HTMLエクスポート機能は準備中です。\n現在はCSVをエクスポートして、908.pyのCtrl+H機能を使用してください。');
}

// プレビューを表示
function previewGame() {
    console.log("⭐ previewGame called");
    if (gameData.questions.length === 0 && gameData.results.length === 0) {
        alert('プレビューするためには、少なくとも1つの質問または結果が必要です。');
        return;
    }
    
    if (!gameData.startNode) {
        alert('スタートノードが設定されていません。最初の質問を追加してください。');
        return;
    }
    
    // プレビューページを開く
    const previewWindow = window.open('', '_blank');
    generatePreviewHTML(previewWindow);
}

// プレビューHTMLを生成（実際にゲームを実行できる）
function generatePreviewHTML(window) {
    // ゲームデータをJSON形式で埋め込む
    const gameDataJson = JSON.stringify(gameData);
    // カスタム画像データも埋め込む
    const customImagesJson = JSON.stringify(getCustomImages());
    
    window.document.write(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ゲームプレビュー</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container { 
                    background: white; 
                    padding: 40px; 
                    border-radius: 20px; 
                    max-width: 700px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                h1 { 
                    color: #2d3748; 
                    margin-bottom: 30px;
                    font-size: 2em;
                }
                .question-text {
                    font-size: 1.3em;
                    margin-bottom: 30px;
                    color: #2d3748;
                    line-height: 1.6;
                }
                .buttons { 
                    display: flex; 
                    flex-direction: column;
                    gap: 15px;
                    margin-top: 30px;
                }
                button { 
                    padding: 18px 30px; 
                    font-size: 1.2em; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    border: none; 
                    border-radius: 12px; 
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 600;
                }
                button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }
                .result-text {
                    font-size: 1.4em;
                    margin: 20px 0;
                    color: #2d3748;
                    line-height: 1.6;
                }
                .result-image {
                    max-width: 100%;
                    border-radius: 15px;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .back-button {
                    margin-top: 30px;
                    background: #4a5568;
                }
                .progress {
                    color: #718096;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container" id="gameContainer">
                <h1>ゲームを読み込んでいます...</h1>
            </div>
            <script>
                const gameData = ${gameDataJson};
                const customImages = ${customImagesJson};
                let currentQuestionId = gameData.startNode;
                let history = [];
                const scoringState = {};
                
                function applyCustomCSS(css) {
                    if (!css) return;
                    let styleEl = document.getElementById('custom-question-style');
                    if (!styleEl) {
                        styleEl = document.createElement('style');
                        styleEl.id = 'custom-question-style';
                        document.head.appendChild(styleEl);
                    }
                    styleEl.textContent = css;
                }
                
                function resetScoring() {
                    Object.keys(scoringState).forEach(axis => delete scoringState[axis]);
                }
                
                function cloneVector(vector) {
                    if (!vector) return null;
                    const copy = {};
                    Object.entries(vector).forEach(([axis, value]) => {
                        copy[axis] = Number(value) || 0;
                    });
                    return copy;
                }
                
                function addScoreVector(vector) {
                    if (!vector) return;
                    Object.entries(vector).forEach(([axis, value]) => {
                        const numericValue = Number(value) || 0;
                        scoringState[axis] = (scoringState[axis] || 0) + numericValue;
                    });
                }
                
                function subtractScoreVector(vector) {
                    if (!vector) return;
                    Object.entries(vector).forEach(([axis, value]) => {
                        const numericValue = Number(value) || 0;
                        scoringState[axis] = (scoringState[axis] || 0) - numericValue;
                    });
                }
                
                function getQuestionProgressLabel() {
                    const count = history.filter(entry => entry.type === 'question').length;
                    return count > 0 ? \`質問 \${count}\` : '開始';
                }
                
                function shuffleArray(array) {
                    const clone = array.slice();
                    for (let i = clone.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [clone[i], clone[j]] = [clone[j], clone[i]];
                    }
                    return clone;
                }
                
                function showQuestion(questionId, options = {}) {
                    const question = gameData.questions.find(q => q.id === questionId);
                    if (!question) {
                        showError('質問が見つかりません');
                        return;
                    }
                    
                    currentQuestionId = questionId;
                    if (!options.skipHistory) {
                        history.push({ id: questionId, type: 'question', scoringVector: null });
                    }
                    
                    const container = document.getElementById('gameContainer');
                    const progress = getQuestionProgressLabel();
                    
                    if (question.type === 'diagnostic_question') {
                        renderDiagnosticQuestion(question, container, progress);
                    } else {
                        renderStandardQuestion(question, container, progress);
                    }
                }
                
                function renderStandardQuestion(question, container, progress) {
                    let questionFontStyle = '';
                    if (question.questionFont) questionFontStyle += \`font-family: \${escapeHtml(question.questionFont)}; \`;
                    if (question.questionFontSize) questionFontStyle += \`font-size: \${escapeHtml(question.questionFontSize)}; \`;
                    if (question.questionTextColor) questionFontStyle += \`color: \${escapeHtml(question.questionTextColor)}; \`;
                    
                    let choiceFontStyle = '';
                    if (question.choiceFont) choiceFontStyle += \`font-family: \${escapeHtml(question.choiceFont)}; \`;
                    if (question.choiceFontSize) choiceFontStyle += \`font-size: \${escapeHtml(question.choiceFontSize)}; \`;
                    if (question.choiceButtonColor) choiceFontStyle += \`background: \${escapeHtml(question.choiceButtonColor)}; \`;
                    if (question.choiceButtonTextColor) choiceFontStyle += \`color: \${escapeHtml(question.choiceButtonTextColor)}; \`;
                    
                    applyCustomCSS(question.customCSS || '');
                    
                    const choiceEntries = question.choices.map((choice, index) => ({ choice, index }));
                    const shuffledChoices = shuffleArray(choiceEntries);
                    
                    container.innerHTML = \`
                        <div class="progress">\${progress}</div>
                        <h1>\${escapeHtml(question.title || '質問')}</h1>
                        <div class="question-text" style="\${questionFontStyle}">\${escapeHtml(question.text || '質問文が未入力です')}</div>
                        <div class="buttons">
                            \${shuffledChoices.map(({ choice, index }) => \`
                                <button onclick="handleStandardChoice('\${question.id}', \${index})" style="\${choiceFontStyle}">
                                    \${escapeHtml(choice.text || \`選択肢\${index + 1}\`)}
                                </button>
                            \`).join('')}
                        </div>
                        <div id="grading-feedback" style="margin-top: 15px;"></div>
                        <button class="back-button" onclick="goBack()">← 戻る</button>
                    \`;
                }
                
                function renderDiagnosticQuestion(question, container, progress) {
                    applyCustomCSS(question.customCSS || '');
                    container.innerHTML = \`
                        <div class="progress">\${progress}</div>
                        <h1>\${escapeHtml(question.question_text || question.title || '診断質問')}</h1>
                        \${question.description ? \`<div class="question-text">\${escapeHtml(question.description)}</div>\` : ''}
                        <div class="diagnostic-inputs">
                            \${renderDiagnosticInputs(question)}
                        </div>
                        <button class="back-button" onclick="goBack()">← 戻る</button>
                    \`;
                }
                
                function renderDiagnosticInputs(question) {
                    const choices = Array.isArray(question.choices) ? question.choices : [];
                    switch (question.question_type) {
                        case 'single_choice':
                            if (choices.length === 0) {
                                return '<p style="color: #718096;">選択肢を設定してください。</p>';
                            }
                            const shuffledSingle = shuffleArray(choices);
                            return \`
                                <div class="buttons">
                                    \${shuffledSingle.map(choice => \`
                                        <button onclick="handleDiagnosticAnswer('\${question.id}', '\${choice.id}')">
                                            \${escapeHtml(choice.text || choice.id)}
                                        </button>
                                    \`).join('')}
                                </div>
                            \`;
                        case 'multiple_choice':
                            if (choices.length === 0) {
                                return '<p style="color: #718096;">選択肢を設定してください。</p>';
                            }
                            const shuffledMulti = shuffleArray(choices);
                            return \`
                                <div class="diagnostic-multi">
                                    \${shuffledMulti.map(choice => \`
                                        <label style="display: block; margin-bottom: 8px;">
                                            <input type="checkbox" name="diag-\${question.id}" value="\${choice.id}"> \${escapeHtml(choice.text || choice.id)}
                                        </label>
                                    \`).join('')}
                                    <button style="margin-top: 10px;" onclick="submitDiagnosticMulti('\${question.id}')">回答する</button>
                                </div>
                            \`;
                        case 'yes_no':
                            return \`
                                <div class="buttons">
                                    <button onclick="handleDiagnosticAnswer('\${question.id}', 'yes')">はい</button>
                                    <button onclick="handleDiagnosticAnswer('\${question.id}', 'no')">いいえ</button>
                                </div>
                            \`;
                        case 'scale': {
                            const min = question.scale?.min ?? 0;
                            const max = question.scale?.max ?? 10;
                            const step = question.scale?.step ?? 1;
                            return \`
                                <div class="diagnostic-scale">
                                    <input type="range" id="scale-\${question.id}" min="\${min}" max="\${max}" step="\${step}" value="\${min}" oninput="document.getElementById('scale-display-\${question.id}').textContent = this.value;">
                                    <div style="margin-top: 10px;">値: <span id="scale-display-\${question.id}">\${min}</span></div>
                                    <button style="margin-top: 10px;" onclick="submitDiagnosticScale('\${question.id}')">回答する</button>
                                </div>
                            \`;
                        }
                        case 'text':
                            return \`
                                <div class="diagnostic-text">
                                    <textarea id="text-\${question.id}" placeholder="回答を入力..." style="width: 100%; min-height: 80px;"></textarea>
                                    <button style="margin-top: 10px;" onclick="submitDiagnosticText('\${question.id}')">回答する</button>
                                </div>
                            \`;
                        default:
                            return '<p style="color: #e53e3e;">未対応の質問形式です。</p>';
                    }
                }
                
                function handleDiagnosticAnswer(questionId, answerValue) {
                    const question = gameData.questions.find(q => q.id === questionId);
                    if (!question) {
                        showError('質問が見つかりません');
                        return;
                    }
                    const scoringVector = applyScoringRules(question, answerValue);
                    if (scoringVector) {
                        addScoreVector(scoringVector);
                        const lastEntry = history[history.length - 1];
                        if (lastEntry && lastEntry.id === questionId) {
                            lastEntry.scoringVector = cloneVector(scoringVector);
                        }
                    }
                    const nextId = resolveNextQuestion(question, answerValue);
                    if (!nextId) {
                        showScoreOnlyScreen();
                        return;
                    }
                    const nextQuestion = gameData.questions.find(q => q.id === nextId);
                    const nextResult = gameData.results.find(r => r.id === nextId);
                    if (nextQuestion) {
                        showQuestion(nextId);
                    } else if (nextResult) {
                        showResult(nextResult);
                    } else {
                        showScoreOnlyScreen();
                    }
                }
                
                function submitDiagnosticMulti(questionId) {
                    const inputs = document.querySelectorAll('input[name="diag-' + questionId + '"]:checked');
                    const values = Array.from(inputs).map(input => input.value);
                    if (values.length === 0) {
                        alert('少なくとも1つ選択してください。');
                        return;
                    }
                    handleDiagnosticAnswer(questionId, values);
                }
                
                function submitDiagnosticScale(questionId) {
                    const input = document.getElementById('scale-' + questionId);
                    if (!input) return;
                    handleDiagnosticAnswer(questionId, input.value);
                }
                
                function submitDiagnosticText(questionId) {
                    const textarea = document.getElementById('text-' + questionId);
                    const value = textarea ? textarea.value : '';
                    handleDiagnosticAnswer(questionId, value);
                }
                
                function applyScoringRules(question, answerValue) {
                    const rules = Array.isArray(question.scoring) ? question.scoring : [];
                    const answers = Array.isArray(answerValue) ? answerValue : [answerValue];
                    const aggregated = {};
                    let applied = false;
                    answers.forEach(answer => {
                        const key = answer === undefined || answer === null ? '' : String(answer);
                        const rule = rules.find(r => r.choice_id === key) || rules.find(r => r.choice_id === '__default');
                        if (rule && rule.vector) {
                            applied = true;
                            Object.entries(rule.vector).forEach(([axis, value]) => {
                                aggregated[axis] = (aggregated[axis] || 0) + (Number(value) || 0);
                            });
                        }
                    });
                    return applied ? aggregated : null;
                }
                
                function resolveNextQuestion(question, answerValue) {
                    const nextRules = question.next || {};
                    if (Array.isArray(answerValue)) {
                        for (const value of answerValue) {
                            const key = String(value);
                            if (nextRules[key]) {
                                return nextRules[key];
                            }
                        }
                    } else if (answerValue !== undefined && answerValue !== null) {
                        const key = String(answerValue);
                        if (nextRules[key]) {
                            return nextRules[key];
                        }
                    }
                    if (nextRules.default) {
                        return nextRules.default;
                    }
                    return getLinearNextQuestionId(question.id);
                }
                
                function getLinearNextQuestionId(questionId) {
                    const index = gameData.questions.findIndex(q => q.id === questionId);
                    if (index !== -1 && gameData.questions[index + 1]) {
                        return gameData.questions[index + 1].id;
                    }
                    return null;
                }
                
                function handleStandardChoice(questionId, choiceIndex) {
                    const question = gameData.questions.find(q => q.id === questionId);
                    if (!question) {
                        showError('質問が見つかりません');
                        return;
                    }
                    const choice = question.choices[choiceIndex];
                    if (!choice) return;
                    if (question.enableGrading) {
                        showGradingFeedback(Boolean(choice.isCorrect));
                    } else {
                        clearGradingFeedback();
                    }
                    
                    const nextId = choice.nextId;
                    if (!nextId) {
                        alert('この選択肢には次のノードが設定されていません。');
                        return;
                    }
                    
                    const nextQuestion = gameData.questions.find(q => q.id === nextId);
                    const nextResult = gameData.results.find(r => r.id === nextId);
                    if (nextQuestion) {
                        showQuestion(nextId);
                    } else if (nextResult) {
                        showResult(nextResult);
                    } else {
                        showScoreOnlyScreen();
                    }
                }
                
                function showGradingFeedback(isCorrect) {
                    const feedbackEl = document.getElementById('grading-feedback');
                    if (!feedbackEl) return;
                    const bg = isCorrect ? '#48bb78' : '#e53e3e';
                    const text = isCorrect ? '正解！よくできました。' : '不正解...もう一度復習してみましょう。';
                    feedbackEl.innerHTML = \`
                        <div style="padding: 12px 16px; border-radius: 10px; background: \${bg}; color: white; font-weight: 600;">
                            \${text}
                        </div>
                    \`;
                }
                
                function clearGradingFeedback() {
                    const feedbackEl = document.getElementById('grading-feedback');
                    if (feedbackEl) {
                        feedbackEl.innerHTML = '';
                    }
                }
                
                function showResult(result, options = {}) {
                    if (!options.skipHistory) {
                        history.push({ id: result.id, type: 'result' });
                    }
                    const container = document.getElementById('gameContainer');
                    
                    let imageHtml = '';
                    if (result.image) {
                        imageHtml = \`<img src="data/\${escapeHtml(result.image)}" alt="結果画像" class="result-image" onerror="this.style.display='none'">\`;
                    }
                    
                    let urlButton = '';
                    if (result.url && result.buttonText) {
                        urlButton = \`<button onclick="window.open('\${escapeHtml(result.url)}', '_blank')">\${escapeHtml(result.buttonText)}</button>\`;
                    }
                    
                    const scoreHtml = formatScoreSummary();
                    
                    container.innerHTML = \`
                        <h1>診断結果</h1>
                        \${imageHtml}
                        <div class="result-text">\${escapeHtml(result.text || result.title || '結果が未入力です')}</div>
                        \${urlButton}
                        \${scoreHtml}
                        <button class="back-button" onclick="restartGame()">最初からやり直す</button>
                    \`;
                }
                
                function formatScoreSummary() {
                    const entries = Object.entries(scoringState);
                    if (!entries.length) return '';
                    return \`
                        <div class="score-summary" style="margin-top: 20px; text-align: left;">
                            <h2 style="font-size: 1.1em; margin-bottom: 10px;">スコアサマリ</h2>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                \${entries.map(([axis, value]) => \`
                                    <li><strong>\${escapeHtml(axis)}:</strong> \${value}</li>
                                \`).join('')}
                            </ul>
                            <pre style="margin-top: 10px; padding: 10px; background: #f7fafc; border-radius: 8px;">\${escapeHtml(JSON.stringify(scoringState, null, 2))}</pre>
                        </div>
                    \`;
                }
                
                function showScoreOnlyScreen() {
                    const container = document.getElementById('gameContainer');
                    history.push({ id: 'score_summary', type: 'result' });
                    const scoreHtml = formatScoreSummary() || '<p>スコアはありません。</p>';
                    container.innerHTML = \`
                        <h1>スコアサマリ</h1>
                        \${scoreHtml}
                        <button class="back-button" onclick="restartGame()">最初からやり直す</button>
                    \`;
                }
                
                function goBack() {
                    if (history.length <= 1) {
                        restartGame();
                        return;
                    }
                    
                    const currentEntry = history.pop();
                    if (currentEntry && currentEntry.scoringVector) {
                        subtractScoreVector(currentEntry.scoringVector);
                    }
                    
                    while (history.length > 0) {
                        const previous = history[history.length - 1];
                        if (previous.type === 'question') {
                            showQuestion(previous.id, { skipHistory: true });
                            return;
                        }
                        history.pop();
                    }
                    
                    restartGame();
                }
                
                function restartGame() {
                    history = [];
                    resetScoring();
                    currentQuestionId = gameData.startNode;
                    if (gameData.startNode) {
                    showQuestion(gameData.startNode);
                    } else {
                        showError('スタートノードが設定されていません。');
                    }
                }
                
                function showError(message) {
                    document.getElementById('gameContainer').innerHTML = \`
                        <h1>エラー</h1>
                        <p>\${escapeHtml(message)}</p>
                        <button onclick="restartGame()">最初からやり直す</button>
                    \`;
                }
                
                function getCustomImageUrl(value) {
                    if (value && value.startsWith('custom:')) {
                        const name = value.substring(7);
                        return customImages[name] || '';
                    }
                    return value || '';
                }
                
                function escapeHtml(text) {
                    if (!text) return '';
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                if (gameData.startNode) {
                    showQuestion(gameData.startNode);
                } else {
                    showError('スタートノードが設定されていません。');
                }
            </script>
        </body>
        </html>
    `);
    window.document.close();
}

// HTMLエスケープ
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初期化
// 注意: このイベントリスナーは editor_init.js で統合管理されるため、
// ここでは削除しないが、editor_init.js が優先される
if (window.__editor_initialized) {
    console.warn("[Editor] initialization skipped (already initialized)");
    return;
}
document.addEventListener('DOMContentLoaded', function() {
    console.log("⭐ DOMContentLoaded #2: Editor初期化開始 (legacy, may be overridden by editor_init.js)");
    console.log("⭐ Editor init started");
    
    // editor_init.js が読み込まれている場合は、そちらに任せる
    if (typeof window.EditorInit !== 'undefined' && window.EditorInit.initComplete && window.EditorInit.initComplete()) {
        console.log("⭐ editor_init.js is managing initialization, skipping legacy init");
        return;
    }
    
    // テンプレートUIは削除され、プロジェクト本棚に統合されました
    // try {
    //     createTemplateButtons();
    //     console.log("⭐ Template buttons created");
    // } catch (e) {
    //     console.error("⭐ Error creating template buttons:", e);
    // }
    
    try {
    updateUI();
        console.log("⭐ UI updated");
    } catch (e) {
        console.error("⭐ Error updating UI:", e);
    }
    
    // 本棚からのプロジェクトロード（URLパラメータ mode=edit または projectId の場合）
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");
    
    if (projectId) {
        console.log("⭐ Loading project from ID:", projectId);
        // projectId が指定されている場合は projects/{projectId}/ から読み込む
        try {
            loadProjectFromId(projectId);
        } catch (e) {
            console.error("⭐ Error loading project from ID:", e);
        }
    } else if (params.get("mode") === "edit") {
        console.log("⭐ Loading project from localStorage (mode=edit)");
        // localStorage から読み込む
        const raw = localStorage.getItem("editor_current_project");
        if (raw) {
            console.log("⭐ Found editor_current_project in localStorage");
            try {
                const data = JSON.parse(raw);
                if (data && typeof data === 'object') {
                    console.log("⭐ Parsed project data:", data);
                    // Ensure tags, category, thumbnail exists
                    if (!data.tags) data.tags = [];
                    if (!data.category) data.category = "";
                    if (!data.thumbnail) data.thumbnail = null;
                    // gameData にロード
                    if (data.questions) {
                        gameData = data;
                        gameData = normalizeGameData(gameData);
                        updateUI();
                        console.log("[Editor] 本棚からプロジェクトをロードしました:", data.title || "無題");
                        console.log("⭐ Project loaded from localStorage");
                    } else if (typeof window.loadProjectData === "function") {
                        console.log("⭐ Using window.loadProjectData");
                        window.loadProjectData(data);
                    } else if (typeof window.loadEditorFromData === "function") {
                        console.log("⭐ Using window.loadEditorFromData");
                        window.loadEditorFromData(data);
                    } else {
                        console.warn("⭐ No valid load function found for project data");
                    }
                } else {
                    console.warn("⭐ Invalid project data format:", typeof data);
                }
            } catch (e) {
                console.error("Editor: 本棚からのロードに失敗", e);
                console.error("⭐ Error loading from localStorage:", e);
            }
        } else {
            console.log("⭐ No editor_current_project found in localStorage");
        }
    } else {
        console.log("⭐ No projectId or mode=edit parameter, starting with empty project");
    }
    
    // プロジェクトIDから読み込む関数
    // localStorage優先、フォールバックでファイル読み込み
    async function loadProjectFromId(id) {
        try {
            console.log("🗂 loadProjectFromId:", id);
            
            // 1. localStorageから読み込みを試みる
            const dataStr = localStorage.getItem("project_" + id);
            if (dataStr) {
                try {
                    const data = JSON.parse(dataStr);
                    console.log("📁 プロジェクトをlocalStorageから読み込み:", id);
                    
                    // gameDataに設定
                    if (typeof window.gameData !== 'undefined') {
                        window.gameData = data;
                    }
                    if (typeof window.setGameData === 'function') {
                        window.setGameData(data);
                    }
                    
                    // UI復元
                    if (typeof window.restoreGameToEditorUI === "function") {
                        window.restoreGameToEditorUI(data);
                    } else {
                        console.warn("restoreGameToEditorUI が未定義です");
                        // 最低限のUI復元
                        const title = document.getElementById("game-title");
                        if (title) title.value = data.title || "";
                        
                        if (data.tags && Array.isArray(data.tags)) {
                            if (typeof window.currentTags !== 'undefined') {
                                window.currentTags = [...data.tags];
                            }
                            if (typeof window.renderTagList === "function") {
                                window.renderTagList();
                            }
                        }
                        
                        if (Array.isArray(data.questions)) {
                            if (typeof window.currentNodes !== 'undefined') {
                                window.currentNodes = [...data.questions];
                            }
                            if (typeof window.renderNodes === "function") {
                                window.renderNodes();
                            }
                        }
                    }
                    
                    // UI更新
                    if (typeof window.updateUI === 'function') {
                        window.updateUI();
                    }
                    if (typeof window.showPreview === 'function') {
                        window.showPreview();
                    }
                    
                    console.log("✅ プロジェクトをlocalStorageから読み込みました:", id);
                    return;
                } catch (e) {
                    console.warn("⚠️ localStorageからの解析に失敗、ファイルから読み込みを試みます:", e);
                }
            }
            
            // 2. localStorageにない場合、ファイルから読み込む（フォールバック）
            console.log("📁 ファイルからプロジェクトを読み込み:", id);
            // プロジェクトフォルダを決定（通常はproject_idとフォルダ名は一致）
            // まず直接パスを試し、失敗した場合は既知のフォルダから検索
            let projectFolder = id;
            let projectPath = `../../projects/${projectFolder}/project.json`;
            let quizPath = `../../projects/${projectFolder}/quiz.json`;
            
            // 直接パスで試行
            try {
                const testRes = await fetch(projectPath);
                if (testRes && testRes.ok) {
                    const testData = await testRes.json();
                    // project.json の project_id と一致するか確認
                    if (testData.project_id && testData.project_id !== id) {
                        console.warn(`⚠️ project_id不一致: URL="${id}", project.json="${testData.project_id}"`);
                    }
                }
            } catch (e) {
                // 直接パスが失敗した場合、既知のフォルダから検索
                console.log(`📁 フォルダ "${id}" が見つからないため、既知のフォルダから検索します`);
                const knownFolders = ['default', 'demo_project_01', 'demo_project_02', 'demo_project_03', 'vector_test', 'dummy_project', 'sample_project'];
                let found = false;
                for (const folder of knownFolders) {
                    try {
                        const testPath = `../../projects/${folder}/project.json`;
                        const testRes = await fetch(testPath);
                        if (testRes && testRes.ok) {
                            const testData = await testRes.json();
                            if (testData.project_id === id) {
                                projectFolder = folder;
                                projectPath = testPath;
                                quizPath = `../../projects/${folder}/quiz.json`;
                                console.log(`✅ project_id "${id}" はフォルダ "${folder}" に対応しています`);
                                found = true;
                                break;
                            }
                        }
                    } catch (e) {
                        // 次のフォルダを試す
                    }
                }
                if (!found) {
                    console.warn(`⚠️ project_id "${id}" に対応するフォルダが見つかりませんでした`);
                }
            }
            
            console.log("⭐ Fetching project files:", { projectPath, quizPath });
            
            const [projectRes, quizRes] = await Promise.all([
                fetch(projectPath).catch((e) => {
                    console.warn("⭐ Failed to fetch project.json:", e);
                    return null;
                }),
                fetch(quizPath).catch((e) => {
                    console.warn("⭐ Failed to fetch quiz.json:", e);
                    return null;
                })
            ]);
            
            console.log("⭐ Fetch results:", {
                project: projectRes?.ok,
                quiz: quizRes?.ok
            });
            
            if (quizRes && quizRes.ok) {
                const quizData = await quizRes.json();
                console.log("⭐ Quiz data loaded:", quizData);
                
                // project.json からメタデータを取得
                let projectMeta = {};
                if (projectRes && projectRes.ok) {
                    projectMeta = await projectRes.json();
                    console.log("⭐ Project metadata loaded:", projectMeta);
                }
                
                // project_id の決定: project.json の project_id を優先、なければURLパラメータのid
                const actualProjectId = projectMeta.project_id || id;
                
                // quiz.json のデータを gameData に設定
                if (quizData.questions || quizData.results) {
                    // quiz.json のデータを gameData 形式に統合
                    const gameData = {
                        id: actualProjectId,  // プロジェクトIDを確実に設定
                        title: projectMeta.title || quizData.title || actualProjectId,
                        description: projectMeta.description || quizData.description || '',
                        tags: projectMeta.tags || quizData.tags || [],
                        startNode: quizData.startNode || (quizData.questions && quizData.questions[0]?.id) || '',
                        questions: quizData.questions || [],
                        results: quizData.results || []
                    };
                    
                    // project.json のメタデータを統合
                    if (projectMeta.category) gameData.category = projectMeta.category;
                    if (projectMeta.thumbnail) gameData.thumbnail = projectMeta.thumbnail;
                    
                    // gameDataに設定
                    if (typeof window.gameData !== 'undefined') {
                        window.gameData = gameData;
                    }
                    if (typeof window.setGameData === 'function') {
                        window.setGameData(gameData);
                    }
                    
                    // UI復元
                    if (typeof window.restoreGameToEditorUI === "function") {
                        window.restoreGameToEditorUI(gameData);
                    } else {
                        console.warn("restoreGameToEditorUI が未定義です");
                        // 最低限のUI復元
                        const title = document.getElementById("game-title");
                        if (title) title.value = gameData.title || "";
                        
                        if (gameData.tags && Array.isArray(gameData.tags)) {
                            if (typeof window.currentTags !== 'undefined') {
                                window.currentTags = [...gameData.tags];
                            }
                            if (typeof window.renderTagList === "function") {
                                window.renderTagList();
                            }
                        }
                        
                        if (Array.isArray(gameData.questions)) {
                            if (typeof window.currentNodes !== 'undefined') {
                                window.currentNodes = [...gameData.questions];
                            }
                            if (typeof window.renderNodes === "function") {
                                window.renderNodes();
                            }
                        }
                    }
                    
                    // UI更新
                    if (typeof window.updateUI === 'function') {
                        window.updateUI();
                    }
                    if (typeof window.showPreview === 'function') {
                        window.showPreview();
                    }
                    
                    console.log("✅ プロジェクトをファイルから読み込みました:", id);
                } else {
                    console.warn("⭐ Quiz data has no questions or results");
                    alert("クイズデータが見つかりません。");
                }
            } else {
                console.warn("⭐ Quiz file not found or not ok:", quizRes);
                alert(`プロジェクト「${id}」が見つかりません。\nlocalStorage にもファイルにも存在しません。`);
            }
        } catch (e) {
            console.error("loadProjectFromId error:", e);
            alert("プロジェクトの読み込み中にエラーが発生しました: " + e.message);
        }
    }
    
    // windowに公開
    if (typeof window !== 'undefined') {
        window.loadProjectFromId = loadProjectFromId;
    }
    
    // 旧実装（ファイル読み込み版）は削除またはコメントアウト
    /*
    async function loadProjectFromId_OLD(projectId) {
        console.log("⭐ loadProjectFromId called with projectId:", projectId);
        try {
            const projectPath = `../../projects/${projectId}/project.json`;
            const quizPath = `../../projects/${projectId}/quiz.json`;
            const editorPath = `../../projects/${projectId}/editor.json`;
            
            console.log("⭐ Fetching project files:", { projectPath, quizPath, editorPath });
            
            const [projectRes, quizRes, editorRes] = await Promise.all([
                fetch(projectPath).catch((e) => {
                    console.warn("⭐ Failed to fetch project.json:", e);
                    return null;
                }),
                fetch(quizPath).catch((e) => {
                    console.warn("⭐ Failed to fetch quiz.json:", e);
                    return null;
                }),
                fetch(editorPath).catch((e) => {
                    console.warn("⭐ Failed to fetch editor.json:", e);
                    return null;
                })
            ]);
            
            console.log("⭐ Fetch results:", {
                project: projectRes?.ok,
                quiz: quizRes?.ok,
                editor: editorRes?.ok
            });
            
            if (quizRes && quizRes.ok) {
                const quizData = await quizRes.json();
                console.log("⭐ Quiz data loaded:", quizData);
                
                // project.json からメタデータを取得
                let projectMeta = {};
                if (projectRes && projectRes.ok) {
                    projectMeta = await projectRes.json();
                    console.log("⭐ Project metadata loaded:", projectMeta);
                }
                
                // quiz.json のデータを gameData に設定
                if (quizData.questions) {
                    gameData = normalizeGameData(quizData);
                    console.log("⭐ Game data normalized");
                    
                    // project.json のメタデータを統合
                    if (projectMeta.title) gameData.title = projectMeta.title;
                    if (projectMeta.description) gameData.description = projectMeta.description;
                    if (projectMeta.tags) gameData.tags = projectMeta.tags;
                    if (projectMeta.category) gameData.category = projectMeta.category;
                    if (projectMeta.thumbnail) gameData.thumbnail = projectMeta.thumbnail;
                    
                    selectedNodeId = null;
                    updateUI();
                    showPreview();
                    
                    console.log("[Editor] プロジェクトを読み込みました:", projectId);
                    console.log("⭐ Project loaded successfully");
                } else {
                    console.warn("⭐ Quiz data has no questions");
                    alert("クイズデータが見つかりません。");
                }
            } else {
                console.warn("⭐ Quiz file not found or not ok:", quizRes);
                alert(`プロジェクト「${projectId}」が見つかりません。`);
            }
        } catch (e) {
            console.error("Failed to load project:", e);
            console.error("⭐ Error in loadProjectFromId:", e);
            alert("プロジェクトの読み込み中にエラーが発生しました。");
        }
    }
    */
});

// -------------------------------------
// プロジェクト本棚を開く
// -------------------------------------
// テンプレート欄は削除され、本棚UIに統合されました
// 「プロジェクトを読み込む」ボタンは本棚ページ（bookshelf.html）に遷移します
window.openProjectShelf = function() {
    console.log("⭐ openProjectShelf called - redirecting to bookshelf");
    // 本棚ページに遷移
    location.href = '../../admin/bookshelf.html';
};

// -------------------------------------
// 棚UIを閉じる
// -------------------------------------
window.closeProjectShelf = function() {
    console.log("⭐ closeProjectShelf called");
    const modal = document.getElementById("project-shelf-modal");
    if (modal) {
        modal.style.display = "none";
    }
};

// =======================
// タグカラー生成関数
// =======================
function randomTagColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// =======================
// タグ UI ロジック
// =======================
let allExistingTags = [];

async function loadAllTags() {
    try {
        allExistingTags = [];
        
        // デフォルトタグを追加
        const defaultTags = ['demo', 'sample', 'education', 'math', 'logic', 'reading', 'inference'];
        allExistingTags.push(...defaultTags);
        
        // localStorage から読み込み
        const savedProjects = JSON.parse(localStorage.getItem("projects") || "[]");
        savedProjects.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                allExistingTags.push(...p.tags);
            }
            if (p.data && p.data.tags && Array.isArray(p.data.tags)) {
                allExistingTags.push(...p.data.tags);
            }
        });
        
        // /projects/ フォルダから読み込み
        const projectFolders = ['default', 'vector_test', 'dummy_project', 'sample_project', 'demo_project_01', 'demo_project_02', 'demo_project_03'];
        for (const folder of projectFolders) {
            try {
                const projectPath = `../../projects/${folder}/project.json`;
                const quizPath = `../../projects/${folder}/quiz.json`;
                
                const [projectRes, quizRes] = await Promise.all([
                    fetch(projectPath).catch(() => null),
                    fetch(quizPath).catch(() => null)
                ]);
                
                if (projectRes && projectRes.ok) {
                    const projectData = await projectRes.json();
                    if (projectData.tags && Array.isArray(projectData.tags)) {
                        allExistingTags.push(...projectData.tags);
                    }
                }
                
                if (quizRes && quizRes.ok) {
                    const quizData = await quizRes.json();
                    if (quizData.tags && Array.isArray(quizData.tags)) {
                        allExistingTags.push(...quizData.tags);
                    }
                }
            } catch (e) {
                // プロジェクトが見つからない場合はスキップ
            }
        }
        
        // 重複を除去
        allExistingTags = [...new Set(allExistingTags)];
    } catch (e) {
        console.warn("タグの読み込みに失敗:", e);
    }
}

function initTagEditor() {
    const tagInput = document.getElementById("tag-input");
    const tagList = document.getElementById("tag-list");
    
    if (!tagInput || !tagList) return;
    
    // サジェストボックスを作成
    const tagSuggestBox = document.createElement("div");
    tagSuggestBox.className = "tag-suggest-box";
    tagSuggestBox.style.display = "none";
    tagInput.parentNode.style.position = "relative";
    tagInput.parentNode.appendChild(tagSuggestBox);
    
    // 既存のタグを表示
    function renderTags() {
        if (!tagList) return;
        tagList.innerHTML = "";
        const tags = gameData.tags || [];
        tags.forEach((t, i) => {
            const pill = document.createElement("div");
            pill.className = "tag-pill";
            const color = randomTagColor(t);
            pill.style.cssText = `
                background: ${color};
                color: white;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin: 4px;
            `;
            pill.innerHTML = `${escapeHtml(t)} <span class="remove" data-index="${i}" style="cursor: pointer; font-weight: bold;">×</span>`;
            tagList.appendChild(pill);
        });
    }
    
    // 初期表示
    renderTags();
    
    // タグサジェスト
    tagInput.addEventListener("input", function() {
        const q = tagInput.value.toLowerCase();
        if (!q) {
            tagSuggestBox.style.display = "none";
            return;
        }
        
        const suggestions = allExistingTags
            .filter(t => t.toLowerCase().includes(q) && !gameData.tags.includes(t))
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            tagSuggestBox.innerHTML = suggestions
                .map(s => `<div class="suggest-item">${escapeHtml(s)}</div>`)
                .join("");
            tagSuggestBox.style.display = "block";
        } else {
            tagSuggestBox.style.display = "none";
        }
    });
    
    tagSuggestBox.addEventListener("click", function(e) {
        if (e.target.classList.contains("suggest-item")) {
            const tag = e.target.innerText;
            if (!gameData.tags.includes(tag)) {
                if (!gameData.tags) gameData.tags = [];
                gameData.tags.push(tag);
                renderTags();
            }
            tagInput.value = "";
            tagSuggestBox.style.display = "none";
        }
    });
    
    // Enter キーでタグ追加
    tagInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            const val = tagInput.value.trim();
            if (val && !gameData.tags.includes(val)) {
                if (!gameData.tags) gameData.tags = [];
                gameData.tags.push(val);
                renderTags();
                tagInput.value = "";
                tagSuggestBox.style.display = "none";
            }
        }
    });
    
    // × ボタンでタグ削除
    tagList.addEventListener("click", function(e) {
        if (e.target.classList.contains("remove")) {
            const index = Number(e.target.dataset.index);
            if (!isNaN(index) && gameData.tags && gameData.tags[index]) {
                gameData.tags.splice(index, 1);
                renderTags();
            }
        }
    });
    
    // タグを読み込む
    loadAllTags();
}

// =======================
// オートセーブ機能
// =======================
let lastSavedState = "";
let autosaveInterval = null;

function startAutosave() {
    if (autosaveInterval) return;
    
    autosaveInterval = setInterval(function() {
        const json = JSON.stringify(gameData);
        if (json !== lastSavedState) {
            try {
                // Zero-Project Mode対応: projectIdを使って保存
                const projectId = window.projectId || localStorage.getItem("project_id") || "temp_project";
                localStorage.setItem("autosave_project", json);
                localStorage.setItem(`project_${projectId}`, json);
                lastSavedState = json;
                console.log("[Editor] オートセーブ完了 (projectId:", projectId + ")");
            } catch (e) {
                console.warn("[Editor] オートセーブに失敗:", e);
            }
        }
    }, 3000);
}

function stopAutosave() {
    if (autosaveInterval) {
        clearInterval(autosaveInterval);
        autosaveInterval = null;
    }
}

// オートセーブを開始
// 注意: このイベントリスナーは editor_init.js で統合管理されるため、
// ここでは削除しないが、editor_init.js が優先される
if (window.__editor_initialized) {
    console.warn("[Editor] initialization skipped (already initialized)");
    return;
}
document.addEventListener('DOMContentLoaded', function() {
    console.log("⭐ DOMContentLoaded #3: イベントリスナー登録開始 (legacy, may be overridden by editor_init.js)");
    console.log("⭐ Registering editor event listeners");
    
    // editor_init.js が読み込まれている場合は、そちらに任せる
    if (typeof window.EditorInit !== 'undefined' && window.EditorInit.initComplete && window.EditorInit.initComplete()) {
        console.log("⭐ editor_init.js is managing event binding, skipping legacy binding");
        return;
    }
    
    try {
        startAutosave();
        console.log("⭐ Autosave started");
    } catch (e) {
        console.error("⭐ Error starting autosave:", e);
    }
    
    // オートセーブから復元
    try {
        const autosaved = localStorage.getItem("autosave_project");
        if (autosaved) {
            const data = JSON.parse(autosaved);
            if (data && data.questions && data.questions.length > 0) {
                if (confirm("オートセーブされたプロジェクトが見つかりました。復元しますか？")) {
                    gameData = normalizeGameData(data);
                    updateUI();
                    console.log("[Editor] オートセーブから復元しました");
                }
            }
        }
    } catch (e) {
        console.warn("[Editor] オートセーブの復元に失敗:", e);
    }
    
    // イベントリスナーの設定（onclick 属性の代わり）
    console.log("⭐ Registering button event listeners...");
    
    // 関数の存在確認
    const requiredFunctions = {
        'addQuestion': addQuestion,
        'addDiagnosticQuestion': addDiagnosticQuestion,
        'addResult': addResult,
        'saveProjectAs': window.saveProjectAs,
        'saveQuiz': saveQuiz,
        'openProjectShelf': window.openProjectShelf,
        'closeProjectShelf': window.closeProjectShelf,
        'exportCSV': exportCSV,
        'exportHTML': exportHTML,
        'previewGame': previewGame,
        'handleFileLoad': handleFileLoad
    };
    
    for (const [name, func] of Object.entries(requiredFunctions)) {
        if (typeof func !== 'function') {
            console.warn(`⭐ WARNING: Function ${name} is not defined!`);
        } else {
            console.log(`⭐ Function ${name} is available`);
        }
    }
    
    const btnAddQuestion = document.getElementById('btn-add-question');
    if (btnAddQuestion) {
        if (typeof addQuestion === 'function') {
            btnAddQuestion.addEventListener('click', addQuestion);
            console.log("⭐ Registered: btn-add-question");
        } else {
            console.warn("⭐ WARNING: addQuestion function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-question' not found in DOM!");
    }
    
    const btnAddDiagnosticQuestion = document.getElementById('btn-add-diagnostic-question');
    if (btnAddDiagnosticQuestion) {
        if (typeof addDiagnosticQuestion === 'function') {
            btnAddDiagnosticQuestion.addEventListener('click', addDiagnosticQuestion);
            console.log("⭐ Registered: btn-add-diagnostic-question");
        } else {
            console.warn("⭐ WARNING: addDiagnosticQuestion function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-diagnostic-question' not found in DOM!");
    }
    
    const btnAddResult = document.getElementById('btn-add-result');
    if (btnAddResult) {
        if (typeof addResult === 'function') {
            btnAddResult.addEventListener('click', addResult);
            console.log("⭐ Registered: btn-add-result");
        } else {
            console.warn("⭐ WARNING: addResult function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-result' not found in DOM!");
    }
    
    const btnSaveProject = document.getElementById('btn-save-project');
    if (btnSaveProject) {
        if (typeof window.saveProjectAs === 'function') {
            btnSaveProject.addEventListener('click', window.saveProjectAs);
            console.log("⭐ Registered: btn-save-project");
        } else {
            console.warn("⭐ WARNING: saveProjectAs function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-save-project' not found in DOM!");
    }
    
    const saveQuizButton = document.getElementById('saveQuizButton');
    if (saveQuizButton) {
        if (typeof saveQuiz === 'function') {
            saveQuizButton.addEventListener('click', saveQuiz);
            console.log("⭐ Registered: saveQuizButton");
        } else {
            console.warn("⭐ WARNING: saveQuiz function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'saveQuizButton' not found in DOM!");
    }
    
    const btnOpenProjectShelf = document.getElementById('btn-open-project-shelf');
    if (btnOpenProjectShelf) {
        if (typeof window.openProjectShelf === 'function') {
            btnOpenProjectShelf.addEventListener('click', window.openProjectShelf);
            console.log("⭐ Registered: btn-open-project-shelf");
        } else {
            console.warn("⭐ WARNING: openProjectShelf function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-open-project-shelf' not found in DOM!");
    }
    
    const btnCloseProjectShelf = document.getElementById('btn-close-project-shelf');
    if (btnCloseProjectShelf) {
        if (typeof window.closeProjectShelf === 'function') {
            btnCloseProjectShelf.addEventListener('click', window.closeProjectShelf);
            console.log("⭐ Registered: btn-close-project-shelf");
        } else {
            console.warn("⭐ WARNING: closeProjectShelf function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-close-project-shelf' not found in DOM!");
    }
    
    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        if (typeof exportCSV === 'function') {
            btnExportCsv.addEventListener('click', exportCSV);
            console.log("⭐ Registered: btn-export-csv");
        } else {
            console.warn("⭐ WARNING: exportCSV function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-export-csv' not found in DOM!");
    }
    
    const btnExportHtml = document.getElementById('btn-export-html');
    if (btnExportHtml) {
        if (typeof exportHTML === 'function') {
            btnExportHtml.addEventListener('click', exportHTML);
            console.log("⭐ Registered: btn-export-html");
        } else {
            console.warn("⭐ WARNING: exportHTML function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-export-html' not found in DOM!");
    }
    
    const btnPreviewGame = document.getElementById('btn-preview-game');
    if (btnPreviewGame) {
        if (typeof previewGame === 'function') {
            btnPreviewGame.addEventListener('click', previewGame);
            console.log("⭐ Registered: btn-preview-game");
        } else {
            console.warn("⭐ WARNING: previewGame function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'btn-preview-game' not found in DOM!");
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        if (typeof handleFileLoad === 'function') {
            fileInput.addEventListener('change', handleFileLoad);
            console.log("⭐ Registered: fileInput");
        } else {
            console.warn("⭐ WARNING: handleFileLoad function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Input 'fileInput' not found in DOM!");
    }
    
    console.log("⭐ Event listener registration completed");
});

// ==========================================================
// loadTemplateIfNeeded: テンプレートIDからテンプレートを読み込む
// ==========================================================
function loadTemplateIfNeeded(id) {
    // テンプレートIDのマッピング（本棚のID → 実際のテンプレートキー）
    const templateMapping = {
        "template_quiz_basic": "quiz",
        "template_flashcard_basic": "flashcard",
        "template_review_basic": "flashcard", // 別名
        "quiz": "quiz", // 直接指定も対応
        "flashcard": "flashcard",
        "diagnosis": "diagnosis"
    };
    
    const templateKey = templateMapping[id] || id;
    
    if (TEMPLATE_PROJECTS[templateKey]) {
        console.log("📘 Loading template:", id, "->", templateKey);
        const template = TEMPLATE_PROJECTS[templateKey];
        
        // テンプレートデータを複製
        const gameData = cloneTemplateData(template.gameData);
        
        // テンプレートメタデータを追加
        gameData.title = template.name;
        gameData.description = template.description;
        gameData.tags = ["template"];
        
        // テンプレートの設定を追加
        if (template.settings) {
            gameData.settings = { ...template.settings };
        }
        
        // テンプレートのカテゴリを追加
        if (template.category) {
            gameData.category = template.category;
        }
        
        // gameDataに設定
        if (typeof window.gameData !== 'undefined') {
            window.gameData = gameData;
        }
        if (typeof window.setGameData === 'function') {
            window.setGameData(gameData);
        }
        
        // selectedNodeIdを設定
        if (typeof window.selectedNodeId !== 'undefined') {
            window.selectedNodeId = gameData.startNode || (gameData.questions[0] ? gameData.questions[0].id : null);
        }
        if (typeof window.setSelectedNodeId === 'function') {
            window.setSelectedNodeId(gameData.startNode || (gameData.questions[0] ? gameData.questions[0].id : null));
        }
        
        // nodeIdCounterを計算
        nodeIdCounter = calculateNextNodeIdCounterFromData(gameData);
        
        // UI復元
        if (typeof window.restoreGameToEditorUI === 'function') {
            window.restoreGameToEditorUI(gameData);
        }
        
        // UI更新
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        if (typeof window.renderNodes === 'function') {
            window.renderNodes();
        }
        if (typeof window.showPreview === 'function') {
            window.showPreview();
        }
        
        console.log("✅ テンプレートを読み込みました:", templateKey);
        return true;
    }
    
    return false;
}

// windowにも公開（後方互換性）
if (typeof window !== 'undefined') {
    window.loadTemplateIfNeeded = loadTemplateIfNeeded;
}

// ==========================================================
// restoreGameToEditorUI: プロジェクトデータをEditor UIに復元
// ==========================================================
function restoreGameToEditorUI(data) {
    console.log("🔄 restoreGameToEditorUI 開始", data);
    
    if (!data) {
        console.warn("⚠️ restoreGameToEditorUI: データがありません");
        return;
    }
    
    try {
        // -----------------------------
        // 1. gameDataに設定（既存の変数を使用）
        // -----------------------------
        if (typeof window.gameData !== 'undefined') {
            window.gameData = data;
        }
        
        // state.jsのsetGameDataも使用
        if (typeof window.setGameData === 'function') {
            window.setGameData(data);
        }
        
        // -----------------------------
        // 2. タイトルとカテゴリ（存在する場合）
        // -----------------------------
        const titleInput = document.getElementById("game-title");
        if (titleInput) {
            titleInput.value = data.title || "";
        }
        
        // カテゴリ
        if (data.category) {
            const categoryInput = document.getElementById("category-input");
            if (categoryInput) {
                categoryInput.value = data.category;
            }
        }
        
        // 設定（settings）
        if (data.settings) {
            // 背景色
            const bgSelect = document.getElementById("background-select");
            if (bgSelect && data.settings.background) {
                bgSelect.value = data.settings.background;
            }
            
            // フォント設定
            const qFont = document.getElementById("font-question");
            if (qFont && data.settings.questionFont) {
                qFont.value = data.settings.questionFont;
            }
            
            const cFont = document.getElementById("font-choice");
            if (cFont && data.settings.choiceFont) {
                cFont.value = data.settings.choiceFont;
            }
            
            // 汎用フォント設定（font-select）
            const fontSel = document.getElementById("font-select");
            if (fontSel && data.settings.font) {
                fontSel.value = data.settings.font;
            }
        }
        
        // -----------------------------
        // 3. タグ復元
        // -----------------------------
        if (data.tags && Array.isArray(data.tags)) {
            // 既存の変数名を検出（currentTags, gameData.tags等）
            if (typeof window.currentTags !== 'undefined') {
                window.currentTags = [...data.tags];
            }
            if (typeof window.gameData !== 'undefined') {
                window.gameData.tags = [...data.tags];
            }
            if (typeof renderTagList === 'function') {
                renderTagList();
            } else if (typeof window.renderTagList === 'function') {
                window.renderTagList();
            }
        }
        
        // -----------------------------
        // 4. 質問ノード復元（自動変数名検出）
        // -----------------------------
        // currentNodes に直接設定（指示書準拠）
        const questions = data.questions || [];
        if (Array.isArray(questions)) {
            window.currentNodes = [...questions];
            
            // 他の変数名も検出して設定（後方互換性）
            const possibleNames = ["nodes", "questionNodes"];
            for (const name of possibleNames) {
                if (typeof window[name] !== 'undefined') {
                    window[name] = [...window.currentNodes];
                }
            }
        }
        
        // -----------------------------
        // 5. UI更新
        // -----------------------------
        if (typeof renderNodes === 'function') {
            renderNodes();
        } else if (typeof window.renderNodes === 'function') {
            window.renderNodes();
        }
        
        if (typeof updateUI === 'function') {
            updateUI();
        } else if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        
        // -----------------------------
        // 6. Preview 更新
        // -----------------------------
        if (typeof updatePreview === 'function') {
            updatePreview();
        } else if (typeof window.showPreview === 'function') {
            window.showPreview();
        }
        
        console.log("✅ restoreGameToEditorUI 完了");
    } catch (e) {
        console.error("❌ restoreGameToEditorUI エラー:", e);
    }
}

// windowにも公開（後方互換性）
if (typeof window !== 'undefined') {
    window.restoreGameToEditorUI = restoreGameToEditorUI;
}



