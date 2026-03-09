import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';

const MainLayout = ({ children, title }) => {
    return (
        <div className="layout-container">
            <Sidebar />
            <div className="layout-content">
                <Topbar title={title} />
                <main className="layout-main">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
