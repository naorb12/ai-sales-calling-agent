import { useState } from "react";
import CompanyConfigForm from "../components/CompanyConfigForm";
import VoiceTestDialog from "../components/VoiceTestDialog";
import type { CompanyConfig } from "../types/config";
import "./ConfigurationPage.css";

export default function ConfigurationPage() {
  const [config, setConfig] = useState<CompanyConfig>({
    companyName: "",
    description: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isConfigValid = (): boolean => {
    const nameValid = config.companyName.trim().length >= 2 && config.companyName.trim().length <= 100;
    const descValid = config.description.trim().length >= 20 && config.description.trim().length <= 500;
    return nameValid && descValid;
  };

  const handleTestClick = () => {
    if (isConfigValid()) {
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="configuration-page">
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">AI Sales Agent Configuration</h1>
          <p className="page-description">
            Configure your company details and test how the AI sales agent represents your business in real-time voice conversations.
          </p>
        </header>

        <div className="page-content">
          <CompanyConfigForm config={config} onChange={setConfig} />

          <div className="test-panel">
            <h2 className="test-panel-title">Test Your Agent</h2>
            <p className="test-panel-description">
              Start a live voice conversation to experience how the agent represents your company with potential customers.
            </p>

            <button
              className="test-button"
              onClick={handleTestClick}
              disabled={!isConfigValid()}
            >
              🎙️ Start Voice Conversation
            </button>

            {!isConfigValid() && (
              <div className="validation-message">
                💡 Complete the configuration form to test your agent
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
      />
    </div>
  );
}

