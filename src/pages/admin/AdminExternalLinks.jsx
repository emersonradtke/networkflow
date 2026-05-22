import { useState } from 'react';
import ExternalLinksManager from '@/components/admin/ExternalLinksManager';
import { Link } from 'lucide-react';

export default function AdminExternalLinks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Link size={28} className="text-primary" />
          Cliques em Links Externos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie compras confirmadas de produtos de link externo e banners</p>
      </div>

      <ExternalLinksManager />
    </div>
  );
}