import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import { Toaster } from 'react-hot-toast';

function App() {
  const toastOptions = {
    success: {
      style: {
        background: '#4CAF50',  
        color: '#fff',           
      },
      iconTheme: {
        primary: '#4CAF50',      
        secondary: '#fff',      
      },
    },
  };
  return (
    <>
    <div>
        <Toaster position="top-right" toastOptions={toastOptions} />
    </div>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
