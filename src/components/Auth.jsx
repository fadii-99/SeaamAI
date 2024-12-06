import { useNavigate } from "react-router-dom";

export const useTokenValidation = () => {
    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();

    const validateTokenAndFetchData = async () => {
        const token = localStorage.getItem("token");
    
        // if (!token) {
        //     localStorage.clear();
        //     navigate("/");
        //     return; // Exit early
        // }


        try {
            const response = await fetch(`${API_URL}/auth/validate-token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();
            // Store user data in localStorage
            localStorage.setItem("userName", data.userData.name);
            localStorage.setItem("userId", data.userData.user_id);
            localStorage.setItem("avatar", data.userData.avatar);
            localStorage.setItem("email", data.userData.email);

        } catch (error) {
            console.error("Error validating token:", error);
            localStorage.clear();
            navigate("/");
        }
    };

    return validateTokenAndFetchData;
};
