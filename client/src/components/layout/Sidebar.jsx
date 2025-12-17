import React from 'react';
import { FiBook, FiUser, FiUsers, FiShield } from 'react-icons/fi';

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <div className="w-56 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-sm">
      {/* Logo Section */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <FiBook className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">LawyerHub</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
            RECORDS
          </div>
          <button
            onClick={() => setActivePage('books')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activePage === 'books'
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiBook className={`text-base ${activePage === 'books' ? 'text-purple-600' : 'text-gray-500'}`} />
            Manage Books
          </button>
          <button
            onClick={() => setActivePage('kyc')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1 ${
              activePage === 'kyc'
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiShield className={`text-base ${activePage === 'kyc' ? 'text-purple-600' : 'text-gray-500'}`} />
            Lawyer KYC
          </button>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
            USERS
          </div>
          <button
            onClick={() => setActivePage('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activePage === 'users'
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiUsers className={`text-base ${activePage === 'users' ? 'text-purple-600' : 'text-gray-500'}`} />
            Users
          </button>
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
            <FiUser className="text-white text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">Admin</div>
            <div className="text-xs text-gray-500 truncate">Administrator</div>
          </div>
        </div>
        <button className="w-full text-xs text-gray-600 hover:text-gray-900 py-2 transition-colors">
          Log out
        </button>
      </div>
    </div>
  );
}
