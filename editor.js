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
let gameData = {
    version: 2,
    startNode: null,
    questions: [],
    results: []
};

let selectedNodeId = null;
let nodeIdCounter = 0;

gameData = normalizeGameData(gameData);

function normalizeGameData(data) {
    if (!data || typeof data !== 'object') {
        return {
            version: 2,
            startNode: null,
            questions: [],
            results: []
        };
    }
    const normalized = {
        version: data.version || 1,
        startNode: data.startNode || null,
        questions: Array.isArray(data.questions) ? data.questions : [],
        results: Array.isArray(data.results) ? data.results : []
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
    gameData = cloneTemplateData(template.gameData);
    selectedNodeId = gameData.startNode || (gameData.questions[0] ? gameData.questions[0].id : null);
    nodeIdCounter = calculateNextNodeIdCounterFromData(gameData);
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
document.addEventListener('DOMContentLoaded', function() {
    // ドロップゾーンのクリックイベントは動的に追加する必要があるため、
    // showQuestionEditor内で設定する
});

// 質問ノードを追加
function addQuestion() {
    const questionId = `q_${nodeIdCounter++}`;
    const question = {
        id: questionId,
        type: 'question',
        title: `質問 ${gameData.questions.length + 1}`,
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
    
    gameData.questions.push(question);
    
    // 最初の質問の場合はスタートノードに設定
    if (gameData.questions.length === 1 && !gameData.startNode) {
        gameData.startNode = questionId;
    }
    
    updateUI();
    selectNode(questionId);
}

function addDiagnosticQuestion() {
    const questionId = `dq_${nodeIdCounter++}`;
    const question = {
        id: questionId,
        type: 'diagnostic_question',
        question_text: `診断質問 ${gameData.questions.filter(q => q.type === 'diagnostic_question').length + 1}`,
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
    
    gameData.questions.push(question);
    
    if (!gameData.startNode) {
        gameData.startNode = questionId;
    }
    
    updateUI();
    selectNode(questionId);
}

// 結果ノードを追加
function addResult() {
    const resultId = `r_${nodeIdCounter++}`;
    const result = {
        id: resultId,
        type: 'result',
        title: `結果 ${gameData.results.length + 1}`,
        text: '',
        image: '',
        url: '',
        buttonText: ''
    };
    
    gameData.results.push(result);
    updateUI();
    selectNode(resultId);
}

// ノードを選択
function selectNode(nodeId) {
    selectedNodeId = nodeId;
    updateUI();
    showEditor();
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
    if (gameData.startNode) {
        const startNode = gameData.questions.find(q => q.id === gameData.startNode);
        if (startNode) {
            const node = createListNode(startNode, 'start');
            nodeList.appendChild(node);
        }
    }
    
    // 質問ノード
    gameData.questions.forEach(question => {
        const node = createListNode(question, question.type || 'question');
        nodeList.appendChild(node);
    });
    
    // 結果ノード
    gameData.results.forEach(result => {
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
    
    div.onclick = () => selectNode(data.id);
    
    return div;
}

// エディタを表示
function updateEditor() {
    if (!selectedNodeId) {
        document.getElementById('editorContent').innerHTML = `
            <div class="empty-state">
                <h2>👋 ノードを選択</h2>
                <p style="margin-top: 20px;">左側のノードをクリックして編集してください。</p>
            </div>
        `;
        return;
    }
    
    const question = gameData.questions.find(q => q.id === selectedNodeId);
    const result = gameData.results.find(r => r.id === selectedNodeId);
    
    if (question) {
        showQuestionEditor(question);
    } else if (result) {
        showResultEditor(result);
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
    const question = gameData.questions.find(function(q) { return q.id === selectedNodeId; });
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
function renderVectorSettingsForQuestion(question) {
    const area = document.getElementById('vectorSettingArea');
    if (!area) return;
    
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
        // 既存のベクトル設定を取得
        const existingVectors = question.vector_scores || {};
        
        // 各選択肢ごとに評価軸UIを表示
        const vectorHtml = question.choices.map(function(choice, index) {
            // 選択肢IDを生成（既存のid、value、またはインデックスベース）
            let choiceId = choice.id || choice.value;
            if (!choiceId) {
                choiceId = `choice_${index}`;
                choice.id = choiceId;
            }
            
            const existingVector = existingVectors[choiceId] || {};
            
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
            
            const existingVector = (question.vector_scores || {})[choiceId] || {};
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

// テンプレートを読み込んで評価軸UIを更新
function loadGlossaryTemplateForQuestion(questionId) {
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
    const question = gameData.questions.find(function(q) { return q.id === questionId; });
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

// 通常クイズ用の評価軸UIを描画
function renderVectorAxisUI(glossaryTerms, choiceId, questionId, existingVector) {
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
        const key = term.id.split('.').pop();
        const currentValue = existingVector[key] !== undefined ? existingVector[key] : 0;
        
        const card = document.createElement('div');
        card.className = 'score-axis-card';
        card.setAttribute('data-axis', key);
        card.setAttribute('data-choice', choiceId);
        
        const termName = escapeHtml(term.name || key);
        const definition = escapeHtml(term.definition || '（説明なし）');
        
        card.innerHTML = `
            <div class="axis-title">${termName} (${escapeHtml(key)})</div>
            <div class="axis-desc">${definition}</div>
            <div class="score-radio-group">
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="-1" ${currentValue === -1 ? 'checked' : ''} 
                           onchange="updateVectorAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', -1)">
                    <span>-1 弱まる</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="0" ${currentValue === 0 ? 'checked' : ''} 
                           onchange="updateVectorAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', 0)">
                    <span>0 影響なし</span>
                </label>
                <label style="cursor: pointer;">
                    <input type="radio" name="${escapeHtml(choiceId)}-${escapeHtml(key)}" value="1" ${currentValue === 1 ? 'checked' : ''} 
                           onchange="updateVectorAxisScore('${escapeHtml(questionId)}', '${escapeHtml(choiceId)}', '${escapeHtml(key)}', 1)">
                    <span>+1 強まる</span>
                </label>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// 通常クイズ用の評価軸スコアを更新
function updateVectorAxisScore(questionId, choiceId, axis, value) {
    const question = gameData.questions.find(function(q) { return q.id === questionId; });
    if (!question) return;
    
    if (!question.vector_scores) {
        question.vector_scores = {};
    }
    
    if (!question.vector_scores[choiceId]) {
        question.vector_scores[choiceId] = {};
    }
    
    if (value === 0) {
        // 0の場合は削除（影響なし）
        delete question.vector_scores[choiceId][axis];
    } else {
        question.vector_scores[choiceId][axis] = value;
    }
    
    // 空のvectorの場合は削除
    if (Object.keys(question.vector_scores[choiceId]).length === 0) {
        delete question.vector_scores[choiceId];
    }
    
    // 空のvector_scoresの場合は削除
    if (Object.keys(question.vector_scores).length === 0) {
        delete question.vector_scores;
    }
    
    updateVectorJson(question);
    updateUI();
    showPreview();
}

// 通常クイズ用のベクトルJSONを更新（詳細表示用）
function updateVectorJson(question) {
    const jsonContainer = document.getElementById('vectorSettingJson');
    if (!jsonContainer) return;
    
    const vectorScores = question.vector_scores || {};
    jsonContainer.textContent = JSON.stringify(vectorScores, null, 2);
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

// 選択肢リストを更新
function updateChoicesList(question) {
    const choicesList = document.getElementById('choicesList');
    choicesList.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-item';
        
        // 選択肢IDを生成（既存のid、value、またはインデックスベース）
        const choiceId = choice.id || choice.value || `choice_${index}`;
        if (!choice.id && !choice.value) {
            choice.id = choiceId;
        }
        
        choiceDiv.innerHTML = `
            <input type="text" value="${escapeHtml(choice.text)}" 
                   placeholder="選択肢 ${index + 1}"
                   onchange="updateChoice('${question.id}', ${index}, 'text', this.value)">
            <select onchange="updateChoiceNext('${question.id}', ${index}, this.value)" 
                    style="padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px; flex: 1;">
                ${getNextNodeOptions(choice.nextId)}
            </select>
            ${question.enableGrading ? `
            <label style="display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                <input type="checkbox" ${choice.isCorrect ? 'checked' : ''} onchange="updateChoiceCorrect('${question.id}', ${index}, this.checked)">
                正解
            </label>` : ''}
            <button onclick="removeChoice('${question.id}', ${index})">削除</button>
        `;
        choicesList.appendChild(choiceDiv);
    });
    
    // ベクトル設定UIを再描画（通常クイズの場合のみ）
    if (question.type !== 'diagnostic_question') {
        setTimeout(function() {
            renderVectorSettingsForQuestion(question);
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
    question.choices[index].isCorrect = Boolean(isCorrect);
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
function addChoice(questionId) {
    const question = gameData.questions.find(q => q.id === questionId);
    if (question) {
        const nextValue = question.choices.length;
        question.choices.push({
            text: `選択肢${nextValue + 1}`,
            value: nextValue,
            nextId: null,
            isCorrect: false
        });
        updateUI();
        showPreview();
    }
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
        const removedChoice = question.choices[choiceIndex];
        const choiceId = removedChoice.id || removedChoice.value;
        
        // 関連するベクトル設定も削除
        if (choiceId && question.vector_scores && question.vector_scores[choiceId]) {
            delete question.vector_scores[choiceId];
            // 空のvector_scoresの場合は削除
            if (Object.keys(question.vector_scores).length === 0) {
                delete question.vector_scores;
            }
        }
        
        question.choices.splice(choiceIndex, 1);
        // 値を再割り当て
        question.choices.forEach((choice, index) => {
            choice.value = index;
        });
        updateUI();
        showPreview();
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
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'game_project.json';
    link.click();
    URL.revokeObjectURL(url);
}

// プロジェクトを読み込み
function loadProject() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loaded = JSON.parse(e.target.result);
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
    alert('HTMLエクスポート機能は準備中です。\n現在はCSVをエクスポートして、908.pyのCtrl+H機能を使用してください。');
}

// プレビューを表示
function previewGame() {
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
document.addEventListener('DOMContentLoaded', function() {
    createTemplateButtons();
    updateUI();
});



