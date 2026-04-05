import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, i) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: item.label,
      };
      if (item.href) {
        entry.item = item.href;
      }
      return entry;
    }),
  };
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const isLast = (i: number) => i === items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-slate-500 py-3 flex-wrap gap-y-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <ChevronRight className="h-3 w-3 mx-1.5 text-slate-600 shrink-0" />}
          {!isLast(i) && item.href ? (
            <a href={item.href} className="hover:text-slate-300 transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-300" aria-current={isLast(i) ? "page" : undefined}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
