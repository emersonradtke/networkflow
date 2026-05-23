import { useOutletContext } from 'react-router-dom';
import ProfileDataSection from '@/components/ProfileDataSection';

export default function ProfileData() {
  const { associate } = useOutletContext() || {};

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto animate-fade-up">
      {associate ? (
        <ProfileDataSection associate={associate} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Carregando dados...
        </div>
      )}
    </div>
  );
}