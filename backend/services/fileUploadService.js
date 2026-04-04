import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiError } from '../utils/apiError.js';

export const handleSingleUpload = async (localFilePath, folder = 'general/uploads') => {
  if (!localFilePath) {
    throw new ApiError(400, 'No file found to upload');
  }

  const cloudinaryResponse = await uploadOnCloudinary(localFilePath, folder);

  if (!cloudinaryResponse) {
    throw new ApiError(500, 'Cloudinary upload failed');
  }

  return {
    url: cloudinaryResponse.secure_url,
    publicId: cloudinaryResponse.public_id,
  };
};

export const handleMultipleUploads = async (files, folder = 'general/uploads') => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'No files found to upload');
  }

  const uploadPromises = files.map(file => uploadOnCloudinary(file.path, folder));
  const responses = await Promise.all(uploadPromises);

  // Filter out any failed results (shouldn't happen with our robust cloudinary helper)
  const successfulUploads = responses
    .filter(res => res !== null)
    .map((res, index) => ({
      url: res.secure_url,
      publicId: res.public_id,
      originalName: files[index].originalname
    }));

  if (successfulUploads.length === 0) {
    throw new ApiError(500, 'All file uploads failed');
  }

  return {
    count: successfulUploads.length,
    files: successfulUploads
  };
};
