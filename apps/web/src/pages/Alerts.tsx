import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  Bell,
  Plus,
  Trash2,
  Check,
  X,
  Send,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  checkAlerts,
  testNotification,
  type AlertRule,
} from '@/services/alerts';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ModelSelector } from '@/components/shared/ModelSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const CONDITION_LABELS: Record<string, string> = {
  price_below: 'Preco abaixo de',
  price_above: 'Preco acima de',
  new_deal_hot: 'Novo deal quente',
  price_drop: 'Queda de preco',
};

const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  both: 'Ambos',
};

const SETTINGS_KEY = 'mp_alert_settings';

interface AlertSettings {
  telegramBotToken: string;
  telegramChatId: string;
  emailAddress: string;
  resendApiKey: string;
}

function loadSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { telegramBotToken: '', telegramChatId: '', emailAddress: '', resendApiKey: '' };
}

function saveSettings(settings: AlertSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export default function Alerts() {
  useDocumentTitle('Alertas');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Settings state
  const [settings, setSettings] = useState<AlertSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formRegion, setFormRegion] = useState(user?.region ?? '');
  const [formCondition, setFormCondition] = useState('price_below');
  const [formThreshold, setFormThreshold] = useState(0);
  const [formChannel, setFormChannel] = useState('telegram');
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const { data: alerts = [], isLoading } = useQuery<AlertRule[]>({
    queryKey: ['alerts'],
    queryFn: getAlerts,
  });

  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setFormName('');
      setFormModelId('');
      setFormThreshold(0);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar alerta');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      updateAlert(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setDeletingId(null);
    },
  });

  const checkMutation = useMutation({
    mutationFn: () => checkAlerts(settings as unknown as Record<string, string>),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      const triggered = results.filter(r => r.triggered).length;
      setTestResult(
        triggered > 0
          ? `${triggered} alerta(s) disparado(s)!`
          : 'Nenhum alerta disparado no momento.'
      );
      setTimeout(() => setTestResult(null), 5000);
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ channel }: { channel: string }) =>
      testNotification(channel, settings as unknown as Record<string, string>),
    onSuccess: (sent) => {
      setTestResult(sent ? 'Notificacao de teste enviada!' : 'Falha ao enviar notificacao de teste.');
      setTimeout(() => setTestResult(null), 5000);
    },
    onError: () => {
      setTestResult('Erro ao enviar notificacao de teste.');
      setTimeout(() => setTestResult(null), 5000);
    },
  });

  function handleCreate() {
    if (!formName.trim() || !formRegion.trim()) {
      setFormError('Preencha nome e regiao.');
      return;
    }
    const needsThreshold = formCondition === 'price_below' || formCondition === 'price_above';
    if (needsThreshold && formThreshold <= 0) {
      setFormError('Informe um valor limite valido.');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      modelId: formModelId || undefined,
      region: formRegion.trim(),
      condition: formCondition,
      threshold: needsThreshold ? formThreshold : undefined,
      channel: formChannel,
    });
  }

  function toggleActive(alert: AlertRule) {
    updateMutation.mutate({
      id: alert.id,
      body: { isActive: !alert.isActive },
    });
  }

  const activeCount = alerts.filter(a => a.isActive).length;
  const totalCount = alerts.length;
  const lastTriggeredAlert = alerts
    .filter(a => a.lastTriggered)
    .sort((a, b) => new Date(b.lastTriggered!).getTime() - new Date(a.lastTriggered!).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Total Alertas</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">{totalCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Ativos</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Inativos</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]/40">{totalCount - activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Ultimo Disparo</p>
          <p className="mt-1 text-sm font-medium text-[#fbbf24]">
            {lastTriggeredAlert ? formatRelativeTime(lastTriggeredAlert.lastTriggered) : 'Nunca'}
          </p>
        </Card>
      </div>

      {/* Alert Settings */}
      <Card>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-[#f0f0f5]/70">
            Configuracoes de Notificacao
          </h3>
          <span className="text-xs text-[#f0f0f5]/40">
            {settingsOpen ? 'Fechar' : 'Abrir'}
          </span>
        </button>

        {settingsOpen && (
          <div className="mt-4 space-y-4">
            {testResult && (
              <div className={cn(
                'rounded-lg border px-4 py-3 text-sm',
                testResult.includes('Falha') || testResult.includes('Erro')
                  ? 'border-[#f87171]/20 bg-[#f87171]/10 text-[#f87171]'
                  : 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e]'
              )}>
                {testResult}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Telegram Bot Token"
                value={settings.telegramBotToken}
                onChange={(e) => setSettings(s => ({ ...s, telegramBotToken: e.target.value }))}
                placeholder="123456:ABC-DEF..."
              />
              <Input
                label="Telegram Chat ID"
                value={settings.telegramChatId}
                onChange={(e) => setSettings(s => ({ ...s, telegramChatId: e.target.value }))}
                placeholder="Ex: 123456789"
              />
              <Input
                label="Email para alertas"
                value={settings.emailAddress}
                onChange={(e) => setSettings(s => ({ ...s, emailAddress: e.target.value }))}
                placeholder="seu@email.com"
              />
              <Input
                label="Resend API Key"
                value={settings.resendApiKey}
                onChange={(e) => setSettings(s => ({ ...s, resendApiKey: e.target.value }))}
                placeholder="re_..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => testMutation.mutate({ channel: 'telegram' })}
                loading={testMutation.isPending}
                disabled={!settings.telegramBotToken || !settings.telegramChatId}
              >
                <Send className="h-4 w-4" />
                Testar Telegram
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => testMutation.mutate({ channel: 'email' })}
                loading={testMutation.isPending}
                disabled={!settings.emailAddress || !settings.resendApiKey}
              >
                <Send className="h-4 w-4" />
                Testar Email
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Alert form */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
          Criar Alerta
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg border border-[#f87171]/20 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Nome do Alerta"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex: iPhone 15 Pro barato em SC"
          />
          <ModelSelector value={formModelId} onChange={setFormModelId} label="Modelo (opcional)" />
          <Input
            label="Regiao"
            value={formRegion}
            onChange={(e) => setFormRegion(e.target.value)}
            placeholder="Ex: SC, SP, RJ"
          />
          <Select
            label="Condicao"
            value={formCondition}
            onChange={(e) => setFormCondition(e.target.value)}
          >
            <option value="price_below">Preco abaixo de</option>
            <option value="price_above">Preco acima de</option>
            <option value="new_deal_hot">Novo deal quente</option>
            <option value="price_drop">Queda de preco</option>
          </Select>
          {(formCondition === 'price_below' || formCondition === 'price_above') && (
            <CurrencyInput
              label="Valor Limite"
              value={formThreshold}
              onChange={setFormThreshold}
              placeholder="0,00"
            />
          )}
          <Select
            label="Canal"
            value={formChannel}
            onChange={(e) => setFormChannel(e.target.value)}
          >
            <option value="telegram">Telegram</option>
            <option value="email">Email</option>
            <option value="both">Ambos</option>
          </Select>
        </div>

        <Button
          className="mt-4"
          onClick={handleCreate}
          loading={createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Criar Alerta
        </Button>
      </Card>

      {/* Manual check */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => checkMutation.mutate()}
          loading={checkMutation.isPending}
        >
          <Zap className="h-4 w-4" />
          Verificar Alertas Agora
        </Button>
        {testResult && (
          <span className="text-sm text-[#f0f0f5]/60">{testResult}</span>
        )}
      </div>

      {/* Alerts table */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
          Meus Alertas
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhum alerta"
            description="Crie seu primeiro alerta para ser notificado quando as condicoes do mercado mudarem."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-[#f0f0f5]/50">
                  <th className="pb-3 pr-4 font-medium">Nome</th>
                  <th className="pb-3 pr-4 font-medium">Condicao</th>
                  <th className="hidden pb-3 pr-4 font-medium md:table-cell">Modelo</th>
                  <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Regiao</th>
                  <th className="pb-3 pr-4 font-medium">Canal</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="hidden pb-3 pr-4 font-medium lg:table-cell">Ultimo Disparo</th>
                  <th className="pb-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {alerts.map((alert) => {
                  const isDeleting = deletingId === alert.id;
                  const conditionText = alert.threshold
                    ? `${CONDITION_LABELS[alert.condition]} R$${Number(alert.threshold).toLocaleString('pt-BR')}`
                    : CONDITION_LABELS[alert.condition];

                  return (
                    <tr key={alert.id} className={cn('text-[#f0f0f5]/80', !alert.isActive && 'opacity-50')}>
                      <td className="py-3 pr-4 font-medium">{alert.name}</td>
                      <td className="py-3 pr-4 text-[#f0f0f5]/60">{conditionText}</td>
                      <td className="hidden py-3 pr-4 text-[#f0f0f5]/60 md:table-cell">
                        {alert.model
                          ? `${alert.model.brand} ${alert.model.name} ${alert.model.variant}`
                          : 'Todos'}
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">{alert.region}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={alert.channel === 'both' ? 'success' : 'neutral'}>
                          {CHANNEL_LABELS[alert.channel]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => toggleActive(alert)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            alert.isActive
                              ? 'bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20'
                              : 'bg-white/[0.06] text-[#f0f0f5]/40 hover:bg-white/[0.1]'
                          )}
                        >
                          {alert.isActive ? (
                            <><Eye className="h-3.5 w-3.5" /> Ativo</>
                          ) : (
                            <><EyeOff className="h-3.5 w-3.5" /> Inativo</>
                          )}
                        </button>
                      </td>
                      <td className="hidden py-3 pr-4 text-[#f0f0f5]/40 lg:table-cell">
                        {formatRelativeTime(alert.lastTriggered)}
                      </td>
                      <td className="py-3">
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteMutation.mutate(alert.id)}
                              loading={deleteMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(alert.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
