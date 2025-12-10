import React, { useEffect, useState } from 'react';
import { FiShield, FiSearch, FiCheck, FiX, FiFileText, FiDownload, FiCalendar, FiUser, FiEye } from 'react-icons/fi';

export default function KYCPage({ API_BASE, showToast }) {
  const [kycs, setKycs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchKYCs();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchKYCs();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [search]);

  async function fetchKYCs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter })
      });

      const res = await fetch(`${API_BASE}/api/kyc?${params}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch KYC requests');
      }

      const data = await res.json();
      setKycs(data.kycs || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error(err);
      showToast && showToast('error', err.message || 'Failed to load KYC requests');
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (kycId) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/${kycId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const errorData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(errorData.message || `Failed to accept KYC (${res.status})`);
      }

      showToast && showToast('success', 'KYC accepted successfully');
      fetchKYCs();
    } catch (err) {
      console.error('Accept error:', err);
      showToast && showToast('error', err.message || 'Failed to accept KYC');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast && showToast('error', 'Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/${rejectModal}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });

      const errorData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(errorData.message || `Failed to reject KYC (${res.status})`);
      }

      showToast && showToast('success', 'KYC rejected successfully');
      setRejectModal(null);
      setRejectReason('');
      fetchKYCs();
    } catch (err) {
      console.error('Reject error:', err);
      showToast && showToast('error', err.message || 'Failed to reject KYC');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      accepted: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };

    return (
      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredKycs = kycs.filter(kyc => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      kyc.lawyerId?.toString().toLowerCase().includes(searchLower) ||
      kyc.idDocument?.fileName?.toLowerCase().includes(searchLower) ||
      kyc.licenseDocument?.fileName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lawyer KYC</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : `${pagination.total} ${pagination.total === 1 ? 'request' : 'requests'}`}
            </p>
          </div>
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
              placeholder="Search by lawyer ID, document name..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white placeholder-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* KYC Requests List */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-4">Loading KYC requests...</p>
          </div>
        )}

        {!loading && filteredKycs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <FiShield className="mx-auto text-gray-400 text-4xl mb-3" />
            <p className="text-sm text-gray-500">No KYC requests found.</p>
          </div>
        )}

        {!loading && filteredKycs.map((kyc) => (
          <div
            key={kyc._id}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiShield className="text-white text-lg" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">KYC Request</h3>
                    {getStatusBadge(kyc.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <FiUser className="text-gray-400" />
                      <span>Lawyer ID: {kyc.lawyerId?.toString().slice(-8) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiCalendar className="text-gray-400" />
                      <span>
                        {kyc.submittedAt
                          ? new Date(kyc.submittedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* ID Document */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiFileText className="text-purple-600 text-sm" />
                  <span className="text-sm font-medium text-gray-900">ID Document</span>
                </div>
                <p className="text-xs text-gray-600 mb-2 truncate">{kyc.idDocument?.fileName || 'No file'}</p>
                {kyc.idDocument?.url && (
                  <div className="flex gap-2">
                    <a
                      href={kyc.idDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                    >
                      <FiEye className="text-xs" />
                      View
                    </a>
                    <a
                      href={kyc.idDocument.url}
                      download
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FiDownload className="text-xs" />
                      Download
                    </a>
                  </div>
                )}
              </div>

              {/* License Document */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiFileText className="text-blue-600 text-sm" />
                  <span className="text-sm font-medium text-gray-900">License Document</span>
                </div>
                <p className="text-xs text-gray-600 mb-2 truncate">{kyc.licenseDocument?.fileName || 'No file'}</p>
                {kyc.licenseDocument?.url && (
                  <div className="flex gap-2">
                    <a
                      href={kyc.licenseDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <FiEye className="text-xs" />
                      View
                    </a>
                    <a
                      href={kyc.licenseDocument.url}
                      download
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FiDownload className="text-xs" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {kyc.status === 'rejected' && kyc.rejectionReason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-900 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700">{kyc.rejectionReason}</p>
              </div>
            )}

            {/* Actions */}
            {kyc.status === 'pending' && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleAccept(kyc._id)}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiCheck className="text-sm" />
                  Accept
                </button>
                <button
                  onClick={() => setRejectModal(kyc._id)}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiX className="text-sm" />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white rounded-lg border border-gray-200 px-5 py-4">
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

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Reject KYC Request</h2>
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this KYC request. This will be visible to the lawyer.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows="4"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectReason.trim()}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Rejecting...' : 'Reject KYC'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
