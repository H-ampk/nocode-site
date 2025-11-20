#!/usr/bin/env julia
"""
クラスタリング分析メインスクリプト

生徒ログデータをクラスタリング分析して、学習パターンを可視化します。

使用方法:
    julia cluster_main.jl

前提条件:
    - student_logs.csv が analysis/ ディレクトリに存在すること
    - 必要なパッケージがインストールされていること:
      - CSV
      - DataFrames
      - Clustering
      - StatsBase
      - Plots
"""

using CSV
using DataFrames
using Clustering
using StatsBase
using Statistics

# ユーティリティ関数を読み込む
include("cluster_utils.jl")
include("cluster_visualize.jl")

function main()
    println("=" ^ 60)
    println("クラスタリング分析を開始します...")
    println("=" ^ 60)
    
    # ログ CSV を読み込む
    csv_path = "student_logs.csv"
    if !isfile(csv_path)
        error("エラー: $csv_path が見つかりません。")
    end
    
    println("\n📊 CSVファイルを読み込んでいます...")
    df = CSV.read(csv_path, DataFrame)
    println("   読み込み完了: $(nrow(df)) 件のログ")
    
    # 必要な特徴量を構築
    println("\n🔧 特徴量マトリックスを構築しています...")
    X = build_feature_matrix(df)
    println("   特徴量数: $(size(X, 2))")
    println("   サンプル数: $(size(X, 1))")
    
    # k-means クラスタリング
    println("\n🎯 k-means クラスタリングを実行しています...")
    k = 3  # クラスタ数
    kmeans_result = kmeans(X, k)
    
    println("\n✅ クラスタリング結果:")
    println("   クラスタ数: $k")
    println("   各クラスタのサイズ:")
    for i in 1:k
        count = sum(kmeans_result.assignments .== i)
        println("     クラスタ $i: $count 件 ($(round(count / length(kmeans_result.assignments) * 100, digits=1))%)")
    end
    
    # 階層的クラスタリング（オプション）
    println("\n🌳 階層的クラスタリングを実行しています...")
    hclust_result = hclust(pairwise(Euclidean(), X'), linkage=:ward)
    
    # クラスタラベルをDataFrameに追加
    df.cluster_label = kmeans_result.assignments
    
    # 結果をCSVに保存
    output_path = "student_logs_clustered.csv"
    CSV.write(output_path, df)
    println("\n💾 クラスタリング結果を保存しました: $output_path")
    
    # 可視化
    println("\n📈 クラスタリング結果を可視化しています...")
    plot_clusters(X, kmeans_result.assignments, hclust_result)
    
    println("\n" * "=" ^ 60)
    println("✅ クラスタリング分析が完了しました！")
    println("=" ^ 60)
end

# メイン処理を実行
if abspath(PROGRAM_FILE) == @__FILE__
    main()
end

