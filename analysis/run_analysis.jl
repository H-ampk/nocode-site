using JSON
using Statistics

# コマンドライン引数からファイル名を取得
file = ARGS[1]

# JSONファイルを読み込む
data = JSON.parsefile(file)

# --- 分析処理の例（自由に書き換え OK） ---
# 実際のデータ構造に合わせて調整してください

# logs 配列がある場合
if haskey(data, "logs") && isa(data["logs"], Array)
    logs = data["logs"]
    
    # 基本統計
    total_answers = length(logs)
    correct_count = count(log -> haskey(log, "correct") && log["correct"], logs)
    correct_rate = total_answers > 0 ? correct_count / total_answers : 0.0
    
    # 反応時間の平均
    response_times = Float64[]
    for log in logs
        if haskey(log, "response_time")
            push!(response_times, log["response_time"])
        end
    end
    avg_response_time = length(response_times) > 0 ? mean(response_times) : 0.0
    
    # ユニークな概念タグ
    concept_tags = String[]
    for log in logs
        if haskey(log, "conceptTags") && isa(log["conceptTags"], Array)
            for tag in log["conceptTags"]
                push!(concept_tags, string(tag))
            end
        end
    end
    unique_concepts = length(unique(concept_tags))
    
    result = Dict(
        "totalAnswers" => total_answers,
        "correctCount" => correct_count,
        "correctRate" => round(correct_rate * 100, digits=2),
        "avgResponseTime" => round(avg_response_time, digits=2),
        "uniqueConcepts" => unique_concepts
    )
else
    # logs がない場合のフォールバック
    result = Dict(
        "message" => "No logs found in data",
        "keys" => collect(keys(data))
    )
end

# JSON形式で出力
println(JSON.json(result))

