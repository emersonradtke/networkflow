import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Package, ExternalLink, ShoppingBag, Upload, Wand2, Loader2, ImageIcon, X, RefreshCw, Search, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StockReplenishModal from '@/components/StockReplenishModal';

const emptyForm = {
  code: '', name: '', description: '', brand: '', supplier: '',
  price: '', commission_percent: '', image_url: '',
  type: 'direct_sale', external_url: '', category: '',
  is_active: true, stock: '', stock_min: '', stock_max: '',
  visibility: 'public', on_special_offer: false,
};

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [replenishProduct, setReplenishProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const fileInputRef = useRef(null);

  useEffect(() => { loadProducts(); loadSuppliers(); }, []);

  const loadProducts = async () => {
    const data = await base44.entities.Product.list('-created_date');
    setProducts(data);
    setLoading(false);
  };

  const loadSuppliers = async () => {
    const data = await base44.entities.Supplier.filter({ is_active: true }, 'name');
    setSuppliers(data);
  };

  const openCreate = () => { setForm({ ...emptyForm, code: generateCode() }); setEditId(null); setDialogOpen(true); };
  const openEdit = (p) => {
   setForm({
     ...p,
     price: p.price?.toString() ?? '',
     commission_percent: p.commission_percent?.toString() ?? '',
     stock: p.stock?.toString() ?? '',
     stock_min: p.stock_min?.toString() ?? '',
     stock_max: p.stock_max?.toString() ?? '',
     visibility: p.visibility || 'public',
     on_special_offer: p.on_special_offer || false,
   });
   setEditId(p.id);
   setDialogOpen(true);
  };

  const canActivate = (f) => {
    if (!f.price || parseFloat(f.price) <= 0) return false;
    if (f.type === 'direct_sale' && (!f.stock || parseInt(f.stock) <= 0)) return false;
    return true;
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isDirect = form.type === 'direct_sale';
    const hasPrice = form.price && parseFloat(form.price) > 0;
    const hasStock = isDirect ? (form.stock && parseInt(form.stock) > 0) : true;
    const isActive = form.is_active && hasPrice && hasStock;

    const data = {
      ...form,
      price: parseFloat(form.price),
      commission_percent: parseFloat(form.commission_percent),
      stock: isDirect ? parseInt(form.stock || 0) : null,
      stock_min: isDirect ? parseInt(form.stock_min || 0) : null,
      stock_max: isDirect ? parseInt(form.stock_max || 0) : null,
      is_active: isActive,
    };
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
    if (!p.is_active) {
      // Tentando ativar
      if (!p.price || p.price <= 0) { alert('Não é possível ativar: produto sem preço.'); return; }
      if (p.type === 'direct_sale' && (!p.stock || p.stock <= 0)) { alert('Não é possível ativar: produto sem estoque.'); return; }
    }
    await base44.entities.Product.update(p.id, { is_active: !p.is_active });
    loadProducts();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
  };

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
          category: { type: 'string' },
          brand: { type: 'string' },
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
        brand: result.brand || f.brand,
      }));
    }
    setFetchingUrl(false);
  };

  const categories = ['all', ...new Set(products.filter(p => p.category).map(p => p.category))];

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.supplier?.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStock = products.filter(p => p.type === 'direct_sale' && p.stock_min != null && p.stock != null && p.stock <= p.stock_min);

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

      {/* Alerta estoque baixo */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-700 mb-1">{lowStock.length} produto(s) com estoque abaixo do mínimo</p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(p => (
                <button key={p.id} onClick={() => setReplenishProduct(p)}
                  className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-full hover:bg-yellow-200 transition-colors">
                  {p.name} ({p.stock}/{p.stock_min})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Busca + Filtro categoria */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, código, categoria, marca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'Todas Categorias' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 dark-card rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          <Button className="mt-4 gold-gradient text-white font-bold gap-2" onClick={openCreate}><Plus size={16} /> Adicionar Produto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => {
            const isLowStock = p.type === 'direct_sale' && p.stock_min != null && p.stock != null && p.stock <= p.stock_min;
            return (
              <div key={p.id} className={`dark-card rounded-xl p-4 flex gap-4 transition-opacity ${!p.is_active ? 'opacity-60' : ''}`}>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm">{p.name}</p>
                        {p.code && (
                          <span className="text-xs font-mono bg-secondary text-primary px-1.5 py-0.5 rounded border border-border">#{p.code}</span>
                        )}
                      </div>
                      {(p.brand || p.supplier) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.brand && <span>Marca: <span className="text-foreground">{p.brand}</span></span>}
                          {p.brand && p.supplier && ' · '}
                          {p.supplier && <span>Fornecedor: <span className="text-foreground">{p.supplier}</span></span>}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                    </div>
                    <Switch checked={!!p.is_active} onCheckedChange={() => toggleActive(p)} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-base font-black text-primary">R$ {p.price?.toFixed(2)}</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{p.commission_percent}% comissão</Badge>
                    <Badge className={p.type === 'external_link' ? 'bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs' : 'bg-green-500/20 text-green-600 border-green-500/30 text-xs'}>
                      {p.type === 'external_link' ? <><ExternalLink size={10} className="mr-1" />Externo</> : <><ShoppingBag size={10} className="mr-1" />Direto</>}
                    </Badge>
                    {p.on_special_offer && (
                      <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs">⭐ Oferta</Badge>
                    )}
                    {p.type === 'direct_sale' && (
                      <Badge className={isLowStock ? 'bg-yellow-500/20 text-yellow-700 border-yellow-400/40 text-xs' : 'bg-secondary text-muted-foreground text-xs'}>
                        {isLowStock && <AlertTriangle size={10} className="mr-1" />}
                        Estoque: {p.stock ?? 0}
                        {p.stock_min != null && ` / mín ${p.stock_min}`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-foreground gap-1" onClick={() => openEdit(p)}>
                      <Pencil size={12} /> Editar
                    </Button>
                    {p.type === 'direct_sale' && (
                      <Button size="sm" variant="ghost" className="h-7 text-blue-500 hover:text-blue-700 gap-1" onClick={() => setReplenishProduct(p)}>
                        <RefreshCw size={12} /> Repor
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-600 gap-1" onClick={() => remove(p.id)}>
                      <Trash2 size={12} /> Remover
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal reposição */}
      {replenishProduct && (
        <StockReplenishModal
          product={replenishProduct}
          onClose={() => setReplenishProduct(null)}
          onDone={loadProducts}
        />
      )}

      {/* Modal form produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-black">{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* Código */}
            <div>
              <Label>Código do Produto</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  className="flex-1 font-mono"
                  placeholder="Ex: ABC12345"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
                <Button type="button" variant="outline" onClick={() => setForm(f => ({ ...f, code: generateCode() }))} className="shrink-0 gap-1.5">
                  <Hash size={14} /> Gerar
                </Button>
              </div>
            </div>

            {/* Tipo + Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_sale">Venda Direta</SelectItem>
                    <SelectItem value="external_link">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input className="mt-1.5" placeholder="Ex: Suplementos" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>

            {/* Marca + Fornecedor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marca</Label>
                <Input className="mt-1.5" placeholder="Ex: NutriPro" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={form.supplier || ''} onValueChange={v => setForm({ ...form, supplier: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.trade_name || s.name}>{s.trade_name || s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL externa */}
            {form.type === 'external_link' && (
              <div>
                <Label>URL do Anúncio / Marketplace</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input className="flex-1" placeholder="https://shopee.com.br/produto..." value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} />
                  <Button type="button" variant="outline" className="shrink-0 gap-1.5 border-[#3B9EE2] text-[#3B9EE2] hover:bg-[#3B9EE2]/10" onClick={fetchFromUrl} disabled={fetchingUrl || !form.external_url?.trim()}>
                    {fetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {fetchingUrl ? 'Buscando...' : 'Capturar'}
                  </Button>
                </div>
              </div>
            )}

            {/* Nome */}
            <div>
              <Label>Nome do Produto</Label>
              <Input className="mt-1.5" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Preço + Comissão */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input className="mt-1.5" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input className="mt-1.5" type="number" step="0.1" value={form.commission_percent} onChange={e => setForm({ ...form, commission_percent: e.target.value })} required />
              </div>
            </div>

            {/* Estoque (apenas venda direta) */}
            {form.type === 'direct_sale' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Qtd. Estoque</Label>
                  <Input className="mt-1.5" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                </div>
                <div>
                  <Label>Qtd. Mínima</Label>
                  <Input className="mt-1.5" type="number" min="0" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: e.target.value })} />
                </div>
                <div>
                  <Label>Qtd. Máxima</Label>
                  <Input className="mt-1.5" type="number" min="0" value={form.stock_max} onChange={e => setForm({ ...form, stock_max: e.target.value })} />
                </div>
              </div>
            )}

            {/* Visibilidade + Oferta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Visibilidade</Label>
                <Select value={form.visibility} onValueChange={v => setForm({ ...form, visibility: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Loja Pública</SelectItem>
                    <SelectItem value="associate_only">Apenas Associados</SelectItem>
                    <SelectItem value="hidden">Oculto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 w-full">
                  <Switch checked={form.on_special_offer} onCheckedChange={v => setForm({ ...form, on_special_offer: v })} />
                  <Label className="m-0">Oferta Especial</Label>
                </div>
              </div>
            </div>

            {/* Aviso se não pode ativar */}
            {form.is_active && !canActivate(form) && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                <AlertTriangle size={14} />
                Produto será salvo como inativo (sem preço{form.type === 'direct_sale' ? ' ou sem estoque' : ''}).
              </div>
            )}

            {/* Imagem */}
            <div>
              <Label>Imagem do Produto</Label>
              <div className="mt-1.5 space-y-2">
                {form.image_url && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={form.image_url} alt="preview" className="w-full h-full object-contain" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploadingImage ? 'Enviando...' : 'Upload de Imagem'}
                  </Button>
                  <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={() => { const url = prompt('Cole a URL da imagem:'); if (url) setForm(f => ({ ...f, image_url: url })); }}>
                    <ImageIcon size={14} /> URL
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