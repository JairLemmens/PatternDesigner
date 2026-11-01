import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GraphEditor } from './GraphEditor'
//import { Viewer } from "./Viewer";
import {Viewer} from "./Viewer1";
import "./app.css";

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <GraphEditor />
//   </StrictMode>,
// )

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GraphEditor />} />
        <Route path="/viewer" element={<Viewer/>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);