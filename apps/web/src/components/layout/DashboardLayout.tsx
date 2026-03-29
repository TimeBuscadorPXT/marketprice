import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AiChatDrawer } from '@/components/shared/AiChatDrawer';
import { OnboardingModal } from '@/components/shared/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  title?: string;
}

export function DashboardLayout({ title = 'Dashboard' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const showOnboarding = !onboardingDismissed && user && !user.onboardingDone;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-60">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />

        <main className="px-4 py-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AiChatDrawer />

      <OnboardingModal
        open={!!showOnboarding}
        onClose={() => setOnboardingDismissed(true)}
      />
    </div>
  );
}
