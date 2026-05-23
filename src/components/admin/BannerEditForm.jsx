import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, X, Pipette } from 'lucide-react';

export default function BannerEditForm({ banner, onSave, onCancel }) {
  const [formData, setFormData] = useState(banner || {
    title: '',
    description: '',
    logo_url: '',
    link: '',
    image_url: '',
    background_color: '#1B2A5E',
    text_color: '#FFFFFF',
    animation: 'fade',
    animation_speed: 'normal',
    commission_percent: 0,
    auto_rotate_seconds: 5,
    is_active: true,
    position: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [eyedropperSupported] = useState(() => {
    return 'EyeDropper' in window;
  });

  const pickColor = async (field) => {
    if (!eyedropperSupported) {
      alert('Seu navegador não suporta captura de cores');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      handleChange(field, result.sRGBHex);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('Erro ao capturar cor:', err);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const url = res?.file_url || res?.data?.file_url;
      if (!url) {
        setError('Upload não retornou URL');
        return;
      }
      setFormData(prev => ({ ...prev, logo_url: url }));
    } catch (err) {
      setError('Erro ao fazer upload da logomarca: ' + (err?.message || ''));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
        <Label>Logomarca</Label>
        <div className="space-y-2">
          {formData.logo_url && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary">
              <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              <button type="button" onClick={() => handleChange('logo_url', '')} className="absolute top-1 right-1 bg-destructive text-white rounded p-0.5">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload size={16} />
              <span className="text-sm">{uploading ? 'Enviando...' : 'Selecionar logo'}</span>
            </label>
          </div>
        </div>
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
              {eyedropperSupported && (
                <Button size="icon" variant="outline" onClick={() => pickColor('background_color')} title="Capturar cor da tela">
                  <Pipette size={16} />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Cor do Texto</Label>
            <div className="flex gap-2">
              <input type="color" value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="w-12 h-9 rounded cursor-pointer" />
              <Input value={formData.text_color} onChange={(e) => handleChange('text_color', e.target.value)} />
              {eyedropperSupported && (
                <Button size="icon" variant="outline" onClick={() => pickColor('text_color')} title="Capturar cor da tela">
                  <Pipette size={16} />
                </Button>
              )}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Comissão (%)</Label>
          <Input type="number" value={formData.commission_percent} onChange={(e) => handleChange('commission_percent', parseFloat(e.target.value))} min="0" max="100" />
        </div>

        <div>
          <Label>Rotação Automática (segundos)</Label>
          <Input type="number" value={formData.auto_rotate_seconds} onChange={(e) => handleChange('auto_rotate_seconds', parseFloat(e.target.value))} min="0" step="1" />
          <p className="text-xs text-muted-foreground mt-1">0 = desabilitado</p>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </div>
  );
}