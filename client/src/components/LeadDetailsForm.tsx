import { useState } from "react";
import type { LeadDetails } from "../types/config";
import "./LeadDetailsForm.css";

interface LeadDetailsFormProps {
  lead: LeadDetails;
  onChange: (lead: LeadDetails) => void;
}

export default function LeadDetailsForm({ lead, onChange }: LeadDetailsFormProps) {
  const [errors, setErrors] = useState<{
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  }>({});

  const [touched, setTouched] = useState<{
    name?: boolean;
    company?: boolean;
    email?: boolean;
    phone?: boolean;
  }>({});

  const validateField = (field: keyof LeadDetails, value: string) => {
    const newErrors = { ...errors };

    if (field === "name") {
      if (!value.trim()) {
        newErrors.name = "Lead name is required";
      } else if (value.trim().length < 2) {
        newErrors.name = "Must be at least 2 characters";
      } else if (value.trim().length > 100) {
        newErrors.name = "Must be less than 100 characters";
      } else {
        delete newErrors.name;
      }
    }

    if (field === "company") {
      if (!value.trim()) {
        newErrors.company = "Company is required";
      } else if (value.trim().length < 2) {
        newErrors.company = "Must be at least 2 characters";
      } else if (value.trim().length > 100) {
        newErrors.company = "Must be less than 100 characters";
      } else {
        delete newErrors.company;
      }
    }

    if (field === "email") {
      if (!value.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = "Must be a valid email address";
      } else {
        delete newErrors.email;
      }
    }

    if (field === "phone") {
      // Phone is optional, but validate if provided
      if (value.trim() && !/^[\d\s\-\+\(\)]+$/.test(value)) {
        newErrors.phone = "Must be a valid phone number";
      } else {
        delete newErrors.phone;
      }
    }

    setErrors(newErrors);
  };

  const handleFieldChange = (field: keyof LeadDetails, value: string) => {
    onChange({ ...lead, [field]: value });
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof LeadDetails) => {
    setTouched({ ...touched, [field]: true });
    validateField(field, lead[field] || "");
  };

  return (
    <div className="lead-form-card">
      <h2 className="lead-form-title">Lead Details</h2>
      <p className="lead-form-subtitle">
        Enter the prospect's information for a personalized test conversation
      </p>

      <div className="lead-form-group">
        <label htmlFor="leadName" className="lead-form-label">
          Lead Name
        </label>
        <input
          id="leadName"
          type="text"
          className={`lead-form-input ${errors.name && touched.name ? "lead-input-error" : ""}`}
          placeholder="e.g., John Smith"
          value={lead.name}
          onChange={(e) => handleFieldChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
        />
        {errors.name && touched.name && (
          <span className="lead-error-message">{errors.name}</span>
        )}
      </div>

      <div className="lead-form-group">
        <label htmlFor="leadCompany" className="lead-form-label">
          Company
        </label>
        <input
          id="leadCompany"
          type="text"
          className={`lead-form-input ${errors.company && touched.company ? "lead-input-error" : ""}`}
          placeholder="e.g., Tech Solutions Inc."
          value={lead.company}
          onChange={(e) => handleFieldChange("company", e.target.value)}
          onBlur={() => handleBlur("company")}
        />
        {errors.company && touched.company && (
          <span className="lead-error-message">{errors.company}</span>
        )}
      </div>

      <div className="lead-form-group">
        <label htmlFor="leadEmail" className="lead-form-label">
          Email
        </label>
        <input
          id="leadEmail"
          type="email"
          className={`lead-form-input ${errors.email && touched.email ? "lead-input-error" : ""}`}
          placeholder="e.g., john.smith@techsolutions.com"
          value={lead.email}
          onChange={(e) => handleFieldChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
        />
        {errors.email && touched.email && (
          <span className="lead-error-message">{errors.email}</span>
        )}
      </div>

      <div className="lead-form-group">
        <label htmlFor="leadPhone" className="lead-form-label">
          Phone Number <span className="optional">(optional)</span>
        </label>
        <input
          id="leadPhone"
          type="tel"
          className={`lead-form-input ${errors.phone && touched.phone ? "lead-input-error" : ""}`}
          placeholder="e.g., +1 (555) 123-4567"
          value={lead.phone || ""}
          onChange={(e) => handleFieldChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
        />
        {errors.phone && touched.phone && (
          <span className="lead-error-message">{errors.phone}</span>
        )}
      </div>
    </div>
  );
}

