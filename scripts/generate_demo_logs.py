#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
デモプロジェクト用学習ログデータ生成スクリプト
demo_project_02 と demo_project_03 の quiz.json に準拠したログを生成
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

def load_quiz_json(project_id):
    """quiz.json を読み込む"""
    quiz_path = Path(f"../projects/{project_id}/quiz.json")
    if not quiz_path.exists():
        raise FileNotFoundError(f"quiz.json not found: {quiz_path}")
    
    with open(quiz_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_path(choices, final_answer):
    """選択肢のパスを生成（1〜4の長さ）"""
    path_length = random.randint(1, 4)
    path = []
    
    # 最後は final_answer にする
    for i in range(path_length - 1):
        # ランダムな選択肢を追加
        choice = random.choice(choices)
        choice_id = choice.get('id') or str(choice.get('value', i))
        path.append(choice_id)
    
    # 最後に final_answer を追加
    path.append(final_answer)
    return path

def generate_vector():
    """ランダムなベクトルを生成"""
    return {
        "logic": random.randint(-1, 1),
        "analysis": random.randint(-1, 1),
        "creativity": random.randint(-1, 1)
    }

def compute_vector_summary(logs):
    """ログからベクトルサマリーを計算"""
    if not logs:
        return {"logic": 0, "analysis": 0, "creativity": 0}
    
    vectors = [log.get("vector", {}) for log in logs if log.get("vector")]
    if not vectors:
        return {"logic": 0, "analysis": 0, "creativity": 0}
    
    summary = {
        "logic": sum(v.get("logic", 0) for v in vectors) / len(vectors),
        "analysis": sum(v.get("analysis", 0) for v in vectors) / len(vectors),
        "creativity": sum(v.get("creativity", 0) for v in vectors) / len(vectors)
    }
    return summary

def compute_cluster_features(logs):
    """
    ログ配列から cluster_features を計算（8次元）
    
    特徴量:
    1. correct_rate: 正答率 (0-1)
    2. avg_response_time: 平均反応時間 (正規化: 0-1, 最大30秒と仮定)
    3. avg_path_length: 平均パス長 (正規化: 0-1, 最大10と仮定)
    4. avg_vector_logic: vector.logic の平均 (正規化: -3〜+3 → 0-1)
    5. avg_vector_analysis: vector.analysis の平均 (正規化: -3〜+3 → 0-1)
    6. avg_vector_creativity: vector.creativity の平均 (正規化: -3〜+3 → 0-1)
    7. glossary_count: glossaryShown の総数 (正規化: 0-1, 最大20と仮定)
    8. total_logs: ログ総数 (正規化: 0-1, 最大50と仮定)
    """
    if not logs or len(logs) == 0:
        return [0.5] * 8
    
    total_logs = len(logs)
    correct_count = sum(1 for log in logs if log.get('correct', False))
    correct_rate = correct_count / total_logs if total_logs > 0 else 0
    
    # 平均反応時間
    response_times = [log.get('response_time', 0) for log in logs if log.get('response_time')]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    normalized_response_time = min(avg_response_time / 30.0, 1.0)
    
    # 平均パス長
    path_lengths = [len(log.get('path', [])) for log in logs if log.get('path')]
    avg_path_length = sum(path_lengths) / len(path_lengths) if path_lengths else 0
    normalized_path_length = min(avg_path_length / 10.0, 1.0)
    
    # vector の平均
    vector_logic_values = []
    vector_analysis_values = []
    vector_creativity_values = []
    
    for log in logs:
        vector = log.get('vector', {})
        if isinstance(vector, dict):
            if 'logic' in vector:
                vector_logic_values.append(vector['logic'])
            if 'analysis' in vector:
                vector_analysis_values.append(vector['analysis'])
            if 'creativity' in vector:
                vector_creativity_values.append(vector['creativity'])
    
    # vector の平均を計算（-1〜+1 → 0-1に正規化）
    avg_vector_logic = sum(vector_logic_values) / len(vector_logic_values) if vector_logic_values else 0
    normalized_vector_logic = (avg_vector_logic + 1) / 2.0  # -1〜+1 → 0-1
    
    avg_vector_analysis = sum(vector_analysis_values) / len(vector_analysis_values) if vector_analysis_values else 0
    normalized_vector_analysis = (avg_vector_analysis + 1) / 2.0
    
    avg_vector_creativity = sum(vector_creativity_values) / len(vector_creativity_values) if vector_creativity_values else 0
    normalized_vector_creativity = (avg_vector_creativity + 1) / 2.0
    
    # Glossary 提示数
    glossary_count = sum(len(log.get('glossaryShown', [])) for log in logs)
    normalized_glossary_count = min(glossary_count / 20.0, 1.0)
    
    # ログ総数（正規化）
    normalized_total_logs = min(total_logs / 50.0, 1.0)
    
    # cluster_features ベクトル（8次元）
    cluster_features = [
        round(correct_rate, 6),
        round(normalized_response_time, 6),
        round(normalized_path_length, 6),
        round(normalized_vector_logic, 6),
        round(normalized_vector_analysis, 6),
        round(normalized_vector_creativity, 6),
        round(normalized_glossary_count, 6),
        round(normalized_total_logs, 6)
    ]
    
    return cluster_features

def generate_session(quiz_data, session_index):
    """1セッション分のログを生成"""
    questions = quiz_data.get("questions", [])
    if not questions:
        raise ValueError("No questions found in quiz.json")
    
    # セッションID生成
    timestamp = datetime.now() - timedelta(days=random.randint(0, 30))
    session_id = f"session_{int(timestamp.timestamp())}_{session_index:03d}"
    generated_at = timestamp.isoformat() + "Z"
    
    # 誤答率を決定（20〜40%）
    error_rate = random.uniform(0.2, 0.4)
    
    logs = []
    for question in questions:
        question_id = question.get("id", f"q_{questions.index(question) + 1}")
        choices = question.get("choices", [])
        
        if not choices:
            continue
        
        # 正解選択肢を見つける
        correct_choice = None
        correct_choice_id = None
        for idx, choice in enumerate(choices):
            if choice.get("isCorrect", False):
                correct_choice = choice
                # id があれば使用、なければ value を文字列化、それもなければインデックス
                # quiz.json の選択肢には id がないため、value を使用
                correct_choice_id = choice.get("id") or str(choice.get("value", idx))
                break
        
        if not correct_choice:
            # 正解がない場合は最初の選択肢を正解とする
            correct_choice = choices[0]
            correct_choice_id = choices[0].get("id") or str(choices[0].get("value", 0))
        
        # 誤答率に基づいて正解/不正解を決定
        is_correct = random.random() > error_rate
        
        if is_correct:
            final_answer = correct_choice_id
            selected_choice = correct_choice
        else:
            # 不正解の場合は正解以外の選択肢を選ぶ
            wrong_choices = [c for c in choices if not c.get("isCorrect", False)]
            if wrong_choices:
                selected_choice = random.choice(wrong_choices)
                # id があれば使用、なければ value を文字列化
                final_answer = selected_choice.get("id") or str(selected_choice.get("value", wrong_choices.index(selected_choice)))
            else:
                selected_choice = choices[0]
                final_answer = selected_choice.get("id") or str(selected_choice.get("value", 0))
        
        # パス生成（final_answer を含む）
        path = generate_path(choices, final_answer)
        
        # 反応時間（2.0〜8.0秒）
        response_time = random.uniform(2.0, 8.0)
        
        # ベクトル（選択肢にvectorがあれば使用、なければ生成）
        vector = selected_choice.get("vector") or generate_vector()
        
        # ログエントリ生成
        log_entry = {
            "questionId": question_id,
            "timestamp": generated_at,
            "final_answer": final_answer,
            "correct": is_correct,
            "response_time": round(response_time, 2),
            "path": path,
            "conceptTags": ["demo"],
            "glossaryShown": [],
            "vector": vector
        }
        
        logs.append(log_entry)
    
    # ベクトルサマリー計算
    vector_summary = compute_vector_summary(logs)
    
    # クラスタ特徴量計算（ログから計算）
    cluster_features = compute_cluster_features(logs)
    
    # クラスタラベル（0,1,2）
    cluster_ground_truth = random.randint(0, 2)
    
    session = {
        "session_id": session_id,
        "generated_at": generated_at,
        "quiz_version": "demo_v1",
        "logs": logs,
        "vector_summary": vector_summary,
        "cluster_features": cluster_features,
        "cluster_ground_truth": cluster_ground_truth
    }
    
    return session

def generate_logs_for_project(project_id, num_sessions=50):
    """プロジェクト用のログデータを生成"""
    print(f"Loading quiz.json for {project_id}...")
    quiz_data = load_quiz_json(project_id)
    
    print(f"Generating {num_sessions} sessions for {project_id}...")
    sessions = []
    
    for i in range(num_sessions):
        session = generate_session(quiz_data, i)
        sessions.append(session)
        if (i + 1) % 10 == 0:
            print(f"  Generated {i + 1}/{num_sessions} sessions...")
    
    # データ構造を構築
    result = {
        "user_id": f"demo_student_{project_id}",
        "sessions": sessions
    }
    
    return result

def main():
    """メイン処理"""
    # 出力ディレクトリを確認
    output_dir = Path("../students")
    output_dir.mkdir(exist_ok=True)
    
    projects = [
        ("demo_project_02", "students/demo_project_02_logs.json"),
        ("demo_project_03", "students/demo_project_03_logs.json")
    ]
    
    for project_id, output_path in projects:
        try:
            print(f"\n{'='*60}")
            print(f"Generating logs for {project_id}")
            print(f"{'='*60}")
            
            logs_data = generate_logs_for_project(project_id, num_sessions=50)
            
            # JSONファイルに保存
            full_path = Path(f"../{output_path}")
            with open(full_path, 'w', encoding='utf-8') as f:
                json.dump(logs_data, f, ensure_ascii=False, indent=2)
            
            print(f"\n[OK] Saved {len(logs_data['sessions'])} sessions to {output_path}")
            print(f"  Total logs: {sum(len(s['logs']) for s in logs_data['sessions'])}")
            
        except FileNotFoundError as e:
            print(f"\n[ERROR] File not found for {project_id}: {e}")
        except json.JSONDecodeError as e:
            print(f"\n[ERROR] JSON decode error for {project_id}: {e}")
        except ValueError as e:
            print(f"\n[ERROR] Value error for {project_id}: {e}")
        except Exception as e:
            print(f"\n[ERROR] Unexpected error for {project_id}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("All done!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()

