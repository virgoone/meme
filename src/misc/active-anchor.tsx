import React, { createContext, useContext, useState } from 'react'

const ActiveAnchorContext = createContext<any>(null)
const ActiveAnchorSetterContext = createContext<any>(null)

// Separate the state as 2 contexts here to avoid
// re-renders of the content triggered by the state update.
export const useActiveAnchor = () => useContext(ActiveAnchorContext)
export const useActiveAnchorSet = () => useContext(ActiveAnchorSetterContext)
export const ActiveAnchor = ({ children }: { children: React.ReactNode }) => {
  const state = useState<any[]>([])

  return (
    <ActiveAnchorContext.Provider value={state[0]}>
      <ActiveAnchorSetterContext.Provider value={state[1]}>
        {children}
      </ActiveAnchorSetterContext.Provider>
    </ActiveAnchorContext.Provider>
  )
}
