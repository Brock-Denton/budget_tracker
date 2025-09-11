import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserSelection from './components/UserSelection';
import MainApp from './components/MainApp';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<UserSelection />} />
          <Route path="/app/:userId" element={<MainApp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;