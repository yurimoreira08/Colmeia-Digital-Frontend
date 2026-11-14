/**
 * Política de senha para senhas **novas** (cadastro e redefinição).
 * Espelha a regra do backend (`authService.ts`): validar aqui só evita uma
 * viagem ao servidor, quem decide é sempre o backend.
 *
 * A senha vale exatamente como foi digitada: espaços contam e não são removidos.
 * O login não usa esta validação, porque contas antigas podem ter senhas curtas.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** O bcrypt do servidor só considera os primeiros 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72;

/** @returns a mensagem de erro para mostrar ao usuário, ou `null` se a senha é válida. */
export function validateNewPassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}
