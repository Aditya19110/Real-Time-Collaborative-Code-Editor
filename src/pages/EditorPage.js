import React, { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import debounce from "lodash.debounce";

const socket = io('http://localhost:5002');

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [username, setUsername] = useState(location.state?.username || '');
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!username) {
      toast.error("Username is required to join the room");
      reactNavigator("/");
      return;
    }

    const init = async () => {
      try {
        socketRef.current = await initSocket();
        socketRef.current.on("connect_error", handleErrors);
        socketRef.current.on("connect_failed", handleErrors);

        function handleErrors(e) {
          console.log("Socket error:", e);
          toast.error("Socket connection failed, try again later");
          reactNavigator("/");
        }

        socketRef.current.emit(ACTIONS.JOIN, { roomId, username });

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the Room`);
            console.log(`${username} Joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          codeRef.current = code;
          setCode(code);
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });
      } catch (error) {
        console.error("Socket initialization failed:", error);
        toast.error("Socket connection failed, try again later");
        reactNavigator("/");
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
      }
    };
  }, [roomId, username, reactNavigator]);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy Room ID:", err);
      toast.error("Failed to copy Room ID");
    }
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    reactNavigator("/");
    toast.success("Left the room");
  }, [reactNavigator]);

  const runCode = useCallback(async () => {
    if (!codeRef.current) {
      toast.error("No code to execute");
      return;
    }

    try {
      const { data } = await axios.post("http://localhost:5002/execute", {
        code: codeRef.current,
      });
      setOutput(data.output);
      toast.success("Code executed successfully");
    } catch (err) {
      console.error("Code execution failed:", err);
      setOutput(err?.response?.data?.error || "Code execution failed");
      toast.error("Code execution failed");
    }
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
        codeRef.current = e.target.result;
        socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: e.target.result });
      };
      reader.readAsText(file);
    }
  }, [roomId]);

  const saveCodeToFile = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "code.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [code]);

  const debouncedCodeChange = useCallback(
    debounce((newCode) => {
      setCode(newCode);
      codeRef.current = newCode;
      socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: newCode });
    }, 300),
    [roomId]
  );

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImg" src="/code-together.png" alt="Logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>Copy Room Id</button>
        <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
        <button className="btn runBtn" onClick={runCode}>Run Code</button>
        <input type="file" onChange={handleFileUpload} />
        <button className="btn saveBtn" onClick={saveCodeToFile}>Save Code</button>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          code={code}
          onCodeChange={debouncedCodeChange}
        />
      </div>
      <div className="outputWrap">
        <h3>Output:</h3>
        <pre className="output">{output || "No output yet"}</pre>
      </div>
    </div>
  );
};

export default EditorPage;
