#!/usr/bin/env python3
"""
quiz_log_dummy.json に cluster_features を統合するスクリプト

実行方法:
python scripts/integrate_cluster_features.py
"""

import json
import random
import os
from pathlib import Path


def generate_random_cluster_features():
    """ランダムな8次元の cluster_features を生成"""
    return [round(random.random(), 6) for _ in range(8)]


def main():
    print('cluster_features を quiz_log_dummy.json に統合中...')
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    students_dir = project_root / 'students'
    
    # cluster_dummy.json を読み込む
    cluster_dummy_path = students_dir / 'cluster_dummy.json'
    cluster_features_list = []
    
    if cluster_dummy_path.exists():
        with open(cluster_dummy_path, 'r', encoding='utf-8') as f:
            cluster_data = json.load(f)
            if 'sessions' in cluster_data:
                cluster_features_list = [
                    session.get('cluster_features')
                    for session in cluster_data['sessions']
                    if 'cluster_features' in session
                ]
                print(f'[OK] cluster_dummy.json から {len(cluster_features_list)} 個の cluster_features を読み込みました')
    else:
        print('[警告] cluster_dummy.json が見つかりません。ランダム生成を使用します。')
    
    # quiz_log_dummy.json を読み込む
    quiz_log_path = students_dir / 'quiz_log_dummy.json'
    if not quiz_log_path.exists():
        print(f'[エラー] {quiz_log_path} が見つかりません')
        return
    
    with open(quiz_log_path, 'r', encoding='utf-8') as f:
        quiz_data = json.load(f)
    
    # vector_test_sessions.sessions に cluster_features を追加
    if 'vector_test_sessions' in quiz_data and 'sessions' in quiz_data['vector_test_sessions']:
        sessions = quiz_data['vector_test_sessions']['sessions']
        added_count = 0
        
        for i, session in enumerate(sessions):
            if 'cluster_features' not in session:
                # cluster_dummy.json から取得、またはランダム生成
                if i < len(cluster_features_list) and cluster_features_list[i] is not None:
                    session['cluster_features'] = cluster_features_list[i]
                else:
                    session['cluster_features'] = generate_random_cluster_features()
                added_count += 1
        
        print(f'[OK] {added_count} 個のセッションに cluster_features を追加しました')
    else:
        print('[警告] vector_test_sessions.sessions が見つかりません')
    
    # トップレベルの logs からセッションを生成する必要があるか確認
    # ただし、analysis.js は sessions 配列を探すので、vector_test_sessions.sessions があれば十分
    
    # ファイルに保存
    with open(quiz_log_path, 'w', encoding='utf-8') as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)
    
    print(f'[OK] {quiz_log_path} を更新しました')
    
    # 統計情報を表示
    if 'vector_test_sessions' in quiz_data and 'sessions' in quiz_data['vector_test_sessions']:
        sessions = quiz_data['vector_test_sessions']['sessions']
        with_features = sum(1 for s in sessions if 'cluster_features' in s)
        print(f'\n[統計] セッション数: {len(sessions)}')
        print(f'  cluster_features を含むセッション: {with_features}')


if __name__ == '__main__':
    main()

