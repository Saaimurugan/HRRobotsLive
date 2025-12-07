import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TestPage from './components/testPage';
import LoginPage from './components/login';
import CreateTest from './components/createTest';
import SignUp from './components/signup';
import { GlobalProvider } from "./globalContext";
import ForgotPasswordPage from './components/forgotPassword';
import ResetPage from './components/reset';
import RedirectPage from './components/redirectPage';
import SearchResult from './components/searchResult';
import CreateTemplate from './components/createTemplate';
import ProfilerPage from './components/profilerPage';
import AIInterview from './components/aiinterview';
import InterviewPage from './components/interviewPage';
import SpeechToText from './components/speechtotext';
import ChatBot from './components/chatBot';
import FaceDetection from './components/faceDetection';
import EditTemplate from './components/editTemplate';
import Profile from './components/profile';
import CreateJD from './components/createJD';

const Header = () => {
  const navigate = useNavigate(); // Access navigate here

  const location = useLocation();
  //alert(location.pathname);
  const routesToCheck = ["/test", "/logout", "/login", "/redirectPage", "/signup", "/forgot-password", "/reset"];
  const isResult = routesToCheck.some(route => location.pathname.includes(route));
  const loginCheck = ["/test", "/logout", "/login"];
  const isLogin = loginCheck.some(route => location.pathname.includes(route));
/*   const isLogin = location.pathname.includes("/login");
 */  
  return (
    <header
    style={{
      position: "fixed",
      top: 0,
      width: "100%",
      background: "#1CBBB4",
      color: "white",
      padding: "0px",
      borderRadius: "0px 0 0 0",
      textAlign: "center",
      display: "flex",
      justifyContent: "space-between",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      zIndex: 1000
    }}
    >
      <img
        src="../logo.png"
        alt="Logo"
        style={{ padding: "5px", height: "50px", marginRight: "0px" }}
      />
          <div>
            {isResult?
            <>
              {!isLogin?
              <>
                <button style={{background: "#1CBBB4", padding: "1px", marginTop: "15px"}} onClick={() => navigate("/list")}>
                <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 22L2 22" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M2 11L6.06296 7.74968M22 11L13.8741 4.49931C12.7784 3.62279 11.2216 3.62279 10.1259 4.49931L9.34398 5.12486" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M15.5 5.5V3.5C15.5 3.22386 15.7239 3 16 3H18.5C18.7761 3 19 3.22386 19 3.5V8.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M4 22V9.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20 9.5V13.5M20 22V17.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M15 22V17C15 15.5858 15 14.8787 14.5607 14.4393C14.1213 14 13.4142 14 12 14C10.5858 14 9.87868 14 9.43934 14.4393M9 22V17" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 9.5C14 10.6046 13.1046 11.5 12 11.5C10.8954 11.5 10 10.6046 10 9.5C10 8.39543 10.8954 7.5 12 7.5C13.1046 7.5 14 8.39543 14 9.5Z" stroke="#1C274C" stroke-width="1.5"/>
                </svg></button>
                </>
                :<></>
              }
            </>
            :
            <>
                <button style={{background: "#1CBBB4", padding: "1px", marginTop: "15px"}} onClick={() => navigate("/list")}>
                <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 22L2 22" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M2 11L6.06296 7.74968M22 11L13.8741 4.49931C12.7784 3.62279 11.2216 3.62279 10.1259 4.49931L9.34398 5.12486" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M15.5 5.5V3.5C15.5 3.22386 15.7239 3 16 3H18.5C18.7761 3 19 3.22386 19 3.5V8.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M4 22V9.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20 9.5V13.5M20 22V17.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M15 22V17C15 15.5858 15 14.8787 14.5607 14.4393C14.1213 14 13.4142 14 12 14C10.5858 14 9.87868 14 9.43934 14.4393M9 22V17" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 9.5C14 10.6046 13.1046 11.5 12 11.5C10.8954 11.5 10 10.6046 10 9.5C10 8.39543 10.8954 7.5 12 7.5C13.1046 7.5 14 8.39543 14 9.5Z" stroke="#1C274C" stroke-width="1.5"/>
                </svg></button>
                <button style={{background: "#1CBBB4", padding: "1px", marginTop: "15px"}} onClick={() => navigate("/profile")}>
                <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12C22 6.49 17.51 2 12 2C6.49 2 2 6.49 2 12C2 14.9 3.25 17.51 5.23 19.34C5.23 19.35 5.23 19.35 5.22 19.36C5.32 19.46 5.44 19.54 5.54 19.63C5.6 19.68 5.65 19.73 5.71 19.77C5.89 19.92 6.09 20.06 6.28 20.2C6.35 20.25 6.41 20.29 6.48 20.34C6.67 20.47 6.87 20.59 7.08 20.7C7.15 20.74 7.23 20.79 7.3 20.83C7.5 20.94 7.71 21.04 7.93 21.13C8.01 21.17 8.09 21.21 8.17 21.24C8.39 21.33 8.61 21.41 8.83 21.48C8.91 21.51 8.99 21.54 9.07 21.56C9.31 21.63 9.55 21.69 9.79 21.75C9.86 21.77 9.93 21.79 10.01 21.8C10.29 21.86 10.57 21.9 10.86 21.93C10.9 21.93 10.94 21.94 10.98 21.95C11.32 21.98 11.66 22 12 22C12.34 22 12.68 21.98 13.01 21.95C13.05 21.95 13.09 21.94 13.13 21.93C13.42 21.9 13.7 21.86 13.98 21.8C14.05 21.79 14.12 21.76 14.2 21.75C14.44 21.69 14.69 21.64 14.92 21.56C15 21.53 15.08 21.5 15.16 21.48C15.38 21.4 15.61 21.33 15.82 21.24C15.9 21.21 15.98 21.17 16.06 21.13C16.27 21.04 16.48 20.94 16.69 20.83C16.77 20.79 16.84 20.74 16.91 20.7C17.11 20.58 17.31 20.47 17.51 20.34C17.58 20.3 17.64 20.25 17.71 20.2C17.91 20.06 18.1 19.92 18.28 19.77C18.34 19.72 18.39 19.67 18.45 19.63C18.56 19.54 18.67 19.45 18.77 19.36C18.77 19.35 18.77 19.35 18.76 19.34C20.75 17.51 22 14.9 22 12ZM16.94 16.97C14.23 15.15 9.79 15.15 7.06 16.97C6.62 17.26 6.26 17.6 5.96 17.97C4.44 16.43 3.5 14.32 3.5 12C3.5 7.31 7.31 3.5 12 3.5C16.69 3.5 20.5 7.31 20.5 12C20.5 14.32 19.56 16.43 18.04 17.97C17.75 17.6 17.38 17.26 16.94 16.97Z" fill="#292D32"/>
                <path d="M12 6.92969C9.93 6.92969 8.25 8.60969 8.25 10.6797C8.25 12.7097 9.84 14.3597 11.95 14.4197C11.98 14.4197 12.02 14.4197 12.04 14.4197C12.06 14.4197 12.09 14.4197 12.11 14.4197C12.12 14.4197 12.13 14.4197 12.13 14.4197C14.15 14.3497 15.74 12.7097 15.75 10.6797C15.75 8.60969 14.07 6.92969 12 6.92969Z" fill="#292D32"/>
                </svg></button>
                <button style={{background: "#1CBBB4", padding: "1px", marginTop: "15px"}} onClick={() => navigate("/logout")}>
                <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 12L6 12M6 12L8 14M6 12L8 10" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 21.9827C10.4465 21.9359 9.51995 21.7626 8.87865 21.1213C8.11027 20.3529 8.01382 19.175 8.00171 17M16 21.9983C18.175 21.9862 19.3529 21.8897 20.1213 21.1213C21 20.2426 21 18.8284 21 16V14V10V8C21 5.17157 21 3.75736 20.1213 2.87868C19.2426 2 17.8284 2 15 2H14C11.1715 2 9.75733 2 8.87865 2.87868C8.11027 3.64706 8.01382 4.82497 8.00171 7" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M3 9.5V14.5C3 16.857 3 18.0355 3.73223 18.7678C4.46447 19.5 5.64298 19.5 8 19.5M3.73223 5.23223C4.46447 4.5 5.64298 4.5 8 4.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                </svg></button>
            </>
            }
          </div>
    </header>
  );
};

const App = () => {
  return (
    <GlobalProvider>
    <Router>
      <>
        <Header />
        <Routes>
        <Route path="/" element={<RedirectPage />} />
        <Route path="/list" element={<CreateTest />} />
          <Route path="/test/:id" element={<TestPage />} />
          <Route path="/reset/:id" element={<ResetPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/logout" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/result" element={<SearchResult/>} />
          <Route path="/createTemplate" element={<CreateTemplate/>} />
          <Route path="/profilerPage" element={<ProfilerPage/>} />
          <Route path="/aiinterview" element={<AIInterview/>} />
          <Route path="/interviewPage" element={<InterviewPage/>} />
          <Route path="/speechtotext" element={<SpeechToText/>} />
          <Route path="/chatBot" element={<ChatBot/>} />
          <Route path="/faceDetection" element={<FaceDetection/>} />
          <Route path="/edit/:id" element={<EditTemplate/>} />
          <Route path='/profile' element={<Profile/>} />
          <Route path="/createJD" element={<CreateJD />} />
          {/* <Route path="/testAuth" element={<TestAuth />} /> */}
        </Routes>
      </>
    </Router>
    </GlobalProvider>
  );
};

export default App;
