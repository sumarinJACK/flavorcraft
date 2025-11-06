"use client";

import { useState, useEffect, ReactNode } from 'react';

interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * NoSSR Component - Prevents hydration mismatch by only rendering children on client-side
 * Use this for components that have client-specific behavior that can't be made isomorphic
 */
export default function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of NoSSR
 */
export function withNoSSR<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  const NoSSRComponent = (props: T) => (
    <NoSSR fallback={fallback}>
      <Component {...props} />
    </NoSSR>
  );
  
  NoSSRComponent.displayName = `withNoSSR(${Component.displayName || Component.name})`;
  
  return NoSSRComponent;
}