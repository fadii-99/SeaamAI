import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import logo from './../assets/logo.png';
import { TailSpin } from "react-loader-spinner";
import { useTokenValidation } from "../components/Auth";



function Login() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: false,
    password: false,
  });
  const validateTokenAndFetchData = useTokenValidation();
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    setFormErrors({ ...formErrors, [name]: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {
      email: !email,
      password: !password,
    };
    setFormErrors(errors);

    const hasErrors = Object.values(errors).some((error) => error);
    if (!hasErrors) {
      setIsLoading(true);
      try {

        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', // Specify the content type
          },
          body: JSON.stringify({ 
            email: email, 
            password: password 
          }),
        });


        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          validateTokenAndFetchData();
          // const token = localStorage.getItem('token');
          try {
            const formData = new FormData();
            formData.append("user_id", localStorage.getItem('userId'));

            const response = await fetch(`${API_URL}/profile/avatar`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to fetch avatar");
            }

            const avatarBlob = await response.blob();
            const avatarUrl = URL.createObjectURL(avatarBlob);
            localStorage.setItem("avatar", avatarUrl); // Save in localStorage
        } catch (error) {
            console.error("Error fetching avatar:", error);
            setAvatarUrl(null); // Fallback to default avatar
        }
          navigate('/Home');

        } else {
          console.error('Login failed:', data);
          setErrorMessage(data.error || 'Login failed. Please try again.');
        }
      } catch (error) {
        console.error('An error occurred:', error);
        setErrorMessage('Something went wrong');
      } finally {
        setIsLoading(false);
    }
    } else {
      setErrorMessage('Please fill in all the fields.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full bg-gray-50 min-h-[100vh] h-full
    md:p-0 p-4">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-xl shadow-lg flex flex-col items-center 
      justify-center gap-8 mt-12 ">
        <img src={logo} alt="logo" className="w-16 h-auto" />
        {errorMessage && (
          <p className="text-red-500 text-sm bg-red-50 w-full rounded-lg py-3 text-center">
            {errorMessage}
          </p>
        )}
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

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full">
          <input
            type="email"
            name="email"
            placeholder="Your email address"
            value={email}
            onChange={handleChange}
            className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
              formErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={password}
              onChange={handleChange}
              className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
                formErrors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-3"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </div>
          <button
            className="text-sm px-6 py-3 bg-gray-950 border-2 border-gray-950 text-white hover:bg-gray-700 font-bold transition-colors rounded-lg w-full"
          >
            LOG IN
          </button>
          <Link to="/ForgetPassword" className=" text-xs text-gray-700 font-medium">
            Forget Password
          </Link>
        </form>
      </div>
      <p className="text-xs text-gray-800 font-medium">
        Don't have an account?
        <span
          onClick={() => navigate('/Signup')}
          className="text-gray-950 cursor-pointer font-bold ml-1"
        >
          Sign Up
        </span>
      </p>
    </div>
  );
}

export default Login;
