#!/usr/bin/env python3
"""
vector_test_sessions 用のダミーデータを生成するスクリプト
50セッション分のランダムデータを生成
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# 設定
TOTAL_SESSIONS = 50
QUESTIONS = ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008', 'q009', 'q010']
CHOICES = ['c1', 'c2', 'c3', 'c4']

# conceptTags の候補
CONCEPT_TAGS = [
    'gravity',
    'astronomy',
    'fluid',
    'pressure',
    'creativity',
    'problem-solving',
    'logic',
    'analysis',
    'memory',
    'cognition'
]

# glossaryShown の候補
GLOSSARY_TERMS = [
    'concept.gravity.basic',
    'concept.gravity.deep',
    'concept.pressure.intro',
    'concept.creativity.basic',
    'concept.logic.intro',
    'concept.analysis.basic',
    'concept.memory.working',
    'concept.cognition.metacognition'
]

# ベクトル軸の候補
VECTOR_AXES = ['logic', 'analysis', 'creativity']


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


def generate_response_time():
    """反応時間を生成"""
    rand = random.random()
    if rand < 0.3:
        return random_float(0.5, 2.0)  # instant
    elif rand < 0.7:
        return random_float(3.0, 12.0)  # searching
    else:
        return random_float(15.0, 40.0)  # deliberate


def generate_path():
    """path（迷いパターン）を生成"""
    steps = random_int(1, 4)
    path = []
    
    for i in range(steps):
        choice = random_choice(CHOICES)
        if len(path) == 0 or path[-1] != choice:
            path.append(choice)
        elif i < steps - 1:
            other_choices = [c for c in CHOICES if c != choice]
            if len(other_choices) > 0:
                path.append(random_choice(other_choices))
            else:
                path.append(choice)
    
    return path


def generate_vector():
    """ベクトルを生成"""
    vector = {}
    for axis in VECTOR_AXES:
        # -1, 0, 1 のいずれかをランダムに設定
        vector[axis] = random_int(-1, 1)
    return vector


def generate_log(session_start_time, log_index):
    """1つのログエントリを生成"""
    question_id = random_choice(QUESTIONS)
    is_correct = random.random() < 0.6  # 60%の確率で正解
    response_time = generate_response_time()
    path = generate_path()
    final_answer = path[-1]
    
    # timestamp を生成（セッション開始時刻から順次）
    timestamp = session_start_time + timedelta(minutes=log_index)
    
    log = {
        'questionId': question_id,
        'timestamp': timestamp.isoformat() + 'Z',
        'final_answer': final_answer,
        'correct': is_correct,
        'response_time': response_time,
        'path': path,
        'conceptTags': random_choices(CONCEPT_TAGS, random_int(1, 3)),
        'glossaryShown': random_choices(GLOSSARY_TERMS, random_int(0, 2)) if random.random() < 0.7 else [],
        'vector': generate_vector()
    }
    
    return log


def generate_session(session_index, base_date):
    """1つのセッションを生成"""
    session_id = f'session_{session_index:03d}'
    
    # セッション開始時刻を生成（base_dateからランダムに過去へ）
    days_ago = random.uniform(0, 30)  # 過去30日以内
    session_start_time = base_date - timedelta(days=days_ago)
    
    # セッション内のログ数をランダムに生成（3〜10件）
    log_count = random_int(3, 10)
    logs = []
    
    for i in range(log_count):
        logs.append(generate_log(session_start_time, i))
    
    return {
        'session_id': session_id,
        'generated_at': session_start_time.isoformat() + 'Z',
        'logs': logs
    }


def main():
    """メイン処理"""
    print('vector_test_sessions 用のダミーデータ生成を開始...')
    
    base_date = datetime.fromisoformat('2025-11-20T12:00:00.000')
    sessions = []
    
    for i in range(1, TOTAL_SESSIONS + 1):
        sessions.append(generate_session(i, base_date))
    
    vector_test_sessions = {
        'user_id': 'dummy_student',
        'generated_at': base_date.isoformat() + 'Z',
        'sessions': sessions
    }
    
    # 既存の quiz_log_dummy.json を読み込む
    file_path = Path(__file__).parent.parent / 'students' / 'quiz_log_dummy.json'
    
    existing_data = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        print(f'警告: {file_path} が見つかりません。新規作成します。')
        existing_data = {
            'dataset_name': 'quiz_log_dummy',
            'type': 'class',
            'created_at': base_date.isoformat() + 'Z',
            'logs': []
        }
    except json.JSONDecodeError as e:
        print(f'エラー: {file_path} のJSON解析に失敗しました: {e}')
        return None
    
    # vector_test_sessions を更新（既存の logs を保持）
    existing_data['vector_test_sessions'] = vector_test_sessions
    
    # ファイルに保存
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f'エラー: ファイルの書き込みに失敗しました: {e}')
        return None
    
    total_logs = sum(len(s['logs']) for s in sessions)
    print(f'\n✅ 完了: {TOTAL_SESSIONS}セッション分のデータを生成しました')
    print(f'   総ログ数: {total_logs}件')
    print(f'   ファイル: {file_path}')
    
    return vector_test_sessions


if __name__ == '__main__':
    main()

