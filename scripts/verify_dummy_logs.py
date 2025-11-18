#!/usr/bin/env python3
"""ダミーログの整合性を確認するスクリプト"""

import json

with open('data/quiz_log_dummy.json', encoding='utf-8') as f:
    data = json.load(f)

logs = data['logs']

print(f'Total logs: {len(logs)}')
print(f'Version: {data["version"]}')
print(f'Generated at: {data["generated_at"]}')

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
print(f'\nResponse time distribution:')
print(f'  instant (<=2s): {instant_count} ({instant_count/len(logs)*100:.1f}%)')
print(f'  searching (2-15s): {searching_count} ({searching_count/len(logs)*100:.1f}%)')
print(f'  deliberate (>=15s): {deliberate_count} ({deliberate_count/len(logs)*100:.1f}%)')

# path の統計
path_lengths = [len(l['path']) for l in logs]
print(f'\nPath length distribution:')
for length in range(1, 5):
    count = sum(1 for pl in path_lengths if pl == length)
    print(f'  {length} steps: {count} ({count/len(logs)*100:.1f}%)')

# clicks と path の整合性チェック
integrity_ok = True
for i, log in enumerate(logs):
    path = log['path']
    clicks = log['clicks']
    if len(path) != len(clicks):
        print(f'Warning: Log {i} - path length ({len(path)}) != clicks length ({len(clicks)})')
        integrity_ok = False
    for j, (p, c) in enumerate(zip(path, clicks)):
        if p != c['choiceId']:
            print(f'Warning: Log {i}, click {j} - path choice ({p}) != click choiceId ({c["choiceId"]})')
            integrity_ok = False
    if clicks[-1]['time'] != log['response_time']:
        print(f'Warning: Log {i} - last click time ({clicks[-1]["time"]}) != response_time ({log["response_time"]})')
        integrity_ok = False

print(f'\nIntegrity check: {"OK" if integrity_ok else "FAILED"}')





