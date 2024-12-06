import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import Loader from './../components/Loader';
import avatar from './../assets/avatar.jpeg';
import { useTokenValidation } from './Auth';
import { useLocation } from 'react-router-dom';
import { useConversation } from '../context/ConversationContext';
import { useNavigate } from 'react-router-dom';

function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;
    const [chatData, setChatData] = useState();
    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to track sidebar open/close
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
    const [formValues, setFormValues] = useState({
        email: '',
        username: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [userId, setUserId] = useState('');
    const validateTokenAndFetchData = useTokenValidation();
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("avatar")); // Initialize with localStorage value
    const { setConversation } = useConversation();

    useEffect(() => {
        validateTokenAndFetchData();
        const userId = localStorage.getItem('userId');
        const avatarAddress = localStorage.getItem('avatar');
        const username = localStorage.getItem('userName');
        const email = localStorage.getItem('email');
        setFormValues((prevValues) => ({
            ...prevValues,
            email: email || '',
            username: username || '',
        }));
        setUserId(userId);
        if (userId) {
            fetchAvatar(userId);
        }
    }, [location.pathname]);

    useEffect(() => {
        const storedAvatar = localStorage.getItem("avatar");
        if (storedAvatar) {
            setAvatarUrl(storedAvatar);
        }
    }, []);


    const fetchAvatar = async (userId) => {
        try {
            const formData = new FormData();
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/profile/avatar`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to fetch avatar");
            }

            const avatarBlob = await response.blob();
            const avatarUrl = URL.createObjectURL(avatarBlob);
            setAvatarUrl(avatarUrl); // Update the state with the new avatar URL
            localStorage.setItem("avatar", avatarUrl); // Save in localStorage
        } catch (error) {
            console.error("Error fetching avatar:", error);
            setAvatarUrl(null); // Fallback to default avatar
        }
    };



    const dummyChats = [
        { id: 1, title: 'Chat with Alex', lastMessage: 'Hey, how are you?' },
        { id: 2, title: 'Project Discussion', lastMessage: 'Let’s review the proposal.' },
        { id: 3, title: 'Support Query', lastMessage: 'Sure, I’ll check that for you.' },
        { id: 4, title: 'Chat with Alex', lastMessage: 'Hey, how are you?' },
        { id: 5, title: 'Project Discussion', lastMessage: 'Let’s review the proposal.' },
    ];





    useEffect(() => {
        const formData = new FormData();
        formData.append("user_id", localStorage.getItem("userId"));

        const fetchData = async () => {
            try {
                const response = await fetch(`${API_URL}/chat/list`, {
                    method: "POST",
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();
                setChatData(data.chats);

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);



    const handleCardClick = async (chatId) => {
        try {
            localStorage.setItem('chatId', chatId);
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('user_id', localStorage.getItem("userId"));


            const response = await fetch(`${API_URL}/chat/get-chat`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to send data to the backend');
            }

            const result = await response.json();
            const conversation = result.complete_chat.conversation.map((msg) => ({
                sender: msg.role === "user" ? "user" : "bot",
                text: msg.content,
                timestamp: msg.timestamp,
            }));

            setConversation(conversation);
        } catch (error) {
            console.error('Error sending data:', error);
        }
    };





    const handleModalInputChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prevValues) => ({
            ...prevValues,
            [name]: value,
        }));
    };




    const handleChangeAvatar = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*'; // Restrict to image files
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setSelectedFile(file); // Save the file object
                const reader = new FileReader();
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };




    const handleSave = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('email', formValues.email);
        formData.append('name', formValues.username);
        if (selectedFile) {
            formData.append("avatar", selectedFile);
        } else {
            formData.append("avatar", avatar);
        }



        try {
            const response = await fetch(`${API_URL}/profile/update`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to save data');
            }

            const result = await response.json();
            localStorage.setItem('token', result.token);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving data:', error);
        } finally {
            setLoading(false); // Hide loader after API call completes
        }
    };



    return (
        <div
            className={`fixed top-0 left-0 h-screen flex flex-col items-start justify-between pb-6 gap-4 transition-all 
                duration-200 ${isSidebarOpen ? 'w-64' : 'w-14'
                } bg-gray-50 border-r`}
            onMouseEnter={() => setIsSidebarOpen(true)} // Open sidebar on hover
            onMouseLeave={() => setIsSidebarOpen(false)} // Close sidebar on mouse leave
        >
            {/* Sidebar Icon */}
            {!isSidebarOpen && <div className="cursor-pointer flex items-center justify-center h-12 w-full">
                <FontAwesomeIcon icon={faHistory} className="text-gray-600 text-md" />
            </div>}


            {/* Chat History */}
            {isSidebarOpen && (
                <div className='w-full pt-4'>
                    <h1
                        onClick={() => {
                            localStorage.removeItem('chatId'); // Remove chatId from localStorage
                            window.location.reload();
                        }}
                        className="text-gray-950 font-semibold text-md py-4 hover:bg-gray-100 rounded-lg flex items-center 
    px-5 text-nowrap mb-5 cursor-pointer"
                    >
                        New Chat
                    </h1>
                    <h1 className="text-gray-950 font-semibold text-lg flex items-center px-5 pb-2 text-nowrap">
                        Chat History
                    </h1>
                    <div className="px-5 overflow-y-auto custom-scrollbar border-gray-200 border-t border-b py-4">
                        <div className="flex-1">
                            {isLoading ? (
                                <p className="text-gray-500 text-center text-sm text-nowrap">Loading chat history...</p>
                            ) : chatData && chatData.length > 0 ? (
                                chatData.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleCardClick(chat.id)}
                                        className="bg-white bg-opacity-70 mt-2 border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition"
                                    >
                                        <h2 className="text-gray-900 font-medium text-sm text-nowrap">{chat.name}</h2>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center text-xs text-nowrap">No Chats Available</p>
                            )}
                        </div>
                    </div>

                </div>
            )}
            <div className='w-full'>
                <div className={` ${isSidebarOpen ? 'px-4 justify-start' : 'px-1 justify-center'} hover:bg-gray-200 rounded w-full 
             flex items-center  py-2`}
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className='flex flex-row items-center gap-2'>
                        <img
                            src={avatarUrl || "frontend/src/assets/avatar.jpeg"}
                            alt="User Avatar"
                            className="w-10 h-10 rounded-full border"
                        />
                        {isSidebarOpen && <label className='text-gray-900 font-medium text-xs'> {formValues.username}</label>}
                    </div>

                </div>
                {/* logout */}
                <div onClick={() => {
                    localStorage.clear()
                    navigate('/')
                }
                }
                    className={`w-full flex items-center  pt-4 ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'}`}>
                    <FontAwesomeIcon icon={faSignOutAlt} className="text-gray-600 text-md text-center p-3 hover:bg-gray-200 rounded-full" />
                </div>
            </div>


            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-100">
                    <div className="bg-white max-w-lg mx-auto w-full p-8 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-950 mb-6">Edit Information</h2>
                        <form className='flex flex-col items-start gap-5'>
                            <input
                                type="email"
                                name="email"
                                value={formValues.email}
                                onChange={handleModalInputChange}
                                className="w-full px-3 py-3 border rounded-lg text-sm outline-none border-gray-300"
                            />

                            <input
                                type="text"
                                name="username"
                                value={formValues.username}
                                onChange={handleModalInputChange}
                                className="w-full px-3 py-3 border rounded-lg text-sm outline-none border-gray-300"
                            />


                            <div className='flex flex-col items-start gap-3'>
                                {/* <label className='text-sm text-gray-950 font-semibold'>Avatar</label> */}
                                <div className='flex flex-row items-center gap-4'>
                                    <img
                                        src={selectedFile ? URL.createObjectURL(selectedFile) : avatarUrl}
                                        alt="User Avatar"
                                        className="w-20 h-20 rounded-full border"
                                    />
                                    <label onClick={handleChangeAvatar}
                                        className='text-xs text-blue-700 hover:text-blue-500'>Change Avatar</label>
                                </div>

                            </div>
                            <div className="flex items-center gap-2 w-full pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setIsSidebarOpen(false);
                                    }} // Close modal on cancel
                                    className="text-sm px-6 py-3 bg-gray-200 border border-gray-200 text-gray-700
                                     hover:bg-gray-300 font-bold transition-colors rounded-lg w-full"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className={`text-sm px-6 py-3 border-2 font-bold transition-colors rounded-lg w-full ${loading
                                            ? "bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed"
                                            : "bg-gray-950 border-gray-950 text-white hover:bg-gray-900"
                                        }`}
                                    disabled={loading}
                                >
                                    {loading ? <Loader /> : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sidebar;
