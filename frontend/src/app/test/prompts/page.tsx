"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { apiBaseUrl } from "@/config/api";
import { MarkdownStreamer } from "@/components/dashboard/MarkdownStreamer";
import { SUPPORTED_LANGUAGES, getLanguageByFullName, DEFAULT_LANGUAGE_CODE, LANGUAGE_CODE_TO_NAME } from "@/config/languages";
import { useConfig } from "@/hooks/useConfig";

type SummaryStyle = "tldr" | "bullet_points" | "tutorial" | "detailed" | "deep_dive";

/**
 * Test page for testing summarization prompts
 * Allows testing different summary styles with the sample transcript
 * Accessible at /test/prompts
 */
export default function PromptsTestPage() {
  const { t } = useTranslation('summary');
  const { config } = useConfig();
  
  const [transcript, setTranscript] = React.useState<string>("");
  const [loadingTranscript, setLoadingTranscript] = React.useState(true);
  const [selectedStyle, setSelectedStyle] = React.useState<SummaryStyle | null>(null);
  const [language, setLanguage] = React.useState("English");
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [fullCustomPrompt, setFullCustomPrompt] = React.useState("");
  const [useFullCustomPrompt, setUseFullCustomPrompt] = React.useState(false);
  const [generatedPrompt, setGeneratedPrompt] = React.useState<string>("");
  const [completeInput, setCompleteInput] = React.useState<string>("");
  const [generatingPrompt, setGeneratingPrompt] = React.useState(false);
  const [summary, setSummary] = React.useState<string>("");
  const [generatingSummary, setGeneratingSummary] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  // Get preset styles from config (same as ControlPanel)
  const allPresets = config?.preset_styles || ["tldr", "bullet_points", "deep_dive", "tutorial", "detailed"];
  const styles: SummaryStyle[] = allPresets as SummaryStyle[];

  // Get supported languages (same as ControlPanel)
  const supportedLanguages = SUPPORTED_LANGUAGES.map(lang => ({
    code: lang.code,
    displayName: lang.label,
    backendName: lang.fullName,
  }));

  const defaultLanguage = config?.default_language || LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || "English";
  
  // Initialize language to default
  React.useEffect(() => {
    if (!language || language === "English") {
      setLanguage(defaultLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLanguage]);

  // Load sample transcript on mount
  React.useEffect(() => {
    loadTranscript();
  }, []);

  // Update complete input when transcript becomes available after prompt is generated
  React.useEffect(() => {
    if (generatedPrompt && transcript && (selectedStyle || useFullCustomPrompt) && !completeInput.includes(transcript)) {
      // Regenerate complete input with transcript
      const updateCompleteInput = async () => {
        try {
          const requestBody: any = {
            language,
            transcript: transcript,
          };

          if (useFullCustomPrompt && fullCustomPrompt) {
            requestBody.fullCustomPrompt = fullCustomPrompt;
          } else if (selectedStyle) {
            requestBody.style = selectedStyle;
            requestBody.customPrompt = customPrompt || undefined;
          } else {
            return; // Can't update without style or full custom prompt
          }

          const response = await fetch(`${apiBaseUrl}/api/test/generate-prompt`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.completeInput) {
              setCompleteInput(data.completeInput);
            }
          }
        } catch (error) {
          console.error("Error updating complete input:", error);
        }
      };
      updateCompleteInput();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, generatedPrompt, selectedStyle, useFullCustomPrompt, fullCustomPrompt]);

  const loadTranscript = async () => {
    try {
      setLoadingTranscript(true);
      const response = await fetch(`${apiBaseUrl}/api/test/sample-transcript`);
      if (!response.ok) {
        throw new Error(`Failed to load transcript: ${response.statusText}`);
      }
      const text = await response.text();
      setTranscript(text);
    } catch (error) {
      console.error("Error loading transcript:", error);
      alert(`Failed to load transcript: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const generatePrompt = async (style?: SummaryStyle) => {
    try {
      setGeneratingPrompt(true);
      if (style) {
        setSelectedStyle(style);
      }
      setGeneratedPrompt("");
      setCompleteInput("");
      setSummary("");
      setError("");

      const url = `${apiBaseUrl}/api/test/generate-prompt`;
      console.log("Generating prompt:", { 
        url, 
        style: style || selectedStyle, 
        language, 
        customPrompt, 
        useFullCustomPrompt,
        hasTranscript: !!transcript 
      });

      const requestBody: any = {
        language,
        transcript: transcript || undefined,
      };

      if (useFullCustomPrompt && fullCustomPrompt) {
        // Use full custom prompt (bypasses template)
        requestBody.fullCustomPrompt = fullCustomPrompt;
      } else {
        // Use template system
        if (!style && !selectedStyle) {
          throw new Error("Please select a style or use full custom prompt");
        }
        requestBody.style = style || selectedStyle;
        requestBody.customPrompt = customPrompt || undefined;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setGeneratedPrompt(data.prompt);
      // Use completeInput if available (when transcript is provided), otherwise fall back to prompt
      setCompleteInput(data.completeInput || data.prompt);
    } catch (error) {
      console.error("Error generating prompt:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to generate prompt: ${errorMessage}`);
      alert(`Failed to generate prompt: ${errorMessage}`);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const generateSummary = async () => {
    if (!transcript) {
      alert("No transcript loaded");
      return;
    }

    if (!useFullCustomPrompt && !selectedStyle) {
      alert("Please select a summary style or use full custom prompt");
      return;
    }

    try {
      setGeneratingSummary(true);
      setSummary("");
      setError("");

      const url = `${apiBaseUrl}/api/test/summarize`;
      console.log("Generating summary:", { 
        url, 
        style: selectedStyle, 
        language, 
        useFullCustomPrompt,
        transcriptLength: transcript.length 
      });

      const requestBody: any = {
        transcript,
        language,
      };

      if (useFullCustomPrompt && fullCustomPrompt) {
        // Use full custom prompt (bypasses template)
        requestBody.fullCustomPrompt = fullCustomPrompt;
      } else {
        // Use template system
        requestBody.style = selectedStyle;
        requestBody.customPrompt = customPrompt || undefined;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to generate summary: ${errorMessage}`);
      alert(`Failed to generate summary: ${errorMessage}\n\nMake sure:\n- Backend is running\n- DASHSCOPE_API_KEY is configured\n- API URL is correct: ${apiBaseUrl}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
          Summarization Prompts Test Page
        </h1>
        <p className="text-theme-text-secondary mb-8">
          Test different summary styles using the sample transcript. Generate prompts and optionally test AI generation.
        </p>

        {/* Controls */}
        <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-theme-text-primary mb-4">Controls</h2>

          {/* Style Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-theme-text-secondary mb-2">
              Summary Style
            </label>
            <div className="flex flex-wrap gap-2">
              {styles.map((style) => {
                // Use translation for style label (same as StyleCard)
                const styleName = t(`form.styleDescriptions.${style}.name`, { 
                  defaultValue: t(`form.presetLabels.${style}`, style) 
                });
                return (
                  <button
                    key={style}
                    onClick={() => generatePrompt(style)}
                    disabled={generatingPrompt || loadingTranscript}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      selectedStyle === style
                        ? "bg-blue-600 text-white"
                        : "bg-theme-bg-secondary text-theme-text-primary hover:bg-theme-bg-secondary/80"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {styleName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFullCustomPrompt}
                onChange={(e) => {
                  setUseFullCustomPrompt(e.target.checked);
                  if (e.target.checked) {
                    setSelectedStyle(null);
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-theme-text-secondary">
                Use Full Custom Prompt (bypasses template system)
              </span>
            </label>
            <p className="text-xs text-theme-text-secondary mt-1 ml-6">
              When enabled, paste your complete prompt here. It will replace the template system entirely.
            </p>
          </div>

          {/* Options */}
          {useFullCustomPrompt ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                Full Custom Prompt
              </label>
              <textarea
                value={fullCustomPrompt}
                onChange={(e) => setFullCustomPrompt(e.target.value)}
                placeholder="Paste your complete prompt here. Include [CONTENT_PLACEHOLDER] where you want the transcript inserted, or it will be appended at the end."
                rows={10}
                className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-theme-text-primary font-mono text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => generatePrompt()}
                  disabled={generatingPrompt || !fullCustomPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingPrompt ? "Generating..." : "Generate Prompt Preview"}
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-theme-text-primary"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.backendName}>
                        {lang.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-theme-text-primary"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.backendName}>
                      {lang.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-2">
                  Custom Prompt (Optional)
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Focus on leadership insights"
                  className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded-md text-theme-text-primary"
                />
              </div>
            </div>
          )}

          {/* Generate Summary Button */}
          {(generatedPrompt && (selectedStyle || useFullCustomPrompt)) && (
            <div className="mb-4">
              <button
                onClick={generateSummary}
                disabled={generatingSummary || !transcript || (useFullCustomPrompt && !fullCustomPrompt.trim())}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingSummary ? "Generating Summary..." : "Generate Summary"}
              </button>
              <p className="text-xs text-theme-text-secondary mt-2">
                Requires DASHSCOPE_API_KEY configured in backend
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-md">
              <div className="text-sm text-red-400">{error}</div>
              <div className="text-xs text-red-500/70 mt-1">API URL: {apiBaseUrl}</div>
            </div>
          )}

          {/* Transcript Info */}
          {loadingTranscript ? (
            <div className="text-sm text-theme-text-secondary">Loading transcript...</div>
          ) : transcript ? (
            <div className="text-sm text-theme-text-secondary">
              ✓ Loaded transcript: {transcript.split("\n").length} lines, ~
              {transcript.split(/\s+/).length} words
            </div>
          ) : (
            <div className="text-sm text-red-500">Failed to load transcript</div>
          )}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generated Prompt */}
          <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg overflow-hidden">
            <div className="bg-theme-bg-secondary px-4 py-3 border-b border-theme-border-primary flex justify-between items-center">
              <h3 className="text-lg font-semibold text-theme-text-primary">Generated Prompt</h3>
              {completeInput && (
                <button
                  onClick={() => copyToClipboard(completeInput)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              )}
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {generatingPrompt ? (
                <div className="text-theme-text-secondary">Generating prompt...</div>
              ) : completeInput ? (
                <pre className="text-sm text-theme-text-primary whitespace-pre-wrap font-mono bg-theme-bg-secondary p-4 rounded">
                  {completeInput}
                </pre>
              ) : (
                <div className="text-theme-text-secondary italic text-center py-8">
                  Select a style to generate prompt...
                </div>
              )}
            </div>
          </div>

          {/* AI Summary Result */}
          <div className="bg-theme-bg-card border border-theme-border-primary rounded-lg overflow-hidden">
            <div className="bg-theme-bg-secondary px-4 py-3 border-b border-theme-border-primary">
              <h3 className="text-lg font-semibold text-theme-text-primary">AI Summary Result</h3>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {generatingSummary ? (
                <div className="text-theme-text-secondary">Generating summary...</div>
              ) : summary ? (
                <MarkdownStreamer content={summary} isStreaming={false} />
              ) : (
                <div className="text-theme-text-secondary italic text-center py-8">
                  {generatedPrompt
                    ? 'Click "Generate Summary" button above to generate a summary'
                    : "Generate a prompt first, then click 'Generate Summary' to test AI generation"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
