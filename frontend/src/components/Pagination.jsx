import React, { useMemo, useState, useRef, useEffect } from 'react';
import '../components.css/Pagination.css';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logic for generating page numbers with ellipsis
  const pageRange = useMemo(() => {
    const range = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

      const showLeftDots = leftSiblingIndex > 2;
      const showRightDots = rightSiblingIndex < totalPages - 2;

      if (!showLeftDots && showRightDots) {
        const leftItemCount = 3 + 2;
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        return [...leftRange, '...', totalPages];
      }

      if (showLeftDots && !showRightDots) {
        const rightItemCount = 3 + 2;
        const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
        return [1, '...', ...rightRange];
      }

      if (showLeftDots && showRightDots) {
        const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
        return [1, '...', ...middleRange, '...', totalPages];
      }
    }
    return range;
  }, [currentPage, totalPages]);

  if (totalPages < 1) return null;

  return (
    <footer className="admin-footer-pagination">
      <div className="pagination-container">
        {/* Left Section: Controls */}
        <div className="pagination-controls">
          <button 
            className="pagination-btn prev" 
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div className="page-numbers">
            {pageRange.map((page, index) => (
              <button
                key={index}
                className={`page-num ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                disabled={page === '...'}
                onClick={() => page !== '...' && onPageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            className="pagination-btn next" 
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Right Section: Info & Settings */}
        <div className="pagination-right">
          <div className="pagination-info">
            {totalRecords === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalRecords)} - {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
          </div>

          <div className="pagination-settings">
            <label>Result per page</label>
            <div className="custom-select-wrapper" ref={dropdownRef}>
              <button 
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
              >
                <span>{pageSize}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isOpen && (
                <div className="custom-select-options">
                  {[5, 10, 15, 20, 50, 100].map(size => (
                    <div 
                      key={size}
                      className={`custom-option ${pageSize === size ? 'active' : ''}`}
                      onClick={() => {
                        onPageSizeChange(size);
                        setIsOpen(false);
                      }}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Pagination;
