using JSON3
using Statistics
using Distributions
using Plots

# コマンドライン引数からファイルパスを取得
input_file = ARGS[1]
output_json_file = ARGS[2]

# JSONファイルを読み込む
data = JSON3.read(read(input_file, String))

# logs 配列から reaction_time を抽出
reaction_times = Float64[]

if haskey(data, :logs) && isa(data.logs, Vector)
    for log in data.logs
        if haskey(log, :response_time)
            push!(reaction_times, Float64(log.response_time))
        end
    end
elseif isa(data, Vector)
    # データが直接配列の場合
    for log in data
        if haskey(log, :response_time)
            push!(reaction_times, Float64(log.response_time))
        end
    end
end

if length(reaction_times) == 0
    error("反応時間データが見つかりませんでした")
end

# 基本統計量を計算
mean_rt = mean(reaction_times)
median_rt = median(reaction_times)
std_rt = std(reaction_times)
min_rt = minimum(reaction_times)
max_rt = maximum(reaction_times)

# 指数分布のパラメータ推定（最尤推定）
# λ = 1 / mean
lambda = 1.0 / mean_rt

# 正規分布のパラメータ推定（最尤推定）
# μ = mean, σ = std
mu = mean_rt
sigma = std_rt

# ヒストグラムを生成
h = histogram(
    reaction_times,
    bins=30,
    xlabel="反応時間 (秒)",
    ylabel="頻度",
    title="反応時間の分布（指数分布・正規分布フィッティング）",
    legend=true,
    dpi=300,
    alpha=0.6
)

# 分布曲線をプロットに追加
x_range = range(minimum(reaction_times), stop=maximum(reaction_times), length=200)

# 指数分布の曲線（スケール調整）
exp_dist = Exponential(1/lambda)
exp_pdf = [pdf(exp_dist, x) * length(reaction_times) * (maximum(reaction_times) - minimum(reaction_times)) / 30 for x in x_range]
plot!(h, x_range, exp_pdf, label="指数分布 (λ=$(round(lambda, digits=4)))", linewidth=2, color=:red)

# 正規分布の曲線（スケール調整）
normal_dist = Normal(mu, sigma)
normal_pdf = [pdf(normal_dist, x) * length(reaction_times) * (maximum(reaction_times) - minimum(reaction_times)) / 30 for x in x_range]
plot!(h, x_range, normal_pdf, label="正規分布 (μ=$(round(mu, digits=2)), σ=$(round(sigma, digits=2)))", linewidth=2, color=:blue)

# プロットをPNGファイルとして保存
plot_dir = dirname(output_json_file)
plot_file = joinpath(plot_dir, "rt_fit.png")
savefig(h, plot_file)

# 結果をJSON形式で保存
result = Dict(
    "mean" => mean_rt,
    "median" => median_rt,
    "std" => std_rt,
    "min" => min_rt,
    "max" => max_rt,
    "lambda" => lambda,
    "mu" => mu,
    "sigma" => sigma,
    "graph" => "rt_fit.png"
)

# JSONファイルに書き込む
json_str = JSON3.write(result)
open(output_json_file, "w") do f
    write(f, json_str)
end

# 標準出力にも出力（デバッグ用）
println("分析完了: 平均=$(mean_rt), 中央値=$(median_rt), 標準偏差=$(std_rt)")

