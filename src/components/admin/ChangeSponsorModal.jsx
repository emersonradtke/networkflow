import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChangeSponsorModal({ associate, onClose, onSuccess }) {
  const [associates, setAssociates] = useState([]);
  const [selected, setSelected] = useState(null); // null = sem patrocinador
  const [noSponsor, setNoSponsor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Associate.filter({ status: 'active' }).then(list => {
      // Excluir o próprio associado da lista
      setAssociates(list.filter(a => a.id !== associate.id));
    });
  }, [associate.id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const resp = await base44.functions.invoke('reorganizeNetwork', {
        action: 'change_sponsor',
        associate_id: associate.id,
        new_sponsor_id: noSponsor ? null : selected?.id || null,
      });
      if (resp.data?.error) { setError(resp.data.error); setSaving(false); return; }
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const currentSponsor = associates.find(a => a.id === associate.sponsor_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar Patrocinador</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">Associado</p>
            <p className="font-semibold text-sm">{associate.full_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Patrocinador atual: <span className="text-foreground font-medium">{currentSponsor?.full_name || associate.sponsor_name || '—'}</span>
            </p>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-2">
            <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">Ao trocar o patrocinador, os níveis de toda a descendência serão recalculados automaticamente.</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="noSponsor" checked={noSponsor}
                onChange={e => { setNoSponsor(e.target.checked); setSelected(null); }}
                className="rounded" />
              <label htmlFor="noSponsor" className="text-sm cursor-pointer">Sem patrocinador (raiz da rede)</label>
            </div>
          </div>

          {!noSponsor && (
            <div className="border rounded-xl overflow-hidden">
              <Command>
                <CommandInput placeholder="Buscar associado..." />
                <CommandList className="max-h-52">
                  <CommandEmpty>Nenhum associado encontrado.</CommandEmpty>
                  <CommandGroup>
                    {associates.map(a => (
                      <CommandItem key={a.id} value={a.full_name}
                        onSelect={() => setSelected(a)}
                        className="text-sm cursor-pointer">
                        <Check size={14} className={cn('mr-2 shrink-0', selected?.id === a.id ? 'opacity-100 text-primary' : 'opacity-0')} />
                        <div>
                          <span className="font-medium">{a.full_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">Nível {a.level_in_network || 1}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}

          {selected && !noSponsor && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              Novo patrocinador: <span className="font-semibold text-blue-800">{selected.full_name}</span>
              <span className="text-xs text-blue-600 ml-2">(Nível {selected.level_in_network || 1} → {associate.full_name} ficará no nível {(selected.level_in_network || 1) + 1})</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || (!noSponsor && !selected)} className="font-bold">
              {saving ? 'Salvando...' : 'Confirmar Troca'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}