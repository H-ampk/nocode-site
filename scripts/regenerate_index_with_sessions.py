#!/usr/bin/env python3
"""
students フォルダ内の JSON ファイルから index.json を自動生成（セッション情報を含む）

実行方法:
python scripts/regenerate_index_with_sessions.py
"""

import json
import os
from pathlib import Path
from datetime import datetime


def extract_sessions_from_dataset(json_path, data):
    """
    データセットからセッション情報を抽出
    
    Returns:
        list: セッション情報のリスト [{"session_id": "...", "index": 0, "date": "..."}, ...]
    """
    sessions = []
    
    # vector_test_sessions.sessions をチェック
    if 'vector_test_sessions' in data and 'sessions' in data['vector_test_sessions']:
        sessions_data = data['vector_test_sessions']['sessions']
        for index, session in enumerate(sessions_data):
            session_id = session.get('session_id', f'session_{index}')
            # 日付を取得（generated_at または最初のログの timestamp）
            date = session.get('generated_at')
            if not date and 'logs' in session and len(session['logs']) > 0:
                first_log = session['logs'][0]
                date = first_log.get('timestamp')
            
            sessions.append({
                'session_id': session_id,
                'index': index,
                'date': date or 'unknown'
            })
    
    # トップレベルの sessions をチェック
    elif 'sessions' in data and isinstance(data['sessions'], list):
        for index, session in enumerate(data['sessions']):
            session_id = session.get('session_id', f'session_{index}')
            # 日付を取得
            date = session.get('timestamp_start') or session.get('generated_at') or session.get('created_at')
            if not date and 'answer_logs' in session and len(session['answer_logs']) > 0:
                first_log = session['answer_logs'][0]
                date = first_log.get('timestamp')
            if not date and 'logs' in session and len(session['logs']) > 0:
                first_log = session['logs'][0]
                date = first_log.get('timestamp')
            
            sessions.append({
                'session_id': session_id,
                'index': index,
                'date': date or 'unknown'
            })
    
    return sessions


def main():
    print('students/index.json を再生成中（セッション情報を含む）...')
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    students_dir = project_root / 'students'
    
    if not students_dir.exists():
        print(f'[エラー] {students_dir} が見つかりません')
        return
    
    # students フォルダ内の JSON ファイルをスキャン
    json_files = [f for f in os.listdir(students_dir) if f.endswith('.json') and f != 'index.json']
    
    datasets = []
    
    for json_file in json_files:
        json_path = students_dir / json_file
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # dataset_name を取得
                dataset_name = data.get('dataset_name') or json_file.replace('.json', '')
                dataset_type = data.get('type') or 'class'
                
                # セッション情報を抽出
                sessions = extract_sessions_from_dataset(json_path, data)
                
                dataset_entry = {
                    'file': json_file,
                    'dataset_name': dataset_name,
                    'type': dataset_type
                }
                
                # セッションがある場合は追加
                if sessions:
                    dataset_entry['sessions'] = sessions
                
                datasets.append(dataset_entry)
                
        except Exception as e:
            print(f'[警告] {json_file} の読み込みに失敗しました: {e}')
    
    # index.json を生成
    index_data = {
        'datasets': datasets
    }
    
    index_path = students_dir / 'index.json'
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f'[OK] {index_path} を更新しました（{len(datasets)} 個のデータセット）')
    
    # データセット一覧を表示
    print('\n[データセット一覧]')
    for ds in datasets:
        session_count = len(ds.get('sessions', []))
        print(f'  - {ds["dataset_name"]} ({ds["type"]}): {ds["file"]} ({session_count} セッション)')


if __name__ == '__main__':
    main()

