#!/usr/bin/env python3
"""
ダミー quiz_log.json を生成するスクリプト

実行方法:
python scripts/generate_dummy_logs.py
"""

import json
import random
from datetime import datetime, timedelta

# 設定
TOTAL_LOGS = 50
QUESTIONS = ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008', 'q009', 'q010']
CHOICES = ['c1', 'c2', 'c3', 'c4']

# conceptTags の候補
CONCEPT_TAGS = [
    '短期記憶',
    '作業記憶',
    '注意',
    '条件づけ',
    '認知負荷',
    'メタ認知'
]

# recommended_terms の候補
RECOMMENDED_TERMS = [
    '短期記憶',
    '作業記憶',
    '注意制御',
    '長期記憶',
    '二重過程理論',
    'ワーキングメモリ'
]


def random_float(min_val, max_val):
    """指定範囲の乱数を生成"""
    return round(random.uniform(min_val, max_val), 1)


def random_int(min_val, max_val):
    """指定範囲の整数を生成"""
    return random.randint(min_val, max_val)


def random_choice(array):
    """配列からランダムに要素を取得"""
    return random.choice(array)


def random_choices(array, count):
    """配列からランダムに複数要素を取得（重複なし）"""
    return random.sample(array, min(count, len(array)))


def get_response_time_category():
    """反応時間の分類を取得"""
    rand = random.random()
    # 分布: instant 30%, searching 40%, deliberate 30%
    if rand < 0.3:
        return 'instant'  # 0.5〜2秒
    elif rand < 0.7:
        return 'searching'  # 3〜12秒
    else:
        return 'deliberate'  # 15〜40秒


def generate_response_time(category):
    """反応時間を生成"""
    if category == 'instant':
        return random_float(0.5, 2.0)
    elif category == 'searching':
        return random_float(3.0, 12.0)
    elif category == 'deliberate':
        return random_float(15.0, 40.0)
    else:
        return random_float(0.5, 40.0)


def generate_path():
    """path（迷いパターン）を生成"""
    steps = random_int(1, 4)
    path = []
    
    if steps == 1:
        # 即答型: 1つの選択肢のみ
        path = [random_choice(CHOICES)]
    else:
        # 迷いパターン: 複数の選択肢間を遷移
        for i in range(steps):
            choice = random_choice(CHOICES)
            # 前の選択肢と異なる場合は追加
            if len(path) == 0 or path[-1] != choice:
                path.append(choice)
            elif i < steps - 1:
                # 同じ選択肢が続く場合は別の選択肢を選ぶ
                other_choices = [c for c in CHOICES if c != choice]
                if len(other_choices) > 0:
                    path.append(random_choice(other_choices))
                else:
                    path.append(choice)
    
    return path


def generate_clicks(path, response_time):
    """clicks を生成（path と整合性を保つ）"""
    if not path:
        return []
    
    # response_time が0以下の場合は最小値に設定
    if response_time <= 0:
        response_time = 0.1
    
    clicks = []
    cumulative_time = 0
    
    for i, choice_id in enumerate(path):
        remaining_time = max(0.1, response_time - cumulative_time)
        remaining_clicks = len(path) - i
        
        if i == len(path) - 1:
            # 最後のクリックは response_time に合わせる
            time = remaining_time
        else:
            # 中間のクリックは均等に分散
            if remaining_clicks > 1:
                average_interval = remaining_time / remaining_clicks
                time = random_float(max(0.1, average_interval * 0.5), min(average_interval * 1.5, remaining_time * 0.9))
            else:
                time = remaining_time
        
        cumulative_time += time
        clicks.append({
            'choiceId': choice_id,
            'time': round(cumulative_time, 1)
        })
    
    # 最後のクリック時間を response_time に合わせる
    if len(clicks) > 0:
        clicks[-1]['time'] = round(response_time, 1)
    
    return clicks


def generate_log():
    """1つのログエントリを生成"""
    question_id = random_choice(QUESTIONS)
    is_correct = random.random() < 0.5  # 50%の確率で正解
    category = get_response_time_category()
    response_time = generate_response_time(category)
    path = generate_path()
    clicks = generate_clicks(path, response_time)
    final_answer = path[-1]
    
    # timestamp を生成（現在時刻からランダムに過去へ）
    now = datetime.now()
    days_ago = random.uniform(0, 30)  # 過去30日以内
    timestamp = now - timedelta(days=days_ago)
    
    log = {
        'questionId': question_id,
        'timestamp': timestamp.isoformat() + 'Z',
        'clicks': clicks,
        'final_answer': final_answer,
        'correct': is_correct,
        'response_time': round(response_time, 1),
        'path': path
    }
    
    # 誤答の場合は conceptTags と recommended_terms を追加
    if not is_correct:
        # conceptTags: 1〜2個をランダムに付与
        tag_count = random_int(1, 2)
        log['conceptTags'] = random_choices(CONCEPT_TAGS, tag_count)
        
        # recommended_terms: 1〜3個をランダムに生成
        term_count = random_int(1, 3)
        log['recommended_terms'] = random_choices(RECOMMENDED_TERMS, term_count)
    
    return log


def main():
    """メイン処理"""
    print('ダミーログ生成を開始...')
    
    logs = []
    for _ in range(TOTAL_LOGS):
        logs.append(generate_log())
    
    print(f'生成完了: {TOTAL_LOGS}件のログ')
    correct_count = sum(1 for l in logs if l['correct'])
    print(f'正答率: {correct_count / len(logs) * 100:.1f}%')
    
    # 分類別の統計
    instant_count = sum(1 for l in logs if l['response_time'] <= 2)
    searching_count = sum(1 for l in logs if 2 < l['response_time'] < 15)
    deliberate_count = sum(1 for l in logs if l['response_time'] >= 15)
    
    print('反応時間分類:')
    print(f'  instant (0.5-2秒): {instant_count}件')
    print(f'  searching (3-12秒): {searching_count}件')
    print(f'  deliberate (15-40秒): {deliberate_count}件')
    
    # ファイルに保存（既存のデータを保持）
    output_path = 'students/quiz_log_dummy.json'
    existing_data = {}
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        pass
    except json.JSONDecodeError as e:
        print(f'警告: {output_path} の読み込みに失敗しました: {e}')
        print('新規作成します。')
    
    # 既存のデータを保持しつつ、logs を更新
    if 'dataset_name' in existing_data or 'type' in existing_data:
        # 新しいフォーマット（dataset_name, type を含む）
        existing_data['logs'] = logs
        if 'created_at' not in existing_data:
            existing_data['created_at'] = datetime.now().isoformat() + 'Z'
        log_data = existing_data
    else:
        # 旧フォーマットまたは新規作成
        log_data = {
            'dataset_name': 'quiz_log_dummy',
            'type': 'class',
            'created_at': datetime.now().isoformat() + 'Z',
            'logs': logs
        }
        # vector_test_sessions が既に存在する場合は保持
        if 'vector_test_sessions' in existing_data:
            log_data['vector_test_sessions'] = existing_data['vector_test_sessions']
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)
    
    print(f'\nファイルに保存しました: {output_path}')
    
    return log_data


if __name__ == '__main__':
    main()





