import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ParentElement from './ParentElement.jsx';


const Home = lazy(() => import('./../pages/Home.jsx'));
const Login = lazy(() => import('./../pages/Login.jsx'));
const SignUp = lazy(() => import('./../pages/SignUp.jsx'));
const ForgetPassword = lazy(() => import('./../pages/ForgetPassword.jsx'));
const PdfUpload =lazy(() => import('./../pages/PdfUpload.jsx'));


const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={''}>
        <Login />
      </Suspense>
    ), 
  },
  {
    path: '/Signup',
    element: (
      <Suspense fallback={''}>
        <SignUp />
      </Suspense>
    ), 
  },
  {
    path: '/ForgetPassword',
    element: (
      <Suspense fallback={''}>
        <ForgetPassword />
      </Suspense>
    ),
  },
  {
    path: '/Upload',
    element: (
      <Suspense fallback={''}>
        <PdfUpload />
      </Suspense>
    ),
  }
  ,
  {
    path: '/Home',
    element: (
      <Suspense fallback={''}>
        <Home />
      </Suspense>
    ),
  }
]);

export default router;
