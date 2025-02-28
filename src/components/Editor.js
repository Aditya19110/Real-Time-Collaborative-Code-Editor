import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/python/python";  // Import Python mode
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import { debounce } from 'lodash'; // Import debounce from lodash
import ACTIONS from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange, code }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    // Initialize the editor only once
    if (!editorRef.current) {
      editorRef.current = Codemirror.fromTextArea(document.getElementById('realtimeEditor'), {
        mode: 'python', // Set Python as the mode
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        theme: 'dracula',
        placeholder: 'Start typing your Python code here...',
        indentUnit: 4,  // Set Python's standard indentation to 4 spaces
        smartIndent: true,  // Auto-indent when pressing tab
        tabSize: 4,  // Tab size for Python
      });
    }

    // Debounced emit function to optimize socket emission
    const emitCodeChange = debounce((code) => {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
    }, 300); // Debounce interval can be adjusted

    // Listen for changes in the editor
    editorRef.current.on('change', (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      onCodeChange(code);

      // Emit the code change if the change isn't from a remote setValue
      if (origin !== 'setValue') {
        emitCodeChange(code);
      }
    });

    // Clean up the editor and event listeners on unmount
    return () => {
      emitCodeChange.cancel(); // Clean up debounce function
      if (editorRef.current) {
        editorRef.current.toTextArea(); // Properly clean up CodeMirror instance
        editorRef.current = null; // Reset reference
      }
    };
  }, [socketRef, roomId, onCodeChange]); // Dependencies for this effect

  useEffect(() => {
    if (editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code); // Update the editor's value if the prop 'code' changes
    }
  }, [code]); // React on 'code' prop change

  useEffect(() => {
    if (socketRef.current) {
      // Handle incoming code changes from other clients
      const handleCodeChange = ({ code }) => {
        if (code !== null && code !== editorRef.current.getValue()) {
          editorRef.current.setValue(code); // Update editor with new code from another client
        }
      };

      socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);

      // Clean up listener on unmount
      return () => {
        socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange); // Cleanup on unmount
      };
    }
  }, [socketRef]); // Dependencies for this effect

  return <textarea id="realtimeEditor" />;
};

export default Editor;