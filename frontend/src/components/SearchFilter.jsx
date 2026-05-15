import React, { useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "../components.css/SearchFilter.css";

const SearchFilter = ({ 
  onSearch, 
  placeholder = "Search...", 
  initialValue = "",
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  const handleSearchClick = () => {
    onSearch(searchTerm);
  };

  return (
    <div className="search-filter-wrapper">
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            if (val === "") {
              onSearch("");
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {searchTerm && (
          <button 
            className="clear-search-btn" 
            onClick={handleClear}
            aria-label="Clear search"
          >
            <FaTimes />
          </button>
        )}
        <FaSearch 
          className="search-icon" 
          onClick={handleSearchClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};

export default SearchFilter;
