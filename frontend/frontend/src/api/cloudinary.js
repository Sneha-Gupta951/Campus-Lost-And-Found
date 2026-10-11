// Uploads a file straight from the browser to Cloudinary and returns the
// public URL. The backend never touches the image bytes — it only stores
// the URL string (in item_images.url), which keeps our server simple.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Image upload is not configured yet (missing Cloudinary env vars)');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Image upload failed — try a smaller image or check your connection');
  }

  const data = await res.json();
  return data.secure_url; // the public HTTPS URL to store in our database
}
