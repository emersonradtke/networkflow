import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BankDataSection from '@/components/BankDataSection';

export default function BankData() {
  const { associate: outletAssociate } = useOutletContext();
  const [associate, setAssociate] = useState(null);

  const loadAssociate = async (src) => {
    if (!src) return;
    // Se já tem id, usa direto
    if (src.id) {
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
      // Fallback: usar o objeto original mesmo sem id
      setAssociate(src);
    }
  };

  useEffect(() => {
    loadAssociate(outletAssociate);
  }, [outletAssociate]);

  const handleUpdate = (savedData) => {
    // Atualiza o associate local com os dados recém salvos, sem ir ao banco
    if (savedData) {
      setAssociate(prev => ({ ...prev, ...savedData }));
    }
  };

  if (!associate) return null;

  return (
    <div className="max-w-xl mx-auto">
      <BankDataSection associate={associate} onUpdate={handleUpdate} />
    </div>
  );
}