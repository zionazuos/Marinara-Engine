const TRANSLATABLE_FIELDS = [
  "description",
  "personality",
  "first_mes",
  "mes_example",
  "scenario",
  "creator_notes",
  "system_prompt",
  "post_history_instructions",
] as const;

/** Connection providers that cannot translate text, so they never appear in the picker. */
export const NON_TEXT_CONNECTION_PROVIDERS = new Set<string>(["image_generation", "video_generation"]);

export const CARD_TRANSLATION_SYSTEM_PROMPT = `You are a professional literary localization specialist for interactive-fiction character cards.

Translate all supplied content faithfully into natural Brazilian Portuguese (pt-BR).
- Preserve meaning, tone, explicitness, formatting, Markdown, HTML, line breaks, and dialogue markers.
- Never add, remove, summarize, censor, explain, or comment on the content.
- Do not translate character names or proper names unless they have a standard Brazilian Portuguese form.
- Preserve every token shaped like __MARI_CARD_MACRO_0__ exactly as written.
- Return only the translated text.`;

interface TranslationTarget {
  label: string;
  read: () => string;
  write: (value: string) => void;
}

export interface CardTranslationProgress {
  completed: number;
  total: number;
  label: string;
}

type TranslationProgressCallback = (progress: CardTranslationProgress) => void;
type TranslateText = (text: string, label: string) => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectTranslationTargets(card: Record<string, unknown>): TranslationTarget[] {
  const data = isRecord(card.data) ? card.data : card;
  const targets: TranslationTarget[] = [];

  for (const field of TRANSLATABLE_FIELDS) {
    if (typeof data[field] !== "string" || !data[field].trim()) continue;
    targets.push({
      label: field,
      read: () => data[field] as string,
      write: (value) => {
        data[field] = value;
      },
    });
  }

  const alternateGreetings = data.alternate_greetings;
  if (Array.isArray(alternateGreetings)) {
    alternateGreetings.forEach((greeting, index) => {
      if (typeof greeting !== "string" || !greeting.trim()) return;
      targets.push({
        label: `alternate_greetings[${index}]`,
        read: () => alternateGreetings[index] as string,
        write: (value) => {
          alternateGreetings[index] = value;
        },
      });
    });
  }

  const characterBook = isRecord(data.character_book) ? data.character_book : null;
  const entries = characterBook && Array.isArray(characterBook.entries) ? characterBook.entries : [];
  entries.forEach((entry, index) => {
    if (!isRecord(entry) || typeof entry.content !== "string" || !entry.content.trim()) return;
    targets.push({
      label: `character_book.entries[${index}].content`,
      read: () => entry.content as string,
      write: (value) => {
        entry.content = value;
      },
    });
  });

  return targets;
}

function protectMacros(text: string): { protectedText: string; macros: Map<string, string> } {
  const macros = new Map<string, string>();
  const protectedText = text.replace(/\{\{[^{}\n]+\}\}/gu, (macro) => {
    const placeholder = `__MARI_CARD_MACRO_${macros.size}__`;
    macros.set(placeholder, macro);
    return placeholder;
  });
  return { protectedText, macros };
}

function restoreMacros(text: string, macros: Map<string, string>, label: string): string {
  let restored = text;
  for (const [placeholder, macro] of macros) {
    if (!restored.includes(placeholder)) {
      throw new Error(`Translation changed a protected macro in ${label}`);
    }
    restored = restored.replaceAll(placeholder, macro);
  }
  return restored;
}

export async function translateCharacterCardPayload(
  payload: Record<string, unknown>,
  translateText: TranslateText,
  onProgress?: TranslationProgressCallback,
): Promise<Record<string, unknown>> {
  const translated = structuredClone(payload);
  const targets = collectTranslationTargets(translated);

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    onProgress?.({ completed: index, total: targets.length, label: target.label });
    const { protectedText, macros } = protectMacros(target.read());
    const result = (await translateText(protectedText, target.label)).trim();
    if (!result) throw new Error(`Translation returned empty text for ${target.label}`);
    target.write(restoreMacros(result, macros, target.label));
    onProgress?.({ completed: index + 1, total: targets.length, label: target.label });
  }

  return translated;
}
