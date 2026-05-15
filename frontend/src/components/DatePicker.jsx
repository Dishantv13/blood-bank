import React, { useState, useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../components.css/DatePicker.css';

const DatePicker = ({ value, onChange, placeholder = "Select Date", minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'month', 'year'
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const calendarRef = useRef(null);
  const containerRef = useRef(null);

  // Month names for display
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days of week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Years for selector (range of 100 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Open/Close Animation
  useEffect(() => {
    if (isOpen) {
      setViewMode('calendar');
      gsap.fromTo(calendarRef.current,
        { opacity: 0, scale: 0.9, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  // Scroll active year into view
  useEffect(() => {
    if (viewMode === 'year') {
      const activeYearEl = document.getElementById(`year-${viewDate.getFullYear()}`);
      if (activeYearEl) {
        activeYearEl.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [viewMode, viewDate]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Padding for start of month
    const firstDay = date.getDay();
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [viewDate]);

  // Memoized minDate timestamp for efficient comparison
  const minTimestamp = useMemo(() => {
    if (!minDate) return null;
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return min.getTime();
  }, [minDate]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    
    // Strict minDate check using timestamps
    if (minTimestamp && date.getTime() < minTimestamp) return;

    onChange(date);
    setIsOpen(false);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isSelected = (date) => {
    if (!date || !value) return false;
    const d1 = new Date(date);
    const d2 = new Date(value);
    return d1.toDateString() === d2.toDateString();
  };

  const isToday = (date) => {
    if (!date) return false;
    return new Date().toDateString() === date.toDateString();
  };

  const isDisabled = (date) => {
    if (!date || !minTimestamp) return false;
    return date.getTime() < minTimestamp;
  };

  return (
    <div className="custom-datepicker-container" ref={containerRef}>
      <div 
        className={`datepicker-input ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaCalendarAlt className="calendar-icon" />
        <span className={!value ? 'placeholder' : ''}>
          {value ? formatDate(value) : placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="datepicker-overlay" ref={calendarRef}>
          <div className="datepicker-header">
            <button type="button" onClick={handlePrevMonth} className="nav-btn">
              <FaChevronLeft />
            </button>
            <div className="current-month-year">
              <span onClick={() => setViewMode('month')} className="header-clickable">
                {months[viewDate.getMonth()]}
              </span>
              <span onClick={() => setViewMode('year')} className="header-clickable">
                {viewDate.getFullYear()}
              </span>
            </div>
            <button type="button" onClick={handleNextMonth} className="nav-btn">
              <FaChevronRight />
            </button>
          </div>

          {viewMode === 'calendar' && (
            <>
              <div className="datepicker-weekdays">
                {daysOfWeek.map(day => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>

              <div className="datepicker-days">
                {daysInMonth.map((date, index) => (
                  <div 
                    key={index} 
                    className={`datepicker-day ${!date ? 'empty' : ''} ${isSelected(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''} ${isDisabled(date) ? 'disabled' : ''}`}
                    onClick={() => handleDateSelect(date)}
                  >
                    {date ? date.getDate() : ""}
                  </div>
                ))}
              </div>
            </>
          )}

          {viewMode === 'month' && (
            <div className="month-grid">
              {months.map((month, index) => (
                <div 
                  key={month} 
                  className={`month-item ${viewDate.getMonth() === index ? 'active' : ''}`}
                  onClick={() => {
                    setViewDate(new Date(viewDate.getFullYear(), index, 1));
                    setViewMode('calendar');
                  }}
                >
                  {month.substring(0, 3)}
                </div>
              ))}
            </div>
          )}

          {viewMode === 'year' && (
            <div className="year-grid">
              {years.map((year) => (
                <div 
                  key={year} 
                  id={`year-${year}`}
                  className={`year-item ${viewDate.getFullYear() === year ? 'active' : ''}`}
                  onClick={() => {
                    setViewDate(new Date(year, viewDate.getMonth(), 1));
                    setViewMode('calendar');
                  }}
                >
                  {year}
                </div>
              ))}
            </div>
          )}

          <div className="datepicker-footer">
            <button 
              type="button" 
              className="today-btn" 
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                // Check if today is allowed
                if (minTimestamp && today.getTime() < minTimestamp) {
                  // If today is disabled, just jump to minDate month
                  const jumpDate = new Date(minTimestamp);
                  setViewDate(jumpDate);
                  return;
                }
                setViewDate(today);
                handleDateSelect(today);
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
