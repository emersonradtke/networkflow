import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Upload, AlertTriangle } from 'lucide-react';

const TYPE_LABELS = {
  terms_of_service: 'Termos de Serviço',
  privacy_policy: 'Política de Privacidade',
};

function TermsSection({ type, terms, loading, onEdit, onDelete, onNew }) {
  const filtered = terms.filter(t => (t.term_type || 'terms_of_service') === type);
  const active = filtered.find(t => t.is_active);
  const history = filtered.filter(t => !t.is_active).sort((a, b) => (b.version || 1) - (a.version || 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Ao salvar alterações, uma nova versão é criada e todos os associados serão solicitados a aceitar novamente.
          </p>
        </div>
        <Button onClick={() => onNew(type)} className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus size={16} className="mr-2" />
          {active ? 'Editar / Nova Versão' : 'Criar'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active ? (
        <div className="space-y-3">
          {/* Versão ativa */}
          <div className="dark-card rounded-2xl p-4 border-2 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{active.title}</h3>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  <Badge variant="outline">v{active.version}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{active.content}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <Button size="icon" variant="outline" onClick={() => onEdit(active)}>
                  <Edit2 size={16} />
                </Button>
                <Button size="icon" variant="outline" onClick={() => onDelete(active.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Histórico */}
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
          Nenhum {TYPE_LABELS[type].toLowerCase()} cadastrado
        </div>
      )}
    </div>
  );
}

export default function TermsManager() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('terms_of_service');
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTerms(); }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('getTermsList', {});
      setTerms(response.data?.terms || []);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = (type) => {
    setFormType(type);
    // Preenche com conteúdo ativo atual para facilitar edição
    const active = terms.find(t => (t.term_type || 'terms_of_service') === type && t.is_active);
    setEditingTerm(active || null);
    setFormData({
      title: active?.title || TYPE_LABELS[type],
      content: active?.content || '',
    });
    setShowForm(true);
  };

  const handleEdit = (term) => {
    setFormType(term.term_type || 'terms_of_service');
    setEditingTerm(term);
    setFormData({ title: term.title, content: term.content });
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
    } catch (error) {
      alert('Erro ao processar arquivo');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert('Título e conteúdo são obrigatórios');
      return;
    }
    try {
      setSaving(true);
      // Sempre cria nova versão (lógica no backend)
      await base44.functions.invoke('saveTermsOfService', {
        title: formData.title,
        content: formData.content,
        term_type: formType,
      });
      setShowForm(false);
      fetchTerms();
    } catch (error) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este termo?')) return;
    try {
      await base44.functions.invoke('deleteTermsOfService', { id });
      fetchTerms();
    } catch (error) {
      alert('Erro ao deletar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1">Termos e Privacidade</h3>
        <p className="text-sm text-muted-foreground">Gerencie os documentos que os associados precisam aceitar</p>
      </div>

      <Tabs defaultValue="terms_of_service">
        <TabsList>
          <TabsTrigger value="terms_of_service">Termos de Serviço</TabsTrigger>
          <TabsTrigger value="privacy_policy">Política de Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="terms_of_service" className="mt-4">
          <TermsSection
            type="terms_of_service"
            terms={terms}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNew={handleNew}
          />
        </TabsContent>

        <TabsContent value="privacy_policy" className="mt-4">
          <TermsSection
            type="privacy_policy"
            terms={terms}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNew={handleNew}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de edição */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? 'Editar' : 'Criar'} — {TYPE_LABELS[formType]}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Ao salvar, uma <strong className="mx-1">nova versão</strong> será criada e todos os associados serão solicitados a aceitar novamente.
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
            <div>
              <Label className="font-semibold">Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={`Ex: ${TYPE_LABELS[formType]}`}
                className="mt-1.5"
              />
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
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? 'Salvando...' : 'Salvar como Nova Versão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}