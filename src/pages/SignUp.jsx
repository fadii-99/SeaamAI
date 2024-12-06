import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import logo from './../assets/logo.png';
import { TailSpin } from "react-loader-spinner"; 



function SignUp() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });
  const [formErrors, setFormErrors] = useState({
    username: false,
    email: false,
    password: false,
    password2: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const togglePassword2Visibility = () => {
    setShowPassword2(!showPassword2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
    setFormErrors({ ...formErrors, [name]: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {
      username: !formValues.username,
      email: !formValues.email,
      password: !formValues.password,
      password2: formValues.password !== formValues.password2,
    };
    setFormErrors(errors);

    const hasErrors = Object.values(errors).some((error) => error);
    if (!hasErrors) {
      setIsLoading(true);
      try {
     
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify({ 
            name: formValues.username, 
            email: formValues.email, 
            password: formValues.password 
          }),
        });
        

        const data = await response.json();


        if (response.ok) {
          navigate('/'); 
        } else {
          console.error('Signup failed:', data);
          setErrorMessage(data.error || 'Sign up failed. Please try again.');
        }
      } catch (error) {
        console.error('An error occurred:', error);
        setErrorMessage('Something went wrong');
      } finally {
        setIsLoading(false); 
    }
    } else {
      setErrorMessage('Please fill in all the fields');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full bg-gray-50 min-h-[100vh] h-full">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-8">
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
                  color="#262626" 
                  ariaLabel="loading"
                  visible={true}
              />
          </div>
      )}
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full">
          <input
            type="text"
            name="username"
            placeholder="Your username"
            value={formValues.username}
            onChange={handleChange}
            className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
              formErrors.username ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <input
            type="email"
            name="email"
            placeholder="Your email address"
            value={formValues.email}
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
              value={formValues.password}
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
          <div className="relative w-full">
            <input
              type={showPassword2 ? 'text' : 'password'}
              name="password2"
              placeholder="Confirm Password"
              value={formValues.password2}
              onChange={handleChange}
              className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
                formErrors.password2 ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={togglePassword2Visibility}
              className="absolute right-3 top-3"
            >
              <FontAwesomeIcon icon={showPassword2 ? faEyeSlash : faEye} />
            </button>
          </div>
          <button
            className="text-sm px-6 py-3 bg-gray-950 border-2 border-gray-950 text-white hover:bg-gray-700 font-bold transition-colors rounded-lg w-full"
          >
            SIGN UP
          </button>
        </form>
      </div>
      <p className="text-xs text-gray-800 font-medium">
        Already have an account?
        <span onClick={() => navigate('/')} className="text-gray-950 cursor-pointer font-bold ml-1">
          Login
        </span>
      </p>
    </div>
  );
}

export default SignUp;
