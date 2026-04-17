import { FaDownload, FaCertificate, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { useDownloadCertificateMutation } from '../store/donationApi';
import { useToast } from '../components/ToastContainer';

const CertificateCard = ({ donation }) => {
  const toast = useToast();
  const [downloadCertificate, { isLoading: isDownloading }] = useDownloadCertificateMutation();

  const handleDownload = async () => {
    if (!donation.certificateCode) {
      toast.error('Certificate code not found');
      return;
    }

    try {
      const blob = await downloadCertificate(donation._id).unwrap();

      // Create blob link to download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Donation_Certificate_${donation.certificateCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download certificate. Please try again later.');
    }
  };

  return (
    <div className="certificate-card">
      <div className="cert-card-left">
        <div className="cert-icon-box">
          <FaCertificate className="cert-icon" />
        </div>
        <div className="cert-details">
          <h3>Donation Certificate</h3>
          <p>Issued on: {new Date(donation.certificateIssuedAt || donation.updatedAt || donation.donationDate).toLocaleDateString()}</p>
          <div className="verify-badge">
            <FaCheckCircle className="verify-icon" />
            <span>Verified Code: {donation.certificateCode}</span>
          </div>
        </div>
      </div>
      <button 
        className="download-btn" 
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
        <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
      </button>
    </div>
  );
};

export default CertificateCard;
