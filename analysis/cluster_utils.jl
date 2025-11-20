"""
クラスタリング分析ユーティリティ関数

特徴量の構築や前処理を行う関数を提供します。
"""

using DataFrames
using Statistics

"""
特徴量マトリックスを構築

Args:
    df: DataFrame（student_logs.csv から読み込んだデータ）

Returns:
    Matrix: 特徴量マトリックス（各行が1つのログ、各列が特徴量）
"""
function build_feature_matrix(df::DataFrame)
    n = nrow(df)
    
    # 特徴量1: 反応時間（正規化）
    reaction_time = coalesce.(df.reaction_time, 0.0)
    rt_mean = mean(reaction_time)
    rt_std = std(reaction_time)
    rt_normalized = rt_std > 0 ? (reaction_time .- rt_mean) ./ rt_std : zeros(n)
    
    # 特徴量2: 誤答率（0 or 1）
    error_flag = coalesce.(df.error_flag, 0)
    
    # 特徴量3: vector の合計（正規化）
    vector_sum = coalesce.(df.vector_sum, 0.0)
    vec_mean = mean(vector_sum)
    vec_std = std(vector_sum)
    vec_normalized = vec_std > 0 ? (vector_sum .- vec_mean) ./ vec_std : zeros(n)
    
    # 特徴量4: 正答率（0 or 1）
    correct = coalesce.(df.correct, 0)
    
    # 特徴量マトリックスを構築
    X = hcat(
        rt_normalized,
        error_flag,
        vec_normalized,
        correct
    )
    
    return X
end

"""
欠損値を処理

Args:
    df: DataFrame

Returns:
    DataFrame: 欠損値を処理したDataFrame
"""
function handle_missing_values(df::DataFrame)
    # 数値列の欠損値を0で埋める
    numeric_cols = names(df, Real)
    for col in numeric_cols
        df[!, col] = coalesce.(df[!, col], 0.0)
    end
    
    # 文字列列の欠損値を空文字で埋める
    string_cols = names(df, AbstractString)
    for col in string_cols
        df[!, col] = coalesce.(df[!, col], "")
    end
    
    return df
end

