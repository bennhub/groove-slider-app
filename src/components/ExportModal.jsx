// src/components/ExportModal.jsx
import React, { useState, useEffect } from "react";
import {
  X,
  Share,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Expand,   
  Minimize,
} from "lucide-react";
import { initiateExport } from "../services/exportService";

// Filename Validation Function
const validateFileName = (name) => {
  // More permissive validation
  // Allows letters, numbers, spaces, underscores, hyphens, and periods
  // Prevents completely empty filenames or filenames with only special characters
  const fileNameRegex = /^[a-zA-Z0-9 _\-\.]+$/;
  return fileNameRegex.test(name) && name.trim() !== "";
};

// Custom Resolution Dropdown Component
const CustomResolutionDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const resolutions = [
    { value: "720x1280", label: "720p" },
    { value: "1080x1920", label: "1080p" },
  ];

  const handleSelect = (newValue) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className="custom-resolution-dropdown">
      <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        {resolutions.find((res) => res.value === value)?.label || value}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isOpen && (
        <div className="dropdown-list">
          {resolutions.map((resolution) => (
            <div
              key={resolution.value}
              className="dropdown-item"
              onClick={() => handleSelect(resolution.value)}
            >
              {resolution.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export Modal Component
const ExportModal = ({
  isOpen,
  progress,
  message,
  onClose,
  onExport,
  isExporting,
  storyData,
  stories,
  duration,
  stopPlayback,
  cancelExport,
}) => {
  const [resolution, setResolution] = useState("1080x1920");
  const [isExportLoopEnabled, setIsExportLoopEnabled] = useState(false);
  const [loopCount, setLoopCount] = useState(1);
  const [exportError, setExportError] = useState(null);
  
  // New states for file name prompt
  const [isFileNamePromptOpen, setIsFileNamePromptOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isFileNameValid, setIsFileNameValid] = useState(false);

  // Calculate total slideshow duration in seconds (single playthrough)
  const slideshowDuration = stories && duration ? stories.length * duration : 0;

  // Calculate total duration with looping
  const totalDuration =
    slideshowDuration * (isExportLoopEnabled ? loopCount : 1);

  // Check if duration exceeds the 3-minute limit (180 seconds)
  const exceedsMaxDuration = totalDuration > 180;

// In ExportModal.jsx, add a new state for the export fit mode
  const [exportFitMode, setExportFitMode] = useState("contain");

  // Format time function (for display)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle loop count change with validation
  const handleLoopCountChange = (value) => {
    const newCount = parseInt(value) || 1;

    // Ensure count is at least 1
    if (newCount < 1) {
      setLoopCount(1);
      return;
    }

    // Check if new count exceeds the 3-minute limit
    const newTotalDuration = slideshowDuration * newCount;
    if (newTotalDuration > 180) {
      // Find the maximum possible loop count
      const maxLoops = Math.floor(180 / slideshowDuration);
      setLoopCount(Math.max(1, maxLoops));
    } else {
      setLoopCount(newCount);
    }
  };

  // Initiate export process
  const handleInitiateExport = () => {
    if (exceedsMaxDuration) {
      setExportError(
        "Export duration exceeds the 3-minute limit. Please reduce loop count."
      );
      return;
    }

    // Open file name prompt
    setIsFileNamePromptOpen(true);
    setFileName("");
    setIsFileNameValid(false);
  };

  // Handle file name input
  const handleFileNameChange = (e) => {
    const newFileName = e.target.value;
    setFileName(newFileName);
    setIsFileNameValid(validateFileName(newFileName));
  };

  // Proceed with export after file name
  const handleProceedExport = async () => {
    // Validate file name
    if (!validateFileName(fileName)) {
      return;
    }

    // Stop playback if active
    if (stopPlayback && typeof stopPlayback === "function") {
      stopPlayback();
    }

    const exportConfig = {
      resolution,
      isExportLoopEnabled,
      exportLoopDuration: isExportLoopEnabled ? totalDuration : 0,
      fileName: `${fileName}.mp4`,
      imageFitMode: "contain", 
    };

    try {
      const exportData = {
        storyData: storyData || stories,
        resolution,
        isExportLoopEnabled,
        exportLoopDuration: isExportLoopEnabled ? totalDuration : 0,
        fileName: `${fileName}.mp4`,
        imageFitMode: "contain", 
      };
      console.log("Exporting with fit mode: contain");
      const exportedFile = await initiateExport(exportData, exportConfig);
      
      // Close file name prompt and reset states
      setIsFileNamePromptOpen(false);
      onExport(exportedFile);
    } catch (error) {
      console.error("Export failed", error);
      setExportError(error.message || "Export failed. Please try again.");
    }
  };

  // Close file name prompt
  const handleCancelFileName = () => {
    setIsFileNamePromptOpen(false);
    setFileName("");
    setIsFileNameValid(false);
  };

  if (!isOpen) return null;

  // File Name Prompt Overlay
  if (isFileNamePromptOpen) {
    return (
      <div className="modal-overlay">
        <div className="modal-content file-name-prompt">
          <button className="modal-close" onClick={handleCancelFileName}>
            <X size={20} />
          </button>
          <h3>Name Your Export</h3>
          <p>Choose a name for your exported video</p>
          
          <div className="file-name-input">
            <input
              type="text"
              value={fileName}
              onChange={handleFileNameChange}
              placeholder="Enter file name"
              className={!isFileNameValid && fileName ? 'input-error' : ''}
            />
            {!isFileNameValid && fileName && (
              <div className="error-message">
                Invalid characters. Use letters, numbers, spaces, and ._-
              </div>
            )}
            <small>Letters, numbers, spaces, hyphens, underscores allowed only</small>
          </div>
          
          <div className="file-name-actions">
            <button 
              className="cancel-button" 
              onClick={handleCancelFileName}
            >
              Cancel
            </button>
            <button 
              className="continue-button"
              onClick={handleProceedExport}
              disabled={!isFileNameValid || !fileName}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content export-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        {!isExporting ? (
          <>
            <h3 className="modal-title">Export Settings</h3>

            <div className="resolution-selector">
              <label>Resolution:</label>
              <CustomResolutionDropdown
                value={resolution}
                onChange={setResolution}
              />
            </div>

   
            <div className="duration-info">
              <div className="info-row">
                <span>Current slideshow length:</span>
                <span className="info-value">
                  {formatTime(slideshowDuration)}
                </span>
              </div>

              {isExportLoopEnabled && (
                <div className="info-row">
                  <span>With looping ({loopCount}×):</span>
                  <span className="info-value">
                    {formatTime(totalDuration)}
                  </span>
                </div>
              )}
              
              <div className="info-row">
                <span style={{ fontSize: "0.90em", color: "orange" }}>
                  Note: Max export duration is 3 minutes. Looping Max is up to 3mins
                </span>
              </div>

              {exceedsMaxDuration && (
                <div className="duration-warning">
                  <AlertTriangle size={16} />
                  <span>Export duration exceeds 3 minute limit</span>
                </div>
              )}
            </div>

            <div className="export-loop-settings">
              <div className="loop-toggle">
                <label>
                  <span>Loop Slideshow</span>
                  <input
                    type="checkbox"
                    checked={isExportLoopEnabled}
                    onChange={() =>
                      setIsExportLoopEnabled(!isExportLoopEnabled)
                    }
                  />
                </label>
              </div>

              {isExportLoopEnabled && (
                <div className="loop-control">
                  <label>Loop Count:</label>
                  <div className="loop-counter">
                    <button
                      onClick={() => handleLoopCountChange(loopCount - 1)}
                      disabled={loopCount <= 1}
                      className="counter-button"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={loopCount}
                      onChange={(e) => handleLoopCountChange(e.target.value)}
                      min="1"
                      className="loop-count-input"
                    />
                    <button
                      onClick={() => handleLoopCountChange(loopCount + 1)}
                      disabled={slideshowDuration * (loopCount + 1) > 180}
                      className="counter-button"
                    >
                      +
                    </button>
                    <span className="loop-unit">×</span>
                  </div>

                  {exceedsMaxDuration && (
                    <div className="loop-warning">
                      <Info size={14} />
                      <span>Maximum export duration is 3 minutes</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {exportError && (
              <div className="export-error-message">{exportError}</div>
            )}

            <div className="export-actions">
              <button
                className="action-button download"
                onClick={handleInitiateExport}
                disabled={exceedsMaxDuration}
                style={{
                  opacity: exceedsMaxDuration ? 0.5 : 1,
                  cursor: exceedsMaxDuration ? "not-allowed" : "pointer",
                }}
              >
                <Download className="button-icon" />
                Export
              </button>
            </div>
          </>
        ) : (
          <div className="loading-container">
            <h3>Exporting Video</h3>
            <p>{message}</p>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
            <p className="export-note">
              This may take several minutes. Please keep the app open.
            </p>
            <button
              onClick={cancelExport}
              style={{
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: "5px",
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
                display: "block",
                margin: "0 auto",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                zIndex: 10000,
              }}
            >
              Cancel Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;