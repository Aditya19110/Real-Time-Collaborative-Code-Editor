import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import './styles/themes.css';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const toastOptions = {
    success: {
      style: {
        background: 'var(--accent-success)',  
        color: 'var(--text-inverse)',           
      },
      iconTheme: {
        primary: 'var(--accent-success)',      
        secondary: 'var(--text-inverse)',      
      },
    },
    error: {
      style: {
        background: 'var(--accent-error)',
        color: 'var(--text-inverse)',
      },
      iconTheme: {
        primary: 'var(--accent-error)',
        secondary: 'var(--text-inverse)',
      },
    },
  };
  
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div>
          <Toaster position="top-right" toastOptions={toastOptions} />
        </div>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor/:roomId" element={<EditorPage />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
