import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Save, Plus, Minus, LayoutGrid, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoryManager from '@/components/admin/CategoryManager';
import BannerManager from '@/components/admin/BannerManager';
import RolePermissionManager from '@/components/admin/RolePermissionManager';

export default function AdminSettings() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    app_name: 'Bold Life',
    max_levels: 5,
    adhesion_price: 100,
    adhesion_description: '',
    withdrawal_min_amount: 50,
    welcome_message: '',
    store_page_size: 24,
    pontos_por_real: 1,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const configs = await base44.entities.NetworkConfig.list();
    if (configs.length > 0) {
      setConfig(configs[0]);
      setForm({ ...form, ...configs[0] });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (config?.id) {
      await base44.entities.NetworkConfig.update(config.id, form);
    } else {
      await base44.entities.NetworkConfig.create(form);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadConfig();
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure a estrutura da rede e parâmetros do sistema</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
      <form onSubmit={save} className="space-y-6">
        {/* Network Config */}
        <div className="dark-card rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Settings size={16} className="text-primary" /> Configurações da Rede
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Nome do App</Label>
              <Input className="mt-1.5 bg-secondary border-border text-foreground" value={form.app_name} onChange={e => setForm({...form, app_name: e.target.value})} />
            </div>
            <div>
              <Label className="text-foreground">Níveis da Rede</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 border border-border" onClick={() => setForm({...form, max_levels: Math.max(1, form.max_levels - 1)})}>
                  <Minus size={14} />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black text-primary">{form.max_levels}</span>
                  <p className="text-xs text-muted-foreground">níveis</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 border border-border" onClick={() => setForm({...form, max_levels: Math.min(20, form.max_levels + 1)})}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-sm text-primary font-semibold mb-1">Como funciona:</p>
            <p className="text-xs text-muted-foreground">
              Com <strong className="text-foreground">{form.max_levels} níveis</strong>, quando um associado faz uma compra, o percentual de comissão do produto é distribuído igualmente para os <strong className="text-foreground">{form.max_levels} uplines</strong> acima dele na cadeia. Cada upline ativo recebe o mesmo percentual.
            </p>
          </div>
        </div>

        {/* Financial Config */}
        <div className="dark-card rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-foreground">Configurações Financeiras</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Taxa de Adesão (R$)</Label>
              <Input className="mt-1.5 bg-secondary border-border text-foreground" type="number" step="0.01" value={form.adhesion_price} onChange={e => setForm({...form, adhesion_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label className="text-foreground">Saque Mínimo (R$)</Label>
              <Input className="mt-1.5 bg-secondary border-border text-foreground" type="number" step="0.01" value={form.withdrawal_min_amount} onChange={e => setForm({...form, withdrawal_min_amount: parseFloat(e.target.value)})} />
            </div>
          </div>
          <div>
            <Label className="text-foreground">Descrição da Adesão</Label>
            <Textarea className="mt-1.5 bg-secondary border-border text-foreground resize-none" rows={3} placeholder="Descreva o que está incluído na adesão..." value={form.adhesion_description} onChange={e => setForm({...form, adhesion_description: e.target.value})} />
          </div>
        </div>

        {/* Points Config */}
        <div className="dark-card rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Gift size={16} className="text-primary" /> Configurações de Pontos
          </h3>
          <div>
            <Label className="text-foreground">Pontos por Real Gasto</Label>
            <p className="text-xs text-muted-foreground mb-2">Quantos pontos o associado ganha a cada R$ 1,00 gasto</p>
            <Input className="mt-1.5 bg-secondary border-border text-foreground max-w-xs" type="number" step="0.01" min="0" value={form.pontos_por_real} onChange={e => setForm({...form, pontos_por_real: parseFloat(e.target.value) || 0})} />
            <p className="text-xs text-primary mt-2">Exemplo: Com valor 2, uma compra de R$ 100 = 200 pontos</p>
          </div>
        </div>

        {/* Store Config */}
        <div className="dark-card rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <LayoutGrid size={16} className="text-primary" /> Configurações da Loja
          </h3>
          <div>
            <Label className="text-foreground">Produtos por página</Label>
            <p className="text-xs text-muted-foreground mb-2">Define quantos produtos são exibidos por página na loja</p>
            <div className="flex gap-2 flex-wrap">
              {[12, 24, 48, 96, 192].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({...form, store_page_size: n})}
                  className={`px-5 py-2 rounded-xl font-bold text-sm border transition-all ${
                    form.store_page_size === n
                      ? 'text-white border-transparent'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                  style={form.store_page_size === n ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="dark-card rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-foreground">Mensagem de Boas-vindas</h3>
          <Textarea className="bg-secondary border-border text-foreground resize-none" rows={4} placeholder="Mensagem exibida para novos associados após o cadastro..." value={form.welcome_message} onChange={e => setForm({...form, welcome_message: e.target.value})} />
        </div>

        <Button type="submit" disabled={saving} className="gold-gradient text-background font-bold gap-2 px-8">
          <Save size={16} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </form>
        </TabsContent>

        <TabsContent value="roles">
          <RolePermissionManager />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="banners">
          <BannerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}