import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const ReceiptUploadPage = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error'
  const [uploading, setUploading] = useState(false);
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setStatus('Please select a file to upload.');
      setStatusType('error');
      return;
    }

    const formData = new FormData();
    formData.append('receiptFile', file);
    if (orderId) formData.append('orderId', orderId);

    setUploading(true);
    try {
      const response = await api.post('/upload-receipt', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setStatus('Receipt uploaded successfully! Your order is now confirmed.');
        setStatusType('success');
        setTimeout(() => {
          navigate(orderId ? `/order-success?orderId=${encodeURIComponent(orderId)}` : '/order-success');
        }, 2000);
      } else {
        setStatus(response.data.message || 'Error uploading receipt. Please try again.');
        setStatusType('error');
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
      setStatus('Error occurred. Please try again.');
      setStatusType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="receipt-upload-wrapper">
      <header>
        <h1>Upload Payment Receipt</h1>
        <p className="subtitle">Confirm your bank transfer for HR Fastfood</p>
      </header>

      <section className="upload-section">
        <div className="upload-card">
          <form onSubmit={handleSubmit}>
            <label htmlFor="receiptFile">Choose receipt file (JPG, PNG, or PDF)</label>
            <input
              type="file"
              id="receiptFile"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button type="submit" className="upload-btn" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Receipt'}
            </button>
          </form>
          {status && <p id="uploadStatus" className={statusType}>{status}</p>}
        </div>
      </section>

      <footer><p>&copy; 2025 HR Fastfood. All rights reserved.</p></footer>
    </div>
  );
};

export default ReceiptUploadPage;
