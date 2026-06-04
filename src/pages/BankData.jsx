import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BankDataSection from '@/components/BankDataSection';

export default function BankData() {
  const { associate: outletAssociate } = useOutletContext();
  const [associate, setAssociate] = useState(null);

  // Sempre busca o associate fresco do banco ao montar ou quando outletAssociate muda
  const loadAssociate = async (src) => {
    if (!src) return;
    try {
      // Se tem id, busca direto pelo id para ter dados sempre atualizados
      if (src.id) {
        const fresh = await base44.entities.Associate.filter({ id: src.id });
        if (fresh.length > 0) { setAssociate(fresh[0]); return; }
        setAssociate(src);
        return;
      }
      // DirectUser legado: buscar por CPF ou email
      let found = [];
      if (src.cpf) found = await base44.entities.Associate.filter({ cpf: src.cpf });
      if (!found.length && src.email) found = await base44.entities.Associate.filter({ email: src.email });
      if (found.length > 0) {
        setAssociate(found[0]);
      } else {
        setAssociate(src);
      }
    } catch {
      setAssociate(src);
    }
  };

  useEffect(() => {
    loadAssociate(outletAssociate);
  }, [outletAssociate]);

  const handleUpdate = (savedData) => {
    if (!savedData) return;
    // Atualiza o associate local com os dados salvos
    setAssociate(prev => ({ ...prev, ...savedData }));
    // Atualiza o sessionStorage para DirectUser legado
    const directUserData = sessionStorage.getItem('directUser');
    if (directUserData) {
      const directUser = JSON.parse(directUserData);
      if (directUser._associate) {
        directUser._associate = { ...directUser._associate, ...savedData };
        sessionStorage.setItem('directUser', JSON.stringify(directUser));
      }
    }
  };

  if (!associate) return null;

  return (
    <div className="max-w-xl mx-auto">
      <BankDataSection associate={associate} onUpdate={handleUpdate} />
    </div>
  );
}