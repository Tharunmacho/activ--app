// Email validation
export const validateEmail = (email: string): string | undefined => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email';
  }
  return undefined;
};

// Password validation
export const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return undefined;
};

// Password match validation
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): string | undefined => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return undefined;
};

// Phone number validation
export const validatePhone = (phone: string): string | undefined => {
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phone) {
    return 'Phone number is required';
  }
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid 10-digit phone number';
  }
  return undefined;
};

// Aadhaar validation
export const validateAadhaar = (aadhaar: string): string | undefined => {
  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaar) {
    return 'Aadhaar number is required';
  }
  if (!aadhaarRegex.test(aadhaar)) {
    return 'Aadhaar must be 12 digits';
  }
  return undefined;
};

// Pincode validation
export const validatePincode = (pincode: string): string | undefined => {
  const pincodeRegex = /^\d{6}$/;
  if (!pincode) {
    return 'Pincode is required';
  }
  if (!pincodeRegex.test(pincode)) {
    return 'Pincode must be 6 digits';
  }
  return undefined;
};

// GST validation
export const validateGST = (gst: string): string | undefined => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (gst && !gstRegex.test(gst)) {
    return 'Invalid GST format';
  }
  return undefined;
};

// IFSC validation
export const validateIFSC = (ifsc: string): string | undefined => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifsc) {
    return 'IFSC code is required';
  }
  if (!ifscRegex.test(ifsc)) {
    return 'Invalid IFSC code';
  }
  return undefined;
};

// Account number validation
export const validateAccountNumber = (accountNumber: string): string | undefined => {
  const accountRegex = /^\d{9,18}$/;
  if (!accountNumber) {
    return 'Account number is required';
  }
  if (!accountRegex.test(accountNumber)) {
    return 'Invalid account number (9-18 digits)';
  }
  return undefined;
};

// Required field validation
export const validateRequired = (value: string, fieldName: string = 'This field'): string | undefined => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return undefined;
};

// Minimum length validation
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string = 'This field'
): string | undefined => {
  if (!value) {
    return `${fieldName} is required`;
  }
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return undefined;
};

// URL validation
export const validateURL = (url: string): string | undefined => {
  const urlRegex = /^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  if (url && !urlRegex.test(url)) {
    return 'Please enter a valid URL';
  }
  return undefined;
};

// Number validation
export const validateNumber = (value: string, fieldName: string = 'This field'): string | undefined => {
  if (!value) {
    return `${fieldName} is required`;
  }
  if (isNaN(Number(value))) {
    return `${fieldName} must be a number`;
  }
  return undefined;
};

// Positive number validation
export const validatePositiveNumber = (
  value: string,
  fieldName: string = 'This field'
): string | undefined => {
  const error = validateNumber(value, fieldName);
  if (error) return error;
  
  if (Number(value) < 0) {
    return `${fieldName} must be a positive number`;
  }
  return undefined;
};
