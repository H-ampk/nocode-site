#!/usr/bin/env python3
"""
既存の quiz_log.json ファイルを新しいフォーマット（A方式）に変換するスクリプト

実行方法:
python scripts/migrate_to_flat_structure.py
"""

import json
import os
from pathlib import Path

def migrate_file(file_path, dataset_name=None, dataset_type='class'):
    """ファイルを新しいフォーマットに変換"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 既に新形式の場合はスキップ
        if 'dataset_name' in data and 'type' in data:
            print(f'Skipping {file_path} (already in new format)')
            return False
        
        # ログデータを抽出
        logs = []
        if isinstance(data, dict):
            if 'logs' in data:
                logs = data['logs']
            elif 'version' in data:
                logs = data.get('logs', [])
        elif isinstance(data, list):
            logs = data
        
        # データセット名を決定
        if not dataset_name:
            file_name = Path(file_path).stem
            # ファイル名から dataset_name を推測
            if 'dummy' in file_name.lower():
                dataset_name = 'quiz_log_dummy'
            elif 'student' in file_name.lower():
                dataset_name = file_name.replace('student', 'student').replace('_', '')
            elif 'class' in file_name.lower():
                dataset_name = file_name.replace('class', 'class').replace('_', '')
            else:
                dataset_name = file_name
        
        # タイプを決定
        if not dataset_type:
            file_name = file_path.lower()
            if 'student' in file_name or '個人' in file_name:
                dataset_type = 'student'
            else:
                dataset_type = 'class'
        
        # 作成日時を取得
        created_at = None
        if isinstance(data, dict):
            created_at = data.get('created_at') or data.get('generated_at')
        
        # 新しいフォーマットに変換
        new_data = {
            'dataset_name': dataset_name,
            'type': dataset_type,
            'created_at': created_at or '2025-11-18',
            'logs': logs
        }
        
        # ファイルを書き込み
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        
        print(f'Migrated {file_path} -> {dataset_name} ({dataset_type})')
        return True
    except Exception as e:
        print(f'Error migrating {file_path}: {e}')
        return False

def main():
    """メイン処理"""
    students_dir = Path('students')
    
    if not students_dir.exists():
        print('students/ directory not found')
        return
    
    # students/ 直下のすべての JSON ファイルを処理
    json_files = list(students_dir.glob('*.json'))
    
    if not json_files:
        print('No JSON files found in students/')
        return
    
    print(f'Found {len(json_files)} JSON files')
    
    migrated_count = 0
    for json_file in json_files:
        if migrate_file(json_file):
            migrated_count += 1
    
    print(f'\nMigration complete: {migrated_count} files migrated')

if __name__ == '__main__':
    main()


