import './App.css'
import Nav from './Nav'
import {BrowserRouter, Route, Routes} from "react-router-dom"
import Contact from './Contact'
import NoPage from './NoPage'
import Verification from './Verification'
import Home from './Home'
import Interactive from './Interactive'
import Suggestions from "./Suggestions.jsx"
import BugReports from "./BugReports.jsx"
import DashboardEntry from "./Dashboards/DashboardEntry.jsx"
import AdminDashboard from "./Dashboards/AdminDashboard.jsx"
import DevDashboardOLD from "./Dashboards/DeveloperDashboardOLD.jsx"
import DevDashboard from "./Dashboards/DeveloperDashboard.jsx"
import UserDashboard from "./Dashboards/UserDashboard.jsx"
import SupDashboard from "./Dashboards/SupervisorDashboard.jsx"
import ManagerDashboard from "./Dashboards/ManagerDashboard.jsx"
import { OAuthPopup } from "@tasoskakour/react-use-oauth2";
import Database from "./Database.jsx"
import Login from "./Login/MainForm.jsx";
import React from "react";
import Dashboard from "./Dashboards/Dashboard.jsx";
import UserSettings from "./UserSettings.jsx";
import {Offcanvas} from 'bootstrap'
import CookiesConsentBanner from "./Cookies.jsx";
export default function App() {
  return (
    <div className="bg-background-dark fw-light text-standard-light text-light">
        {/*{!localStorage.token && !sessionStorage.token ? <Login/> : (<div>*/}
      <Nav />
      <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRight" aria-labelledby="offcanvasRightLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="offcanvasRightLabel">User settings</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <UserSettings />
        </div>
      </div>
      <CookiesConsentBanner />
      <div className="p-3">
        <BrowserRouter>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contact/suggestions" element={<Suggestions />} />
            <Route path="/contact/bugreports" element={<BugReports />} />
            <Route path="/*" element={<NoPage />} />
            <Route path="/interactive" element={<Interactive />} />
            <Route path="/dashboards" element={<DashboardEntry />} />
            <Route path="/dashboards/admin" element={<AdminDashboard />} />
            <Route path="/dashboards/devold" element={<DevDashboardOLD />} />
            <Route path="/dashboards/dev" element={<DevDashboard />} />
            <Route path="/dashboards/user" element={<UserDashboard />} />
            <Route path="/dashboards/sup" element={<SupDashboard />} />
            <Route path="/dashboards/manager" element={<ManagerDashboard />} />
            <Route path="/dashboards/main" element={<Dashboard />} />
            <Route path="/database" element={<Database />} />
            <Route element={<OAuthPopup />} path="/callback" />
          </Routes>
        </BrowserRouter>
      </div>
        {/*</div>)}*/}
    </div>

  )
}
