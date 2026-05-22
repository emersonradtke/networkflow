import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdminTermsOfService() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', is_active: false });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const data = await base44.asServiceRole.entities.TermsOfService.list('-created_date');
      setTerms(data);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert('Título e conteúdo são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await base44.asServiceRole.entities.TermsOfService.update(editingId, formData);
      } else {
        // Se estamos criando um novo termo, desativa os antigos
        const activeTerms = terms.filter(t => t.is_active);
        for (const term of activeTerms) {
          await base44.asServiceRole.entities.TermsOfService.update(term.id, { is_active: false });
        }
        
        const nextVersion = Math.max(...terms.map(t => t.version || 1), 0) + 1;
        await base44.asServiceRole.entities.TermsOfService.create({
          ...formData,
          version: nextVersion
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', content: '', is_active: false });
      fetchTerms();
    } catch (error) {
      console.error('Erro ao salvar termo:', error);
      alert('Erro ao salvar termo');
    }
  };

  const handleEdit = (term) => {
    setEditingId(term.id);
    setFormData({ 
      title: term.title, 
      content: term.content, 
      is_active: term.is_active 
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este termo?')) return;

    try {
      await base44.asServiceRole.entities.TermsOfService.delete(id);
      fetchTerms();
    } catch (error) {
      console.error('Erro ao deletar termo:', error);
      alert('Erro ao deletar termo');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground">Gerencie os termos de serviço da plataforma</p>
      </div>

      <Button onClick={() => setShowForm(true)} className="mb-6">
        <Plus size={18} className="mr-2" /> Novo Termo
      </Button>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum termo cadastrado
        </div>
      ) : (
        <div className="grid gap-4">
          {terms.map(term => (
            <div key={term.id} className="border rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{term.title}</h3>
                  {term.is_active && <Badge className="bg-green-100 text-green-800">Ativo</Badge>}
                  <Badge variant="outline">v{term.version}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{term.content}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => handleEdit(term)}
                >
                  <Edit2 size={18} />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => handleDelete(term.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Termo' : 'Novo Termo de Serviço'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <Label className="font-semibold">Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Termos de Serviço"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="font-semibold">Conteúdo (Markdown)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite o conteúdo em markdown..."
                className="mt-1.5 h-64 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ title: '', content: '', is_active: false });
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Atualizar' : 'Criar'} Termo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}