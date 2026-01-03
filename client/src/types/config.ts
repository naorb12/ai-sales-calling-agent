/**
 * Company configuration for AI sales agent
 * Matches backend CompanyConfig interface
 */
export interface CompanyConfig {
  companyName: string;
  description: string;
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

