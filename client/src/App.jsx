import React, { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import BooksPage from './components/books/BooksPage';
import UsersPage from './components/users/UsersPage';
import KYCPage from './components/kyc/KYCPage';
import Toast from './components/common/Toast';

export default function App() {
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
  const [activePage, setActivePage] = useState('books');
  const [toast, setToast] = useState(null);

  const showToast = (type, message, data = null) => {
    setToast({ type, message, data });
    setTimeout(() => setToast(null), 4500);
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'books':
        return 'Manage Books';
      case 'users':
        return 'Users';
      case 'kyc':
        return 'Lawyer KYC';
      default:
        return 'Dashboard';
    }
  };

  return (
    <>
      <MainLayout pageTitle={getPageTitle()} activePage={activePage} setActivePage={setActivePage}>
        {activePage === 'books' && (
          <BooksPage API_BASE={API_BASE} showToast={showToast} />
        )}
        {activePage === 'users' && (
          <UsersPage API_BASE={API_BASE} showToast={showToast} />
        )}
        {activePage === 'kyc' && (
          <KYCPage API_BASE={API_BASE} showToast={showToast} />
        )}
      </MainLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
