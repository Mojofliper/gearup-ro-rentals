export const validateGearName = (name: string): string | null => {
  if (!name || name.trim().length < 3) {
    return 'Numele trebuie să aibă cel puțin 3 caractere';
  }
  if (name.length > 100) {
    return 'Numele nu poate depăși 100 de caractere';
  }
  // Check for suspicious content
  if (/[<>]|script|javascript|onclick|onerror/i.test(name)) {
    return 'Numele conține caractere nepermise';
  }
  return null;
};

export const validateGearDescription = (description: string): string | null => {
  if (description && description.length > 2000) {
    return 'Descrierea nu poate depăși 2000 de caractere';
  }
  // Check for suspicious content
  if (/[<>]|script|javascript|onclick|onerror/i.test(description)) {
    return 'Descrierea conține caractere nepermise';
  }
  return null;
};

export const validatePrice = (price: string): string | null => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return 'Prețul trebuie să fie un număr pozitiv';
  }
  if (numPrice > 1000000) {
    return 'Prețul este prea mare';
  }
  return null;
};

export const validateImageFile = (file: File): string | null => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Tipul de fișier nu este permis. Folosește JPG, PNG sau WebP';
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'Fișierul este prea mare. Dimensiunea maximă este 5MB';
  }
  
  return null;
};

export const validateBookingDates = (startDate: string, endDate: string): string | null => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (start < now) {
    return 'Data de început nu poate fi în trecut';
  }
  
  if (end <= start) {
    return 'Data de sfârșit trebuie să fie după data de început';
  }
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) {
    return 'Perioada de închiriere nu poate depăși un an';
  }
  
  return null;
};

export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone) return null;
  
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return 'Numărul de telefon nu este valid';
  }
  
  return null;
};

export const validateAmount = (amount: string, min = 0, max = 1000000): string | null => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return 'Suma trebuie să fie un număr valid';
  }
  
  if (numAmount < min) {
    return `Suma minimă este ${min} RON`;
  }
  
  if (numAmount > max) {
    return `Suma maximă este ${max} RON`;
  }
  
  return null;
};

export const validateSearchQuery = (query: string): string | null => {
  if (query.length > 100) {
    return 'Termenul de căutare este prea lung';
  }
  
  // Check for suspicious patterns
  if (/[<>]|script|javascript|onclick|onerror/i.test(query)) {
    return 'Termenul de căutare conține caractere nepermise';
  }
  
  return null;
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/script/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};
