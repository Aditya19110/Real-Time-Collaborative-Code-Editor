# CodeTogether - Real-Time Collaborative Code Editor

A modern, real-time collaborative code editor built with React and Socket.io. Write Python code together with multiple users in real-time!

## Features

- **Real-time Collaboration**: Multiple users can edit code simultaneously
- **Live Code Execution**: Run Python code and see output instantly
- **Modern UI/UX**: Beautiful, responsive design with gradient backgrounds
- **File Management**: Upload and save code files
- **User Management**: See connected users with avatars
- **Syntax Highlighting**: Python syntax highlighting with custom theme
- **Auto-completion**: Smart code completion and bracket matching
- **Connection Status**: Real-time connection status indicator

## UI/UX Improvements Made

### Home Page
- Modern gradient background with glassmorphism effects
- Improved form validation with real-time feedback
- Better button states (disabled, loading)
- Enhanced typography and spacing
- Responsive design for mobile devices

### Editor Page
- **Three-panel layout**: Sidebar, Editor, Output panel
- **Enhanced sidebar**: 
  - Better organized action buttons with icons
  - Connection status indicator
  - Improved user list display
  - Styled file upload button
- **Custom code editor theme**: Dark theme with syntax highlighting
- **Improved output panel**: Clear button, better formatting
- **Loading states**: Run button shows loading state while executing
- **Responsive design**: Mobile-friendly layout

### Button Improvements
- All buttons now have proper hover effects
- Loading states for async operations
- Disabled states when appropriate
- Icon integration for better UX
- Consistent styling across the app

## Technical Improvements

### Fixed Issues
1. **Missing Dependencies**: Added `lodash.debounce` package
2. **Import Errors**: Fixed import statements for debounce function
3. **ESLint Warnings**: Resolved React hooks dependencies warnings
4. **Code Cleanup**: Removed unused variables and duplicate keys

### Performance Optimizations
- Debounced code change events to reduce network traffic
- Proper cleanup of event listeners
- Optimized re-renders with proper dependency arrays

### Enhanced Features
- Better error handling for code execution
- Improved file upload with file type restrictions
- Connection status monitoring with heartbeat
- Enhanced form validation on home page

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/Aditya19110/Real-Time-Collaborative-Code-Editor
cd Real-Time-Collaborative-Code-Editor
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Start the backend server (in a separate terminal)
```bash
npm run server:dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Client.js          # User avatar component
│   ├── Editor.js          # CodeMirror editor wrapper
│   └── EditorTheme.css    # Custom editor theme
├── pages/
│   ├── Home.js            # Landing page
│   └── EditorPage.js      # Main editor interface
├── App.js                 # Main app component
├── App.css                # Global styles
└── socket.js              # Socket.io configuration
```

## Usage

1. **Create a Room**: Click "Create New Room" on the home page
2. **Join a Room**: Enter a Room ID and your username
3. **Start Coding**: Write Python code in the editor
4. **Collaborate**: Share the Room ID with others to code together
5. **Run Code**: Click the "Run Code" button to execute Python code
6. **Save/Load**: Upload files or save your work locally

## Key Features in Detail

### Real-time Collaboration
- Changes are synced instantly across all connected users
- See other users' cursors and selections
- Live user presence indicators

### Code Execution
- Server-side Python code execution
- Real-time output display
- Error handling and feedback

### File Management
- Upload Python files, text files, and more
- Save current code to local file
- Drag and drop support (coming soon)

### Responsive Design
- Mobile-friendly interface
- Adaptive layout for different screen sizes
- Touch-friendly controls

## Future Enhancements

- [ ] Multiple programming language support
- [ ] Collaborative cursor indicators
- [ ] Chat functionality
- [ ] Code version history
- [ ] Themes and customization
- [ ] Integration with GitHub
- [ ] Video/Voice chat integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

---

Made with ❤️ by the Aditya Kulkarni
