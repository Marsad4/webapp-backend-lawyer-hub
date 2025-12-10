import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children, pageTitle, activePage, setActivePage }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="ml-56">
        <Header pageTitle={pageTitle} />
        <main className="pt-16">
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[calc(100vh-4rem-3rem)] overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
