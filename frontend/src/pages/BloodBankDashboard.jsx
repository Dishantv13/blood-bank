import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../store/apiSlice';
import { Link, useNavigate } from 'react-router-dom';
import { useGetBloodBankInventoryQuery, useGetBloodBankProfileQuery, useUpdateBloodBankProfileMutation, useUpdateBloodBankInventoryMutation, useUploadBloodBankPhotoMutation, useGetAllBloodBanksQuery, useChangeBloodBankPasswordMutation } from '../store/bloodBankApi';
import { useGetBloodBankRequestsQuery, useGetBloodBankApprovedRequestsQuery, useApproveRequestMutation, useRejectRequestMutation } from '../store/requestApi';
import { useGetBloodBankCampsQuery, useDeleteCampMutation, useLazyGetCampRegistrationsQuery, useDeleteCampRegistrationMutation, useCreateCampMutation, useUpdateCampMutation } from '../store/bloodCampApi';
import { useGetBloodBankEventsQuery } from '../store/eventApi';
import { useToast } from '../components/ToastContainer';
import MapModal from '../components/MapModal';
import BloodBankEventManager from '../components/BloodBankEventManager';
import BloodBankDonations from '../components/BloodBankDonations';
import ThemeToggle from '../components/ThemeToggle';
import SkeletonLoader from '../components/SkeletonLoader';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/BloodBankDashboard.css';

const BloodBankDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { success, error, info, warning } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('bloodBankDashboardTab') || 'overview';
  });
  const [bloodBank, setBloodBank] = useState(() => {
    try {
      const cached = localStorage.getItem('bloodBankData');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inventory, setInventory] = useState(() => {
    try {
      const cached = localStorage.getItem('inventory_last');
      return cached ? JSON.parse(cached) : [
        { type: 'A+', units: 0, status: 'critical' },
        { type: 'A-', units: 0, status: 'critical' },
        { type: 'B+', units: 0, status: 'critical' },
        { type: 'B-', units: 0, status: 'critical' },
        { type: 'AB+', units: 0, status: 'critical' },
        { type: 'AB-', units: 0, status: 'critical' },
        { type: 'O+', units: 0, status: 'critical' },
        { type: 'O-', units: 0, status: 'critical' }
      ];
    } catch (e) {
      return [
        { type: 'A+', units: 0, status: 'critical' },
        { type: 'A-', units: 0, status: 'critical' },
        { type: 'B+', units: 0, status: 'critical' },
        { type: 'B-', units: 0, status: 'critical' },
        { type: 'AB+', units: 0, status: 'critical' },
        { type: 'AB-', units: 0, status: 'critical' },
        { type: 'O+', units: 0, status: 'critical' },
        { type: 'O-', units: 0, status: 'critical' }
      ];
    }
  });
  const [camps, setCamps] = useState([]);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [showCampModal, setShowCampModal] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [showCampDetails, setShowCampDetails] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [bloodBanksList, setBloodBanksList] = useState([]);
  const [bloodBankPhoto, setBloodBankPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [savingInventory, setSavingInventory] = useState(false);
  const [savingSection, setSavingSection] = useState(null); // 'profile', 'hours', 'preferences'
  const [inventoryChanged, setInventoryChanged] = useState(false);
  const [inventorySaveError, setInventorySaveError] = useState('');
  const [requestsSubTab, setRequestsSubTab] = useState('pending'); // 'pending' or 'approved'
  const [requestSourceTab, setRequestSourceTab] = useState('user');
  const [campForm, setCampForm] = useState({
    name: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    venue: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
    targetUnits: 100,
    description: ''
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [gettingBankLocation, setGettingBankLocation] = useState(false);
  const [bankLocation, setBankLocation] = useState(null);
  const [showBankMapModal, setShowBankMapModal] = useState(false);

  // Settings States
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [operatingHours, setOperatingHours] = useState({
    open: '09:00',
    close: '17:00',
    openOnWeekends: true,
    emergency247: true
  });
  const [preferences, setPreferences] = useState({
    emailNotify: true,
    smsNotify: true,
    weeklyReport: true,
    donorNotify: false
  });

  // RTK Queries - Optimized with skipping to improve load times
  const { data: profileData, isFetching: loadingProfile } = useGetBloodBankProfileQuery();

  const { data: inventoryData, isFetching: loadingInventory } = useGetBloodBankInventoryQuery(undefined, {
    skip: activeTab !== 'inventory' && activeTab !== 'overview'
  });

  const { data: requestsData, isFetching: loadingRequests } = useGetBloodBankRequestsQuery({
    status: 'pending',
    ...(requestSourceTab === 'user'
      ? { requestType: 'user' }
      : requestSourceTab === 'bank'
        ? { requestType: 'bloodbank', direction: 'received' }
        : { requestType: 'bloodbank', direction: 'sent' }),
    limit: 500
  }, {
    skip: activeTab !== 'requests' && activeTab !== 'overview'
  });

  const { data: approvedRequestsData, isFetching: loadingApprovedRequests } = useGetBloodBankApprovedRequestsQuery({
    ...(requestSourceTab === 'user'
      ? { requestType: 'user' }
      : requestSourceTab === 'bank'
        ? { requestType: 'bloodbank', direction: 'received' }
        : { requestType: 'bloodbank', direction: 'sent' }),
    limit: 4
  }, {
    skip: activeTab !== 'requests' || requestsSubTab !== 'approved'
  });

  const { data: campsData, isFetching: loadingCamps } = useGetBloodBankCampsQuery(undefined, {
    skip: activeTab !== 'camps' && activeTab !== 'overview'
  });

  const { data: eventsData, isFetching: loadingEvents } = useGetBloodBankEventsQuery(undefined, {
    skip: activeTab !== 'events' && activeTab !== 'overview'
  });

  const { data: bloodBanksData, isFetching: loadingBloodBanks } = useGetAllBloodBanksQuery(undefined, {
    skip: activeTab !== 'inventory' && activeTab !== 'bloodbanks'
  });

  // RTK Mutations
  const [updateProfile, { isLoading: updatingProfile }] = useUpdateBloodBankProfileMutation();
  const [updateInventoryMutation] = useUpdateBloodBankInventoryMutation();
  const [uploadPhoto, { isLoading: uploadingPhoto }] = useUploadBloodBankPhotoMutation();
  const [approveRequestMutation] = useApproveRequestMutation();
  const [rejectRequestMutation] = useRejectRequestMutation();
  const [createCampMutation] = useCreateCampMutation();
  const [updateCampMutation] = useUpdateCampMutation();
  const [deleteCampMutation] = useDeleteCampMutation();
  const [deleteCampRegistrationMutation] = useDeleteCampRegistrationMutation();
  const [triggerGetRegistrations] = useLazyGetCampRegistrationsQuery();
  const [changePassword, { isLoading: changingPassword }] = useChangeBloodBankPasswordMutation();

  // Only show full-screen loader if we have NO profile data
  const loading = (loadingProfile && !bloodBank);

  // Settings Dirty Status Detection
  const isProfileChanged = bloodBank && (
    profileForm.name !== (bloodBank.name || '') ||
    profileForm.phone !== (bloodBank.phone || '') ||
    profileForm.address !== (bloodBank.address || '')
  );

  const isHoursChanged = bloodBank && bloodBank.operatingHours && (
    operatingHours.open !== (bloodBank.operatingHours.open || '09:00') ||
    operatingHours.close !== (bloodBank.operatingHours.close || '17:00') ||
    operatingHours.openOnWeekends !== (bloodBank.operatingHours.openOnWeekends ?? true) ||
    operatingHours.emergency247 !== (bloodBank.operatingHours.emergency247 ?? true)
  );

  const isPreferencesChanged = bloodBank && bloodBank.preferences && (
    preferences.emailNotify !== (bloodBank.preferences.emailNotify ?? true) ||
    preferences.smsNotify !== (bloodBank.preferences.smsNotify ?? true) ||
    preferences.weeklyReport !== (bloodBank.preferences.weeklyReport ?? true) ||
    preferences.donorNotify !== (bloodBank.preferences.donorNotify ?? false)
  );

  const isPasswordReady = passwordForm.currentPassword && passwordForm.newPassword && passwordForm.confirmPassword;

  // Map inventory from query
  useEffect(() => {
    const dataToUse = inventoryData?.data || inventoryData?.inventory;
    if (dataToUse && !inventoryChanged) {
      const mappedInventory = dataToUse.map(item => ({
        type: item.bloodGroup || item.type,
        units: item.units || 0,
        status: item.units > 10 ? 'good' : item.units > 5 ? 'low' : 'critical',
        lastUpdated: item.lastUpdated
      }));
      setInventory(mappedInventory);

      const bloodBankId = bloodBank?.id || bloodBank?._id || 'default';
      localStorage.setItem(`inventory_${bloodBankId}`, JSON.stringify(mappedInventory));
      localStorage.setItem('inventory_last', JSON.stringify(mappedInventory));
    }
  }, [inventoryData, bloodBank, inventoryChanged]);

  // Effect to automatically determine if inventory has changed based on server data
  useEffect(() => {
    const dataToUse = inventoryData?.data || inventoryData?.inventory;
    if (!dataToUse || !inventory.length) {
      setInventoryChanged(false);
      return;
    }

    // Compare current state with data from the server
    const differencesFound = inventory.some(item => {
      const serverItem = dataToUse.find(s => (s.bloodGroup || s.type) === item.type);
      if (!serverItem) return false;
      return (serverItem.units || 0) !== item.units;
    });

    setInventoryChanged(differencesFound);
  }, [inventory, inventoryData]);

  // Map requests from query
  useEffect(() => {
    if (requestsData?.requests) {
      setRequests(requestsData.requests);
    }
    if (approvedRequestsData?.requests) {
      setApprovedRequests(approvedRequestsData.requests);
    }
  }, [requestsData, approvedRequestsData]);

  // Map camps/events
  useEffect(() => {
    if (campsData) {
      setCamps(Array.isArray(campsData) ? campsData : campsData.camps || []);
    }
    if (eventsData) {
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData.events || []);
    }
    if (bloodBanksData) {
      setBloodBanksList(Array.isArray(bloodBanksData) ? bloodBanksData : bloodBanksData.data || []);
    }
  }, [campsData, eventsData, bloodBanksData]);

  // Handle browser back/refresh with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (inventoryChanged) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inventoryChanged]);

  // Map profile info
  useEffect(() => {
    if (profileData) {
      const bb = profileData.data || profileData.bloodBank || profileData;
      setBloodBank(bb);

      // Sync form states
      setProfileForm({
        name: bb.name || '',
        phone: bb.phone || '',
        address: bb.address || ''
      });

      if (bb.operatingHours) {
        setOperatingHours({
          open: bb.operatingHours.open || '09:00',
          close: bb.operatingHours.close || '17:00',
          openOnWeekends: bb.operatingHours.openOnWeekends ?? true,
          emergency247: bb.operatingHours.emergency247 ?? true
        });
      }

      if (bb.preferences) {
        setPreferences({
          emailNotify: bb.preferences.emailNotify ?? true,
          smsNotify: bb.preferences.smsNotify ?? true,
          weeklyReport: bb.preferences.weeklyReport ?? true,
          donorNotify: bb.preferences.donorNotify ?? false
        });
      }

      if (bb.profileImage) {
        setPhotoPreview(bb.profileImage);
      }
      if (bb.location?.coordinates && (bb.location.coordinates[0] !== 0 || bb.location.coordinates[1] !== 0)) {
        setBankLocation({ type: 'Point', coordinates: bb.location.coordinates });
      }
      const existingData = JSON.parse(localStorage.getItem('bloodBankData') || '{}');
      localStorage.setItem('bloodBankData', JSON.stringify({ ...existingData, ...bb }));
    }
  }, [profileData]);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bloodBankDashboardTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Check if blood bank is logged in
    const token = localStorage.getItem('bloodBankToken');
    const data = localStorage.getItem('bloodBankData');

    if (!token || !data) {
      navigate(ROUTE_PATH.BLOOD_BANK_LOGIN);
      return;
    }

    const bloodBankData = JSON.parse(data);
    setBloodBank(bloodBankData);

    // Initial inventory from localStorage for snappiness
    const bloodBankId = bloodBankData.id || bloodBankData._id || 'default';
    const savedInventory = localStorage.getItem(`inventory_${bloodBankId}`);
    if (savedInventory) {
      try {
        const parsedInventory = JSON.parse(savedInventory);
        if (parsedInventory && parsedInventory.length > 0) {
          setInventory(parsedInventory);
        }
      } catch (e) { }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('bloodBankToken');
    localStorage.removeItem('bloodBankData');
    // Reset RTK Query cache to clear data from previous session
    dispatch(apiSlice.util.resetApiState());
    navigate(ROUTE_PATH.BLOOD_BANK_LOGIN);
  };

  const handleCampFormChange = (e) => {
    setCampForm({
      ...campForm,
      [e.target.name]: e.target.value
    });
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      error('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCampForm(prev => ({ ...prev, latitude, longitude }));

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'RaktSarthi Blood Bank System'
              }
            }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch address');
          }

          const data = await response.json();

          if (data && data.address) {
            setCampForm(prev => ({
              ...prev,
              address: data.address.road || data.address.suburb || data.display_name || '',
              city: data.address.city || data.address.town || data.address.village || data.address.county || '',
              state: data.address.state || '',
              pincode: data.address.postcode || ''
            }));
            success('Location fetched successfully!');
          } else {
            warning('Location coordinates captured, but address details could not be retrieved. Please enter manually.');
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
          warning('Location coordinates captured, but address could not be retrieved. Please enter address manually.');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to retrieve your location. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or enter address manually.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }

        error(errorMessage);
        setFetchingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  };

  const handleGetBankLocation = () => {
    if (!navigator.geolocation) {
      error('Geolocation is not supported by your browser');
      return;
    }

    setGettingBankLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setBankLocation({ type: 'Point', coordinates: [longitude, latitude] });

        try {
          // Update profile with new location
          await updateProfile({
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          }).unwrap();
          success('Hospital location updated successfully!');
        } catch (err) {
          console.error('Error updating bank location:', err);
          error('Location captured but failed to save to profile. Please try again.');
        } finally {
          setGettingBankLocation(false);
        }
      },
      (err) => {
        console.error('Error getting location:', err);
        error('Unable to retrieve your location. Please check browser permissions.');
        setGettingBankLocation(false);
      }
    );
  };

  const handleDeleteCamp = async (campId) => {
    if (window.confirm('Are you sure you want to delete this camp?')) {
      try {
        await deleteCampMutation(campId).unwrap();
        addNotification(`Camp deleted successfully`);
      } catch (err) {
        console.error('Error deleting camp:', err);
        addNotification('Error deleting camp', 'error');
      }
    }
  };

  const handleViewCamp = (camp) => {
    setSelectedCamp(camp);
    setShowCampDetails(true);
  };

  const handleViewRegistrations = async (camp) => {
    setSelectedCamp(camp);
    try {
      // Fetch the latest camp data with registrations using RTK Query lazy trigger
      const response = await triggerGetRegistrations(camp._id).unwrap();

      const updatedCamp = {
        ...camp,
        registeredDonors: response.registrations || response || []
      };
      setSelectedCamp(updatedCamp);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      // Fallback to camp data we have
      setSelectedCamp(camp);
    }

    setShowRegistrations(true);
  };

  const handleDeleteDonor = async (campId, donorId) => {
    if (!window.confirm('Are you sure you want to remove this donor registration?')) {
      return;
    }

    try {
      await deleteCampRegistrationMutation({ campId, donorId }).unwrap();
      addNotification('Donor registration removed successfully');
    } catch (err) {
      console.error('Error deleting donor:', err);
      const errorMsg = err.data?.message || 'Failed to remove donor registration';
      error(errorMsg);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this blood request?')) {
      return;
    }

    try {
      await approveRequestMutation({
        id: requestId,
        data: { responseNote: 'Request approved. Blood units are available.' }
      }).unwrap();

      addNotification('Blood request approved successfully');
      success('Blood request approved successfully');
    } catch (err) {
      console.error('Error approving request:', err);
      const errorMessage = err.data?.message || 'Failed to approve request. Please try again.';
      addNotification(errorMessage);
      error(errorMessage);
    }
  };

  // Handle Save Inventory button click
  const handleSaveInventory = async () => {
    setSavingInventory(true);
    setInventorySaveError('');

    try {
      const backendInventory = inventory.map(item => ({
        bloodGroup: item.type || item.bloodGroup,
        units: item.units,
        lastUpdated: new Date()
      }));

      await updateInventoryMutation({ inventory: backendInventory }).unwrap();

      success('Inventory saved successfully!');
      addNotification('Inventory saved successfully!');
    } catch (err) {
      console.error('Error saving inventory:', err);
      const errorMessage = err.data?.message || err.message || 'Failed to save inventory. Please try again.';
      setInventorySaveError(errorMessage);
    } finally {
      setSavingInventory(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('File size should not exceed 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      error('Please select an image file');
      return;
    }

    setBloodBankPhoto(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!bloodBankPhoto) {
      warning('Please select a photo file first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('photo', bloodBankPhoto);

      await uploadPhoto(formData).unwrap();
      
      addNotification('Hospital photo uploaded successfully!');
      success('Hospital photo uploaded successfully!');
      setBloodBankPhoto(null);
    } catch (err) {
      console.error('Error uploading photo:', err);
      // More descriptive error if available
      const errorMsg = err.data?.message || 'Failed to upload photo. Please try again.';
      error(errorMsg);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');

    if (reason === null) return;

    try {
      await rejectRequestMutation({
        id: requestId,
        data: { responseNote: reason || 'Request rejected due to unavailability of blood units.' }
      }).unwrap();

      addNotification('Blood request rejected');
      info('Blood request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      const errorMessage = err.data?.message || 'Failed to reject request. Please try again.';
      addNotification(errorMessage);
      error(errorMessage);
    }
  };

  const handleCreateCamp = async (e) => {
    e.preventDefault();
    console.log('Submitting camp form...', campForm);

    try {
      const campData = {
        name: campForm.name,
        date: campForm.date,
        startTime: campForm.startTime,
        endTime: campForm.endTime,
        venue: campForm.venue,
        address: campForm.address,
        city: campForm.city,
        state: campForm.state,
        pincode: campForm.pincode,
        targetUnits: parseInt(campForm.targetUnits) || 0,
        description: campForm.description,
        contactPhone: bloodBank?.phone || '',
        contactEmail: bloodBank?.email || '',
        latitude: campForm.latitude,
        longitude: campForm.longitude
      };

      console.log('Sending camp data to API:', campData);

      if (editingCamp) {
        await updateCampMutation({ id: editingCamp._id, ...campData }).unwrap();
        addNotification(`Blood camp "${campForm.name}" updated successfully!`);
        success('Blood camp updated successfully!');
      } else {
        await createCampMutation(campData).unwrap();
        addNotification(`New blood camp "${campForm.name}" created successfully and is now visible to donors!`);
        success('Blood camp created successfully!');
      }

      setShowCampModal(false);
      setEditingCamp(null);
      setCampForm({
        name: '',
        date: '',
        startTime: '09:00',
        endTime: '17:00',
        venue: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: null,
        longitude: null,
        targetUnits: 100,
        description: ''
      });
    } catch (err) {
      console.error('Error saving camp:', err);
      error('Failed to save camp. Please try again.');
    }
  };

  const handleEditCamp = (camp) => {
    setCampForm({
      name: camp.name || '',
      date: camp.date ? camp.date.split('T')[0] : '',
      startTime: camp.startTime || '09:00',
      endTime: camp.endTime || '17:00',
      venue: camp.venue || '',
      address: camp.address || '',
      city: camp.city || '',
      state: camp.state || '',
      pincode: camp.pincode || '',
      latitude: camp.latitude || null,
      longitude: camp.longitude || null,
      targetUnits: camp.targetUnits || 100,
      description: camp.description || ''
    });
    setEditingCamp(camp);
    setShowCampModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingSection('profile');
    try {
      await updateProfile(profileForm).unwrap();
      success('Hospital profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to update profile';
      error(msg);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveHours = async () => {
    setSavingSection('hours');
    try {
      await updateProfile({ operatingHours }).unwrap();
      success('Operating hours updated successfully!');
    } catch (err) {
      console.error('Error saving hours:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to update operating hours';
      error(msg);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSavePreferences = async () => {
    setSavingSection('preferences');
    try {
      await updateProfile({ preferences }).unwrap();
      success('Notification preferences updated successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to update preferences';
      error(msg);
    } finally {
      setSavingSection(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      error('New password must be different from current password');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Passwords do not match');
      return;
    }
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      error('Please fill in all password fields');
      return;
    }
    try {
      // First unwrap the mutation result to ensure errors are caught
      const result = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }).unwrap();

      // Only proceed to success if the mutation didn't throw
      success('Password changed successfully! Please login again with your new password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Auto logout after change
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (err) {
      console.error('Password change error details:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to change password';
      error(msg);
    }
  };

  const addNotification = (message) => {
    const newNotif = {
      message,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const updateInventory = (type, change) => {
    setInventory(prev => {
      const updated = prev.map(item => {
        if (item.type === type) {
          const newUnits = Math.max(0, item.units + change);
          let status = 'good';
          if (newUnits <= 5) status = 'critical';
          else if (newUnits <= 10) status = 'low';
          return { ...item, units: newUnits, status };
        }
        return item;
      });

      return updated;
    });
  };

  const handleUnitsInputChange = (type, value) => {
    // Convert to number and prevent leading zeros
    const newUnits = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(newUnits) || newUnits < 0 || newUnits > 999) return;

    setInventory(prev => {
      const updated = prev.map(item => {
        if (item.type === type) {
          let status = 'good';
          if (newUnits <= 5) status = 'critical';
          else if (newUnits <= 10) status = 'low';
          return { ...item, units: newUnits, status };
        }
        return item;
      });
      return updated;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#16a34a';
      case 'low': return '#f59e0b';
      case 'critical': return '#dc2626';
      default: return '#666';
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isUpcomingDate = (dateValue) => {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return false;
    return parsedDate >= today;
  };

  const upcomingCampsList = camps
    .filter(camp => camp.status !== 'completed' && isUpcomingDate(camp.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastCampsList = camps
    .filter(camp => camp.status === 'completed' || !isUpcomingDate(camp.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingEventsList = events
    .filter(event => isUpcomingDate(event.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0);
  const criticalTypes = inventory.filter(item => item.status === 'critical').length;
  const upcomingCamps = upcomingCampsList.length;
  const currentBankId = String(bloodBank?._id || bloodBank?.id || '');

  const isInterBankRequest = (request) => request?.requestType === 'bloodbank';
  const isOutgoingInterBankRequest = (request) => {
    const requesterId = String(request?.requestingBloodBank?._id || request?.requestingBloodBank?.id || request?.requestingBloodBank || '');
    return isInterBankRequest(request) && requesterId === currentBankId;
  };

  const pendingRequests = requests.filter((request) => {
    const requestStatus = String(request?.status || '').toLowerCase();
    const responseStatus = String(request?.bloodBankResponse?.status || '').toLowerCase();

    if (requestStatus !== 'pending') return false;
    return !responseStatus || responseStatus === 'pending';
  });

  if (loading) {
    return <SkeletonLoader />;
  }

  const handleTabChange = (tab) => {
    if (inventoryChanged && activeTab === 'inventory' && tab !== 'inventory') {
      if (!window.confirm('You have unsaved inventory changes. Are you sure you want to leave this tab?')) {
        return;
      }

      // Reset inventory state to match server data
      const dataToUse = inventoryData?.data || inventoryData?.inventory;
      if (dataToUse) {
        setInventory(dataToUse.map(item => ({
          type: item.bloodGroup || item.type,
          units: item.units || 0,
          status: item.units > 10 ? 'good' : item.units > 5 ? 'low' : 'critical',
          lastUpdated: item.lastUpdated
        })));
      }
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const formatAddress = (address) => {
    if (!address) return 'Address not available';
    if (typeof address === 'string') return address;

    const parts = [address.street, address.city, address.state, address.zipCode || address.pincode]
      .filter(Boolean);
    return parts.length ? parts.join(', ') : 'Address not available';
  };

  const formatOperatingHours = (operatingHours) => {
    if (!operatingHours) return 'Hours not available';
    if (typeof operatingHours === 'string') return operatingHours;

    const open = operatingHours.open || 'N/A';
    const close = operatingHours.close || 'N/A';
    return `${open} - ${close}`;
  };

  const handleViewBloodBankDetails = (bloodBankItem) => {
    const bankId = bloodBankItem?._id || bloodBankItem?.id;
    if (!bankId) {
      error('Unable to open details for this blood bank');
      return;
    }

    navigate(ROUTE_PATH.BLOOD_BANK_DETAILS.replace(":bankId", bankId), {
      state: { bloodBank: bloodBankItem }
    });
  };

  const directoryBloodBanks = bloodBanksList.filter((bank) => {
    const bankId = String(bank?._id || bank?.id || '');
    return bankId && bankId !== currentBankId;
  });

  const renderCampCard = (camp) => {
    const isPastCamp = camp.status === 'completed' || !isUpcomingDate(camp.date);
    const campStatus = isPastCamp ? 'completed' : (camp.status || 'scheduled');
    const registeredCount = camp.registeredDonors?.length || 0;
    const targetUnits = camp.targetUnits || 1;
    const progressPercentage = Math.round((registeredCount / targetUnits) * 100);

    return (
      <div key={camp._id} className={`camp-card event-style-card ${isPastCamp ? 'past-camp' : ''}`}>
        {/* {isPastCamp && <div className="past-camp-overlay"></div>} */}
        <div className="event-badge camp-badge">
          Blood Camp
        </div>

        <div className="event-header">
          <h3>{camp.name}</h3>
          <span className={`camp-status ${campStatus}`}>{campStatus}</span>
        </div>

        <p className="event-description">{camp.description || 'Blood donation camp organized by blood bank'}</p>

        <div className="event-info-grid">
          <div className="info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{new Date(camp.date).toLocaleDateString()}</span>
          </div>

          <div className="info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{camp.startTime || '09:00'} - {camp.endTime || '17:00'}</span>
          </div>

          <div className="info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{camp.venue}, {camp.city}</span>
          </div>

          <div className="info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{registeredCount} / {camp.targetUnits} donors</span>
          </div>
        </div>

        <div className="camp-contact-info">
          <p>
            <strong>Contact:</strong> {bloodBank?.email || 'N/A'} | {bloodBank?.phone || 'N/A'}
          </p>
        </div>

        <div className="camp-organizer-info">
          <p>
            <strong>Organized by:</strong> {bloodBank?.name || 'Blood Bank'}
          </p>
        </div>

        <div className="camp-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (registeredCount / targetUnits) * 100)}%`,
                backgroundColor: registeredCount >= targetUnits ? '#b91c1c' : '#dc2626'
              }}
            ></div>
          </div>
          <div className="progress-percentage">
            {progressPercentage}%
          </div>
        </div>

        <div className="camp-actions-footer">
          <button
            className="action-btn details-btn"
            onClick={() => handleViewCamp(camp)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Details
          </button>
          <button
            className="action-btn edit-camp"
            onClick={() => handleEditCamp(camp)}
            disabled={isPastCamp}
            title={isPastCamp ? 'Cannot edit past camps' : 'Edit camp'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Edit
          </button>
          <button
            className="action-btn registrations-btn"
            onClick={() => handleViewRegistrations(camp)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Regs
          </button>
          <button
            className="action-btn delete-camp"
            onClick={() => handleDeleteCamp(camp._id)}
            disabled={isPastCamp}
            title={isPastCamp ? 'Cannot delete past camps' : 'Delete camp'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="blood-bank-dashboard">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h2>{bloodBank?.name || 'Blood Bank'}</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Overview
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => handleTabChange('inventory')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Inventory
          </button>

          <button
            className={`nav-item ${activeTab === 'camps' ? 'active' : ''}`}
            onClick={() => handleTabChange('camps')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Blood Camps
          </button>

          <button
            className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Requests
          </button>

          <button
            className={`nav-item ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => handleTabChange('donations')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Donations
          </button>

          <button
            className={`nav-item ${activeTab === 'bloodbanks' ? 'active' : ''}`}
            onClick={() => handleTabChange('bloodbanks')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Blood Banks
          </button>

          <button
            className={`nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => handleTabChange('events')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Events
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="header-left">
            <h1>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'inventory' && 'Blood Inventory'}
              {activeTab === 'camps' && 'Blood Camps'}
              {activeTab === 'requests' && 'Blood Requests'}
              {activeTab === 'donations' && 'Donations'}
              {activeTab === 'bloodbanks' && 'Blood Banks Directory'}
              {activeTab === 'events' && 'Events Management'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p>Welcome back, {bloodBank?.name}</p>
          </div>
          <div className="header-right">
            <ThemeToggle />
            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setNotifications([])}>Clear All</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="no-notifications">
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((notif, index) => (
                        <div key={index} className="notification-item">
                          <div className="notif-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="notif-content">
                            <p>{notif.message}</p>
                            <span className="notif-time">{notif.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Link to={ROUTE_PATH.LOGIN} className="header-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </Link>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #e63946, #d62828)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{totalUnits}</h3>
                    <p>Total Units</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{criticalTypes}</h3>
                    <p>Critical Types</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{upcomingCamps}</h3>
                    <p>Upcoming Camps</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <circle cx="12" cy="16" r="2" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{upcomingEventsList.length}</h3>
                    <p>Upcoming Events</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{requests.length}</h3>
                    <p>Pending Requests</p>
                  </div>
                </div>
              </div>

              <div className="overview-grid">
                <div className="overview-card">
                  <h3>Quick Inventory Status</h3>
                  <div className="mini-inventory">
                    {inventory.map(item => (
                      <div key={item.type} className="mini-inv-item">
                        <span className="blood-type">{item.type}</span>
                        <div className="inv-bar">
                          <div
                            className="inv-bar-fill"
                            style={{
                              width: `${Math.min(100, (item.units / 50) * 100)}%`,
                              background: getStatusColor(item.status)
                            }}
                          ></div>
                        </div>
                        <span className="units">{item.units}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overview-card">
                  <h3>Upcoming Camps</h3>
                  <div className="mini-camps scrollable">
                    {upcomingCampsList.map(camp => (
                      <div key={camp._id} className="mini-camp-item">
                        <div className="camp-date">
                          <span className="day">{new Date(camp.date).getDate()}</span>
                          <span className="month">{new Date(camp.date).toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div className="camp-info">
                          <h4>{camp.name}</h4>
                          <p>{camp.venue}, {camp.city}</p>
                        </div>
                      </div>
                    ))}
                    {upcomingCampsList.length === 0 && (
                      <p className="no-data">No upcoming camps</p>
                    )}
                  </div>
                </div>

                <div className="overview-card">
                  <h3>Upcoming Events</h3>
                  <div className="mini-camps scrollable">
                    {upcomingEventsList.map(event => (
                      <div key={event._id} className="mini-camp-item event-item">
                        <div className="camp-date">
                          <span className="day">{new Date(event.date).getDate()}</span>
                          <span className="month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div className="camp-info">
                          <h4>{event.title}</h4>
                          <p>{event.location?.name || event.location?.address || 'Location TBD'}</p>
                        </div>
                      </div>
                    ))}
                    {upcomingEventsList.length === 0 && (
                      <p className="no-data">No upcoming events</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="inventory-content">
              <div className="inventory-actions">
                <button
                  className={`save-inventory-btn ${inventoryChanged ? 'has-changes' : ''} ${savingInventory ? 'saving' : ''}`}
                  onClick={handleSaveInventory}
                  disabled={savingInventory}
                >
                  {savingInventory ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Save Inventory
                    </>
                  )}
                </button>
                {inventorySaveError && (
                  <div className="inventory-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {inventorySaveError}
                  </div>
                )}
              </div>
              <div className="inventory-grid">
                {inventory.map(item => (
                  <div key={item.type} className="inventory-card">
                    <div className="inv-header">
                      <span className="blood-type-large">{item.type}</span>
                      <span className={`status-badge ${item.status}`}>{item.status}</span>
                    </div>
                    <div className="inv-controls">
                      <button
                        className="inv-btn inv-btn-decrease"
                        onClick={() => updateInventory(item.type, -1)}
                        disabled={item.units <= 0}
                        title="Decrease by 1"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <div className="inv-value">
                        <input
                          type="number"
                          className="inv-input"
                          value={item.units === 0 ? '' : item.units}
                          placeholder="0"
                          onChange={(e) => handleUnitsInputChange(item.type, e.target.value)}
                          min="0"
                          max="999"
                        />
                        <span className="units-label">units</span>
                      </div>
                      <button
                        className="inv-btn inv-btn-increase"
                        onClick={() => updateInventory(item.type, 1)}
                        disabled={item.units >= 100}
                        title="Increase by 1"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Camps Tab */}
          {activeTab === 'camps' && (
            <div className="camps-content">
              <div className="camps-header">
                <h2>Manage Blood Camps</h2>
                <button className="create-camp-btn" onClick={() => setShowCampModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create New Camp
                </button>
              </div>



              <div className="camps-list">
                {loadingCamps ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading camps...</p>
                  </div>
                ) : upcomingCampsList.length === 0 && pastCampsList.length === 0 ? (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h3>No Upcoming Camps</h3>
                    <p>Create a new blood camp to get started</p>
                  </div>
                ) : upcomingCampsList.length === 0 ? (
                  <p className="no-data">No upcoming camps</p>
                ) : null}
              </div>

              {!loadingCamps && upcomingCampsList.length > 0 && (
                <div className="events-section">
                  <h3 className="section-title">📅 Upcoming Camps</h3>
                  <div className="events-grid camps-scroll-grid">
                    {upcomingCampsList.map(camp => renderCampCard(camp))}
                  </div>
                </div>
              )}

              {!loadingCamps && pastCampsList.length > 0 && (
                <div className="events-section">
                  <h3 className="section-title">📊 Past Camps (Last 3)</h3>
                  <div className="events-grid camps-scroll-grid">
                    {pastCampsList.slice(0, 3).map(camp => renderCampCard(camp))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="requests-content">
              <h2>Blood Requests</h2>

              {/* Sub Navigation for Pending/Approved */}
              <div className="requests-sub-nav requests-sub-nav--status">
                <button
                  className={`sub-nav-btn ${requestsSubTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setRequestsSubTab('pending')}
                >
                  Pending Requests
                </button>
                <button
                  className={`sub-nav-btn ${requestsSubTab === 'approved' ? 'active' : ''}`}
                  onClick={() => setRequestsSubTab('approved')}
                >
                  Approved Requests
                </button>
              </div>

              <div className="requests-sub-nav requests-sub-nav--source">
                <button
                  className={`sub-nav-btn ${requestSourceTab === 'user' ? 'active' : ''}`}
                  onClick={() => setRequestSourceTab('user')}
                >
                  From User
                </button>
                <button
                  className={`sub-nav-btn ${requestSourceTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setRequestSourceTab('bank')}
                >
                  From Bank
                </button>
                <button
                  className={`sub-nav-btn ${requestSourceTab === 'my' ? 'active' : ''}`}
                  onClick={() => setRequestSourceTab('my')}
                >
                  My Requests
                </button>
              </div>

              {/* Pending Requests */}
              {requestsSubTab === 'pending' && (
                <>
                  {loadingRequests ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading requests...</p>
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      <h3>No Pending Requests</h3>
                      <p>{requestSourceTab === 'bank' ? 'No pending blood bank requests at the moment' : requestSourceTab === 'my' ? 'No pending requests sent by your blood bank' : 'No pending user blood requests at the moment'}</p>
                    </div>
                  ) : (
                    <div className="requests-list pending-grid">
                      {pendingRequests.map(request => {
                        const isMyOutgoingRequest = isInterBankRequest(request) && isOutgoingInterBankRequest(request);
                        const responseStatus = request.bloodBankResponse?.status || request.status || 'pending';

                        return (
                          <div key={request._id || request.id} className="request-card">
                            <div className="request-header">
                              <span className="blood-type-badge">{request.bloodGroup}</span>
                              {isMyOutgoingRequest ? (
                                <span className={`request-status-badge ${responseStatus}`}>{responseStatus}</span>
                              ) : (
                                <span className={`urgency-badge ${request.urgency}`}>{request.urgency}</span>
                              )}
                            </div>
                            <div className="request-details">
                              {isInterBankRequest(request) ? (
                                isOutgoingInterBankRequest(request) ? (
                                  <>
                                    <p><strong>Request Type:</strong> Blood Bank Transfer</p>
                                    <p><strong>Requested To:</strong> {request.targetBloodBank?.name || 'N/A'}</p>
                                    <p><strong>Supplier Contact:</strong> {request.targetBloodBank?.phone || 'N/A'}</p>
                                    <p><strong>Supplier Address:</strong> {request.targetBloodBank?.address?.street || 'N/A'}</p>
                                  </>
                                ) : (
                                  <>
                                    <p><strong>Request Type:</strong> Blood Bank Transfer</p>
                                    <p><strong>Requested By:</strong> {request.requestingBloodBank?.name || request.patientName}</p>
                                    <p><strong>Requester Contact:</strong> {request.requestingBloodBank?.phone || request.contactNumber || 'N/A'}</p>
                                    <p><strong>Requester Address:</strong> {request.requestingBloodBank?.address?.street || request.hospital?.address || 'N/A'}</p>
                                  </>
                                )
                              ) : (
                                <>
                                  <p><strong>Patient:</strong> {request.patientName}</p>
                                  <p><strong>Hospital:</strong> {request.hospital?.name || 'N/A'}</p>
                                  <p><strong>Address:</strong> {request.hospital?.address || 'N/A'}</p>
                                </>
                              )}
                              <p><strong>Blood Group:</strong> {request.bloodGroup}</p>
                              <p><strong>Units Required:</strong> {request.units}</p>
                              <p><strong>Contact:</strong> {request.contactNumber}</p>
                              <p><strong>Required By:</strong> {new Date(request.requiredBy).toLocaleDateString()}</p>
                              {request.description && (
                                <p><strong>Description:</strong> {request.description}</p>
                              )}
                            </div>
                            {!(isInterBankRequest(request) && isOutgoingInterBankRequest(request)) && (
                              <div className="request-actions">
                                <button
                                  className="action-btn approve"
                                  onClick={() => handleApproveRequest(request._id || request.id)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <path d="M16 4L6 14L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Approve
                                </button>
                                <button
                                  className="action-btn reject"
                                  onClick={() => handleRejectRequest(request._id || request.id)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  </svg>
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Approved Requests */}
              {requestsSubTab === 'approved' && (
                <>
                  {loadingApprovedRequests ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading approved requests...</p>
                    </div>
                  ) : approvedRequests.length === 0 ? (
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      <h3>No Approved Requests</h3>
                      <p>{requestSourceTab === 'bank' ? 'No approved blood bank transfer requests yet' : requestSourceTab === 'my' ? 'No approved requests sent by your blood bank yet' : 'You have not approved any user requests yet'}</p>
                    </div>
                  ) : (
                    <div className="requests-list approved-grid">
                      {approvedRequests.map(request => (
                        <div key={request._id || request.id} className="request-card approved">
                          <div className="request-header">
                            <span className="blood-type-badge">{request.bloodGroup}</span>
                            <span className="status-badge approved">Approved</span>
                          </div>
                          <div className="request-details">
                            {isInterBankRequest(request) ? (
                              <>
                                <p><strong>Request Type:</strong> Blood Bank Transfer</p>
                                <p><strong>{isOutgoingInterBankRequest(request) ? 'Requested From' : 'Requested By'}:</strong> {isOutgoingInterBankRequest(request) ? (request.targetBloodBank?.name || 'N/A') : (request.requestingBloodBank?.name || request.patientName)}</p>
                                <p><strong>{isOutgoingInterBankRequest(request) ? 'Supplier Contact' : 'Requester Contact'}:</strong> {isOutgoingInterBankRequest(request) ? (request.targetBloodBank?.phone || 'N/A') : (request.requestingBloodBank?.phone || request.contactNumber || 'N/A')}</p>
                              </>
                            ) : (
                              <>
                                <p><strong>Patient:</strong> {request.patientName}</p>
                                <p><strong>Hospital:</strong> {request.hospital?.name || 'N/A'}</p>
                                <p><strong>Address:</strong> {request.hospital?.address || 'N/A'}</p>
                              </>
                            )}
                            <p><strong>Blood Group:</strong> {request.bloodGroup}</p>
                            <p><strong>Units Provided:</strong> {request.units}</p>
                            <p><strong>Contact:</strong> {request.contactNumber}</p>
                            <p><strong>Required By:</strong> {new Date(request.requiredBy).toLocaleDateString()}</p>
                            {request.requestedBy && (
                              <>
                                <p><strong>Requested By:</strong> {request.requestedBy.name}</p>
                                <p><strong>Email:</strong> {request.requestedBy.email}</p>
                                <p><strong>Phone:</strong> {request.requestedBy.phone}</p>
                              </>
                            )}
                            {isInterBankRequest(request) && request.bloodBankResponse?.responseNote && (
                              <p><strong>Response Note:</strong> {request.bloodBankResponse.responseNote}</p>
                            )}
                            {request.description && (
                              <p><strong>Description:</strong> {request.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Blood Banks Tab */}
          {activeTab === 'bloodbanks' && (
            <div className="bloodbanks-content">
              <h2>Blood Banks Directory</h2>
              <p className="section-description">Browse available blood banks and check their inventory status</p>

              {loadingBloodBanks ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading blood banks...</p>
                </div>
              ) : directoryBloodBanks.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <h3>No Other Blood Banks Found</h3>
                  <p>Other registered blood banks will appear here</p>
                </div>
              ) : (
                <div className="bloodbanks-grid">
                  {/* Real blood banks data from API */}
                  {directoryBloodBanks.map((bloodBankItem, index) => (
                    <div key={bloodBankItem._id || bloodBankItem.id || index} className="bloodbank-item">
                      <div className="bloodbank-header">
                        <div className="bloodbank-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <div>
                          <h3>{bloodBankItem.name}</h3>
                          <p className="bloodbank-address">{formatAddress(bloodBankItem.address)}</p>
                        </div>
                      </div>
                      <div className="bloodbank-quick-info">
                        <div className="info-item">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C7.82 21 2 15.18 2 8V5z" strokeWidth="2" />
                          </svg>
                          {bloodBankItem.phone}
                        </div>
                        <div className="info-item">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <circle cx="10" cy="10" r="7" strokeWidth="2" />
                            <path d="M10 6v4l2 2" strokeWidth="2" />
                          </svg>
                          {formatOperatingHours(bloodBankItem.operatingHours)}
                        </div>
                      </div>
                      <button
                        className="btn-view-details"
                        onClick={() => handleViewBloodBankDetails(bloodBankItem)}
                      >
                        View Details & Inventory
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Donations Tab */}
          {activeTab === 'donations' && (
            <BloodBankDonations />
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <BloodBankEventManager />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-content">
              <h2>Hospital Settings</h2>

              {/* Hospital Photo Upload Section */}
              <div className="settings-section">
                <h3>Hospital Photo</h3>
                <div className="settings-form">
                  <div className="photo-upload-container">
                    <div className="photo-preview-wrapper">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Hospital" className="hospital-photo-preview" />
                      ) : (
                        <div className="no-photo-placeholder">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <p>No photo uploaded</p>
                        </div>
                      )}
                    </div>
                    <div className="photo-upload-actions">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                        id="bloodBankPhotoInput"
                      />
                      <label htmlFor="bloodBankPhotoInput" className="btn-upload-photo">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" strokeWidth="2" />
                          <polyline points="13 2 13 9 20 9" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Choose Photo
                      </label>
                      {photoPreview && (
                        <button
                          onClick={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="btn-save-photo"
                        >
                          {uploadingPhoto ? (
                            <>
                              <span className="spinner-small"></span>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M16 4L6 14L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Save Photo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="photo-help-text">Recommended: 800x600px, Max size: 5MB</p>
                  </div>
                </div>
              </div>

              {/* Hospital Location Section */}
              <div className="settings-section">
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                    <circle cx="12" cy="7" r="2" />
                  </svg>
                  Hospital Location
                </h3>
                <div className="settings-form">
                  {bankLocation?.coordinates &&
                    (bankLocation.coordinates[0] !== 0 || bankLocation.coordinates[1] !== 0) ? (
                    <div className="location-info-display">
                      <div className="location-status location-saved">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Location saved</span>
                      </div>
                      <p className="coordinates-display">
                        <strong>Coordinates:</strong> {bankLocation.coordinates[1].toFixed(6)}, {bankLocation.coordinates[0].toFixed(6)}
                      </p>
                      <div className="location-actions">
                        <button
                          type="button"
                          className="btn-view-location"
                          onClick={() => setShowBankMapModal(true)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View on Map
                        </button>
                        <button
                          type="button"
                          className="btn-update-location"
                          onClick={handleGetBankLocation}
                          disabled={gettingBankLocation}
                        >
                          {gettingBankLocation ? (
                            <>
                              <span className="spinner-small"></span>
                              Updating...
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              Update Location
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="no-location-display">
                      <div className="no-location-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                          <circle cx="12" cy="7" r="2" />
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p>No location set. Share your hospital location so patients can find you easily.</p>
                      <button
                        type="button"
                        className="btn-capture-location"
                        onClick={handleGetBankLocation}
                        disabled={gettingBankLocation}
                      >
                        {gettingBankLocation ? (
                          <>
                            <span className="spinner-small"></span>
                            Getting Location...
                          </>
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Capture Current Location
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <h3>Hospital Profile</h3>
                <form className="settings-form" onSubmit={handleSaveProfile}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="hospitalName">Hospital Name</label>
                      <input
                        type="text"
                        id="hospitalName"
                        className="form-control"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="Enter hospital name"
                        disabled={updatingProfile}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="regNum">Registration Number</label>
                      <input
                        type="text"
                        id="regNum"
                        className="form-control"
                        value={bloodBank?.registrationNumber || ''}
                        placeholder="Hospital registration number"
                        readOnly
                        style={{ background: 'var(--input-bg)', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="hospitalEmail">Email</label>
                      <input
                        type="email"
                        id="hospitalEmail"
                        className="form-control"
                        value={bloodBank?.email || ''}
                        placeholder="Hospital email"
                        readOnly
                        style={{ background: 'var(--input-bg)', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="hospitalPhone">Phone</label>
                      <input
                        type="tel"
                        id="hospitalPhone"
                        className="form-control"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="Contact number"
                        disabled={updatingProfile}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="hospitalAddress">Address</label>
                    <textarea
                      id="hospitalAddress"
                      className="form-control"
                      rows="3"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="Hospital address"
                      disabled={updatingProfile}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={`btn-save-settings ${isProfileChanged ? 'has-changes' : ''}`} 
                    disabled={!isProfileChanged || updatingProfile}
                  >
                    {updatingProfile && savingSection === 'profile' ? (
                      <>
                        <span className="spinner-small"></span>
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M16 4L6 14L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Save Profile
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="settings-section">
                <h3>Operating Hours</h3>
                <div className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="openTime">Opening Time</label>
                      <input
                        type="time"
                        id="openTime"
                        className="form-control"
                        value={operatingHours.open}
                        onChange={(e) => setOperatingHours({ ...operatingHours, open: e.target.value })}
                        disabled={updatingProfile}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="closeTime">Closing Time</label>
                      <input
                        type="time"
                        id="closeTime"
                        className="form-control"
                        value={operatingHours.close}
                        onChange={(e) => setOperatingHours({ ...operatingHours, close: e.target.value })}
                        disabled={updatingProfile}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="openWeekends">
                      <input
                        type="checkbox"
                        id="openWeekends"
                        checked={operatingHours.openOnWeekends}
                        onChange={(e) => setOperatingHours({ ...operatingHours, openOnWeekends: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>Open on Weekends</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="emergency247">
                      <input
                        type="checkbox"
                        id="emergency247"
                        checked={operatingHours.emergency247}
                        onChange={(e) => setOperatingHours({ ...operatingHours, emergency247: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>24/7 Emergency Service</span>
                    </label>
                  </div>

                  <button 
                    className={`btn-save-settings ${isHoursChanged ? 'has-changes' : ''}`} 
                    onClick={handleSaveHours}
                    disabled={!isHoursChanged || updatingProfile}
                  >
                    {updatingProfile && savingSection === 'hours' ? (
                      <>
                        <span className="spinner-small"></span>
                        Saving Hours...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M16 4L6 14L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Save Hours
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Notification Preferences</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="emailNotify">
                      <input
                        type="checkbox"
                        id="emailNotify"
                        checked={preferences.emailNotify}
                        onChange={(e) => setPreferences({ ...preferences, emailNotify: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>Email notifications for new blood requests</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="smsNotify">
                      <input
                        type="checkbox"
                        id="smsNotify"
                        checked={preferences.smsNotify}
                        onChange={(e) => setPreferences({ ...preferences, smsNotify: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>SMS alerts for critical blood shortages</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="weeklyReport">
                      <input
                        type="checkbox"
                        id="weeklyReport"
                        checked={preferences.weeklyReport}
                        onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>Weekly inventory reports</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label" htmlFor="donorNotify">
                      <input
                        type="checkbox"
                        id="donorNotify"
                        checked={preferences.donorNotify}
                        onChange={(e) => setPreferences({ ...preferences, donorNotify: e.target.checked })}
                        disabled={updatingProfile}
                      />
                      <span>Donor registration notifications</span>
                    </label>
                  </div>

                  {/* <button 
                    className={`btn-save-settings ${isPreferencesChanged ? 'has-changes' : ''}`} 
                    onClick={handleSavePreferences}
                    disabled={!isPreferencesChanged || updatingProfile}
                  >
                    {updatingProfile && savingSection === 'preferences' ? (
                      <>
                        <span className="spinner-small"></span>
                        Saving Preferences...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M16 4L6 14L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Save Preferences
                      </>
                    )}
                  </button> */}
                </div>
              </div>

              <div className="settings-section">
                <h3>Security</h3>
                <form className="settings-form" onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label htmlFor="currentPwd">Current Password</label>
                    <input
                      type="password"
                      id="currentPwd"
                      className="form-control"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      disabled={changingPassword}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPwd">New Password</label>
                    <input
                      type="password"
                      id="newPwd"
                      className="form-control"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      disabled={changingPassword}
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPwd">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPwd"
                      className="form-control"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      disabled={changingPassword}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={`btn-save-settings btn-danger ${isPasswordReady ? 'has-changes' : ''}`} 
                    disabled={!isPasswordReady || changingPassword}
                  >
                    {changingPassword ? (
                      <>
                        <span className="spinner-small"></span>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <rect x="3" y="5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                          <path d="M7 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Change Password
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="settings-section">
                <h3>Data Management</h3>
                <div className="settings-form">
                  <p className="settings-description">
                    Export your hospital data and reports for backup or analysis.
                  </p>

                  <div className="data-export-options">
                    <button className="btn-export">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M17 13v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M15 8l-5-5m0 0L5 8m5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Export Inventory Data
                    </button>
                    <button className="btn-export">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M17 13v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M15 8l-5-5m0 0L5 8m5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Export Camp Reports
                    </button>
                    <button className="btn-export">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M17 13v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M15 8l-5-5m0 0L5 8m5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Export All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Camp Modal */}
      {showCampModal && (
        <div className="modal-overlay" onClick={() => { setShowCampModal(false); setEditingCamp(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCamp ? 'Edit Blood Camp' : 'Create Blood Camp'}</h2>
              <button className="modal-close" onClick={() => { setShowCampModal(false); setEditingCamp(null); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateCamp} className="camp-form">
              <div className="form-group">
                <label>Camp Name</label>
                <input
                  type="text"
                  name="name"
                  value={campForm.name}
                  onChange={handleCampFormChange}
                  placeholder="Enter camp name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={campForm.date}
                    onChange={handleCampFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Target Units</label>
                  <input
                    type="number"
                    name="targetUnits"
                    value={campForm.targetUnits}
                    onChange={handleCampFormChange}
                    min="10"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={campForm.startTime}
                    onChange={handleCampFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={campForm.endTime}
                    onChange={handleCampFormChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={campForm.venue}
                  onChange={handleCampFormChange}
                  placeholder="Venue name"
                  required
                />
              </div>

              <div className="form-group location-group">
                <label>Location</label>
                <button
                  type="button"
                  className="fetch-location-btn"
                  onClick={fetchLocation}
                  disabled={fetchingLocation}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z" />
                  </svg>
                  {fetchingLocation ? 'Fetching Location...' : 'Auto-Fetch Location'}
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={campForm.address}
                    onChange={handleCampFormChange}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={campForm.city}
                    onChange={handleCampFormChange}
                    placeholder="City"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    value={campForm.state}
                    onChange={handleCampFormChange}
                    placeholder="State"
                  />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={campForm.pincode}
                    onChange={handleCampFormChange}
                    placeholder="Pincode"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={campForm.description}
                  onChange={handleCampFormChange}
                  placeholder="Camp description..."
                  rows="3"
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowCampModal(false); setEditingCamp(null); }} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingCamp ? 'Update Camp' : 'Create Camp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camp Details Modal */}
      {showCampDetails && selectedCamp && (
        <div className="modal-overlay" onClick={() => setShowCampDetails(false)}>
          <div className="modal-content camp-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCamp.name}</h2>
              <button className="close-modal" onClick={() => setShowCampDetails(false)}>×</button>
            </div>
            <div className="camp-details-content">
              <div className="detail-section">
                <h3>Event Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span>{new Date(selectedCamp.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time:</span>
                  <span>{selectedCamp.startTime} - {selectedCamp.endTime}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`camp-status ${selectedCamp.status}`}>{selectedCamp.status}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Location</h3>
                <div className="detail-row">
                  <span className="detail-label">Venue:</span>
                  <span>{selectedCamp.venue}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span>{selectedCamp.address}, {selectedCamp.city}</span>
                </div>
                {selectedCamp.state && (
                  <div className="detail-row">
                    <span className="detail-label">State:</span>
                    <span>{selectedCamp.state}</span>
                  </div>
                )}
                {selectedCamp.pincode && (
                  <div className="detail-row">
                    <span className="detail-label">Pincode:</span>
                    <span>{selectedCamp.pincode}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Collection Progress</h3>
                <div className="detail-row">
                  <span className="detail-label">Target Units:</span>
                  <span>{selectedCamp.targetUnits} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Collected:</span>
                  <span>{selectedCamp.collectedUnits} units</span>
                </div>
                <div className="progress-bar-large">
                  <div
                    className="progress-fill-large"
                    style={{ width: `${(selectedCamp.collectedUnits / selectedCamp.targetUnits) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-percentage">
                  {Math.round((selectedCamp.collectedUnits / selectedCamp.targetUnits) * 100)}% Complete
                </div>
              </div>

              {selectedCamp.description && (
                <div className="detail-section">
                  <h3>Description</h3>
                  <p>{selectedCamp.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegistrations && selectedCamp && (
        <div className="modal-overlay" onClick={() => setShowRegistrations(false)}>
          <div className="modal-content registrations-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrations - {selectedCamp.name}</h2>
              <button className="close-modal" onClick={() => setShowRegistrations(false)}>×</button>
            </div>
            <div className="registrations-content">
              {selectedCamp.registeredDonors && selectedCamp.registeredDonors.length > 0 ? (
                <div className="registrations-table-container">
                  <table className="registrations-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Name</th>
                        <th>Blood Group</th>
                        <th>Phone</th>
                        <th>Registered At</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCamp.registeredDonors.map((donor, index) => {
                        // Check if event has passed
                        const eventDate = new Date(selectedCamp.date);
                        const today = new Date();
                        const isPastEvent = eventDate < today.setHours(0, 0, 0, 0);

                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{donor.name}</td>
                            <td>
                              <span className="blood-type-badge">{donor.bloodGroup}</span>
                            </td>
                            <td>{donor.phone}</td>
                            <td>{new Date(donor.registeredAt).toLocaleDateString()}</td>
                            <td>
                              <span className={`status-badge ${isPastEvent ? (donor.attended ? 'attended' : 'pending') : 'registered'}`}>
                                {isPastEvent ? (donor.attended ? 'ATTENDED' : 'PENDING') : 'REGISTERED'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="delete-donor-btn"
                                onClick={() => handleDeleteDonor(selectedCamp._id, donor._id || donor.donor)}
                                title="Remove registration"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#e63946',
                                  cursor: 'pointer',
                                  padding: '5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#c41e3a'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#e63946'}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="registrations-summary">
                    {(() => {
                      const eventDate = new Date(selectedCamp.date);
                      const today = new Date();
                      const isPastEvent = eventDate < today.setHours(0, 0, 0, 0);

                      if (isPastEvent) {
                        return (
                          <>
                            <p><strong>Total Registrations:</strong> {selectedCamp.registeredDonors.length}</p>
                            <p><strong>Attended:</strong> {selectedCamp.registeredDonors.filter(d => d.attended).length}</p>
                            <p><strong>Pending:</strong> {selectedCamp.registeredDonors.filter(d => !d.attended).length}</p>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <p><strong>Total Registrations:</strong> {selectedCamp.registeredDonors.length}</p>
                            <p><strong>Registered:</strong> {selectedCamp.registeredDonors.length}</p>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <h3>No Registrations Yet</h3>
                  <p>No donors have registered for this camp yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Modal for Blood Bank Location */}
      {showBankMapModal && bankLocation && (
        <MapModal
          location={bankLocation}
          name={bloodBank?.name || 'Hospital Location'}
          onClose={() => setShowBankMapModal(false)}
        />
      )}
    </div>
  );
};

export default BloodBankDashboard;
