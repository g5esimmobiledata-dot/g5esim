// src/components/layouts/LayoutWrapper.tsx
import { ReactNode } from 'react';
import { EmptyLayout, PublicLayout } from './PublicLayout';
// import { PublicLayout } from "./PublicLayout";
// import { EmptyLayout } from "./EmptyLayout";

interface LayoutWrapperProps {
  children: ReactNode;
  layout?: 'public' | 'empty';
}

export function LayoutWrapper({ children, layout = 'public' }: LayoutWrapperProps) {
  switch (layout) {
    case 'public':
      return <PublicLayout>{children}</PublicLayout>;
    case 'empty':
      return <EmptyLayout>{children}</EmptyLayout>;
    default:
      return <PublicLayout>{children}</PublicLayout>;
  }
}
