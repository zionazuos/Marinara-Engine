type GlmThinkingOptions = {
  model: string;
  baseUrl: string;
  providerKind: string;
  enableThinking?: boolean;
  reasoningEffort?: string | null;
};

export function isGlmModel(model: string): boolean {
  return model.toLowerCase().includes("glm");
}

export function isGlm52Model(model: string): boolean {
  return /(?:^|\/)glm-5\.2(?:$|[-:])/u.test(model.toLowerCase());
}

/**
 * GLM 5.3 raciocina sempre e **rejeita** o pedido de desligar o raciocínio:
 * responde 400 `reasoning_required` — "GLM 5.3 always thinks and does not support
 * disabling reasoning" — quando recebe `enable_thinking: false`, `reasoning_effort:
 * "none"` ou `reasoning.effort: "none"`. Sem raciocínio explícito (tradução de card,
 * por exemplo) mandávamos `enable_thinking: false` e toda chamada falhava. Enviar
 * `true` também não serve: passa a valer para quem pediu explicitamente para desligar.
 * O certo é omitir o parâmetro e deixar o modelo no padrão dele.
 */
export function isGlmAlwaysThinkingModel(model: string): boolean {
  return /(?:^|\/)glm-5\.3(?:$|[-:])/u.test(model.toLowerCase());
}

export function isNativeGlmEndpoint(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return (
      hostname === "api.z.ai" ||
      hostname.endsWith(".api.z.ai") ||
      hostname === "open.bigmodel.cn" ||
      hostname.endsWith(".open.bigmodel.cn")
    );
  } catch {
    return false;
  }
}

function hasActiveReasoningEffort(reasoningEffort?: string | null): boolean {
  return !!reasoningEffort && reasoningEffort !== "none";
}

function glm52ReasoningEffort(reasoningEffort?: string | null): "high" | "max" | null {
  if (!hasActiveReasoningEffort(reasoningEffort)) return null;
  return reasoningEffort === "max" || reasoningEffort === "xhigh" ? "max" : "high";
}

export function applyGlmThinkingParameters(body: Record<string, unknown>, options: GlmThinkingOptions): boolean {
  if (!isGlmModel(options.model)) return false;
  const nativeEndpoint = isNativeGlmEndpoint(options.baseUrl);
  if (!nativeEndpoint && options.providerKind !== "nanogpt") return false;
  const thinkingEnabled = options.enableThinking === true || hasActiveReasoningEffort(options.reasoningEffort);

  if (nativeEndpoint && isGlm52Model(options.model)) {
    body.thinking = { type: thinkingEnabled ? "enabled" : "disabled" };
    const effort = glm52ReasoningEffort(options.reasoningEffort);
    if (thinkingEnabled && effort) body.reasoning_effort = effort;
    return true;
  }

  // Modelos que sempre pensam recusam o parâmetro quando ele pede o desligamento.
  // Omitir é o único caminho seguro; o modelo já raciocina por padrão.
  if (!thinkingEnabled && isGlmAlwaysThinkingModel(options.model)) {
    return true;
  }

  body.enable_thinking = thinkingEnabled;
  return true;
}
