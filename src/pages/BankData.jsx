import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BankDataSection from '@/components/BankDataSection';

export default function BankData() {
  const { associate: outletAssociate } = useOutletContext();
  const [associate, setAssociate] = useState(outletAssociate);

  // Se o associate do outlet não tem id (DirectUser legado), buscar pelo CPF
  useEffect(() => {
    if (outletAssociate && !outletAssociate.id && outletAssociate.cpf) {
      base44.entities.Associate.filter({ cpf: outletAssociate.cpf }).then(res => {
        if (res.length > 0) setAssociate(res[0]);
      });
    } else {
      setAssociate(outletAssociate);
    }
  }, [outletAssociate]);

  if (!associate) return null;

  return (
    <div className="max-w-xl mx-auto">
      <BankDataSection associate={associate} onUpdate={() => {}} />
    </div>
  );
}