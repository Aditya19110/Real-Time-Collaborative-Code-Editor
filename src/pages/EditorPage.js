import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import axios from "axios";

// Icons (You might want to install react-icons or lucide-react, but I'll use SVGs for now to avoid new deps if possible, or just text/emoji if simple)
// Actually, let's use some simple SVG icons for buttons to make it look premium.

const SERVER_URL = process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://code-editor-backend-2h8c.onrender.com'
    : 'http://localhost:5002');

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile responsiveness

  // Refs for socket management
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const socketConnectionRef = useRef(null);
  const roomIdRef = useRef(roomId);
  const usernameRef = useRef(location.state?.username);
  const navigatorRef = useRef(reactNavigator);

  // Update refs on render
  useEffect(() => {
    roomIdRef.current = roomId;
    usernameRef.current = location.state?.username;
    navigatorRef.current = reactNavigator;
  }, [roomId, location.state?.username, reactNavigator]);

  // Initialization Effect
  useEffect(() => {
    if (!usernameRef.current) {
      toast.error("Username is required to join the room");
      navigatorRef.current("/");
      return;
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
        const username = usernameRef.current;
        socketRef.current = initSocket(SERVER_URL);
        
        const socket = socketRef.current;

        socket.on('connect', () => {
            setIsConnected(true);
            toast.success("Connected to server");
            socket.emit(ACTIONS.JOIN, { roomId: roomIdRef.current, username });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            toast.error("Disconnected from server");
        });

        socket.on('connect_error', (err) => {
             setIsConnected(false);
             toast.error("Connection failed");
             console.error(err);
        });

        socket.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
            setClients(clients);
            if (joinedUser !== username) {
                toast.success(`${joinedUser} joined`);
            }
            // Sync code if I am the one with code
            if (codeRef.current && socketId !== socket.id) {
                 socket.emit(ACTIONS.SYNC_CODE, { code: codeRef.current, socketId });
            }
        });

        socket.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUser }) => {
            toast.success(`${leftUser} left`);
            setClients((prev) => prev.filter((c) => c.socketId !== socketId));
        });

        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
            if (code !== null) {
                codeRef.current = code;
                setCode(code);
            }
        });
    };

    init();

    return () => {
        isInitializedRef.current = false;
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        }
    }
  }, []);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied");
    } catch (err) {
      toast.error("Failed to copy");
    }
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    reactNavigator("/");
  }, [reactNavigator]);

  const runCode = useCallback(async () => {
    if (!codeRef.current.trim()) return;
    setIsRunning(true);
    try {
      const { data } = await axios.post(`${SERVER_URL}/execute`, {
        code: codeRef.current,
      });
      setOutput(data.output || "Executed successfully");
      toast.success("Executed!");
    } catch (err) {
      setOutput(err?.response?.data?.error || err.message || "Error");
      toast.error("Execution failed");
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleCodeChange = useCallback((newCode) => {
      codeRef.current = newCode;
      setCode(newCode); // Update local state
      // Socket emission is handled inside Editor component or here? 
      // Original code had debounced emission in Editor.js, let's keep it there or move it here.
      // But Editor.js needs to emit.
      // Wait, original code passed `debouncedCodeChange` to Editor.
  }, []);

  // Pass a wrapper that doesn't debounce here, but updates ref.
  // The Editor component handles the socket emission.
  
  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-900 text-white overflow-hidden">
      
      {/* Mobile Header / Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
            <img src="/code-together.png" alt="Logo" className="w-8 h-8 rounded-md" />
            <span className="font-bold text-lg">CodeTogether</span>
        </div>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition"
        >
            {isSidebarOpen ? '✖' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 bg-gray-800 border-r border-gray-700 z-20 absolute md:relative h-full transition-all duration-300 shadow-xl`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
             <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                <img src="/code-together.png" alt="Logo" className="w-6 h-6" />
             </div>
             <div>
                 <h2 className="font-bold text-lg leading-tight">CodeTogether</h2>
                 <div className="flex items-center gap-2 mt-1">
                     <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                     <span className="text-xs text-gray-400">{isConnected ? 'Online' : 'Offline'}</span>
                 </div>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Active Users ({clients.length})</h3>
            <div className="flex flex-wrap gap-3">
                {clients.map((client) => (
                    <Client key={client.socketId} username={client.username} />
                ))}
            </div>
        </div>

        <div className="p-4 border-t border-gray-700 space-y-3">
            <button onClick={copyRoomId} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-all group">
                <span className="text-gray-300 group-hover:text-white">Copy Room ID</span>
            </button>
            <button onClick={leaveRoom} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-all">
                Leave Room
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
         {/* Toolbar */}
         <div className="h-14 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4">
             <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <span className="px-3 py-1 bg-gray-700/50 rounded text-sm text-gray-300 border border-gray-600">
                    main.py
                </span>
             </div>
             
             <div className="flex items-center gap-4">
                <button 
                    onClick={runCode} 
                    disabled={isRunning}
                    className={`flex items-center gap-2 px-6 py-1.5 rounded-full font-bold text-sm transition-all shadow-lg shadow-green-900/20
                        ${isRunning 
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white hover:shadow-green-500/25'
                        }`}
                >
                    {isRunning ? (
                         <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Running...</span>
                         </>
                    ) : (
                        <>
                           <span>▶ Run</span>
                        </>
                    )}
                </button>
             </div>
         </div>

         {/* Editor & Output Split */}
         <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
             
             {/* Code Editor Area */}
             <div className="flex-1 h-full relative overflow-hidden">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    code={code}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                        setCode(code);
                    }}
                />
             </div>

             {/* Output Area */}
             <div className="h-1/3 lg:h-full lg:w-1/3 bg-black border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col shadow-2xl z-10">
                 <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Terminal Output</span>
                     <button onClick={() => setOutput("")} className="text-xs text-gray-500 hover:text-gray-300 underline">Clear</button>
                 </div>
                 <pre className="flex-1 p-4 font-mono text-sm text-green-400 overflow-auto whitespace-pre-wrap custom-scrollbar">
                     {output || <span className="text-gray-600 italic">Example: Click 'Run' to see output here...</span>}
                 </pre>
             </div>
         </div>
      </main>
    </div>
  );
};

export default EditorPage;