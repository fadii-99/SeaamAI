import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import logo from './../assets/logo.png';
import { TailSpin } from "react-loader-spinner"; 



function ForgetPassword() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState(''); // New state for old password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailFound, setEmailFound] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: false,
    otp: false,
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false); 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'otp') setOtp(value);
    if (name === 'oldPassword') setOldPassword(value); 
    if (name === 'newPassword') setNewPassword(value);
    if (name === 'confirmPassword') setConfirmPassword(value);
    setFormErrors({ ...formErrors, [name]: false });
  };


  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSearchEmail = async (e) => {
    e.preventDefault();
    const errors = {
      email: !email,
    };
    setFormErrors(errors);

    if (!errors.email) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/forget-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
     

        if (response.ok) {
          const data = await response.json();
          console.log('Email found:', data);
          setEmailFound(true);
          setErrorMessage('');
        } else {
          const errorData = await response.json();
          setErrorMessage(errorData.error || 'Email not found');
          setEmailFound(false);
        }
      } catch (error) {
        console.error('Error during email search:', error);
        setErrorMessage('An error occurred. Please try again.');
      } finally {
        setIsLoading(false); 
    }
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    const errors = {
      otp: !otp,
      oldPassword: !oldPassword, 
      newPassword: !newPassword,
      confirmPassword: !confirmPassword || newPassword !== confirmPassword,
    };
  
    setFormErrors(errors);
    setIsLoading(true);
      console.log('Sending request with:', { email , otp , newPassword , confirmPassword });
      
      try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            otp: otp, 
            email: email, 
            new_password: newPassword 
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response received:', data);
          setSuccessMessage('Password updated successfully!');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          const errorData = await response.json();
          console.log('Error response:', errorData);
          setErrorMessage(errorData.error || 'OTP verification failed');
        }
      } catch (error) {
        console.error('Error during OTP verification:', error);
        setErrorMessage('An error occurred. Please try again.');
      } finally {
        setIsLoading(false); 
    }
    
  };
  

  return (
    <>
      <div className="flex items-center justify-center bg-gray-50 min-h-[100vh] h-full">
        <div className="max-w-md p-8 rounded-xl shadow-lg flex flex-col items-center gap-8 w-full bg-white">
          {errorMessage && <p className="text-red-500 text-sm bg-red-50 w-full rounded-lg py-3 text-center">{errorMessage}</p>}
          {successMessage && <p className="text-green-500 text-sm mt-4 bg-green-50 w-full rounded-lg py-3 text-center">{successMessage}</p>}

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
          <div className="flex flex-col items-center gap-6">
          <img src={logo} alt="logo" className="w-16 h-auto" />
            <h1 className="text-2xl font-bold border-gray-950">
              {emailFound ? 'Reset Password' : 'Forget Password'}
            </h1>
          </div>

          {!emailFound ? (
            <form onSubmit={handleSearchEmail} className="flex flex-col items-center gap-6 w-full">
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
              <button
                className="text-sm px-6 py-3 bg-gray-950 border-2 border-gray-950 text-white hover:bg-gray-700 font-bold transition-colors rounded-lg w-full"
              >
                SEARCH EMAIL
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitOtp} className="flex flex-col items-center gap-6 w-full">
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={otp}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
                  formErrors.otp ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="relative w-full">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="Enter New Password"
                  value={newPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
                    formErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <FontAwesomeIcon
                  icon={showNewPassword ? faEyeSlash : faEye}
                  onClick={toggleNewPasswordVisibility}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer"
                />
              </div>
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-3 border rounded-lg text-sm outline-none ${
                    formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <FontAwesomeIcon
                  icon={showConfirmPassword ? faEyeSlash : faEye}
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer"
                />
              </div>
              <button
                className="text-sm px-6 py-3 bg-gray-950 border-2 border-gray-950 text-white hover:bg-gray-700 font-bold transition-colors rounded-lg w-full"
              >
                RESET NOW          
              </button>
            </form>
          )}

          <p className="text-xs text-gray-800 font-medium mt-4">
            <span onClick={() => navigate('/')} className="border-gray-950 cursor-pointer font-semibold">
              Go Back To Login Page
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

export default ForgetPassword;
