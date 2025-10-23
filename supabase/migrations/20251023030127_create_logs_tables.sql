-- Tabela para logs de atividades dos usuários
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action varchar(100) NOT NULL,
  resource varchar(100),
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para logs de erros da aplicação
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type varchar(100) NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  url text,
  user_agent text,
  ip_address inet,
  context jsonb,
  severity varchar(20) DEFAULT 'error' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON public.user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_activity_logs
CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.user_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para error_logs
CREATE POLICY "Users can view their own error logs"
  ON public.error_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert error logs"
  ON public.error_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Função para limpar logs antigos (manter apenas últimos 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_activity_logs 
  WHERE created_at < now() - interval '90 days';
  
  DELETE FROM public.error_logs 
  WHERE created_at < now() - interval '90 days' AND resolved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de logs
CREATE OR REPLACE FUNCTION public.get_logs_stats(user_uuid uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_activities_today', (
      SELECT count(*) FROM public.user_activity_logs 
      WHERE user_id = user_uuid AND created_at >= current_date
    ),
    'user_activities_week', (
      SELECT count(*) FROM public.user_activity_logs 
      WHERE user_id = user_uuid AND created_at >= current_date - interval '7 days'
    ),
    'errors_today', (
      SELECT count(*) FROM public.error_logs 
      WHERE (user_id = user_uuid OR user_id IS NULL) AND created_at >= current_date
    ),
    'errors_week', (
      SELECT count(*) FROM public.error_logs 
      WHERE (user_id = user_uuid OR user_id IS NULL) AND created_at >= current_date - interval '7 days'
    ),
    'unresolved_errors', (
      SELECT count(*) FROM public.error_logs 
      WHERE (user_id = user_uuid OR user_id IS NULL) AND resolved = false
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_logs_stats(uuid) TO authenticated;