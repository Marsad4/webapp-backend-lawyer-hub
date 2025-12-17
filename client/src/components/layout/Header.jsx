import React from 'react';

export default function Header({ pageTitle }) {
  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10 shadow-sm">
      <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{pageTitle || 'Dashboard'}</h1>
    </div>
  );
}
