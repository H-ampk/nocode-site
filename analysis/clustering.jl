using JSON3
using DataFrames
using Clustering
using Statistics

# 入力ファイルパス
input_file = "students/cluster_dummy.json"
output_file = "analysis/cluster_output.json"

# JSONファイルを読み込む
data = JSON3.read(read(input_file, String))

# sessions 配列から cluster_features を抽出
sessions = []
features_matrix = Float64[]

if haskey(data, :sessions) && isa(data.sessions, Vector)
    sessions = data.sessions
else
    error("sessions が見つかりませんでした")
end

if length(sessions) == 0
    error("セッションデータが空です")
end

# cluster_features を抽出して行列に変換
feature_vectors = []
session_ids = String[]

for (idx, session) in enumerate(sessions)
    if haskey(session, :cluster_features) && isa(session.cluster_features, Vector)
        features = session.cluster_features
        # Float64 に変換
        feature_vec = [Float64(f) for f in features]
        push!(feature_vectors, feature_vec)
        
        # session_id を保存
        session_id = haskey(session, :session_id) ? string(session.session_id) : "session_$idx"
        push!(session_ids, session_id)
    else
        @warn "セッション $idx に cluster_features が見つかりません"
    end
end

if length(feature_vectors) == 0
    error("cluster_features が見つかりませんでした")
end

# 特徴量の次元数を確認
feature_dim = length(feature_vectors[1])
for (idx, vec) in enumerate(feature_vectors)
    if length(vec) != feature_dim
        error("セッション $idx の特徴量次元が一致しません: $(length(vec)) != $feature_dim")
    end
end

# 行列に変換（各行が1つのセッション、各列が1つの特徴量）
# Clustering.jl は列がサンプル、行が特徴量の形式を期待するため、転置が必要
X = hcat(feature_vectors...)  # 列がサンプル、行が特徴量
X = X'  # 転置: 行がサンプル、列が特徴量

println("データ形状: $(size(X)) (サンプル数 × 特徴量次元)")
println("サンプル数: $(size(X, 1))")
println("特徴量次元: $(size(X, 2))")

# k-means クラスタリング (k=3)
k = 3
result = kmeans(X, k; maxiter=200, display=:iter)

# クラスタ割り当てと距離を計算
cluster_assignments = result.assignments
centers = result.centers

# 各セッションの結果を構築
output_results = []

for (idx, session_id) in enumerate(session_ids)
    assigned_cluster = cluster_assignments[idx]
    
    # セッションの特徴量ベクトル
    feature_vec = feature_vectors[idx]
    
    # 割り当てられたクラスタの中心までの距離を計算
    cluster_center = centers[:, assigned_cluster]
    distance = sqrt(sum((feature_vec[i] - cluster_center[i])^2 for i in 1:length(feature_vec)))
    
    push!(output_results, Dict(
        "session_id" => session_id,
        "assigned_cluster" => assigned_cluster,
        "distance" => round(distance, digits=4)
    ))
end

# 結果をJSON形式で保存
output_dict = Dict(
    "total_sessions" => length(output_results),
    "k" => k,
    "feature_dimension" => feature_dim,
    "results" => output_results
)

json_str = JSON3.write(output_dict, indent=2)
open(output_file, "w") do f
    write(f, json_str)
end

println("\nクラスタリング分析完了:")
println("  総セッション数: $(length(output_results))")
println("  クラスタ数: $k")
println("  出力ファイル: $output_file")

# クラスタごとの統計を表示
for cluster_id in 1:k
    cluster_sessions = [r for r in output_results if r["assigned_cluster"] == cluster_id]
    avg_distance = mean([r["distance"] for r in cluster_sessions])
    println("  クラスタ $cluster_id: $(length(cluster_sessions)) セッション, 平均距離: $(round(avg_distance, digits=4))")
end

