import { useState } from 'react';
import ExternalLinksManager from '@/components/admin/ExternalLinksManager';
import DepositReconciliationPanel from '@/components/admin/DepositReconciliationPanel';
import { Link, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

      <Tabs defaultValue="intentions" className="w-full">
        <TabsList>
          <TabsTrigger value="intentions">Intenções de Compra</TabsTrigger>
          <TabsTrigger value="reconciliation">Conciliação de Depósitos</TabsTrigger>
        </TabsList>
        <TabsContent value="intentions">
          <ExternalLinksManager />
        </TabsContent>
        <TabsContent value="reconciliation">
          <DepositReconciliationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}