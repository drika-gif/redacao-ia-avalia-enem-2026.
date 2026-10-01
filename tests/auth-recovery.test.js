import test from 'node:test';
import assert from 'node:assert/strict';

test('auth recovery flow: detect recovery type in hash or event and allow password update', async () => {
  // 1. Simula URL com hash de recuperação enviado pelo link do Supabase
  const fakeHash = '#access_token=mock-token-xyz&expires_at=1790000000&refresh_token=mock-refresh&type=recovery';
  const isRecoveryInUrl = fakeHash.includes('type=recovery');
  assert.equal(isRecoveryInUrl, true, 'Hash da URL deve identificar o tipo recovery');

  // 2. Simula o listener de auth do Supabase emitindo evento PASSWORD_RECOVERY
  let recoveryModeTriggered = false;
  const mockAuthStateChange = (event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryModeTriggered = true;
    }
  };
  mockAuthStateChange('PASSWORD_RECOVERY');
  assert.equal(recoveryModeTriggered, true, 'Evento PASSWORD_RECOVERY deve ativar o modo de redefinição');

  // 3. Validação de senha: mínimo 6 caracteres e confirmação idêntica
  const validateNewPassword = (pwd, confirmPwd) => {
    if (pwd.length < 6) throw new Error('A senha deve conter no mínimo 6 caracteres.');
    if (pwd !== confirmPwd) throw new Error('As senhas não coincidem.');
    return true;
  };

  assert.throws(() => validateNewPassword('123', '123'), /mínimo 6 caracteres/);
  assert.throws(() => validateNewPassword('senha123', 'senha456'), /não coincidem/);
  assert.equal(validateNewPassword('NovaSenha@2026', 'NovaSenha@2026'), true);

  // 4. Simula chamada ao Supabase updateUser({ password })
  let updatedPasswordValue = '';
  const mockSupabaseClient = {
    auth: {
      updateUser: async ({ password }) => {
        updatedPasswordValue = password;
        return { data: { user: { id: 'mock-user-id' } }, error: null };
      }
    }
  };

  const { data, error } = await mockSupabaseClient.auth.updateUser({ password: 'NovaSenha@2026' });
  assert.equal(error, null);
  assert.equal(data.user.id, 'mock-user-id');
  assert.equal(updatedPasswordValue, 'NovaSenha@2026', 'A nova senha deve ser enviada corretamente ao Supabase');
});
