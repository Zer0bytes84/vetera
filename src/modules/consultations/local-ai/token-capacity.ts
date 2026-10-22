// French notes and JSON average about four characters per Gemma token; three
// keeps a margin for dense text (numbers, escapes) without oversizing the cache.
const CHARACTERS_PER_TOKEN = 3;
const MINIMUM_CAPACITY = 1024;

/** Engine size chosen before the tokenizer is available; checked afterwards. */
export function estimateTokenCapacity(text: string, reserve: number) {
  return Math.max(
    MINIMUM_CAPACITY,
    Math.ceil(text.length / CHARACTERS_PER_TOKEN) + reserve
  );
}
