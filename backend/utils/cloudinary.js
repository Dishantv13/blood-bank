import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file from the server to Cloudinary
 * @param {string} localFilePath - Path to the file on the local server
 * @param {string} folder - Folder in Cloudinary to store the file
 * @returns {Promise<object|null>} - Cloudinary upload response or null on failure
 */
export const uploadOnCloudinary = async (localFilePath, folder = 'blood-bank/profiles') => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: folder
    });

    // File has been uploaded successfully
    console.log('File uploaded to Cloudinary:', response.url);

    // Remove the file from the local server
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error('Cloudinary upload error:', error);

    // Remove the locally saved temporary file as the upload failed
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    return null;
  }
};

/**
 * Delete a file from Cloudinary using its public ID
 * @param {string} publicId - Public ID of the file in Cloudinary
 * @returns {Promise<object|null>} - Cloudinary delete response
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return null;
  }
};

export default cloudinary;
