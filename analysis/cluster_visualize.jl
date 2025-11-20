"""
クラスタリング結果の可視化

クラスタリング結果をグラフとして出力します。
"""

using Plots
using Clustering

"""
クラスタリング結果を可視化

Args:
    X: 特徴量マトリックス
    labels: クラスタラベル
    hclust_result: 階層的クラスタリング結果（オプション）
"""
function plot_clusters(X, labels, hclust_result=nothing)
    # k-means クラスタリング結果の散布図
    p1 = scatter(
        X[:, 1], X[:, 2],
        group=labels,
        title="Student Clusters (k-means)",
        xlabel="Feature 1 (Normalized Reaction Time)",
        ylabel="Feature 2 (Error Flag)",
        legend=true,
        markersize=5,
        alpha=0.6
    )
    
    # 3D散布図（特徴量が3つ以上ある場合）
    if size(X, 2) >= 3
        p2 = scatter(
            X[:, 1], X[:, 2], X[:, 3],
            group=labels,
            title="Student Clusters (3D)",
            xlabel="Feature 1",
            ylabel="Feature 2",
            zlabel="Feature 3",
            legend=true,
            markersize=5,
            alpha=0.6
        )
    end
    
    # 階層的クラスタリングのデンドログラム
    if hclust_result !== nothing
        p3 = plot(
            hclust_result,
            title="Hierarchical Clustering (Dendrogram)",
            xlabel="Sample",
            ylabel="Distance",
            legend=false
        )
    end
    
    # グラフを保存
    savefig(p1, "student_clusters_2d.png")
    println("   📊 2D散布図を保存しました: student_clusters_2d.png")
    
    if size(X, 2) >= 3
        savefig(p2, "student_clusters_3d.png")
        println("   📊 3D散布図を保存しました: student_clusters_3d.png")
    end
    
    if hclust_result !== nothing
        savefig(p3, "student_clusters_dendrogram.png")
        println("   📊 デンドログラムを保存しました: student_clusters_dendrogram.png")
    end
end

"""
クラスタ統計を計算

Args:
    df: DataFrame（クラスタラベルが含まれている）
    labels: クラスタラベル

Returns:
    DataFrame: クラスタごとの統計
"""
function compute_cluster_stats(df::DataFrame, labels)
    cluster_stats = DataFrame(
        cluster = Int[],
        count = Int[],
        avg_reaction_time = Float64[],
        error_rate = Float64[],
        avg_vector_sum = Float64[]
    )
    
    unique_labels = unique(labels)
    for label in unique_labels
        mask = labels .== label
        cluster_df = df[mask, :]
        
        push!(cluster_stats, (
            cluster = label,
            count = nrow(cluster_df),
            avg_reaction_time = mean(coalesce.(cluster_df.reaction_time, 0.0)),
            error_rate = mean(coalesce.(cluster_df.error_flag, 0.0)),
            avg_vector_sum = mean(coalesce.(cluster_df.vector_sum, 0.0))
        ))
    end
    
    return cluster_stats
end

