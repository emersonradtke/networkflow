import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Upload, AlertTriangle, Download, Search, Eye } from 'lucide-react';

const CATEGORIES = {
  terms_of_service: 'Termos de Uso',
  privacy_policy:   'Política de Privacidade',
  lgpd_consent:     'Consentimento LGPD',
  image_consent:    'Uso de Imagem',
  regulation:       'Regulamento',
  digital_contract: 'Contrato Digital',
  other:            'Outros',
};

// ──────────────────────────────────────────
// Seção de um documento por categoria
// ──────────────────────────────────────────
function CategorySection({ category, terms, loading, onEdit, onDelete, onNew }) {
  const filtered = terms.filter(t => (t.category || t.term_type || 'terms_of_service') === category);
  const active = filtered.find(t => t.is_active);
  const history = filtered.filter(t => !t.is_active).sort((a, b) => (b.version || 1) - (a.version || 1));
  const label = CATEGORIES[category];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ao salvar, uma nova versão é criada e todos os aceites anteriores são invalidados.
        </p>
        <Button onClick={() => onNew(category)} className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus size={16} className="mr-2" />
          {active ? 'Nova Versão' : 'Criar'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active ? (
        <div className="space-y-3">
          <div className="dark-card rounded-2xl p-4 border-2 border-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h3 className="font-semibold">{active.title}</h3>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  <Badge variant="outline">v{active.version}</Badge>
                  {active.is_mandatory !== false && <Badge className="bg-red-100 text-red-700">Obrigatório</Badge>}
                </div>
                {active.effective_date && (
                  <p className="text-xs text-muted-foreground mb-1">Vigência: {active.effective_date}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">{active.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="icon" variant="outline" onClick={() => onEdit(active)}>
                  <Edit2 size={16} />
                </Button>
                <Button size="icon" variant="outline" onClick={() => onDelete(active.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Versões anteriores</p>
              {history.map(term => (
                <div key={term.id} className="dark-card rounded-xl p-3 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{term.title}</span>
                    <Badge variant="outline" className="text-xs">v{term.version}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(term.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground dark-card rounded-2xl p-6">
          Nenhum {label.toLowerCase()} cadastrado ainda.
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Aba de aceites / auditoria
// ──────────────────────────────────────────
function AcceptancesReport() {
  const [acceptances, setAcceptances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewRow, setPreviewRow] = useState(null);

  useEffect(() => { fetchAcceptances(); }, []);

  const fetchAcceptances = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.UserTermsAcceptance.list('-accepted_at', 500);
      setAcceptances(data);
    } catch (err) {
      console.error('Erro ao carregar aceites', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = acceptances.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.user_email || '').toLowerCase().includes(q) ||
      (a.terms_title || '').toLowerCase().includes(q) ||
      (a.terms_category || '').toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const headers = ['Usuário', 'Email', 'Documento', 'Categoria', 'Versão', 'Data Aceite', 'IP', 'Dispositivo', 'User Agent'];
    const rows = filtered.map(a => [
      a.user_id,
      a.user_email || '',
      a.terms_title || '',
      a.terms_category || '',
      a.terms_version || '',
      a.accepted_at ? new Date(a.accepted_at).toLocaleString('pt-BR') : '',
      a.ip_address || '',
      a.device_type || '',
      (a.user_agent || '').replace(/,/g, ';')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aceites_termos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleExportCsv} className="gap-2 shrink-0">
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="dark-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase">
                  <th className="text-left py-3 px-4">Usuário</th>
                  <th className="text-left py-3 px-4">Documento</th>
                  <th className="text-left py-3 px-4">Versão</th>
                  <th className="text-left py-3 px-4">Data Aceite</th>
                  <th className="text-left py-3 px-4">Dispositivo</th>
                  <th className="text-left py-3 px-4">IP</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum aceite registrado
                    </td>
                  </tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground text-xs truncate max-w-36">{a.user_email || a.user_id}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-foreground truncate max-w-40">{a.terms_title || '—'}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORIES[a.terms_category] || a.terms_category || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">v{a.terms_version}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {a.accepted_at ? new Date(a.accepted_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground capitalize">{a.device_type || '—'}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{a.ip_address || '—'}</td>
                    <td className="py-3 px-4">
                      <Button size="icon" variant="ghost" onClick={() => setPreviewRow(a)}>
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview de auditoria */}
      <Dialog open={!!previewRow} onOpenChange={() => setPreviewRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Aceite</DialogTitle>
          </DialogHeader>
          {previewRow && (
            <div className="space-y-3 text-sm">
              {[
                ['Usuário ID', previewRow.user_id],
                ['Email', previewRow.user_email],
                ['Documento', previewRow.terms_title],
                ['Categoria', CATEGORIES[previewRow.terms_category] || previewRow.terms_category],
                ['Versão', `v${previewRow.terms_version}`],
                ['Data Aceite', previewRow.accepted_at ? new Date(previewRow.accepted_at).toLocaleString('pt-BR') : '—'],
                ['IP', previewRow.ip_address],
                ['Dispositivo', previewRow.device_type],
                ['Session ID', previewRow.session_id],
                ['User Agent', previewRow.user_agent],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-semibold text-muted-foreground w-32 shrink-0">{k}:</span>
                  <span className="text-foreground break-all">{v || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────
export default function TermsManager() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState('terms_of_service');
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', is_mandatory: true, effective_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTerms(); }, []);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getTermsList', {});
      setTerms(response.data?.terms || []);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = (category) => {
    setFormCategory(category);
    const active = terms.find(t => (t.category || t.term_type || 'terms_of_service') === category && t.is_active);
    setEditingTerm(active || null);
    setFormData({
      title: active?.title || CATEGORIES[category],
      content: active?.content || '',
      is_mandatory: active?.is_mandatory !== false,
      effective_date: ''
    });
    setShowForm(true);
  };

  const handleEdit = (term) => {
    setFormCategory(term.category || term.term_type || 'terms_of_service');
    setEditingTerm(term);
    setFormData({
      title: term.title,
      content: term.content,
      is_mandatory: term.is_mandatory !== false,
      effective_date: term.effective_date || ''
    });
    setShowForm(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: { type: 'object', properties: { content: { type: 'string' } } }
      });
      if (extractRes.output?.content) {
        setFormData(f => ({ ...f, content: extractRes.output.content }));
      }
    } catch {
      alert('Erro ao processar arquivo');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert('Título e conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('saveTermsOfService', {
        title: formData.title,
        content: formData.content,
        category: formCategory,
        is_mandatory: formData.is_mandatory,
        effective_date: formData.effective_date || null
      });
      setShowForm(false);
      fetchTerms();
    } catch {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return;
    try {
      await base44.functions.invoke('deleteTermsOfService', { id });
      fetchTerms();
    } catch {
      alert('Erro ao deletar');
    }
  };

  const docCategories = Object.keys(CATEGORIES);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1">Termos e Documentos</h3>
        <p className="text-sm text-muted-foreground">Gerencie documentos obrigatórios e histórico de aceites</p>
      </div>

      <Tabs defaultValue="terms_of_service">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto flex-wrap gap-1 p-1">
            {docCategories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {CATEGORIES[cat]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="acceptances" className="text-xs">
              📋 Aceites
            </TabsTrigger>
          </TabsList>
        </div>

        {docCategories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <CategorySection
              category={cat}
              terms={terms}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNew={handleNew}
            />
          </TabsContent>
        ))}

        <TabsContent value="acceptances" className="mt-4">
          <AcceptancesReport />
        </TabsContent>
      </Tabs>

      {/* Modal de edição */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? 'Nova Versão' : 'Criar'} — {CATEGORIES[formCategory]}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Ao salvar, uma <strong className="mx-1">nova versão</strong> será criada e todos os usuários deverão aceitar novamente.
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="font-semibold">Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={CATEGORIES[formCategory]}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="font-semibold">Data de Vigência</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Switch
                  id="mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={(val) => setFormData({ ...formData, is_mandatory: val })}
                />
                <Label htmlFor="mandatory" className="text-sm cursor-pointer">
                  Obrigatório (bloqueia acesso)
                </Label>
              </div>
            </div>

            <div>
              <Label className="font-semibold">Conteúdo (Markdown)</Label>
              <div className="flex gap-2 mb-2 mt-1">
                <label className="cursor-pointer">
                  <input type="file" accept=".txt,.md,.pdf" onChange={handleFileUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                    <span><Upload size={14} /> Importar arquivo</span>
                  </Button>
                </label>
              </div>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite o conteúdo em markdown..."
                className="h-64 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? 'Salvando...' : 'Publicar Nova Versão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}