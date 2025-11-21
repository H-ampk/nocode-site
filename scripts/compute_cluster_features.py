#!/usr/bin/env python3
"""
quiz_log_dummy.json の各セッションから cluster_features を計算して追加するスクリプト

実行方法:
python scripts/compute_cluster_features.py
"""

import json
from pathlib import Path


def compute_cluster_features(logs):
    """
    ログ配列から cluster_features を計算
    
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
        # デフォルト値（すべて0.5）
        return [0.5] * 8
    
    total_logs = len(logs)
    correct_count = sum(1 for log in logs if log.get('correct', False))
    correct_rate = correct_count / total_logs if total_logs > 0 else 0
    
    # 平均反応時間
    response_times = [log.get('response_time', 0) for log in logs if log.get('response_time')]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    normalized_response_time = min(avg_response_time / 30.0, 1.0)  # 最大30秒で正規化
    
    # 平均パス長
    path_lengths = [len(log.get('path', [])) for log in logs if log.get('path')]
    avg_path_length = sum(path_lengths) / len(path_lengths) if path_lengths else 0
    normalized_path_length = min(avg_path_length / 10.0, 1.0)  # 最大10で正規化
    
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
    
    # vector の平均を計算（-3〜+3 → 0-1に正規化）
    avg_vector_logic = sum(vector_logic_values) / len(vector_logic_values) if vector_logic_values else 0
    normalized_vector_logic = (avg_vector_logic + 3) / 6.0  # -3〜+3 → 0-1
    
    avg_vector_analysis = sum(vector_analysis_values) / len(vector_analysis_values) if vector_analysis_values else 0
    normalized_vector_analysis = (avg_vector_analysis + 3) / 6.0
    
    avg_vector_creativity = sum(vector_creativity_values) / len(vector_creativity_values) if vector_creativity_values else 0
    normalized_vector_creativity = (avg_vector_creativity + 3) / 6.0
    
    # Glossary 提示数
    glossary_count = sum(len(log.get('glossaryShown', [])) for log in logs)
    normalized_glossary_count = min(glossary_count / 20.0, 1.0)  # 最大20で正規化
    
    # ログ総数（正規化）
    normalized_total_logs = min(total_logs / 50.0, 1.0)  # 最大50で正規化
    
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


def main():
    print('quiz_log_dummy.json の各セッションから cluster_features を計算中...')
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    students_dir = project_root / 'students'
    quiz_log_path = students_dir / 'quiz_log_dummy.json'
    
    if not quiz_log_path.exists():
        print(f'[エラー] {quiz_log_path} が見つかりません')
        return
    
    # quiz_log_dummy.json を読み込む
    with open(quiz_log_path, 'r', encoding='utf-8') as f:
        quiz_data = json.load(f)
    
    updated_count = 0
    
    # vector_test_sessions.sessions を処理
    if 'vector_test_sessions' in quiz_data and 'sessions' in quiz_data['vector_test_sessions']:
        sessions = quiz_data['vector_test_sessions']['sessions']
        
        for session in sessions:
            if 'logs' in session and isinstance(session['logs'], list):
                # cluster_features を計算
                cluster_features = compute_cluster_features(session['logs'])
                session['cluster_features'] = cluster_features
                updated_count += 1
    
    # ファイルに保存
    with open(quiz_log_path, 'w', encoding='utf-8') as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)
    
    print(f'[OK] {updated_count} 個のセッションに cluster_features を追加しました')
    print(f'[OK] {quiz_log_path} を更新しました')
    
    # 統計情報を表示
    if 'vector_test_sessions' in quiz_data and 'sessions' in quiz_data['vector_test_sessions']:
        sessions = quiz_data['vector_test_sessions']['sessions']
        with_features = sum(1 for s in sessions if 'cluster_features' in s)
        print(f'\n[統計] セッション数: {len(sessions)}')
        print(f'  cluster_features を含むセッション: {with_features}')


if __name__ == '__main__':
    main()

