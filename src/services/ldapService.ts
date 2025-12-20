export interface LdapResponse {
  status: boolean;
  name?: string;
  mail?: string;
  grupo?: string;
  error?: string;
}

export const ldapService = {
  async authenticate(user: string, password: string): Promise<LdapResponse> {
    // URL do script PHP hospedado no servidor interno
    // Em produção, isso deve ser uma variável de ambiente: import.meta.env.VITE_LDAP_API_URL
    const LDAP_API_URL = import.meta.env.VITE_LDAP_API_URL || 'http://localhost/api/auth.php';

    try {
      const response = await fetch(LDAP_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, password }),
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com servidor LDAP');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('LDAP Error:', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Erro de conexão'
      };
    }
  }
};
