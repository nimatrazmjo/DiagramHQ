'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type View,
  type ViewObject,
  type ExportFormat,
  type ExportTheme,
  type ExportScale,
  type ExportResult,
  exportArchitectureView,
} from '@diagramhq/domain';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  currentView: View;
  views?: View[];
  viewObjects?: ViewObject[];
  onExportTriggered?: (result: ExportResult) => void;
}

export function ExportModal({
  isOpen,
  onClose,
  model,
  currentView,
  views = [],
  viewObjects = [],
  onExportTriggered,
}: ExportModalProps): JSX.Element | null {
  const [selectedViewId, setSelectedViewId] = useState<string>(currentView.id);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<ExportScale>(2);
  const [theme, setTheme] = useState<ExportTheme>('dark');
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [includeLegend, setIncludeLegend] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Active view to export
  const activeView = useMemo(() => {
    return views.find((v) => v.id === selectedViewId) ?? currentView;
  }, [views, selectedViewId, currentView]);

  // Compute live export preview and result
  const exportResult = useMemo<ExportResult>(() => {
    return exportArchitectureView(
      activeView,
      model,
      {
        format,
        scale,
        theme,
        includeMetadata,
        includeLegend,
        customTitle: customTitle.trim() || undefined,
      },
      viewObjects,
    );
  }, [activeView, model, format, scale, theme, includeMetadata, includeLegend, customTitle, viewObjects]);

  if (!isOpen) return null;

  const handleDownload = () => {
    onExportTriggered?.(exportResult);

    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = exportResult.dataUri;
      link.download = exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyClipboard = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(exportResult.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback or ignore
      }
    }
  };

  const formattedSize =
    exportResult.byteSize > 1024
      ? `${(exportResult.byteSize / 1024).toFixed(1)} KB`
      : `${exportResult.byteSize} B`;

  const totalWidth = exportResult.dimensions.width * exportResult.dimensions.scale;
  const totalHeight = exportResult.dimensions.height * exportResult.dimensions.scale;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#f8fafc',
      }}
      data-testid="export-modal-backdrop"
      onClick={onClose}
    >
      <div
        style={{
          width: '920px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="export-modal-container"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              Export Architecture Diagram
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Export high-resolution vector and raster assets for documentation, presentations, and print.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {views.length > 1 && (
              <select
                value={selectedViewId}
                onChange={(e) => setSelectedViewId(e.target.value)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                data-testid="export-view-select"
              >
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`${v.name} (${v.kind.toUpperCase()})`}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
              }}
              data-testid="export-close-btn"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#090d16',
            borderBottom: '1px solid #1e293b',
            padding: '0 24px',
          }}
        >
          {(['png', 'svg', 'pdf', 'json'] as ExportFormat[]).map((fmt) => {
            const isActive = format === fmt;
            const labels: Record<ExportFormat, string> = {
              png: 'PNG (Raster Image)',
              svg: 'SVG (Vector)',
              pdf: 'PDF (Print Document)',
              json: 'JSON (Model Data)',
            };
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                style={{
                  padding: '12px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                data-testid={`export-format-${fmt}`}
              >
                {labels[fmt]}
              </button>
            );
          })}
        </div>

        {/* Content Body: Preview & Controls */}
        <div style={{ display: 'flex', flex: 1, minHeight: '380px', overflow: 'hidden' }}>
          {/* Left: Diagram Live Preview */}
          <div
            style={{
              flex: 1,
              padding: '24px',
              backgroundColor: '#090d16',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
            data-testid="export-preview-pane"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '340px',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                backgroundColor: theme === 'light' ? '#ffffff' : theme === 'transparent' ? '#1e293b' : '#090d16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '16px',
              }}
            >
              {format === 'json' ? (
                <pre
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#a7f3d0',
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                  data-testid="export-json-preview"
                >
                  {exportResult.content}
                </pre>
              ) : format === 'pdf' ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  data-testid="export-pdf-preview"
                >
                  <div
                    style={{
                      padding: '16px 24px',
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontWeight: 600,
                    }}
                  >
                    📄 PDF Document • A4 Landscape (842 × 595 pt)
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    Contains embedded vector streams and DiagramHQ architectural specification.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  dangerouslySetInnerHTML={{ __html: exportResult.content }}
                  data-testid="export-svg-preview"
                />
              )}
            </div>

            {/* Preview Status Pill */}
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                gap: '16px',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <span>{`Dimensions: ${totalWidth} × ${totalHeight} px`}</span>
              <span>•</span>
              <span>{`Size: ${formattedSize}`}</span>
              <span>•</span>
              <span>{`Scale: ${scale}x`}</span>
            </div>
          </div>

          {/* Right: Export Configuration Settings */}
          <div
            style={{
              width: '320px',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid #1e293b',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto',
            }}
            data-testid="export-settings-sidebar"
          >
            {/* Custom Title Override */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Title Override (Optional)
              </label>
              <input
                type="text"
                placeholder={activeView.name}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
                data-testid="export-title-input"
              />
            </div>

            {/* Resolution / Scale Selector (for PNG / SVG) */}
            {format !== 'json' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Resolution / Scale
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {([1, 2, 3, 4] as ExportScale[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScale(s)}
                      style={{
                        padding: '6px 0',
                        backgroundColor: scale === s ? '#2563eb' : '#1e293b',
                        border: scale === s ? '1px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      data-testid={`export-scale-${s}x`}
                    >
                      {`${s}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Selector */}
            {format !== 'json' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Canvas Background
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['dark', 'light', 'transparent'] as ExportTheme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        backgroundColor: theme === t ? '#2563eb' : '#1e293b',
                        border: theme === t ? '1px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                      data-testid={`export-theme-${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata & Legend Toggles */}
            {format !== 'json' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    data-testid="export-metadata-checkbox"
                  />
                  <span>Include Title & Metadata Banner</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeLegend}
                    onChange={(e) => setIncludeLegend(e.target.checked)}
                    data-testid="export-legend-checkbox"
                  />
                  <span>Include Component Kind Legend</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#090d16',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            <span>File: </span>
            <code style={{ color: '#38bdf8' }} data-testid="export-filename">
              {exportResult.filename}
            </code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCopyClipboard}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              data-testid="export-copy-btn"
            >
              {copied ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: '8px 20px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              data-testid="export-download-btn"
            >
              {`Download ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
