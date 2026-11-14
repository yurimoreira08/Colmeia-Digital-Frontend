/**
 * @jest-environment node
 */
/**
 * Acessibilidade dos elementos tocáveis (F6 do relatório).
 *
 * Varre o código de src/ e exige, em todo Pressable/Touchable:
 * - `accessibilityRole`, para o leitor de tela dizer o que é (botão, caixa de seleção...);
 * - `accessibilityLabel` quando não há texto visível dentro (botões só de ícone),
 *   porque o leitor de tela não teria o que ler.
 *
 * É uma verificação estática, pelo texto do código: rápida e sem renderizar as telas.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..', 'src');
const TOUCHABLE = /<(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)\b/g;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

/** Fim da tag de abertura que começa em `start`, ignorando `>` dentro de chaves (ex.: arrow functions). */
function openingTagEnd(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return i;
  }
  return source.length;
}

type Problem = { file: string; line: number; issue: string };

function findProblems(): Problem[] {
  const problems: Problem[] = [];
  for (const file of sourceFiles(SRC)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(TOUCHABLE)) {
      const start = match.index ?? 0;
      const end = openingTagEnd(source, start);
      const tag = source.slice(start, end + 1);
      const selfClosing = tag.endsWith('/>');
      const closing = `</${match[1]}>`;
      const body = selfClosing ? '' : source.slice(end + 1, source.indexOf(closing, end));
      const line = source.slice(0, start).split('\n').length;
      const where = { file: path.relative(SRC, file).replace(/\\/g, '/'), line };

      if (!/accessibilityRole=/.test(tag)) problems.push({ ...where, issue: 'sem accessibilityRole' });
      if (!/<Text\b/.test(body) && !/accessibilityLabel=/.test(tag)) problems.push({ ...where, issue: 'sem texto e sem accessibilityLabel' });
    }
  }
  return problems;
}

it('todo elemento tocável tem papel e, se não tiver texto, rótulo', () => {
  const report = findProblems().map((p) => `${p.file}:${p.line} ${p.issue}`);
  expect(report).toEqual([]);
});
