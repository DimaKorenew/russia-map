import React from 'react'
import { RussiaMap } from './components/RussiaMap'
import './App.css'

const App: React.FC = () => {
  return (
    <div className="app-container">
      <h1>Интерактивная карта России</h1>
      <RussiaMap />
    </div>
  )
}

export default App
