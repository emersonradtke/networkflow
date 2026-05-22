import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BannerEditForm from './BannerEditForm';

export default function BannerManager() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.StoreBanner.list('position', 100);
      setBanners(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bannerId) => {
    if (confirm('Excluir este banner?')) {
      try {
        await base44.entities.StoreBanner.delete(bannerId);
        loadBanners();
      } catch (e) {
        alert('Erro ao excluir');
      }
    }
  };

  const handleToggle = async (banner) => {
    try {
      await base44.entities.StoreBanner.update(banner.id, { is_active: !banner.is_active });
      loadBanners();
    } catch (e) {
      alert('Erro ao atualizar');
    }
  };

  const handleSave = async () => {
    setShowForm(false);
    setEditingBanner(null);
    loadBanners();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Gerenciamento de Banners</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBanner(null)}>+ Novo Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Editar Banner' : 'Criar Banner'}</DialogTitle>
            </DialogHeader>
            <BannerEditForm banner={editingBanner} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum banner criado</div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{banner.title}</h3>
                <p className="text-sm text-muted-foreground">{banner.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Link: {banner.link}</span>
                  <span>Comissão: {banner.commission_percent}%</span>
                  <span>Animação: {banner.animation}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleToggle(banner)}>
                  {banner.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
                <Dialog open={editingBanner?.id === banner.id && showForm} onOpenChange={(open) => {
                  if (!open) setEditingBanner(null);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingBanner(banner); setShowForm(true); }}>
                      <Edit2 size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Editar Banner</DialogTitle>
                    </DialogHeader>
                    <BannerEditForm banner={banner} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingBanner(null); }} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
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