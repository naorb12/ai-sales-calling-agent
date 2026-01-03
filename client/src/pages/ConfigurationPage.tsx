import { useState } from "react";
import CompanyConfigForm from "../components/CompanyConfigForm";
import LeadDetailsForm from "../components/LeadDetailsForm";
import VoiceTestDialog from "../components/VoiceTestDialog";
import type { CompanyConfig, LeadDetails } from "../types/config";
import "./ConfigurationPage.css";

export default function ConfigurationPage() {
  const [config, setConfig] = useState<CompanyConfig>({
    companyName: "",
    description: "",
  });

  const [lead, setLead] = useState<LeadDetails>({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isConfigValid = (): boolean => {
    const nameValid = config.companyName.trim().length >= 2 && config.companyName.trim().length <= 100;
    const descValid = config.description.trim().length >= 20 && config.description.trim().length <= 500;
    return nameValid && descValid;
  };

  const isLeadValid = (): boolean => {
    const nameValid = lead.name.trim().length >= 2 && lead.name.trim().length <= 100;
    const companyValid = lead.company.trim().length >= 2 && lead.company.trim().length <= 100;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
    const phoneValid = !lead.phone || /^[\d\s\-\+\(\)]+$/.test(lead.phone);
    return nameValid && companyValid && emailValid && phoneValid;
  };

  const isFormValid = (): boolean => {
    return isConfigValid() && isLeadValid();
  };

  const handleTestClick = () => {
    if (isFormValid()) {
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="configuration-page">
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">AI Sales Agent Configuration</h1>
          <p className="page-description">
            Configure your company details and prospect information to test the AI sales agent.
          </p>
        </header>

        <div className="page-content">
          <div className="config-forms">
            <CompanyConfigForm config={config} onChange={setConfig} />
            <LeadDetailsForm lead={lead} onChange={setLead} />
          </div>

          <div className="test-panel">
            <h2 className="test-panel-title">Test Your Agent</h2>
            <p className="test-panel-description">
              Start a live voice conversation to experience how the agent represents your company with potential customers.
            </p>

            <button
              className="test-button"
              onClick={handleTestClick}
              disabled={!isFormValid()}
            >
              🎙️ Start Voice Conversation
            </button>

            {!isFormValid() && (
              <div className="validation-message">
                💡 Complete both configuration forms to test your agent
              </div>
            )}

            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Real-time voice conversation</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>AI-powered responses</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Live transcript display</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VoiceTestDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        config={config}
        lead={lead}
      />
    </div>
  );
}

