const { query, checkConnection, pool } = require('./server/db.cjs');

async function verify() {
  console.log('Verificando conexão com o banco...');
  const connected = await checkConnection();
  if (!connected) {
    console.error('Falha na conexão. Verifique .env.local');
    process.exit(1);
  }

  try {
    console.log('Buscando usuários...');
    const users = await query('SELECT id, email, full_name, created_at FROM app_users');
    console.log('Usuários encontrados:', users.length);
    console.table(users);

    const targetUsers = ['cie@costao.com.br', 'Markenting@costao.com.br']; // Note: Markenting com n
    
    for (const email of targetUsers) {
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        console.log(`[OK] Usuário ${email} encontrado.`);
      } else {
        console.log(`[FALHA] Usuário ${email} NÃO encontrado.`);
      }
    }

  } catch (error) {
    console.error('Erro ao verificar usuários:', error);
  } finally {
    await pool.end();
  }
}

verify();
