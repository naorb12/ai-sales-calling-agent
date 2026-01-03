import { useState } from "react";
import type { CompanyConfig } from "../types/config";
import "./CompanyConfigForm.css";

interface CompanyConfigFormProps {
  config: CompanyConfig;
  onChange: (config: CompanyConfig) => void;
}

export default function CompanyConfigForm({ config, onChange }: CompanyConfigFormProps) {
  const [errors, setErrors] = useState<{
    companyName?: string;
    description?: string;
  }>({});

  const [touched, setTouched] = useState<{
    companyName?: boolean;
    description?: boolean;
  }>({});

  const validateField = (field: "companyName" | "description", value: string) => {
    const newErrors = { ...errors };

    if (field === "companyName") {
      if (!value.trim()) {
        newErrors.companyName = "Company name is required";
      } else if (value.trim().length < 2) {
        newErrors.companyName = "Must be at least 2 characters";
      } else if (value.trim().length > 100) {
        newErrors.companyName = "Must be less than 100 characters";
      } else {
        delete newErrors.companyName;
      }
    }

    if (field === "description") {
      if (!value.trim()) {
        newErrors.description = "Description is required";
      } else if (value.trim().length < 20) {
        newErrors.description = "Must be at least 20 characters";
      } else if (value.trim().length > 500) {
        newErrors.description = "Must be less than 500 characters";
      } else {
        delete newErrors.description;
      }
    }

    setErrors(newErrors);
  };

  const handleCompanyNameChange = (value: string) => {
    onChange({ ...config, companyName: value });
    if (touched.companyName) {
      validateField("companyName", value);
    }
  };

  const handleDescriptionChange = (value: string) => {
    onChange({ ...config, description: value });
    if (touched.description) {
      validateField("description", value);
    }
  };

  const handleBlur = (field: "companyName" | "description") => {
    setTouched({ ...touched, [field]: true });
    validateField(field, config[field]);
  };

  return (
    <div className="config-form-card">
      <h2 className="form-title">Company Configuration</h2>
      <p className="form-subtitle">
        Configure how the AI sales agent represents your company
      </p>

      <div className="form-group">
        <label htmlFor="companyName" className="form-label">
          Company Name
        </label>
        <input
          id="companyName"
          type="text"
          className={`form-input ${errors.companyName && touched.companyName ? "input-error" : ""}`}
          placeholder="e.g., Nespresso"
          value={config.companyName}
          onChange={(e) => handleCompanyNameChange(e.target.value)}
          onBlur={() => handleBlur("companyName")}
        />
        {errors.companyName && touched.companyName && (
          <span className="error-message">{errors.companyName}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Company Description
        </label>
        <textarea
          id="description"
          className={`form-textarea ${errors.description && touched.description ? "input-error" : ""}`}
          placeholder="e.g., We create premium coffee machines and deliver exceptional coffee experiences. Our Nespresso systems bring barista-quality espresso to homes and offices worldwide."
          rows={5}
          value={config.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onBlur={() => handleBlur("description")}
        />
        <div className="char-count">
          {config.description.length} / 500 characters
        </div>
        {errors.description && touched.description && (
          <span className="error-message">{errors.description}</span>
        )}
      </div>
    </div>
  );
}

