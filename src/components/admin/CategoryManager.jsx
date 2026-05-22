import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ProductCategory.list('order', 100);
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', description: '', icon: '', order: 0, is_active: true });
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setFormData(category);
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      if (editingCategory?.id) {
        await base44.entities.ProductCategory.update(editingCategory.id, formData);
      } else {
        await base44.entities.ProductCategory.create(formData);
      }
      setShowForm(false);
      handleReset();
      loadCategories();
    } catch (e) {
      alert('Erro ao salvar categoria');
    }
  };

  const handleDelete = async (categoryId) => {
    if (confirm('Excluir esta categoria?')) {
      try {
        await base44.entities.ProductCategory.delete(categoryId);
        loadCategories();
      } catch (e) {
        alert('Erro ao excluir');
      }
    }
  };

  return (
    <div className="dark-card rounded-2xl p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-foreground">Categorias de Produtos</h3>
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) handleReset();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">+ Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da categoria"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">URL do Ícone</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ordem</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Carregando...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">Nenhuma categoria</div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex-1">
                <h4 className="font-bold text-foreground">{cat.name}</h4>
                {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(cat)}
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}