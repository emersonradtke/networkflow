import { useOutletContext } from 'react-router-dom';
import BankDataSection from '@/components/BankDataSection';

export default function BankData() {
  const { associate } = useOutletContext();

  if (!associate) return null;

  return (
    <div className="max-w-xl mx-auto">
      <BankDataSection associate={associate} onUpdate={() => {}} />
    </div>
  );
}