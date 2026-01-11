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
    industry: "",
    email: "",
    phone: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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

  const handleNext = () => {
    if (isConfigValid()) setCurrentStep(prev => prev + 1);
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="configuration-page">
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">AI Sales Agent</h1>
          <p className="page-description">
            Configure your company details and prospect information to test the AI sales agent.
          </p>
        </header>

        <div className="page-content">
        <div className="config-forms">
            {currentStep === 0 && (
              <CompanyConfigForm config={config} onChange={setConfig} />
            )} 
             {currentStep === 1 && (
              <LeadDetailsForm lead={lead} onChange={setLead} />
            )} 
             
        </div>
          { currentStep === 2 && (
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
        )}
        </div>
         <div className="step-navigation">
              <button 
                onClick={handleBack} 
                disabled={currentStep === 0}
                className="nav-button"
              >
                ← Back
              </button>
              {currentStep === 0 || currentStep === 1 ? (
                <button 
                  onClick={handleNext} 
                  disabled={currentStep === 0 && !isConfigValid() || currentStep === 1 && !isLeadValid()}
                  className="nav-button"
                >
                  Next →
                </button>
              ) : null}
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

