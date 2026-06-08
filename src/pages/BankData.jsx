import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BankDataSection from '@/components/BankDataSection';

export default function BankData() {
  const [associate, setAssociate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssociate();
  }, []);

  const loadAssociate = async () => {
    setLoading(true);
    try {
      // DirectUser legado
      const directUserData = sessionStorage.getItem('directUser');
      if (directUserData) {
        const directUser = JSON.parse(directUserData);
        const src = directUser._associate;
        if (src) {
          let found = [];
          if (src.id) found = await base44.entities.Associate.filter({ id: src.id });
          if (!found.length && src.cpf) found = await base44.entities.Associate.filter({ cpf: src.cpf });
          if (!found.length && src.email) found = await base44.entities.Associate.filter({ email: src.email });
          if (found.length > 0) { setAssociate(found[0]); return; }
          setAssociate(src);
          return;
        }
      }

      // Usuário Base44 nativo
      const me = await base44.auth.me();
      if (me) {
        const found = await base44.entities.Associate.filter({ user_id: me.id });
        if (found.length > 0) setAssociate(found[0]);
      }
    } catch (e) {
      console.error('loadAssociate error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (savedData) => {
    if (!savedData) return;
    // Atualiza estado local imediatamente para feedback visual
    setAssociate(prev => ({ ...prev, ...savedData }));
    // Atualiza sessionStorage para DirectUser legado
    const raw = sessionStorage.getItem('directUser');
    if (raw) {
      const du = JSON.parse(raw);
      if (du._associate) {
        du._associate = { ...du._associate, ...savedData };
        sessionStorage.setItem('directUser', JSON.stringify(du));
      }
    }
    // Recarrega do banco para garantir persistência real
    loadAssociate();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!associate) return (
    <div className="text-center py-20 text-muted-foreground">Cadastro não encontrado.</div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <BankDataSection associate={associate} onUpdate={handleUpdate} />
    </div>
  );
}