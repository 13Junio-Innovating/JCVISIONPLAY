import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  User,
  Calendar,
  AlertCircle,
  Info
} from "lucide-react";
import { loggingService, UserActivityLog, ErrorLog, LogsStats } from "@/services/loggingService";

const Logs = () => {
  const [userActivities, setUserActivities] = useState<UserActivityLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activitiesData, errorsData, statsData] = await Promise.all([
        loggingService.getUserActivityLogs(100),
        loggingService.getErrorLogs(100),
        loggingService.getLogsStats(),
      ]);

      setUserActivities(activitiesData);
      setErrorLogs(errorsData);
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Logs atualizados!");
  };

  const handleResolveError = async (errorId: string) => {
    try {
      const success = await loggingService.resolveError(errorId);
      if (success) {
        toast.success("Erro marcado como resolvido!");
        fetchData();
      } else {
        toast.error("Erro ao marcar como resolvido");
      }
    } catch (error) {
      console.error("Erro ao resolver erro:", error);
      toast.error("Erro ao marcar como resolvido");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <User className="w-4 h-4 text-green-500" />;
      case 'signup':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'create_screen':
      case 'create_playlist':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'delete_screen':
      case 'delete_playlist':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'update_screen_playlist':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'signup': 'Cadastro',
      'create_screen': 'Criar Tela',
      'create_playlist': 'Criar Playlist',
      'delete_screen': 'Excluir Tela',
      'delete_playlist': 'Excluir Playlist',
      'update_screen_playlist': 'Atualizar Playlist da Tela',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Logs do Sistema</h1>
            <p className="text-muted-foreground">
              Monitore atividades dos usuários e erros da aplicação
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atividades Hoje</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.user_activities_today}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atividades Semana</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.user_activities_week}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Hoje</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.errors_today}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Semana</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.errors_week}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros Não Resolvidos</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.unresolved_errors}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs para diferentes tipos de logs */}
        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activities">
              <Activity className="w-4 h-4 mr-2" />
              Atividades dos Usuários
            </TabsTrigger>
            <TabsTrigger value="errors">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Logs de Erros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Atividades dos Usuários</CardTitle>
                <CardDescription>
                  Histórico de ações realizadas pelos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {userActivities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Info className="w-8 h-8 mx-auto mb-2" />
                        Nenhuma atividade registrada
                      </div>
                    ) : (
                      userActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-4 p-4 border rounded-lg"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getActionIcon(activity.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {getActionLabel(activity.action)}
                              </p>
                              <div className="flex items-center space-x-2">
                                {activity.resource && (
                                  <Badge variant="outline">{activity.resource}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {formatDate(activity.created_at || '')}
                                </span>
                              </div>
                            </div>
                            {activity.details && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(activity.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Erros</CardTitle>
                <CardDescription>
                  Erros capturados na aplicação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {errorLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        Nenhum erro registrado
                      </div>
                    ) : (
                      errorLogs.map((error) => (
                        <div
                          key={error.id}
                          className="p-4 border rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="font-medium">{error.error_type}</span>
                              <Badge className={getSeverityColor(error.severity || 'medium')}>
                                {error.severity}
                              </Badge>
                              {error.resolved && (
                                <Badge className="bg-green-100 text-green-800">
                                  Resolvido
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDate(error.created_at || '')}
                              </span>
                              {!error.resolved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveError(error.id!)}
                                >
                                  Marcar como Resolvido
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <p className="font-medium text-red-600 mb-2">
                              {error.error_message}
                            </p>
                            
                            {error.url && (
                              <p className="text-muted-foreground mb-1">
                                <strong>URL:</strong> {error.url}
                              </p>
                            )}
                            
                            {error.context && (
                              <div className="mt-2">
                                <strong>Contexto:</strong>
                                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(error.context, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {error.stack_trace && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-muted-foreground">
                                  Stack Trace
                                </summary>
                                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                  {error.stack_trace}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Logs;