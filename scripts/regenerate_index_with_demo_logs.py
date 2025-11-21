#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
students/index.json を再生成し、demo_project_02_logs.json と demo_project_03_logs.json を追加
"""

import json
from pathlib import Path
from datetime import datetime

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    students_dir = project_root / 'students'
    index_path = students_dir / 'index.json'
    
    datasets = []
    
    # 既存の quiz_log_dummy.json を読み込む
    quiz_log_path = students_dir / 'quiz_log_dummy.json'
    if quiz_log_path.exists():
        with open(quiz_log_path, 'r', encoding='utf-8') as f:
            quiz_log_data = json.load(f)
        
        if 'vector_test_sessions' in quiz_log_data and 'sessions' in quiz_log_data['vector_test_sessions']:
            sessions = quiz_log_data['vector_test_sessions']['sessions']
            session_list = []
            for idx, session in enumerate(sessions):
                session_list.append({
                    "session_id": session.get("session_id", f"session_{idx:03d}"),
                    "index": idx,
                    "date": session.get("generated_at", session.get("created_at", ""))
                })
            
            datasets.append({
                "file": "quiz_log_dummy.json",
                "dataset_name": "quiz_log_dummy",
                "type": "class",
                "sessions": session_list
            })
    
    # demo_project_02_logs.json を追加
    demo02_path = students_dir / 'demo_project_02_logs.json'
    if demo02_path.exists():
        with open(demo02_path, 'r', encoding='utf-8') as f:
            demo02_data = json.load(f)
        
        if 'sessions' in demo02_data:
            sessions = demo02_data['sessions']
            session_list = []
            for idx, session in enumerate(sessions):
                session_list.append({
                    "session_id": session.get("session_id", f"session_{idx:03d}"),
                    "index": idx,
                    "date": session.get("generated_at", "")
                })
            
            datasets.append({
                "file": "demo_project_02_logs.json",
                "dataset_name": "demo_project_02",
                "type": "class",
                "sessions": session_list
            })
    
    # demo_project_03_logs.json を追加
    demo03_path = students_dir / 'demo_project_03_logs.json'
    if demo03_path.exists():
        with open(demo03_path, 'r', encoding='utf-8') as f:
            demo03_data = json.load(f)
        
        if 'sessions' in demo03_data:
            sessions = demo03_data['sessions']
            session_list = []
            for idx, session in enumerate(sessions):
                session_list.append({
                    "session_id": session.get("session_id", f"session_{idx:03d}"),
                    "index": idx,
                    "date": session.get("generated_at", "")
                })
            
            datasets.append({
                "file": "demo_project_03_logs.json",
                "dataset_name": "demo_project_03",
                "type": "class",
                "sessions": session_list
            })
    
    # index.json を生成
    index_data = {
        "datasets": datasets
    }
    
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] index.json を再生成しました")
    print(f"  データセット数: {len(datasets)}")
    for ds in datasets:
        session_count = len(ds.get('sessions', []))
        print(f"    - {ds['dataset_name']}: {session_count} セッション")

if __name__ == '__main__':
    main()

