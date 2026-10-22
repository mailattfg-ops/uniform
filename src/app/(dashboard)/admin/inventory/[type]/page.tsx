'use client';

import { useParams } from 'next/navigation';
import CatalogManager from '../../_components/CatalogManager';

export default function InventoryPage() {
  const params = useParams();
  const rawType = params?.type;
  const type = (typeof rawType === 'string' ? rawType : 'fabrics') as 'fabrics' | 'buttons' | 'threads';

  const config: Record<'fabrics' | 'buttons' | 'threads', { title: string; subtitle: string }> = {
    fabrics: { title: 'Fabric Catalog', subtitle: 'Material Grade & Coding' },
    buttons: { title: 'Button Catalog', subtitle: 'Styles & Fastener Types' },
    threads: { title: 'Thread Catalog', subtitle: 'Color Codes & Tensile Strength' }
  };

  const current = config[type] || config.fabrics;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CatalogManager 
        type={type} 
        title={current.title} 
        subtitle={current.subtitle} 
      />
    </div>
  );
}
