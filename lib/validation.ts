import validator from 'validator';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateQuery = (input: string, userPlan: string): string => {
  // Length limits based on plan
  const maxLength = userPlan === 'ENTERPRISE' ? 50000 : 10000;

  if (!input || typeof input !== 'string') {
    throw new ValidationError('Query must be a non-empty string');
  }

  if (input.length > maxLength) {
    throw new ValidationError(
      `Query exceeds maximum length of ${maxLength} characters`,
      'query'
    );
  }

  // Check for control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(input)) {
    throw new ValidationError('Query contains invalid control characters', 'query');
  }

  // Detect potential prompt injection (log but don't block)
  const suspiciousPatterns = [
    /ignore\s+(previous|all)\s+instructions?/i,
    /you\s+are\s+now\s+(a|an)/i,
    /system\s+prompt/i,
    /\bDAN\b.*\bmode\b/i,
    /roleplay\s+as/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some(p => p.test(input));
  if (hasSuspiciousPattern) {
    console.warn('Potential prompt injection detected:', input.slice(0, 100));
  }

  // Basic XSS sanitization
  const sanitized = validator.escape(input);

  return sanitized;
};

export const validateEmail = (email: string): string => {
  if (!validator.isEmail(email)) {
    throw new ValidationError('Invalid email address', 'email');
  }

  return validator.normalizeEmail(email) || email;
};

export const validatePassword = (password: string): void => {
  if (password.length < 12) {
    throw new ValidationError(
      'Password must be at least 12 characters long',
      'password'
    );
  }

  // Check complexity
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const complexityCount = [hasLowerCase, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexityCount < 3) {
    throw new ValidationError(
      'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters',
      'password'
    );
  }
};

export const validateFileUpload = (
  file: File,
  userPlan: string
): void => {
  // Size limits by plan
  const maxSizes: Record<string, number> = {
    STARTER: 10 * 1024 * 1024,      // 10MB
    PROFESSIONAL: 50 * 1024 * 1024,  // 50MB
    ENTERPRISE: 100 * 1024 * 1024,   // 100MB
  };

  const maxSize = maxSizes[userPlan] || maxSizes.STARTER;

  if (file.size > maxSize) {
    throw new ValidationError(
      `File size exceeds maximum of ${maxSize / 1024 / 1024}MB for ${userPlan} plan`,
      'file'
    );
  }

  // Whitelist MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type ${file.type} is not allowed`,
      'file'
    );
  }

  // Validate filename
  const filename = file.name;
  if (filename.length > 255) {
    throw new ValidationError('Filename too long', 'file');
  }

  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename', 'file');
  }
};

export const sanitizeFilename = (filename: string): string => {
  // Remove any path components
  const basename = filename.split('/').pop()?.split('\\').pop() || 'file';

  // Remove special characters except dots, hyphens, underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return sanitized;
};

export const validateConversationTitle = (title: string): string => {
  if (title.length > 200) {
    throw new ValidationError('Title exceeds maximum length of 200 characters', 'title');
  }

  return validator.escape(title.trim());
};
