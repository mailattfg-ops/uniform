'use client';

import { useParams } from 'next/navigation';
import CatalogManager from '../../_components/CatalogManager';
import DesignManager from '../../_components/DesignManager';

export default function InventoryPage() {
  const params = useParams();
  const type = params.type as 'fabrics' | 'buttons' | 'threads' | 'designs';

  if (type === 'designs') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <DesignManager />
      </div>
    );
  }

  const config = {
    fabrics: { title: 'Fabric Catalog', subtitle: 'Material Grade & Coding' },
    buttons: { title: 'Button Catalog', subtitle: 'Styles & Fastener Types' },
    threads: { title: 'Thread Catalog', subtitle: 'Color Codes & Tensile Strength' }
  };

  const current = config[type as keyof typeof config] || config.fabrics;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CatalogManager 
        type={type as any} 
        title={current.title} 
        subtitle={current.subtitle} 
      />
    </div>
  );
}
