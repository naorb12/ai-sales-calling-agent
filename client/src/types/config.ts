/**
 * Company configuration for AI sales agent
 * Matches backend CompanyConfig interface
 */
export interface CompanyConfig {
  companyName: string;
  description: string;
}

/**
 * Lead details for testing the agent
 */
export interface LeadDetails {
  name: string;
  company: string;
  industry: string;
  email: string;
  phone?: string; // Optional
}

/**
 * Validation result for company config
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    companyName?: string;
    description?: string;
  };
}

/**
 * Validation result for lead details
 */
export interface LeadValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  };
}

