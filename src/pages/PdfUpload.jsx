import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { BsCloudUpload } from "react-icons/bs";
import { TailSpin } from "react-loader-spinner"; // Import loader spinner
import pdfImage from './../assets/pdfImage.png';
import headingImage from './../assets/headingImage.png';

function PdfUpload() {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [chatId, setChatId]= useState(false);
    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();


    const handleFileChange = async (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setFiles(uploadedFiles);
        if (uploadedFiles.length > 0) {
            setIsLoading(true);
            try {
                const formData = new FormData();
                uploadedFiles.forEach((file) => formData.append("files", file));
                formData.append("user_id", localStorage.getItem("userId"));
                formData.append("chat_id", localStorage.getItem("chatId") || chatId || "null");
    
                const response = await fetch(`${API_URL}/documents/upload`, {
                    method: "POST",
                    body: formData,
                });
    
                // if (!response.ok) {
                //     const errorData = await response.json();
                //     throw new Error(errorData.message || "Document upload failed");
                // }
    
                const data = await response.json();
    
                localStorage.setItem("chatId", data.chatId);
                setChatId(data.chatId);
    
                setModalMessage("Document added successfully!");
                setIsError(false);
                setShowModal(true);

                
                setTimeout(() => {
                    setShowModal(false);
                    navigate("/Home"); // Navigate back to chatbot
                }, 3000);
    
                // Re-fetch conversation after successful upload
                const chatResponse = await fetch(`${API_URL}/chat/get-chat`, {
                    method: "POST",
                    body: new FormData().append("chat_id", data.chatId).append("user_id", localStorage.getItem("userId")),
                });
    
                if (chatResponse.ok) {
                    const chatData = await chatResponse.json();
                    const conversation = chatData.complete_chat.conversation.map((msg) => ({
                        sender: msg.role === "user" ? "user" : "bot",
                        text: msg.content,
                        timestamp: msg.timestamp,
                    }));
                }
    
            } catch (error) {
                setModalMessage("Document added successfully!");
                setTimeout(() => {
                    setShowModal(false);
                    navigate("/Home"); // Navigate back to chatbot
                }, 3000);
                setIsError(true);
                setShowModal(true);
                setFiles([]); // Reset files on error
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen gap-4 py-4">
            {/* Loader */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
                    <TailSpin
                        height={80}
                        width={80}
                        color="#262626" // gray-950 color
                        ariaLabel="loading"
                        visible={true}
                    />

                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white px-6 py-10 rounded-lg shadow-lg max-w-sm w-full relative">
                       <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-2 right-4 text-gray-700 hover:text-gray-800 font-medium text-4xl"
                        >
                            ×
                        </button>

                        <div className="flex flex-col items-center gap-4 mt-4">
                            <h2
                                className={`text-lg font-semibold ${
                                    isError ? "text-red-600" : "text-green-600"
                                }`}
                            >
                                {modalMessage}
                            </h2>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-row items-center gap-4">
                <img src={headingImage} alt="heading-image" className="w-20 h-auto" />
                <h1 className="text-gray-950 font-bold text-5xl">ChatPDF Online</h1>
            </div>
            <p className="text-gray-500 font-medium mb-4">
                Use the AI capabilities provided to help you read better
            </p>
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 
            border-dashed border-gray-300 max-w-2xl mx-auto w-full p-8">
                <img
                    src={pdfImage}
                    alt="PDF Icon"
                    className="w-32 h-auto"
                />
                <label
                    htmlFor="file-upload"
                    className="bg-gray-950 hover:bg-gray-900 text-white font-medium py-3 px-12 
                    rounded-lg text-sm cursor-pointer transition-all"
                >
                    <BsCloudUpload className="inline-block mr-2 text-md" />
                    Click or drag here to upload
                </label>
                <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                />
                <div className="mt-8 text-xs text-gray-500 text-center">
                    <p>File types supported: PDF | Max file size: 50MB</p>
                    <p>Max Token: 100K (Approximately 70,000 words or characters)</p>
                </div>
            </div>

            {/* File Information */}
            {files.length > 0 && (
                <div className="mt-6 text-sm text-gray-600 flex flex-col items-center gap-4 max-w-2xl mx-auto w-full">
                    <p className="text-gray-950 font-bold">Selected Files:</p>
                    <ul className="grid grid-cols-4 gap-4">
                        {files.map((file, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <img
                                    src={pdfImage}
                                    alt="PDF Icon"
                                    className="w-14 h-auto"
                                />
                                <li className="font-medium text-[9px]">{file.name}</li>
                            </div>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default PdfUpload;
