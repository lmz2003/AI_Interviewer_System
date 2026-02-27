import React, { createContext, useState, useContext, type ReactNode } from 'react';

interface AIAssistantContextType {
  isOpen: boolean;
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false); // Default to open

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <AIAssistantContext.Provider value={{ isOpen, toggleOpen, setIsOpen }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = (): AIAssistantContextType => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};
