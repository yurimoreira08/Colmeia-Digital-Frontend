export function normalizeBoxName(name: string): string {
  const match = name.trim().match(/^(Nova Caixa|Caixa|Cxa|Cx)\s*(\d+)$/i);
  if (match) {
    const prefix = match[1].toLowerCase().startsWith('nova') ? 'Nova Caixa' : 'Caixa';
    const num = parseInt(match[2], 10);
    return `${prefix} ${String(num).padStart(2, '0')}`;
  }
  return name.trim();
}
