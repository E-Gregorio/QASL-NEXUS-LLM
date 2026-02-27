import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { NewHUPage } from './pages/NewHUPage';
import { ExistingProjectPage } from './pages/ExistingProjectPage';
import { ExploratoryAIPage } from './pages/ExploratoryAIPage';
import { PipelineLivePage } from './pages/PipelineLivePage';
import { ResultsPage } from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/new-hu" element={<NewHUPage />} />
            <Route path="/existing" element={<ExistingProjectPage />} />
            <Route path="/exploratory" element={<ExploratoryAIPage />} />
            <Route path="/pipeline" element={<PipelineLivePage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
