import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AssistantView from './routes/AssistantView.jsx';
import FamilyPortal from './routes/FamilyPortal.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssistantView />} />
        <Route path="/family/*" element={<FamilyPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
