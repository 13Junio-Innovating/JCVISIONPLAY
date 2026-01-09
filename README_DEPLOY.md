
## 10. Criar o Banco de Dados (Se der erro "Unknown database")

Se o DBeaver conectar mas der erro "Unknown database 'jvisiondb'", você precisa criar o banco manualmente.

No terminal do servidor (PuTTY), dentro da pasta do projeto (`/var/www/jvision` ou onde você colocou):

1. **Criar o Banco**:
   ```bash
   mysql -u root -p -e "CREATE DATABASE jvisiondb;"
   ```

2. **Criar as Tabelas**:
   ```bash
   mysql -u root -p jvisiondb < server/schema.sql
   ```

3. **Verificar**:
   Agora tente conectar novamente no DBeaver.

## 11. Configurar Apache (Proxy Reverso)

Para que o site consiga acessar a API, precisamos ativar os módulos de proxy e configurar o Apache.

1.  **Ativar módulos necessários** (Execute no PuTTY):
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    sudo systemctl restart apache2
    ```

2.  **Editar configuração do site**:
    Edite o arquivo de configuração do Apache (geralmente `000-default.conf`):
    ```bash
    sudo nano /etc/apache2/sites-available/000-default.conf
    ```

    Adicione estas linhas dentro do bloco `<VirtualHost *:80>`, antes do `</VirtualHost>` final:

    ```apache
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
    ProxyPass /auth http://localhost:3001/auth
    ProxyPassReverse /auth http://localhost:3001/auth
    ProxyPass /uploads http://localhost:3001/uploads
    ProxyPassReverse /uploads http://localhost:3001/uploads
    ```

    Salve (Ctrl+O, Enter) e saia (Ctrl+X).

3.  **Reiniciar Apache**:
    ```bash
    sudo systemctl restart apache2
    ```
