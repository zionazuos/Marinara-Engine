import assert from "node:assert/strict";
import { translateCharacterCardPayload } from "../../packages/client/src/lib/character-card-translation.js";

const source = {
  spec: "chara_card_v2",
  data: {
    name: "Alice",
    description: "Hello {{user}}",
    personality: "Kind",
    alternate_greetings: ["Welcome, {{user}}!", ""],
    tags: ["english"],
    character_book: {
      entries: [{ name: "Secret", content: "Hidden truth" }],
    },
  },
};
const translatedLabels: string[] = [];
const translated = await translateCharacterCardPayload(source, async (text, label) => {
  translatedLabels.push(label);
  return `PT:${text}`;
});

assert.equal((translated.data as typeof source.data).description, "PT:Hello {{user}}");
assert.equal((translated.data as typeof source.data).personality, "PT:Kind");
assert.equal((translated.data as typeof source.data).alternate_greetings[0], "PT:Welcome, {{user}}!");
assert.equal((translated.data as typeof source.data).alternate_greetings[1], "");
assert.equal((translated.data as typeof source.data).character_book.entries[0].content, "PT:Hidden truth");
assert.equal((translated.data as typeof source.data).name, "Alice");
assert.deepEqual((translated.data as typeof source.data).tags, ["english"]);
assert.equal(source.data.description, "Hello {{user}}", "the source payload must not be mutated");
assert.deepEqual(translatedLabels, [
  "description",
  "personality",
  "alternate_greetings[0]",
  "character_book.entries[0].content",
]);

const flatCard = { name: "Bob", first_mes: "Hello {{char}}", creator: "Author" };
const translatedFlatCard = await translateCharacterCardPayload(flatCard, async (text) => `PT:${text}`);
assert.equal(translatedFlatCard.first_mes, "PT:Hello {{char}}");
assert.equal(translatedFlatCard.name, "Bob");
assert.equal(translatedFlatCard.creator, "Author");

await assert.rejects(
  () => translateCharacterCardPayload(flatCard, async () => "macro removed"),
  /protected macro/u,
);

console.log("Character card translation regression checks passed.");
