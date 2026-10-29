import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BomUploadPage } from './pages/BomUploadPage';
import { CataloguePage } from './pages/CataloguePage';
import { AlternativeFinderPage } from './pages/AlternativeFinderPage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { IndianSellersPage } from './pages/IndianSellersPage';
import { api } from './api/client';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [workspaceName, setWorkspaceName] = useState('Bharat Industrial & Embedded Systems');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Cross-page navigation parameters
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined);
  const [selectedBomId, setSelectedBomId] = useState<string | undefined>(undefined);
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState<string>('');
  const [selectedSellerPartNumber, setSelectedSellerPartNumber] = useState<string | undefined>(undefined);

  const loadWorkspaceMeta = async () => {
    try {
      const s = await api.getSettings();
      if (s?.workspace_name) {
        setWorkspaceName(s.workspace_name);
      }
    } catch (err) {
      console.warn('Could not load workspace settings:', err);
    }
  };

  useEffect(() => {
    loadWorkspaceMeta();
  }, []);

  const handleNavigate = (page: PageId, extraId?: string) => {
    if (page === 'alternatives' || page === 'simulator') {
      if (extraId) setSelectedComponentId(extraId);
    } else if (page === 'risk' || page === 'boms') {
      if (extraId) setSelectedBomId(extraId);
    } else if (page === 'sellers') {
      setSelectedSellerPartNumber(extraId);
    } else if (page === 'catalogue') {
      if (extraId) setCatalogueSearchQuery(extraId);
      else setCatalogueSearchQuery('');
    }

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset workspace to baseline demo dataset? This will restore clean synthetic demo BOMs and components.')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.resetDemoWorkspace();
      alert('Workspace reset to synthetic baseline dataset.');
      await loadWorkspaceMeta();
      // Reload if on dashboard to refresh metrics
      if (currentPage === 'dashboard') {
        window.location.reload();
      }
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F3] flex text-[#18232D] font-sans antialiased">
      {/* Precision Industrial Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={handleNavigate}
        isOpenMobile={isOpenMobile}
        onToggleMobile={() => setIsOpenMobile(!isOpenMobile)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[232px] min-w-0">
        <Header
          currentPage={currentPage}
          workspaceName={workspaceName}
          onNavigate={handleNavigate}
          onToggleMobileNav={() => setIsOpenMobile(!isOpenMobile)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto space-y-4">
          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'boms' && (
            <BomUploadPage
              initialBomId={selectedBomId}
              onNavigateToAlternatives={(compId) => handleNavigate('alternatives', compId)}
              onNavigateToSimulator={(compId) => handleNavigate('simulator', compId)}
              onNavigateToSellers={(partNumber) => handleNavigate('sellers', partNumber)}
            />
          )}

          {currentPage === 'sellers' && (
            <IndianSellersPage
              initialPartNumber={selectedSellerPartNumber}
              onNavigateToAlternatives={(compId) => handleNavigate('alternatives', compId)}
              onNavigateToBoms={(bomId) => handleNavigate('boms', bomId)}
            />
          )}

          {currentPage === 'catalogue' && (
            <CataloguePage
              key={catalogueSearchQuery}
              initialSearchQuery={catalogueSearchQuery}
              onSelectAlternative={(comp) => handleNavigate('alternatives', comp.id)}
              onSimulateOutage={(comp) => handleNavigate('simulator', comp.id)}
            />
          )}

          {currentPage === 'alternatives' && (
            <AlternativeFinderPage
              key={selectedComponentId}
              initialComponentId={selectedComponentId}
            />
          )}

          {currentPage === 'simulator' && (
            <SimulatorPage
              key={selectedComponentId}
              initialComponentId={selectedComponentId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsPage />
          )}

          {currentPage === 'data-sources' && (
            <DataSourcesPage />
          )}

          {currentPage === 'settings' && (
            <SettingsPage onResetSuccess={loadWorkspaceMeta} />
          )}

          {currentPage === 'risk' && (
            <RiskAnalysisPage
              onSimulate={(compId) => handleNavigate('simulator', compId)}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
