import React, { useEffect, useState } from 'react';
import { FiUsers, FiBriefcase, FiSearch, FiChevronDown, FiChevronUp, FiMail, FiPhone, FiCalendar, FiSliders, FiX, FiMapPin, FiFileText, FiEdit2, FiTrash2,  FiUser, FiGlobe } from 'react-icons/fi';

export default function UsersPage({ API_BASE, showToast }) {
  const [activeTab, setActiveTab] = useState('regular');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    role: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
useEffect(() => {
    fetchUsers();
  }, [activeTab, sortBy, sortOrder, pagination.page, filters]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [search]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const endpoint = activeTab === 'regular' ? '/regular' : '/lawyers';
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        search: search.trim(),
        ...(filters.role && { role: filters.role })
      });

      const res = await fetch(`${API_BASE}/api/users${endpoint}?${params}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error(err);
      showToast && showToast('error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ role: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = filters.role;

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <FiChevronUp className="text-xs" /> : <FiChevronDown className="text-xs" />;
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    if (activeTab === 'regular') {
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        isAdmin: user.isAdmin || false
      });
    } else {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        practiceAreas: user.practiceAreas ? user.practiceAreas.join(', ') : '',
        officeAddress: user.officeAddress || '',
        role: user.role || ''
      });
    }
  };

  const handleDelete = async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const endpoint = activeTab === 'regular' ? '/regular' : '/lawyers';
      const url = `${API_BASE}/api/users${endpoint}/${userId}`;
      
      console.log('Deleting user:', url);
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const errorData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(errorData.message || `Failed to delete user (${res.status})`);
      }

      showToast && showToast('success', 'User deleted successfully');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      console.error('Delete error:', err);
      showToast && showToast('error', err.message || 'Failed to delete user');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!editingUser || !editingUser._id) {
        throw new Error('User ID is required');
      }

      const endpoint = activeTab === 'regular' ? '/regular' : '/lawyers';
      const updateData = { ...formData };
      
      if (activeTab === 'lawyers' && updateData.practiceAreas) {
        updateData.practiceAreas = updateData.practiceAreas.split(',').map(a => a.trim()).filter(a => a);
      }

      const url = `${API_BASE}/api/users${endpoint}/${editingUser._id}`;
      
      console.log('Updating user:', url, updateData);

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const errorData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(errorData.message || `Failed to update user (${res.status})`);
      }

      showToast && showToast('success', 'User updated successfully');
      setEditingUser(null);
      setFormData({});
      fetchUsers();
    } catch (err) {
      console.error('Update error:', err);
      showToast && showToast('error', err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : `${pagination.total} ${pagination.total === 1 ? 'user' : 'users'}`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('regular');
              setFilters({ role: '' });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'regular'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiUsers className="inline mr-2 text-sm" />
            Regular Users
          </button>
          <button
            onClick={() => {
              setActiveTab('lawyers');
              setFilters({ role: '' });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'lawyers'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiBriefcase className="inline mr-2 text-sm" />
            Lawyers
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === 'regular' ? 'users by name, email, username...' : 'lawyers by name, email, practice areas...'}`}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap ${
              showFilters || hasActiveFilters
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiSliders className="text-sm" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full font-semibold">
                1
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Filter Options</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <FiX className="text-xs" />
                  Clear all
                </button>
              )}
            </div>
            <div>
              {activeTab === 'regular' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="lawyer">Lawyer</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-4">Loading users...</p>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">No {activeTab === 'regular' ? 'users' : 'lawyers'} found.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50/50 border-b border-gray-200">
                <tr>
                  {activeTab === 'regular' ? (
                    <>
                      <th className="px-4 py-2.5 text-left w-[14%]">
                        <button
                          onClick={() => handleSort('fullName')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Name
                          <SortIcon field="fullName" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[24%]">
                        <button
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Email
                          <SortIcon field="email" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[11%]">
                        <button
                          onClick={() => handleSort('username')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Username
                          <SortIcon field="username" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[15%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-2.5 text-left w-[9%]">
                        <button
                          onClick={() => handleSort('isAdmin')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Role
                          <SortIcon field="isAdmin" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[12%]">
                        <button
                          onClick={() => handleSort('createdAt')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Created
                          <SortIcon field="createdAt" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[15%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2.5 text-left w-[10%]">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Name
                          <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[16%]">
                        <button
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Email
                          <SortIcon field="email" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[12%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-2.5 text-left w-[12%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Practice Areas
                      </th>
                      <th className="px-4 py-2.5 text-left w-[15%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Office Address
                      </th>
                      <th className="px-4 py-2.5 text-left w-[13%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Bio
                      </th>
                      <th className="px-4 py-2.5 text-left w-[8%]">
                        <button
                          onClick={() => handleSort('role')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Role
                          <SortIcon field="role" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[8%]">
                        <button
                          onClick={() => handleSort('createdAt')}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          Date
                          <SortIcon field="createdAt" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 text-left w-[6%] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr 
                    key={user._id} 
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    {activeTab === 'regular' ? (
                      <>
                        <td className="px-4 py-2.5">
                          <div className="text-sm font-medium text-gray-900 truncate">{user.fullName || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <FiMail className="text-gray-400 text-xs flex-shrink-0" />
                            <span className="break-words" title={user.email || '—'}>{user.email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="text-sm text-gray-600 truncate" title={`@${user.username || '—'}`}>@{user.username || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {user.phone ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                              <FiPhone className="text-gray-400 text-xs flex-shrink-0" />
                              <span className="break-words" title={user.phone}>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${
                              user.isAdmin
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <FiCalendar className="text-gray-400 text-xs flex-shrink-0" />
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="text-sm" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user._id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5">
                          <div className="text-sm font-medium text-gray-900 truncate">{user.name || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <FiMail className="text-gray-400 text-xs flex-shrink-0" />
                            <span className="break-words" title={user.email || '—'}>{user.email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {user.phone ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                              <FiPhone className="text-gray-400 text-xs flex-shrink-0" />
                              <span className="break-words" title={user.phone}>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {user.practiceAreas && user.practiceAreas.length > 0 ? (
                            <div className="max-h-16 overflow-y-auto scrollbar-hide">
                              <div className="flex flex-wrap gap-1">
                                {user.practiceAreas.map((area, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md"
                                  >
                                    {area}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {user.officeAddress ? (
                            <div className="max-h-12 overflow-y-auto scrollbar-hide">
                              <div className="flex items-start gap-1.5 text-xs text-gray-600 leading-relaxed">
                                <FiMapPin className="text-gray-400 text-xs flex-shrink-0 mt-0.5" />
                                <span>{user.officeAddress}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {user.bio ? (
                            <div className="max-h-12 overflow-y-auto scrollbar-hide">
                              <div className="flex items-start gap-1.5 text-xs text-gray-600 leading-relaxed">
                                <FiFileText className="text-gray-400 text-xs flex-shrink-0 mt-0.5" />
                                <span>{user.bio}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {user.role ? (
                            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700">
                              {user.role}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <FiCalendar className="text-gray-400 text-xs flex-shrink-0" />
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="text-sm" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user._id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white text-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit {activeTab === 'regular' ? 'User' : 'Lawyer'}</h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setFormData({});
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {activeTab === 'regular' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={formData.isAdmin ? 'admin' : 'user'}
                      onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.value === 'admin' }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Practice Areas (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.practiceAreas}
                      onChange={(e) => setFormData(prev => ({ ...prev, practiceAreas: e.target.value }))}
                      placeholder="e.g. Criminal Law, Family Law"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Office Address</label>
                    <textarea
                      value={formData.officeAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, officeAddress: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="lawyer">Lawyer</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setFormData({});
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete {activeTab === 'regular' ? 'User' : 'Lawyer'}</h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this {activeTab === 'regular' ? 'user' : 'lawyer'}? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Card Modal */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    {activeTab === 'regular' ? (
                      <FiUser className="text-white text-2xl" />
                    ) : (
                      <FiBriefcase className="text-white text-2xl" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {activeTab === 'regular' ? selectedUser.fullName : selectedUser.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeTab === 'regular' ? `@${selectedUser.username}` : selectedUser.role || 'Lawyer'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiMail className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-words">{selectedUser.email || '—'}</p>
                    </div>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <FiPhone className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-sm font-medium text-gray-900 break-words">{selectedUser.phone}</p>
                      </div>
                    </div>
                  )}
                  {activeTab === 'regular' && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <FiUser className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Role</p>
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-md ${
                          selectedUser.isAdmin
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {selectedUser.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </div>
                    </div>
                  )}
                  {activeTab === 'lawyers' && selectedUser.role && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <FiBriefcase className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Role</p>
                        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-700">
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <FiCalendar className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedUser.createdAt
                          ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lawyer Specific Information */}
              {activeTab === 'lawyers' && (
                <>
                  {selectedUser.practiceAreas && selectedUser.practiceAreas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Practice Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.practiceAreas.map((area, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-100"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser.officeAddress && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Office Address</h3>
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiMapPin className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedUser.officeAddress}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.bio && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Bio</h3>
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiFileText className="text-purple-600 text-lg flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedUser.bio}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.languages && selectedUser.languages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.languages.map((lang, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg border border-green-100"
                          >
                            <FiGlobe className="inline mr-1.5 text-xs" />
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser.experienceYears && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Experience</h3>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <FiBriefcase className="text-purple-600 text-lg flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.experienceYears} {selectedUser.experienceYears === 1 ? 'year' : 'years'} of experience
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Regular User Additional Info */}
              {activeTab === 'regular' && selectedUser.photoUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Profile Photo</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <img 
                      src={selectedUser.photoUrl} 
                      alt={selectedUser.fullName}
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  handleEdit(selectedUser);
                }}
                className="px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
              >
                <FiEdit2 className="text-sm" />
                Edit
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setDeleteConfirm(selectedUser._id);
                }}
                className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <FiTrash2 className="text-sm" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
