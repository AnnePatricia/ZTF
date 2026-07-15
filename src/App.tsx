// src/App.tsx
import { useState, useEffect } from "react";
import Login from "./components/Login/Login";
import ZtfDashboard from "./components/Dashboard/ZtfDashboard";
import Documents from "./components/Documents/Documents";
import ZtfPipeline from "./components/Workflow/ZtfPipeline";
import Users from "./components/Users/Users";
import ZtfReports from "./components/Reports/ZtfReports";
import Transcription from "./components/Transcription/Transcription";
import SCDashboard from "./components/superCorrection/SCDashboard";
import Footer from "./components/common/Footer";
import Header from "./components/common/Header";
import TabNavigation from "./components/common/TabNavigation";
import MediaLibrary from './components/MediaLibrary/MediaLibrary';
import { useAuth } from "./hooks/useAuth";
import { useRoles } from "./hooks/useRoles";
import { checkPermission, isAdmin, isChef, getUserDepartment } from './utils/permissions';
import { AIContextProvider } from './context/AIContext';
import AIWidget from './components/ia/AIWidget';
import AIPanel from './components/ia/AIPanel';
import { QueryProvider } from './providers/QueryProvider';
import { AppStateProvider } from "./context/AppStateContext";
import D4Workspace from "./components/departments/D4/D4Workspace";
// import ZtfPipeline from "./components/Workflow/ZtfPipeline";


interface TabConfig {
  key: string;
  label: string;
  requiredPermission: string | null;
  showForAdmin?: boolean;
  showForChef?: boolean;
}

const TABS: TabConfig[] = [
  { key: "dashboard", label: "Tableau de bord", requiredPermission: null, showForAdmin: true, showForChef: true },
  { key: "documents", label: "Documents", requiredPermission: "create_import", showForAdmin: true, showForChef: true },
  { key: "workflow", label: "Workflow", requiredPermission: "view_all_books", showForAdmin: true },
  { key: "super-correction", label: "Super Correction", requiredPermission: null, showForAdmin: true },
  { key: "reports", label: "Rapports", requiredPermission: "view_reports", showForAdmin: true, showForChef: true },
  { key: "transcription", label: "Transcription", requiredPermission: "modify_file", showForAdmin: true },
  { key: "users", label: "Utilisateurs", requiredPermission: "manage_users", showForAdmin: true },
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentView, setCurrentView] = useState<'documents' | 'media-library'>('documents');
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentUser: ztfUser, loading: rolesLoading } = useRoles();

  // ✅ Forcer le re-render quand l'utilisateur change
  const [userKey, setUserKey] = useState(0);

  useEffect(() => {
    // Quand l'utilisateur change (connexion/déconnexion), incrémenter la clé
    setUserKey(prev => prev + 1);
    setActiveTab("dashboard");
    setCurrentView('documents');
  }, [user?.id]); // ✅ Dépend de l'ID de l'utilisateur

  const loading = authLoading || rolesLoading;
  const userDepartment = getUserDepartment(ztfUser);
  const userIsAdmin = ztfUser ? isAdmin(ztfUser.role) : false;
  const userIsChef = ztfUser ? isChef(ztfUser.role) : false;

  const visibleTabs = TABS.filter(tab => {
    if (!ztfUser) return false;
    if (userIsAdmin && tab.showForAdmin) return true;
    if (userIsChef && userDepartment) {
      if (tab.key === 'dashboard') return true;
      if (tab.key === 'documents') return true;
      if (tab.key === 'reports') return true;
      return false;
    }
    if (tab.key === 'dashboard') return true;
    if (tab.key === 'documents' && tab.requiredPermission) {
      return checkPermission(ztfUser.role, tab.requiredPermission as any);
    }
    return false;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <ZtfDashboard />;
      case "documents":
        return currentView === 'documents' ? (
          <Documents userDepartment={userDepartment} userIsAdmin={userIsAdmin} />
        ) : (
          <MediaLibrary />
        );
      case "editorialization":
        return <D4Workspace />;
      case "workflow":
        return <ZtfPipeline />;
      case "super-correction":
        if (!userIsAdmin) {
          return (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-lock text-5xl mb-4"></i>
              <p className="text-lg">Accès réservé aux administrateurs</p>
            </div>
          );
        }
        return <SCDashboard />;
      case "reports":
        return <ZtfReports />;
      case "transcription":
        return <Transcription />;
      case "users":
        if (!userIsAdmin) {
          return (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-lock text-5xl mb-4"></i>
              <p className="text-lg">Accès réservé aux administrateurs</p>
            </div>
          );
        }
        return <Users />;
      default:
        return null;
    }
  };

  const handleLoginSuccess = () => { };

  const handleLogout = async () => {
    try {
      await signOut();
      // ✅ Réinitialiser l'état local
      setActiveTab("dashboard");
      setCurrentView('documents');
    } catch (err: any) {
      console.error('❌ Erreur lors de la déconnexion:', err);
      alert('❌ Erreur lors de la déconnexion');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-5xl text-primary mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ✅ Utiliser userKey pour forcer le re-render complet
  return (
    <QueryProvider key={userKey}>
      <AppStateProvider>
        <AIContextProvider>
          <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header
              onLogout={handleLogout}
              user={ztfUser}
              isAdmin={userIsAdmin}
              isChef={userIsChef}
              department={userDepartment}
            />
            <main className="flex-1 container mx-auto px-4 py-6">
              <TabNavigation
                tabs={visibleTabs.map((t) => t.label)}
                activeTab={visibleTabs.find((t) => t.key === activeTab)?.label || ""}
                onTabChange={(label) => {
                  const found = visibleTabs.find((t) => t.label === label);
                  if (found) {
                    setActiveTab(found.key);
                    setCurrentView('documents');
                  }
                }}
              />
              <div className="mt-6">{renderTabContent()}</div>
            </main>
            <Footer />
            <AIWidget />
            <AIPanel />
          </div>
        </AIContextProvider>
      </AppStateProvider>
    </QueryProvider>
  );
}

export default App;