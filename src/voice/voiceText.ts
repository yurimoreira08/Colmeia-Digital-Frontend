/**
 * Tratamento do texto reconhecido pela voz, comum às telas de revisão e de
 * manejo.
 */

/** Minúsculas, sem acentos e sem pontuação, com espaços simples. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Diz se a palavra (ou frase) `word` aparece inteira dentro de `text`.
 * Evita falsos positivos como "mel" dentro de "melgueira" ou "obs" dentro de
 * "observar". Espera os dois textos já normalizados.
 */
export function containsWholeWord(text: string, word: string): boolean {
  let idx = text.indexOf(word);
  while (idx !== -1) {
    const before = idx > 0 ? text[idx - 1] : ' ';
    const after = idx + word.length < text.length ? text[idx + word.length] : ' ';
    if (/[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after)) return true;
    idx = text.indexOf(word, idx + 1);
  }
  return false;
}

/** Palavras de ligação que o apicultor fala antes do conteúdo ("observação **que** ..."). */
const DICTATION_FILLER = /^(falar|dizer|que|de|do|da|com|sobre|adicione|escreva|registre|coloque)\s+/i;

/**
 * Prepara um trecho ditado para entrar numa anotação: tira a palavra de
 * ligação do começo e põe a primeira letra em maiúscula. Devolve '' se não
 * sobrar conteúdo.
 */
export function formatDictation(text: string): string {
  const payload = text.replace(DICTATION_FILLER, '').trim();
  return payload ? payload.charAt(0).toUpperCase() + payload.slice(1) : '';
}

/** Acrescenta uma frase ao texto da anotação, separando com ponto final. */
export function appendSentence(previous: string, sentence: string): string {
  return previous ? previous.trim().replace(/[.?!]$/, '') + '. ' + sentence : sentence;
}
