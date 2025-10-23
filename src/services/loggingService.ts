import { supabase } from '@/integrations/supabase/client';

// Tipos específicos para detalhes de atividades
export interface LoginDetails {
  email: string;
  success: boolean;
  error_message?: string;
}

export interface ScreenDetails {
  screen_id: string;
  screen_name: string;
  playlist_id?: string;
  playlist_name?: string;
}

export interface PlaylistDetails {
  playlist_id: string;
  playlist_name: string;
  media_count: number;
}

export interface MediaDetails {
  media_id: string;
  media_name: string;
  file_type: string;
  file_size?: number;
  duration?: number;
  rotation?: number;
}

export interface PlayerDetails {
  playlist_id: string;
  playlist_name: string;
  media_count: number;
  offline_status: boolean;
}

// Union type para todos os possíveis detalhes de atividade
export type ActivityDetails = 
  | LoginDetails 
  | ScreenDetails 
  | PlaylistDetails 
  | MediaDetails 
  | PlayerDetails 
  | Record<string, string | number | boolean>;

// Tipos específicos para contextos de erro
export interface JavaScriptErrorContext {
  filename?: string;
  lineno?: number;
  colno?: number;
}

export interface PromiseRejectionContext {
  promise?: string;
}

export interface DatabaseErrorContext {
  table?: string;
  operation?: string;
  query?: string;
}

export interface AuthErrorContext {
  action?: string;
  email?: string;
}

export interface FileOperationContext {
  file_name?: string;
  file_size?: number;
  operation?: string;
}

// Union type para todos os possíveis contextos de erro
export type ErrorContext = 
  | JavaScriptErrorContext 
  | PromiseRejectionContext 
  | DatabaseErrorContext 
  | AuthErrorContext 
  | FileOperationContext 
  | Record<string, string | number | boolean>;

export interface UserActivityLog {
  id?: string;
  user_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  details?: ActivityDetails;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface ErrorLog {
  id?: string;
  user_id?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  url?: string;
  user_agent?: string;
  ip_address?: string;
  context?: ErrorContext;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  created_at?: string;
}

export interface LogsStats {
  user_activities_today: number;
  user_activities_week: number;
  errors_today: number;
  errors_week: number;
  unresolved_errors: number;
}

class LoggingService {
  private getUserAgent(): string {
    return navigator.userAgent || 'Unknown';
  }

  private async getClientIP(): Promise<string | null> {
    try {
      // Em produção, você pode usar um serviço para obter o IP real
      // Por enquanto, retornamos null e deixamos o servidor lidar com isso
      return null;
    } catch (error) {
      return null;
    }
  }

  private getCurrentUrl(): string {
    return window.location.href;
  }

  private getCurrentUserId(): string | null {
    return supabase.auth.getUser().then(({ data }) => data.user?.id || null).catch(() => null);
  }

  /**
   * Registra uma atividade do usuário
   */
  async logUserActivity(
    action: string,
    resource?: string,
    resourceId?: string,
    details?: ActivityDetails
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Tentativa de log de atividade sem usuário autenticado');
        return;
      }

      const logData: UserActivityLog = {
        user_id: user.id,
        action,
        resource,
        resource_id: resourceId,
        details,
        ip_address: await this.getClientIP(),
        user_agent: this.getUserAgent(),
      };

      const { error } = await supabase
        .from('user_activity_logs')
        .insert([logData]);

      if (error) {
        console.error('Erro ao registrar atividade do usuário:', error);
        // Fallback: salvar no localStorage se falhar no banco
        this.saveToLocalStorage('user_activities', logData);
      }
    } catch (error) {
      console.error('Erro ao registrar atividade do usuário:', error);
      // Fallback: salvar no localStorage
      this.saveToLocalStorage('user_activities', {
        action,
        resource,
        resource_id: resourceId,
        details,
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Registra um erro da aplicação
   */
  async logError(
    error: Error | string,
    errorType: string,
    context?: ErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = typeof error === 'object' && error.stack ? error.stack : undefined;

      const logData: ErrorLog = {
        user_id: user?.id || null,
        error_type: errorType,
        error_message: errorMessage,
        stack_trace: stackTrace,
        url: this.getCurrentUrl(),
        user_agent: this.getUserAgent(),
        ip_address: await this.getClientIP(),
        context,
        severity,
        resolved: false,
      };

      const { error: dbError } = await supabase
        .from('error_logs')
        .insert([logData]);

      if (dbError) {
        console.error('Erro ao registrar erro no banco:', dbError);
        // Fallback: salvar no localStorage se falhar no banco
        this.saveToLocalStorage('error_logs', logData);
      }
    } catch (logError) {
      console.error('Erro ao registrar erro:', logError);
      // Fallback: salvar no localStorage
      this.saveToLocalStorage('error_logs', {
        error_type: errorType,
        error_message: typeof error === 'string' ? error : error.message,
        context,
        severity,
        created_at: new Date().toISOString(),
        url: this.getCurrentUrl(),
      });
    }
  }

  /**
   * Obtém estatísticas de logs
   */
  async getLogsStats(): Promise<LogsStats | null> {
    try {
      // Como o Supabase não reconhece 'get_logs_stats', vamos calcular as estatísticas localmente
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Contar atividades do usuário
      const { data: userActivities, error: activitiesError } = await supabase
        .from('user_activity_logs' as any)
        .select('created_at')
        .gte('created_at', weekAgo.toISOString());

      if (activitiesError) {
        console.error('Erro ao obter estatísticas de logs:', activitiesError);
        return null;
      }

      const user_activities_today = userActivities.filter(
        (log: UserActivityLog) => new Date(log.created_at!) >= today
      ).length;
      const user_activities_week = userActivities.length;

      // Contar erros
      const { data: errorLogs, error: errorsError } = await supabase
        .from('error_logs')
        .select('created_at, resolved')
        .gte('created_at', weekAgo.toISOString());

      if (errorsError) {
        console.error('Erro ao obter estatísticas de logs:', errorsError);
        return null;
      }

      const errors_today = errorLogs.filter(
        (log: ErrorLog) => new Date(log.created_at!) >= today
      ).length;
      const errors_week = errorLogs.length;
      const unresolved_errors = errorLogs.filter((log: ErrorLog) => !log.resolved).length; 

      const data: LogsStats = {
        user_activities_today,
        user_activities_week,
        errors_today,
        errors_week,
        unresolved_errors,
      };

      if (error) {
        console.error('Erro ao obter estatísticas de logs:', error);
        return null;
      }

      return data as LogsStats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de logs:', error);
      return null;
    }
  }

  /**
   * Obtém logs de atividades do usuário
   */
  async getUserActivityLogs(limit: number = 50, offset: number = 0): Promise<UserActivityLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao obter logs de atividades:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter logs de atividades:', error);
      return [];
    }
  }

  /**
   * Obtém logs de erros
   */
  async getErrorLogs(limit: number = 50, offset: number = 0): Promise<ErrorLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao obter logs de erros:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter logs de erros:', error);
      return [];
    }
  }

  /**
   * Marca um erro como resolvido
   */
  async resolveError(errorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId);

      if (error) {
        console.error('Erro ao marcar erro como resolvido:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar erro como resolvido:', error);
      return false;
    }
  }

  /**
   * Salva logs no localStorage como fallback
   */
  private saveToLocalStorage(type: string, data: UserActivityLog | ErrorLog): void {
    try {
      const key = `fallback_${type}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]') as (UserActivityLog | ErrorLog)[];
      existing.push(data);
      
      // Manter apenas os últimos 100 registros
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }

  /**
   * Sincroniza logs do localStorage com o banco
   */
  async syncFallbackLogs(): Promise<void> {
    try {
      // Sincronizar atividades de usuário
      const userActivities = JSON.parse(localStorage.getItem('fallback_user_activities') || '[]') as UserActivityLog[];
      if (userActivities.length > 0) {
        const { error } = await supabase
          .from('user_activity_logs')
          .insert(userActivities);
        
        if (!error) {
          localStorage.removeItem('fallback_user_activities');
        }
      }

      // Sincronizar logs de erro
      const errorLogs = JSON.parse(localStorage.getItem('fallback_error_logs') || '[]') as ErrorLog[];
      if (errorLogs.length > 0) {
        const { error } = await supabase
          .from('error_logs')
          .insert(errorLogs);
        
        if (!error) {
          localStorage.removeItem('fallback_error_logs');
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar logs do fallback:', error);
    }
  }
}

// Instância singleton do serviço de logging
export const loggingService = new LoggingService();

// Interceptador global de erros
window.addEventListener('error', (event) => {
  const context: JavaScriptErrorContext = {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  };
  
  loggingService.logError(
    event.error || event.message,
    'javascript_error',
    context,
    'high'
  );
});

// Interceptador de promessas rejeitadas
window.addEventListener('unhandledrejection', (event) => {
  const context: PromiseRejectionContext = {
    promise: event.promise?.toString(),
  };
  
  loggingService.logError(
    event.reason,
    'unhandled_promise_rejection',
    context,
    'high'
  );
});

export default loggingService;