// ローカルLLM統一レイヤ
export async function callOllama(model, prompt, options = {}) {
  const body = {
    model,
    prompt,
    stream: false,
    ...options
  };

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  return json.response;
}

