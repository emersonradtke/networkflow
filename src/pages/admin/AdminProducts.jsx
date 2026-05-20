import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Package, ExternalLink, ShoppingBag, Upload, Wand2, Loader2, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyForm = {
  name: '', description: '', price: '', commission_percent: '',
  image_url: '', type: 'direct_sale', external_url: '', category: '', is_active: true
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await base44.entities.Product.list('-created_date');
    setProducts(data);
    setLoading(false);
  };

  const openCreate = () => { setForm(emptyForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (p) => {
    setForm({ ...p, price: p.price?.toString(), commission_percent: p.commission_percent?.toString() });
    setEditId(p.id);
    setDialogOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price), commission_percent: parseFloat(form.commission_percent) };
    if (editId) await base44.entities.Product.update(editId, data);
    else await base44.entities.Product.create(data);
    setDialogOpen(false);
    loadProducts();
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Remover produto?')) return;
    await base44.entities.Product.delete(id);
    loadProducts();
  };

  const toggleActive = async (p) => {
    await base44.entities.Product.update(p.id, { is_active: !p.is_active });
    loadProducts();
  };

  // Upload de imagem
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
  };

  // Captura automática de dados do anúncio via URL
  const fetchFromUrl = async () => {
    const url = form.external_url?.trim();
    if (!url) return;
    setFetchingUrl(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Acesse o seguinte link de produto e extraia as informações do anúncio: ${url}\n\nRetorne os dados do produto encontrado.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          category: { type: 'string' }
        }
      }
    });
    if (result) {
      setForm(f => ({
        ...f,
        name: result.name || f.name,
        description: result.description || f.description,
        price: result.price ? result.price.toString() : f.price,
        image_url: result.image_url || f.image_url,
        category: result.category || f.category,
      }));
    }
    setFetchingUrl(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o catálogo da loja virtual</p>
        </div>
        <Button className="gold-gradient text-white font-bold gap-2" onClick={openCreate}>
          <Plus size={16} /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 dark-card rounded-xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
          <Button className="mt-4 gold-gradient text-white font-bold gap-2" onClick={openCreate}><Plus size={16} /> Adicionar Produto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className={`dark-card rounded-xl p-4 flex gap-4 ${!p.is_active ? 'opacity-50' : ''}`}>
              <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-base font-black text-primary">R$ {p.price?.toFixed(2)}</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{p.commission_percent}% comissão</Badge>
                  <Badge className={p.type === 'external_link' ? 'bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs' : 'bg-green-500/20 text-green-600 border-green-500/30 text-xs'}>
                    {p.type === 'external_link' ? <><ExternalLink size={10} className="mr-1" />Externo</> : <><ShoppingBag size={10} className="mr-1" />Direto</>}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-foreground gap-1" onClick={() => openEdit(p)}>
                    <Pencil size={12} /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 gap-1" onClick={() => remove(p.id)}>
                    <Trash2 size={12} /> Remover
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_sale">Venda Direta</SelectItem>
                    <SelectItem value="external_link">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input className="mt-1.5" placeholder="Ex: Suplementos" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
            </div>

            {/* URL externa + botão capturar */}
            {form.type === 'external_link' && (
              <div>
                <Label>URL do Anúncio / Marketplace</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    className="flex-1"
                    placeholder="https://shopee.com.br/produto..."
                    value={form.external_url}
                    onChange={e => setForm({...form, external_url: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-1.5 border-[#3B9EE2] text-[#3B9EE2] hover:bg-[#3B9EE2]/10"
                    onClick={fetchFromUrl}
                    disabled={fetchingUrl || !form.external_url?.trim()}
                  >
                    {fetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {fetchingUrl ? 'Buscando...' : 'Capturar'}
                  </Button>
                </div>
                {fetchingUrl && (
                  <p className="text-xs text-muted-foreground mt-1">Extraindo dados do anúncio com IA...</p>
                )}
              </div>
            )}

            {/* Nome */}
            <div>
              <Label>Nome do Produto</Label>
              <Input className="mt-1.5" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>

            {/* Preço + Comissão */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input className="mt-1.5" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input className="mt-1.5" type="number" step="0.1" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} required />
              </div>
            </div>

            {/* Imagem */}
            <div>
              <Label>Imagem do Produto</Label>
              <div className="mt-1.5 space-y-2">
                {/* Preview */}
                {form.image_url && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={form.image_url} alt="preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Botões upload / URL */}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploadingImage ? 'Enviando...' : 'Upload de Imagem'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 shrink-0"
                    onClick={() => {
                      const url = prompt('Cole a URL da imagem:');
                      if (url) setForm(f => ({ ...f, image_url: url }));
                    }}
                  >
                    <ImageIcon size={14} />
                    URL
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}>
              {saving ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}