#!/usr/bin/env python3
"""ダミーログの整合性を確認するスクリプト"""

import json
from pathlib import Path

file_path = Path('students/quiz_log_dummy.json')

try:
    with open(file_path, encoding='utf-8') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f'エラー: {file_path} が見つかりません。')
    exit(1)
except json.JSONDecodeError as e:
    print(f'エラー: {file_path} のJSON解析に失敗しました: {e}')
    exit(1)

# logs の存在確認
if 'logs' not in data:
    print('エラー: "logs" キーが見つかりません。')
    exit(1)

logs = data['logs']

if not logs:
    print('警告: logs が空です。')
    exit(0)

print(f'Total logs: {len(logs)}')
print(f'Dataset name: {data.get("dataset_name", "N/A")}')
print(f'Type: {data.get("type", "N/A")}')
print(f'Created at: {data.get("created_at", data.get("generated_at", "N/A"))}')

# 必須キーのチェック
required_keys = ['questionId', 'clicks', 'path', 'final_answer', 'correct', 'response_time', 'timestamp']
all_keys_valid = all(all(key in log for key in required_keys) for log in logs)
print(f'All required keys present: {all_keys_valid}')

# 正答・誤答の統計
correct_count = sum(1 for l in logs if l['correct'])
error_count = sum(1 for l in logs if not l['correct'])
print(f'Correct: {correct_count} ({correct_count/len(logs)*100:.1f}%)')
print(f'Error: {error_count} ({error_count/len(logs)*100:.1f}%)')

# conceptTags と recommended_terms の統計
with_concept_tags = sum(1 for l in logs if 'conceptTags' in l)
with_recommended = sum(1 for l in logs if 'recommended_terms' in l)
print(f'With conceptTags: {with_concept_tags} (should be {error_count})')
print(f'With recommended_terms: {with_recommended} (should be {error_count})')

# 反応時間分類
instant_count = sum(1 for l in logs if l['response_time'] <= 2)
searching_count = sum(1 for l in logs if 2 < l['response_time'] < 15)
deliberate_count = sum(1 for l in logs if l['response_time'] >= 15)
print('\nResponse time distribution:')
print(f'  instant (<=2s): {instant_count} ({instant_count/len(logs)*100:.1f}%)')
print(f'  searching (2-15s): {searching_count} ({searching_count/len(logs)*100:.1f}%)')
print(f'  deliberate (>=15s): {deliberate_count} ({deliberate_count/len(logs)*100:.1f}%)')

# path の統計
path_lengths = [len(l['path']) for l in logs]
print('\nPath length distribution:')
for length in range(1, 5):
    count = sum(1 for pl in path_lengths if pl == length)
    print(f'  {length} steps: {count} ({count/len(logs)*100:.1f}%)')

# clicks と path の整合性チェック
integrity_ok = True
for i, log in enumerate(logs):
    if 'path' not in log or 'clicks' not in log:
        print(f'Warning: Log {i} - path または clicks が存在しません')
        integrity_ok = False
        continue
    
    path = log['path']
    clicks = log['clicks']
    
    if not path or not clicks:
        print(f'Warning: Log {i} - path または clicks が空です')
        integrity_ok = False
        continue
    
    if len(path) != len(clicks):
        print(f'Warning: Log {i} - path length ({len(path)}) != clicks length ({len(clicks)})')
        integrity_ok = False
    for j, (p, c) in enumerate(zip(path, clicks)):
        if 'choiceId' not in c:
            print(f'Warning: Log {i}, click {j} - choiceId が存在しません')
            integrity_ok = False
            continue
        if p != c['choiceId']:
            print(f'Warning: Log {i}, click {j} - path choice ({p}) != click choiceId ({c["choiceId"]})')
            integrity_ok = False
    if clicks and 'time' in clicks[-1]:
        if clicks[-1]['time'] != log['response_time']:
            print(f'Warning: Log {i} - last click time ({clicks[-1]["time"]}) != response_time ({log["response_time"]})')
            integrity_ok = False

print(f'\nIntegrity check: {"OK" if integrity_ok else "FAILED"}')

# vector_test_sessions の検証
if 'vector_test_sessions' in data:
    print('\n' + '='*50)
    print('vector_test_sessions の検証')
    print('='*50)
    
    vts = data['vector_test_sessions']
    sessions = vts.get('sessions', [])
    print(f'セッション数: {len(sessions)}')
    print(f'User ID: {vts.get("user_id", "N/A")}')
    print(f'Generated at: {vts.get("generated_at", "N/A")}')
    
    total_vector_logs = 0
    vector_logs_with_vector = 0
    vector_errors = []
    
    for session_idx, session in enumerate(sessions):
        if 'session_id' not in session:
            print(f'警告: Session {session_idx} に session_id がありません')
            continue
        
        session_logs = session.get('logs', [])
        if not session_logs:
            continue
        
        total_vector_logs += len(session_logs)
        
        for log_idx, log in enumerate(session_logs):
            if not isinstance(log, dict):
                continue
            
            if 'vector' in log:
                vector_logs_with_vector += 1
                vector = log['vector']
                if not isinstance(vector, dict):
                    vector_errors.append(
                        f'Session {session["session_id"]}, Log {log_idx}: '
                        f'vector が辞書型ではありません'
                    )
                    continue
                
                # ベクトルの値が -1, 0, 1 のいずれかであることを確認
                for axis, value in vector.items():
                    if not isinstance(value, (int, float)):
                        vector_errors.append(
                            f'Session {session["session_id"]}, Log {log_idx}: '
                            f'vector[{axis}] = {value} (型が不正: {type(value).__name__})'
                        )
                    elif value not in [-1, 0, 1]:
                        vector_errors.append(
                            f'Session {session["session_id"]}, Log {log_idx}: '
                            f'vector[{axis}] = {value} (expected -1, 0, or 1)'
                        )
    
    print(f'総ログ数: {total_vector_logs}件')
    print(f'vector フィールドを持つログ: {vector_logs_with_vector}件')
    
    if vector_errors:
        print(f'\n⚠️ ベクトル値のエラー: {len(vector_errors)}件')
        for error in vector_errors[:10]:  # 最初の10件のみ表示
            print(f'  {error}')
        if len(vector_errors) > 10:
            print(f'  ... 他 {len(vector_errors) - 10}件のエラー')
    else:
        print('✅ ベクトル値の検証: OK')
else:
    print('\nvector_test_sessions は見つかりませんでした。')





