import React from "react";

const Loader = () => {
    return (
        <div className="flex items-center justify-center">
            <svg
                className="animate-spin h-5 w-5 text-black"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C6.48 0 0 6.48 0 12h4zm2 5.29a7.962 7.962 0 01-2-5.3H0c0 3.87 2.69 7.13 6.29 8.12l-.29-2.82z"
                ></path>
            </svg>
        </div>
    );
};

export default Loader;
