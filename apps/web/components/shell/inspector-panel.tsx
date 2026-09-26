'use client';

import React, { useState } from 'react';

export interface InspectorItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  status?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface InspectorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  selectedItem?: { id: string; name: string; type: string } | null;
}

type TabType = 'properties' | 'hierarchy' | 'metadata';

export function InspectorPanel({
  isOpen,
  onToggle,
  children,
  selectedItem = null,
}: InspectorPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('properties');

  // Render minimal collapsed strip when collapsed
  if (!isOpen) {
    return (
      <aside
        aria-label="Inspector collapsed strip"
        style={{
          width: '36px',
          backgroundColor: '#0a0d14',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand inspector panel"
          title="Expand inspector"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#64748b',
          }}
        >
          Inspector
        </span>
      </aside>
    );
  }

  // Render full panel when open
  return (
    <aside
      aria-label="Object Inspector"
      style={{
        width: '300px',
        minWidth: '300px',
        backgroundColor: '#0a0d14',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#e2e8f0',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1e293b',
          height: '48px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Inspector</span>
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse inspector"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Collapse panel"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Tabs navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#070a10',
          padding: '0 8px',
          flexShrink: 0,
        }}
      >
        {(['properties', 'hierarchy', 'metadata'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#60a5fa' : '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'center',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Body Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {/* Custom children slot */}
        {children ? (
          <div>{children}</div>
        ) : selectedItem ? (
          /* Render based on active tab when item is selected */
          <div>
            {activeTab === 'properties' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Name
                  </label>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#f8fafc',
                      backgroundColor: '#111827',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #1f2937',
                    }}
                  >
                    {selectedItem.name}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Type
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#93c5fd',
                      backgroundColor: '#172554',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #1d4ed8',
                    }}
                  >
                    {selectedItem.type}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Object ID
                  </label>
                  <code
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#94a3b8',
                      backgroundColor: '#0f172a',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #1e293b',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedItem.id}
                  </code>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Status
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#a7f3d0',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                      }}
                    />
                    Active / Synced
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hierarchy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  Model Context
                </div>
                <div
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}
                  >
                    <span>📁</span> Workspace Root
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingLeft: '14px',
                      color: '#cbd5e1',
                    }}
                  >
                    <span>↳ 📦</span> {selectedItem.type}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingLeft: '28px',
                      color: '#60a5fa',
                      fontWeight: 600,
                    }}
                  >
                    <span>↳ ✦</span> {selectedItem.name}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  Entity Metadata
                </div>
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#cbd5e1',
                    lineHeight: '1.6',
                  }}
                >
                  <div>
                    <strong>ID:</strong> {selectedItem.id}
                  </div>
                  <div>
                    <strong>Kind:</strong> {selectedItem.type}
                  </div>
                  <div>
                    <strong>Namespace:</strong> default
                  </div>
                  <div>
                    <strong>Sync:</strong> Local Cache
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Default empty state when no item is selected */
          <div
            style={{
              height: '100%',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '24px 12px',
              color: '#64748b',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: '#475569',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <p
              style={{
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#94a3b8',
                margin: 0,
                maxWidth: '220px',
              }}
            >
              Select an object on the canvas or navigator to view and edit its properties.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default InspectorPanel;
