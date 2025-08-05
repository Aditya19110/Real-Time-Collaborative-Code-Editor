import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/python/python";  // Import Python mode
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import "./EditorTheme.css"; // Import custom theme
import debounce from 'lodash.debounce'; // Import debounce from lodash.debounce
import ACTIONS from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange, code }) => {
  const editorRef = useRef(null);
  const emitCodeChangeRef = useRef(null);

  useEffect(() => {
    // Initialize the editor only once
    if (!editorRef.current) {
      editorRef.current = Codemirror.fromTextArea(document.getElementById('realtimeEditor'), {
        mode: 'python', // Set Python as the mode
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        theme: 'modern', // Use our custom theme
        placeholder: `# Welcome to CodeTogether! 🚀
# Start typing your Python code here...
# Your changes will be synced in real-time with other users!

# Example: Try this simple Python program
def greet(name):
    return f"Hello, {name}! Welcome to collaborative coding!"

# Run this code to see the output
name = input("Enter your name: ")
print(greet(name))

# Feel free to modify this code or write your own!`,
        indentUnit: 4,  // Set Python's standard indentation to 4 spaces
        smartIndent: true,  // Auto-indent when pressing tab
        tabSize: 4,  // Tab size for Python
        lineWrapping: true, // Enable line wrapping
        matchBrackets: true, // Highlight matching brackets
        showCursorWhenSelecting: true, // Show cursor when selecting
        extraKeys: {
          "Ctrl-Space": "autocomplete", // Enable autocomplete
          "Tab": function(cm) {
            // Custom tab behavior for better Python indentation
            if (cm.getSelection()) {
              cm.indentSelection("add");
            } else {
              cm.replaceSelection("    ", "end");
            }
          }
        }
      });

      // Create debounced function
      emitCodeChangeRef.current = debounce((code) => {
        if (socketRef.current) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
        }
      }, 300);

      // Listen for changes in the editor
      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);

        // Emit the code change if the change isn't from a remote setValue
        if (origin !== 'setValue') {
          emitCodeChangeRef.current(code);
        }
      });
    }

    // Clean up the editor and event listeners on unmount
    return () => {
      if (emitCodeChangeRef.current) {
        emitCodeChangeRef.current.cancel(); // Clean up debounce function
        emitCodeChangeRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.toTextArea(); // Properly clean up CodeMirror instance
        editorRef.current = null; // Reset reference
      }
    };
  }, [socketRef, roomId, onCodeChange]); // Dependencies for this effect

  useEffect(() => {
    if (editorRef.current && code !== editorRef.current.getValue()) {
      const currentCursor = editorRef.current.getCursor();
      editorRef.current.setValue(code);
      // Restore cursor position to prevent jumping
      editorRef.current.setCursor(currentCursor);
    }
  }, [code]); // React on 'code' prop change

  useEffect(() => {
    if (socketRef.current) {
      const socket = socketRef.current; // Copy to variable for cleanup
      
      // Handle incoming code changes from other clients
      const handleCodeChange = ({ code }) => {
        if (code !== null && editorRef.current && code !== editorRef.current.getValue()) {
          const currentCursor = editorRef.current.getCursor();
          editorRef.current.setValue(code);
          // Restore cursor position to prevent jumping
          editorRef.current.setCursor(currentCursor);
        }
      };

      socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

      // Clean up listener on unmount
      return () => {
        socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
      };
    }
  }, [socketRef]); // Dependencies for this effect

  return <textarea id="realtimeEditor" />;
};

export default Editor;