import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function BannerEditForm({ banner, onSave, onCancel }) {
  const [formData, setFormData] = useState(banner || {
    title: '',
    description: '',
    link: '',
    image_url: '',
    background_color: '#1B2A5E',
    text_color: '#FFFFFF',
    animation: 'fade',
    animation_speed: 'normal',
    commission_percent: 0,
    is_active: true,
    position: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.link) {
      setError('Título e link são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (banner?.id) {
        await base44.entities.StoreBanner.update(banner.id, formData);
      } else {
        await base44.entities.StoreBanner.create(formData);
      }
      onSave();
    } catch (e) {
      setError('Erro ao salvar banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Título *</Label>
        <Input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Título do banner" />
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Descrição" rows={2} />
      </div>

      <div>
        <Label>Link *</Label>
        <Input value={formData.link} onChange={(e) => handleChange('link', e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <Label>URL da Imagem</Label>
        <Input value={formData.image_url} onChange={(e) => handleChange('image_url', e.target.value)} placeholder="https://..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cor de Fundo</Label>
          <div className="flex gap-2">
            <input type="color" value={formData.background_color} onChange={(e) => handleChange('background_color', e.target.value)} className="w-12 h-9 rounded cursor-pointer" />
            <Input value={formData.background_color} onChange={(e) => handleChange('background_color', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Cor do Texto</Label>
          <div className="flex gap-2">
            <input type="color" value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="w-12 h-9 rounded cursor-pointer" />
            <Input value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Animação</Label>
          <Select value={formData.animation} onValueChange={(value) => handleChange('animation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="pulse">Pulse</SelectItem>
              <SelectItem value="bounce">Bounce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Velocidade</Label>
          <Select value={formData.animation_speed} onValueChange={(value) => handleChange('animation_speed', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Lenta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="fast">Rápida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Comissão (%)</Label>
        <Input type="number" value={formData.commission_percent} onChange={(e) => handleChange('commission_percent', parseFloat(e.target.value))} min="0" max="100" />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </div>
  );
}