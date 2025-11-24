#!/usr/bin/env python3
"""
students フォルダ内の JSON ファイルから index.json を自動生成（Python版）

実行方法:ffahj
python scripts/regenerate_index.py
"""

import json
import os
from pathlib import Path
from datetime import datetime


def main():
    print('students/index.json を再生成中...')
    
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
                
                datasets.append({
                    'file': json_file,
                    'dataset_name': dataset_name,
                    'type': dataset_type
                })
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
        print(f'  - {ds["dataset_name"]} ({ds["type"]}): {ds["file"]}')


if __name__ == '__main__':
    main()

