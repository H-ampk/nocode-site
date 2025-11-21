/**
 * ノード操作（追加・削除）
 */

import { getGameData, setGameData, incrementNodeIdCounter, setSelectedNodeId } from '../core/state.js';

/**
 * 質問ノードを追加
 */
export function addQuestion() {
    console.log("⭐ addQuestion called");
    try {
        const gameData = getGameData();
        const questionId = `q_${incrementNodeIdCounter()}`;
        const question = {
            id: questionId,
            type: 'question',
            title: `質問 ${gameData.questions.length + 1}`,
            text: '',
            questionFont: '',
            choiceFont: '',
            customCSS: '',
            backgroundType: 'color',
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
        
        setGameData(gameData);
        // UI更新はグローバル関数を使用（後でモジュール化）
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        if (typeof window.selectNode === 'function') {
            window.selectNode(questionId);
        }
        console.log("⭐ addQuestion: Question added successfully");
    } catch (e) {
        console.error("⭐ addQuestion: Error adding question:", e);
        alert("質問の追加中にエラーが発生しました。");
    }
}

/**
 * 診断質問ノードを追加
 */
export function addDiagnosticQuestion() {
    console.log("⭐ addDiagnosticQuestion called");
    try {
        const gameData = getGameData();
        const questionId = `dq_${incrementNodeIdCounter()}`;
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
        
        setGameData(gameData);
        // UI更新はグローバル関数を使用（後でモジュール化）
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        if (typeof window.selectNode === 'function') {
            window.selectNode(questionId);
        }
        console.log("⭐ addDiagnosticQuestion: Diagnostic question added successfully");
    } catch (e) {
        console.error("⭐ addDiagnosticQuestion: Error adding diagnostic question:", e);
        alert("診断質問の追加中にエラーが発生しました。");
    }
}

/**
 * 結果ノードを追加
 */
export function addResult() {
    console.log("⭐ addResult called");
    try {
        const gameData = getGameData();
        const resultId = `r_${incrementNodeIdCounter()}`;
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
        setGameData(gameData);
        // UI更新はグローバル関数を使用（後でモジュール化）
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        if (typeof window.selectNode === 'function') {
            window.selectNode(resultId);
        }
        console.log("⭐ addResult: Result added successfully");
    } catch (e) {
        console.error("⭐ addResult: Error adding result:", e);
        alert("結果の追加中にエラーが発生しました。");
    }
}

/**
 * ノードを削除
 */
export function deleteNode(nodeId) {
    const gameData = getGameData();
    
    // 質問から削除
    gameData.questions = gameData.questions.filter(q => q.id !== nodeId);
    
    // 結果から削除
    gameData.results = gameData.results.filter(r => r.id !== nodeId);
    
    // スタートノードが削除された場合
    if (gameData.startNode === nodeId) {
        gameData.startNode = gameData.questions.length > 0 ? gameData.questions[0].id : null;
    }
    
    // 他のノードからの参照を削除
    gameData.questions.forEach(question => {
        if (question.choices) {
            question.choices.forEach(choice => {
                if (choice.nextId === nodeId) {
                    choice.nextId = null;
                }
            });
        }
        if (question.next) {
            Object.keys(question.next).forEach(key => {
                if (question.next[key] === nodeId) {
                    delete question.next[key];
                }
            });
        }
    });
    
    setGameData(gameData);
    setSelectedNodeId(null);
    // UI更新はグローバル関数を使用（後でモジュール化）
    if (typeof window.updateUI === 'function') {
        window.updateUI();
    }
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.addQuestion = addQuestion;
    window.addDiagnosticQuestion = addDiagnosticQuestion;
    window.addResult = addResult;
    window.deleteNode = deleteNode;
}

