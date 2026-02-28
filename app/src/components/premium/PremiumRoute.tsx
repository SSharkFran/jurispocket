import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasFeatureAccess } from '@/lib/plans';
import type { PremiumFeatureKey } from '@/lib/plans';
import { FeatureLockedPage } from './FeatureLockedPage';

interface PremiumRouteProps {
  feature: PremiumFeatureKey;
  children: ReactNode;
}

export function PremiumRoute({ feature, children }: PremiumRouteProps) {
  const { user, workspace, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const canAccess = hasFeatureAccess(workspace?.plano, feature, user?.role);
  if (canAccess) {
    return <>{children}</>;
  }

  return (
    <FeatureLockedPage
      feature={feature}
      currentPlan={workspace?.plano}
      userName={user?.nome}
      workspaceName={workspace?.nome}
    />
  );
}
