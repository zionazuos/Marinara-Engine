import assert from "node:assert/strict";
import { applyGlmThinkingParameters } from "../../packages/server/src/services/llm/providers/glm-request-compat.js";

// GLM 5.3 raciocina sempre e responde 400 `reasoning_required` quando recebe o pedido
// de desligar o raciocínio. Antes desta correção, qualquer chamada que não pedisse
// raciocínio explicitamente — tradução de card, por exemplo — mandava
// `enable_thinking: false` e falhava. O parâmetro precisa ser OMITIDO, nunca forçado
// para `true`: forçar passaria por cima de quem pediu para desligar de propósito.

const nanogpt = { baseUrl: "https://nano-gpt.com/api/v1", providerKind: "nanogpt" };
const GLM53 = "z-ai/glm-5.3-flash-uncensored";

// ── Sem raciocínio pedido: o parâmetro não pode ser enviado ──
{
  const body: Record<string, unknown> = {};
  const handled = applyGlmThinkingParameters(body, { ...nanogpt, model: GLM53 });
  assert.equal(handled, true, "GLM no nanogpt deve ser tratado pelo helper");
  assert.equal(
    "enable_thinking" in body,
    false,
    "GLM 5.3 sem raciocínio pedido não pode receber enable_thinking — a API rejeita",
  );
}

// ── Desligamento explícito: continua sem enviar, em vez de mandar false ──
{
  const body: Record<string, unknown> = {};
  applyGlmThinkingParameters(body, { ...nanogpt, model: GLM53, reasoningEffort: "none" });
  assert.equal("enable_thinking" in body, false, "nem com reasoningEffort=none o parâmetro pode ir");
}

// ── Raciocínio pedido: aí sim o parâmetro vai, como true ──
{
  const body: Record<string, unknown> = {};
  applyGlmThinkingParameters(body, { ...nanogpt, model: GLM53, enableThinking: true });
  assert.equal(body.enable_thinking, true, "com thinking pedido, GLM 5.3 aceita enable_thinking=true");
}
{
  const body: Record<string, unknown> = {};
  applyGlmThinkingParameters(body, { ...nanogpt, model: GLM53, reasoningEffort: "high" });
  assert.equal(body.enable_thinking, true, "reasoningEffort ativo também liga o thinking");
}

// ── Outros GLM não regridem: eles aceitam o desligamento ──
{
  const body: Record<string, unknown> = {};
  applyGlmThinkingParameters(body, { ...nanogpt, model: "zai-org/glm-5.2:thinking" });
  assert.equal(body.enable_thinking, false, "GLM 5.2 continua recebendo enable_thinking=false");
}
{
  const body: Record<string, unknown> = {};
  applyGlmThinkingParameters(body, { ...nanogpt, model: "zai-org/glm-4.7:thinking" });
  assert.equal(body.enable_thinking, false, "GLM 4.7 continua recebendo enable_thinking=false");
}

// ── Modelo não-GLM segue fora do helper ──
{
  const body: Record<string, unknown> = {};
  const handled = applyGlmThinkingParameters(body, { ...nanogpt, model: "xiaomi/mimo-v2.5:thinking" });
  assert.equal(handled, false, "modelo não-GLM não é tratado aqui");
  assert.deepEqual(body, {}, "e o body não pode ser tocado");
}

console.log("GLM always-thinking regression checks passed.");
