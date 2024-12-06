import React, { createContext, useState, useContext } from 'react';

// Create the context
const ConversationContext = createContext();

// Create a provider component
export const ConversationProvider = ({ children }) => {
    const [conversation, setConversation] = useState([]);

    return (
        <ConversationContext.Provider value={{ conversation, setConversation }}>
            {children}
        </ConversationContext.Provider>
    );
};

// Custom hook to use the ConversationContext
export const useConversation = () => useContext(ConversationContext);

