import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../../src/utils/passwordPolicy';

describe('validateNewPassword (mesma regra do backend)', () => {
  it('exige pelo menos 8 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validateNewPassword('1234567')).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('aceita 8 caracteres ou mais', () => {
    expect(validateNewPassword('12345678')).toBeNull();
    expect(validateNewPassword('uma senha bem longa')).toBeNull();
  });

  it('conta os espaços, porque a senha vale exatamente como foi digitada', () => {
    expect(validateNewPassword('  abc   ')).toBeNull();
  });

  it('recusa senha vazia', () => {
    expect(validateNewPassword('')).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('recusa senhas acima de 72 caracteres (limite do bcrypt no servidor)', () => {
    expect(validateNewPassword('a'.repeat(73))).toBe('A senha deve ter no máximo 72 caracteres.');
  });
});
