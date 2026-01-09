import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Monitor, Building2 } from "lucide-react";
import { loggingService } from "@/services/loggingService";
import { ldapService } from "@/services/ldapService";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // LDAP States
  const [ldapUser, setLdapUser] = useState("");
  const [ldapPassword, setLdapPassword] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const session = api.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.auth.login(email, password);

      // Log da atividade de login bem-sucedido
      await loggingService.logUserActivity(
        'login',
        'auth',
        undefined,
        { email, login_method: 'email_password' }
      );

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      // Log do erro de login
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido no login'),
        'login_error',
        { email, attempted_action: 'login' },
        'medium'
      );
      
      toast.error(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.auth.signUp(email, password, fullName);
      // Auto login after signup
      await api.auth.login(email, password);

      // Log da atividade de cadastro bem-sucedido
      await loggingService.logUserActivity(
        'signup',
        'auth',
        undefined,
        { email, full_name: fullName, signup_method: 'email_password' }
      );

      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      // Log do erro de cadastro
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido no cadastro'),
        'signup_error',
        { email, full_name: fullName, attempted_action: 'signup' },
        'medium'
      );
      
      toast.error(error instanceof Error ? error.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleLdapLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await ldapService.authenticate(ldapUser, ldapPassword);

      if (result.status && result.mail) {
        // Se autenticado no LDAP, tentamos logar ou criar usuário no Supabase
        // Estratégia: Tentar login com senha padrão ou criar usuário via Edge Function (ideal)
        // Por enquanto, vamos simular o sucesso e redirecionar, mas o ideal seria
        // integrar com o Supabase Auth via Custom Token.
        
        // Log da atividade
        await loggingService.logUserActivity(
          'login_ldap',
          'auth',
          undefined,
          { user: ldapUser, group: result.grupo }
        );

        toast.success(`Bem-vindo, ${result.name}!`);
        // Armazenar dados do usuário LDAP temporariamente (não persistente como Supabase Session)
        localStorage.setItem('ldap_user', JSON.stringify(result));
        navigate("/dashboard");
      } else {
        throw new Error(result.error || 'Falha na autenticação LDAP');
      }
    } catch (error) {
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro no login LDAP'),
        'login_ldap_error',
        { user: ldapUser, attempted_action: 'login_ldap' },
        'medium'
      );
      toast.error(error instanceof Error ? error.message : "Erro ao entrar via LDAP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-32 h-32 flex items-center justify-center mb-2">
            <img src="/logo.png" alt="Logo Costão" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            COSTAO VISION PLAY
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Gerencie seus painéis digitais de forma simples
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="ldap" className="flex gap-2">
                <Building2 className="w-4 h-4" />
                Corp
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="ldap">
              <form onSubmit={handleLdapLogin} className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-200 mb-4">
                  <p>Login Corporativo (Active Directory)</p>
                  <p className="text-xs text-blue-200/60 mt-1">Use seu usuário de rede e senha.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ldap-user">Usuário de Rede</Label>
                  <Input
                    id="ldap-user"
                    type="text"
                    placeholder="ex: nome.sobrenome"
                    value={ldapUser}
                    onChange={(e) => setLdapUser(e.target.value)}
                    required
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ldap-password">Senha</Label>
                  <Input
                    id="ldap-password"
                    type="password"
                    placeholder="••••••••"
                    value={ldapPassword}
                    onChange={(e) => setLdapPassword(e.target.value)}
                    required
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Entrar com AD"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
