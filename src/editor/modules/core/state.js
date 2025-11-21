/**
 * Editor のグローバル状態管理
 * 
 * gameData は window.gameData に統一する
 */

// window.gameData が存在しない場合は初期化
if (typeof window !== 'undefined' && !window.gameData) {
    window.gameData = {
        title: '',
        description: '',
        questions: [],
        results: [],
        startNode: null,
        tags: [],
        category: '',
        thumbnail: null
    };
}

// ノードIDカウンター
let nodeIdCounter = 0;

// 選択中のノードID
let selectedNodeId = null;

// Glossary テンプレート定義
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

// テンプレートプロジェクト定義（簡略版 - 完全版は後で移動）
const TEMPLATE_PROJECTS = {};

/**
 * 状態の取得・設定関数
 * 
 * window.gameData に統一する
 */
export function getGameData() {
    if (typeof window !== 'undefined') {
        // window.gameData が存在しない場合は初期化
        if (!window.gameData) {
            window.gameData = {
                title: '',
                description: '',
                questions: [],
                results: [],
                startNode: null,
                tags: [],
                category: '',
                thumbnail: null
            };
        }
        return window.gameData;
    }
    // window が存在しない場合（SSRなど）のフォールバック
    return {
        title: '',
        description: '',
        questions: [],
        results: [],
        startNode: null,
        tags: [],
        category: '',
        thumbnail: null
    };
}

export function setGameData(data) {
    if (typeof window !== 'undefined') {
        window.gameData = data;
        console.log('🔧 unified gameData set:', window.gameData);
    }
}

export function getNodeIdCounter() {
    return nodeIdCounter;
}

export function setNodeIdCounter(value) {
    nodeIdCounter = value;
}

export function incrementNodeIdCounter() {
    return nodeIdCounter++;
}

export function getSelectedNodeId() {
    return selectedNodeId;
}

export function setSelectedNodeId(id) {
    selectedNodeId = id;
}

export function getGlossaryTemplates() {
    return GLOSSARY_TEMPLATES;
}

export function getTemplateProjects() {
    return TEMPLATE_PROJECTS;
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.getGameData = getGameData;
    window.setGameData = setGameData;
}

