import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Chatbot from "../components/Chatbot";



function Home() {
    return (
        <div className="h-screen flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <div className="flex flex-col items-center p-4 h-full">
                    <Chatbot />
                </div>
            </div>
        </div>
    );
}

export default Home;

