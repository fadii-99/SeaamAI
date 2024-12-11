import React, { useState, useRef, useEffect } from "react";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faPaperclip ,faTrash } from "@fortawesome/free-solid-svg-icons";
import { TailSpin } from "react-loader-spinner";
import { useTokenValidation } from "../components/Auth";
import { useConversation } from "../context/ConversationContext";

function Chatbot() {
    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const validateTokenAndFetchData = useTokenValidation();
    const { conversation } = useConversation();

    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState(conversation || []); // State to store messages
    const [input, setInput] = useState(""); // State to manage user input
    const [isInputEmpty, setIsInputEmpty] = useState(false); // State to manage input validation
    const bottomRef = useRef(null); // Ref to scroll to the bottom
    const [dropdownOpen, setDropdownOpen] = useState(false); // State for dropdown visibility
    const [documents, setDocuments] = useState([]); // To store uploaded documents
     const [chatId, setChatId]= useState(localStorage.getItem('chatId'));

    const userAvatarUrl = "https://ui-avatars.com/api/?name=User&background=random&size=128";

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);


    
    
    const handleDeleteDocument = async (docName) => {
        try {
            const formData = new FormData();
            formData.append("user_id", localStorage.getItem("userId"));
            formData.append("chat_id", localStorage.getItem("chatId"));
            formData.append("document", docName);
    
            const response = await fetch(`${API_URL}/documents/delete`, {
                method: "POST",
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error("Failed to delete document");
            }
    
            setDocuments((prevDocuments) =>
                prevDocuments.filter((doc) => doc !== docName)
            );
    
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };
    
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


     useEffect(() => {
        setMessages(conversation); // Sync messages with context whenever conversation updates
    }, [conversation]);

  

    useEffect(() => {
            const userId = localStorage.getItem("userId");
            if (userId) {
                fetchChatData(userId);
            }
    }, []);
    


    useEffect(() => {
        validateTokenAndFetchData();
    }, []);


    const fetchChatData = async (userId) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append("user_id", userId);
            formData.append("chat_id", localStorage.getItem('chatId') || chatId || "null");


            const response = await fetch(`${API_URL}/documents/list`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to fetch documents");
            }

            const data = await response.json();
            setDocuments(data.documents|| []); // Populate documents
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (input.trim() === "") {
            setIsInputEmpty(true);
            return;
        }
    
        setIsInputEmpty(false);
        setLoading(true);
    
        // Create user message and add it immediately to messages
        const userMessage = { sender: "user", text: input, timestamp: new Date().toISOString() };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
    
        setInput(""); // Clear input field
    
        try {
            const formData = new FormData();
            formData.append("message", input);
            formData.append("chat_id", chatId || "null");
            formData.append("user_id", localStorage.getItem("userId"));
    
            const response = await fetch(`${API_URL}/chat/get-response`, {
                method: "POST",
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error("Failed to fetch response");
            }
    
            const data = await response.json();
    
            // Save chat ID in state and localStorage
            const newChatId = data.chat_id;
            setChatId(newChatId);
            localStorage.setItem("chatId", newChatId);
    
            // Map the conversation to the expected format
            const conversation = data.complete_chat.conversation.map((msg) => ({
                sender: msg.role === "user" ? "user" : "bot",
                text: msg.content,
                timestamp: msg.timestamp,
            }));
    
            // Update messages state with the new conversation
            setMessages(conversation);
        } catch (error) {
            console.error("Error fetching bot response:", error);
            const errorMessage = {
                sender: "bot",
                text: "Failed to send data to the backend.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setLoading(false);
        }
    };
    
    
    
    
    console.log(localStorage.getItem('Avatar'));
    

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar mt-10 border-gray-200">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <div className="p-2 border-gray-100 border-2 rounded-xl">
                            <img src={logo} alt="Logo" className="w-12 h-auto" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800 mt-4">Start Chat Now</h1>
                        <p className="text-xs text-gray-500 text-center">
                            Choose a prompt below or write your own to start <br /> chatting with Seam.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
    { messages.map((message, index) => (
        <div
            key={index}
            className={`flex ${message.sender === "user" ? "justify-start" : "justify-start"}`}
        >
            {message.sender === "user" ? (
                // User's message block
                <div className="flex items-center gap-4 w-full">
                    <img
                        src={localStorage.getItem('avatar')}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-lg border"
                    />
                    <div className="text-gray-950 font-medium rounded-lg text-sm break-words w-full">
                        {message.text}
                    </div>
                </div>
            ) : (
                // Bot's message block
                <div className="flex items-start gap-4 w-full">
                    <img
                        src={logo}
                        alt="Bot Logo"
                        className="w-8 h-auto rounded-lg border p-1"
                    />
                    <div className="flex flex-col items-start gap-6 mt-1 break-words w-full">
                        <label className="text-gray-950 font-medium rounded-lg text-sm">
                            Results
                        </label>
                        <label className="text-gray-700 font-regular rounded-lg text-xs leading-6 pb-8 break-words w-full">
                            {message.text}
                        </label>
                    </div>
                </div>
            )}
        </div>
    ))}

    {/* Loader below the latest user query */}
    {loading && (
        <div className="flex items-center gap-2 ml-12">
            <TailSpin height="20" width="20" color="black" />
            <p className="text-black text-xs font-medium">Fetching response...</p>
        </div>
    )}

    <div ref={bottomRef}></div>
</div>

                )}
            </div>

            {/* Input Field */}
            <div
                className={` border-gray-300 flex flex-col items-start mt-6 bg-gray-100 rounded-xl ${
                    isInputEmpty ? "border-2 border-red-500" : "border border-gray-300"
                }`}
            >
                <div className="flex flex-row items-center w-full gap-4">
                    <input
                        type="text"
                        placeholder="Ask AI a question or make a request ........"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className={`w-full p-3 focus:outline-none text-gray-700 rounded-xl bg-gray-100 placeholder:text-gray-700 text-xs font-regular`}
                    />
                    <button
                        onClick={handleSendMessage}
                        className="ml-2 p-3 rounded-xl text-gray-400 flex items-center justify-center hover:bg-gray-200"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="h-5 w-5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12l15-6-6 15-3-6-6-3z" />
                        </svg>
                    </button>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <div className="relative flex items-center group">
                        {/* Attach Icon */}
                        <label
                            onClick={() => navigate("/Upload")}
                            className="text-gray-700 hover:bg-gray-200 rounded-lg p-2 text-xs ml-2 my-2 cursor-pointer"
                        >
                            <FontAwesomeIcon icon={faPaperclip} className="text-lg opacity-60" />
                        </label>

                        {/* Tooltip */}
                        <div className="absolute left-[-200%] top-1/2 transform -translate-y-1/2 bg-gray-100 border border-gray-400 text-gray-700 text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Attach File
                        </div>
                    </div>
                    <div className="flex items-end justify-end relative">
                        <label
                            onClick={() => setDropdownOpen((prev) => !prev)} // Toggle dropdown
                            className="border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-lg p-2 text-[11px] text-center cursor-pointer flex items-center gap-2"
                        >
                            Uploaded Documents
                            <FontAwesomeIcon icon={faCaretDown} className="text-xs opacity-60" />
                        </label>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div className="absolute bottom-10 right-0 bg-white border border-gray-300 rounded-lg shadow-md z-10 w-60">
                                {documents.length === 0 ? (
                                    // Show message if no documents
                                    <div className="px-4 py-2 text-gray-700 text-xs">
                                        No Documents Added
                                    </div>
                                ) : (
                                    // Show documents if present
                                    <ul>
                                    {documents.map((doc, index) => {
                                        // Extract part of the string after the first "-" (minus sign)
                                        const displayDoc = doc.includes('-') ? doc.split('-')[1] : doc;
                                
                                        return (
                                            <div className="flex flex-row items-center justify-between gap-4 w-full px-4 py-2">
                                           <li
                                                key={index}
                                                className=" text-gray-700 hover:bg-gray-100 cursor-pointer text-xs"
                                                onClick={() => alert(`Selected: ${displayDoc}`)} // Handle document selection
                                            >
                                                {displayDoc}
                                            </li>
                                            <FontAwesomeIcon
                                                icon={faTrash}
                                                className="text-xs opacity-60 text-red-700 cursor-pointer"
                                                onClick={() => handleDeleteDocument(doc)} // Call delete function
                                            />
                                            </div>
                                           
                                        );
                                    })}
                                </ul>
                                
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chatbot;
