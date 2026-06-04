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
    if (!savedData) return;
    // Atualiza o associate local
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