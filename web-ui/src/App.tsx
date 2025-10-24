import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Network, TreePine, List, AlertTriangle, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import DependencyGraphView from './components/DependencyGraphView';
import HierarchyTreeView from './components/HierarchyTreeView';
import BacklogListView from './components/BacklogListView';
import StoryDetailView from './components/StoryDetailView';
import ProjectSelector from './components/ProjectSelector';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize selectedProjectId from URL immediately
  const getProjectIdFromPath = (pathname: string): number | null => {
    const match = pathname.match(/^\/project\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() =>
    getProjectIdFromPath(location.pathname)
  );
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [checkingApi, setCheckingApi] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Update selectedProjectId when URL changes
  useEffect(() => {
    const projectId = getProjectIdFromPath(location.pathname);
    setSelectedProjectId(projectId);
  }, [location.pathname]);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('/api/health');
        setApiConnected(response.ok);
      } catch (error) {
        setApiConnected(false);
      } finally {
        setCheckingApi(false);
      }
    };

    checkApiHealth();
    // Check API health every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Navigate to project when selection changes
  const handleProjectChange = (projectId: number | null) => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    } else {
      navigate('/');
    }
  };

  const getNavItems = () => {
    const basePrefix = selectedProjectId ? `/project/${selectedProjectId}` : '';
    return [
      { path: basePrefix || '/', icon: List, label: 'Backlog List' },
      { path: `${basePrefix}/dag`, icon: Network, label: 'Dependency Graph' },
      { path: `${basePrefix}/tree`, icon: TreePine, label: 'Hierarchy Tree' },
    ];
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      {/* API Error Banner */}
      {!checkingApi && !apiConnected && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} />
            <div>
              <p className="font-semibold">API Server Not Running</p>
              <p className="text-sm text-red-100">
                Please start the API server: <code className="bg-red-700 px-2 py-0.5 rounded">npm run dev:server</code> in the web-ui directory
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden w-full">
        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav className={`
          w-64 bg-white shadow-lg flex flex-col
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
        <div className="p-6 relative">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 md:hidden"
            aria-label="Close menu"
          >
            <X size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Agile Backlog</h1>
          <p className="text-sm text-gray-500 mt-1">Dependency Visualization</p>
        </div>

        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
        />

        <ul className="space-y-1 px-3 mt-4">
          {getNavItems().map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <Link
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === path
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="text-xs text-gray-500">
            <p className="font-medium">Legend</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span>Todo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Review</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Done</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Blocked</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

        {/* Floating menu button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-30 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        {/* Main content */}
        <main className="flex-1 overflow-hidden w-full min-w-0">
          <Routes>
            <Route path="/" element={<BacklogListView projectId={null} />} />
            <Route path="/project/:projectId" element={<BacklogListView />} />
            <Route path="/project/:projectId/story/:storyId" element={<StoryDetailView />} />
            <Route path="/project/:projectId/dag" element={<DependencyGraphView />} />
            <Route path="/project/:projectId/tree" element={<HierarchyTreeView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
