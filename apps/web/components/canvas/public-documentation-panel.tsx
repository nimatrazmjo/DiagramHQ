'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type View,
  type Flow,
  type ArchitectureDecisionRecord,
  type PublicDocPublication,
  type PublicDocVisibility,
  type PublicSiteBundle,
  type PublicSitePage,
  type PublicDocSearchResult,
  createPublicDocPublication,
  publishDocPublication,
  unpublishDocPublication,
  updatePublicDocPublication,
  recordPublicDocView,
  verifyPublicDocAccess,
  compilePublicSiteBundle,
  searchPublicSite,
  generatePublicShareUrl,
} from '@diagramhq/domain';

export interface PublicDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  initialPublication?: PublicDocPublication;
  adrs?: ArchitectureDecisionRecord[];
  views?: View[];
  flows?: Flow[];
  onPublish?: (pub: PublicDocPublication) => void;
  onUnpublish?: (pub: PublicDocPublication) => void;
  onUpdatePublication?: (pub: PublicDocPublication) => void;
}

type ModalMode = 'settings' | 'reader_preview';
type SettingsTab = 'general' | 'access' | 'content' | 'releases' | 'analytics' | 'export';

export function PublicDocumentationModal({
  isOpen,
  onClose,
  model,
  initialPublication,
  adrs = [],
  views = [],
  flows = [],
  onPublish,
  onUnpublish,
  onUpdatePublication,
}: PublicDocumentationModalProps): JSX.Element | null {
  // Current Publication State
  const [publication, setPublication] = useState<PublicDocPublication>(() => {
    if (initialPublication) return initialPublication;
    return createPublicDocPublication({
      architectureId: model.architecture.id,
      title: `${model.architecture.name} Documentation`,
      description: model.architecture.description || 'Public architecture documentation for external readers.',
      visibility: 'public',
    });
  });

  // UI Modes and Tabs
  const [mode, setMode] = useState<ModalMode>('settings');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Form Fields for Publishing / Editing
  const [formTitle, setFormTitle] = useState(publication.title);
  const [formDescription, setFormDescription] = useState(publication.description);
  const [formSlug, setFormSlug] = useState(publication.slug);
  const [formOrgName, setFormOrgName] = useState(publication.branding.organizationName);
  const [formPrimaryColor, setFormPrimaryColor] = useState(publication.branding.primaryColor);
  const [formVisibility, setFormVisibility] = useState<PublicDocVisibility>(publication.visibility);
  const [formPasskey, setFormPasskey] = useState(publication.passkey || '');
  const [formVersion, setFormVersion] = useState(publication.version);
  const [releaseChangelog, setReleaseChangelog] = useState('');

  // Reader Preview State (External anonymous reader simulation)
  const [readerPasskeyInput, setReaderPasskeyInput] = useState('');
  const [readerPasskeyError, setReaderPasskeyError] = useState('');
  const [readerUnlocked, setReaderUnlocked] = useState(false);
  const [activePageId, setActivePageId] = useState<string>('doc-overview');
  const [readerSearchQuery, setReaderSearchQuery] = useState('');

  // Compile Public Site Bundle
  const bundle: PublicSiteBundle = useMemo(() => {
    return compilePublicSiteBundle(publication, model, {
      adrs,
      views,
      flows,
    });
  }, [publication, model, adrs, views, flows]);

  // Client-side search results in reader mode
  const searchResults: PublicDocSearchResult[] = useMemo(() => {
    if (!readerSearchQuery.trim()) return [];
    return searchPublicSite(bundle, readerSearchQuery);
  }, [bundle, readerSearchQuery]);

  // Current active page in reader mode
  const activePage: PublicSitePage | undefined = useMemo(() => {
    return bundle.pages.find((p) => p.id === activePageId) || bundle.pages[0];
  }, [bundle.pages, activePageId]);

  if (!isOpen) return null;

  const publicUrl = generatePublicShareUrl(publication);

  // Handlers
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyStandaloneHtml = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bundle.standaloneHtmlExport).catch(() => {});
    }
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleSaveSettings = () => {
    const updated = updatePublicDocPublication(publication, {
      title: formTitle,
      description: formDescription,
      slug: formSlug,
      visibility: formVisibility,
      passkey: formVisibility === 'password_protected' ? formPasskey : undefined,
      branding: {
        ...publication.branding,
        organizationName: formOrgName,
        primaryColor: formPrimaryColor,
      },
    });
    setPublication(updated);
    onUpdatePublication?.(updated);
  };

  const handlePublishRelease = () => {
    handleSaveSettings();
    const published = publishDocPublication(publication, {
      version: formVersion || '1.0.0',
      changelog: releaseChangelog || 'Published updated architecture documentation.',
    });
    setPublication(published);
    onPublish?.(published);
  };

  const handleUnpublish = () => {
    const draft = unpublishDocPublication(publication);
    setPublication(draft);
    onUnpublish?.(draft);
  };

  const handleOpenReaderPreview = () => {
    // Record view analytics
    const updated = recordPublicDocView(publication, { isNewVisitor: true });
    setPublication(updated);
    setReaderUnlocked(publication.visibility !== 'password_protected');
    setReaderPasskeyInput('');
    setReaderPasskeyError('');
    setMode('reader_preview');
  };

  const handleVerifyPasskey = () => {
    const verification = verifyPublicDocAccess(publication, { passkey: readerPasskeyInput });
    if (verification.allowed) {
      setReaderUnlocked(true);
      setReaderPasskeyError('');
    } else {
      setReaderPasskeyError('Invalid passkey. Please check and try again.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      data-testid="public-doc-modal-overlay"
    >
      <div
        style={{
          width: '95vw',
          maxWidth: '1280px',
          height: '90vh',
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        data-testid="public-doc-modal-container"
      >
        {/* ==================================================================== */}
        {/* Top Header Bar */}
        {/* ==================================================================== */}
        <div
          style={{
            height: '64px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: publication.branding.primaryColor || '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
                color: '#ffffff',
              }}
            >
              📖
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                  {publication.title}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: publication.status === 'published' ? '#065f46' : '#92400e',
                    color: publication.status === 'published' ? '#6ee7b7' : '#fde68a',
                  }}
                  data-testid="publication-status-badge"
                >
                  {publication.status}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#334155',
                    color: '#94a3b8',
                  }}
                >
                  {`v${publication.version}`}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1e3a8a',
                    color: '#93c5fd',
                  }}
                  data-testid="visibility-badge"
                >
                  {publication.visibility === 'public'
                    ? '🌐 Public (No Account Required)'
                    : publication.visibility === 'unlisted'
                      ? '🔗 Unlisted Secret Link'
                      : '🔒 Password Protected'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {`Public URL: ${publicUrl}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {mode === 'settings' ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenReaderPreview}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  data-testid="view-reader-mode-btn"
                >
                  <span>👁️</span>
                  <span>View as External Reader</span>
                </button>
                {publication.status === 'published' ? (
                  <button
                    type="button"
                    onClick={handleUnpublish}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#475569',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    data-testid="unpublish-btn"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublishRelease}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#16a34a',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    data-testid="publish-btn"
                  >
                    Publish Documentation
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('settings')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                data-testid="back-to-settings-btn"
              >
                <span>⚙️</span>
                <span>Publisher Settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#334155',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-testid="close-public-doc-modal-btn"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Main Body */}
        {/* ==================================================================== */}
        {mode === 'settings' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left Settings Navigation */}
            <div
              style={{
                width: '240px',
                backgroundColor: '#131b2e',
                borderRight: '1px solid #334155',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0 8px 8px' }}>
                Settings & Publishing
              </div>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('general')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'general' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'general' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-general"
              >
                <span>⚙️</span>
                <span>General & Branding</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('access')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'access' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'access' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-access"
              >
                <span>🔒</span>
                <span>Access & Security</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('content')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'content' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'content' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-content"
              >
                <span>📑</span>
                <span>Content Selection</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('releases')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'releases' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'releases' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-releases"
              >
                <span>🏷️</span>
                <span>Releases & Versioning</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('analytics')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'analytics' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'analytics' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-analytics"
              >
                <span>📊</span>
                <span>Reader Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('export')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeSettingsTab === 'export' ? '#1e293b' : 'transparent',
                  color: activeSettingsTab === 'export' ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                data-testid="tab-export"
              >
                <span>📦</span>
                <span>Offline HTML Export</span>
              </button>
            </div>

            {/* Right Settings Content */}
            <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
              {/* Share URL Banner Card */}
              <div
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px 20px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                    🔗 External Reader Share Link (Viewable without an account)
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#f8fafc',
                      background: '#090d16',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                    }}
                    data-testid="public-share-url-text"
                  >
                    {publicUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: copiedLink ? '#059669' : '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  data-testid="copy-link-btn"
                >
                  {copiedLink ? '✓ Copied Link' : 'Copy Public Link'}
                </button>
              </div>

              {/* Tab 1: General & Branding */}
              {activeSettingsTab === 'general' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>General & Branding</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Configure how external readers see your architecture documentation portal.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        Portal Title
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '14px',
                        }}
                        data-testid="input-title"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '14px',
                        }}
                        data-testid="input-description"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                          Custom URL Slug
                        </label>
                        <input
                          type="text"
                          value={formSlug}
                          onChange={(e) => setFormSlug(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '14px',
                          }}
                          data-testid="input-slug"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={formOrgName}
                          onChange={(e) => setFormOrgName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '14px',
                          }}
                          data-testid="input-org-name"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        Brand Accent Color
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="color"
                          value={formPrimaryColor}
                          onChange={(e) => setFormPrimaryColor(e.target.value)}
                          style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={formPrimaryColor}
                          onChange={(e) => setFormPrimaryColor(e.target.value)}
                          style={{
                            width: '140px',
                            padding: '10px 14px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                          }}
                          data-testid="input-primary-color"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        data-testid="save-general-settings-btn"
                      >
                        Save General Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Access & Security */}
              {activeSettingsTab === 'access' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Access & Visibility</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Control how external readers view this documentation. External readers never need to create an account.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px',
                        backgroundColor: formVisibility === 'public' ? '#1e3a8a33' : '#1e293b',
                        border: formVisibility === 'public' ? '1px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={formVisibility === 'public'}
                        onChange={() => setFormVisibility('public')}
                        data-testid="radio-visibility-public"
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          Public (Recommended)
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Anyone on the internet with the link can view your documentation without logging in or having an account.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px',
                        backgroundColor: formVisibility === 'unlisted' ? '#1e3a8a33' : '#1e293b',
                        border: formVisibility === 'unlisted' ? '1px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="unlisted"
                        checked={formVisibility === 'unlisted'}
                        onChange={() => setFormVisibility('unlisted')}
                        data-testid="radio-visibility-unlisted"
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          Unlisted Secret Link
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Only readers who possess the secret slug URL can access the site. Disallowed in search engines. No account required.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px',
                        backgroundColor: formVisibility === 'password_protected' ? '#1e3a8a33' : '#1e293b',
                        border: formVisibility === 'password_protected' ? '1px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="password_protected"
                        checked={formVisibility === 'password_protected'}
                        onChange={() => setFormVisibility('password_protected')}
                        data-testid="radio-visibility-password"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          Password Protected
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                          Requires a shared passkey to unlock the docs. External visitors do NOT need an account or email to view.
                        </div>
                        {formVisibility === 'password_protected' && (
                          <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                              Passkey Code:
                            </label>
                            <input
                              type="text"
                              value={formPasskey}
                              onChange={(e) => setFormPasskey(e.target.value)}
                              placeholder="e.g. partner-secret-2026"
                              style={{
                                width: '100%',
                                maxWidth: '320px',
                                padding: '8px 12px',
                                backgroundColor: '#0f172a',
                                border: '1px solid #3b82f6',
                                borderRadius: '6px',
                                color: '#ffffff',
                                fontSize: '13px',
                              }}
                              data-testid="input-passkey"
                            />
                          </div>
                        )}
                      </div>
                    </label>

                    <div style={{ marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        data-testid="save-access-settings-btn"
                      >
                        Save Access Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Content Selection */}
              {activeSettingsTab === 'content' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Published Content Selection</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Select which architecture artifacts are compiled into this public documentation bundle.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>Architecture Overview Page</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Root summary synthesizing subsystem hierarchy, tech stack, and entity breakdown.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={publication.contentConfig.includeOverview}
                        onChange={(e) => {
                          const updated = updatePublicDocPublication(publication, {
                            contentConfig: {
                              ...publication.contentConfig,
                              includeOverview: e.target.checked,
                            },
                          });
                          setPublication(updated);
                        }}
                        data-testid="toggle-overview"
                      />
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {`Architecture Decision Records (ADRs) (${adrs.length} available)`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Include architectural decisions, context, and consequences for external audit.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>Included</span>
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {`Diagram Views (${views.length} available)`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Render visual diagrams as interactive preview cards in the documentation.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>Included</span>
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {`Execution Flows (${flows.length} available)`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Include end-to-end integration and data flows.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>Included</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Releases & Versioning */}
              {activeSettingsTab === 'releases' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Releases & Versioning</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Publish versioned snapshots of your architecture documentation.
                  </p>

                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      padding: '20px',
                      marginBottom: '28px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>
                      Publish New Documentation Release
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                          Release Version
                        </label>
                        <input
                          type="text"
                          value={formVersion}
                          onChange={(e) => setFormVersion(e.target.value)}
                          placeholder="e.g. 1.1.0"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '13px',
                          }}
                          data-testid="input-release-version"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                          Changelog Note
                        </label>
                        <input
                          type="text"
                          value={releaseChangelog}
                          onChange={(e) => setReleaseChangelog(e.target.value)}
                          placeholder="e.g. Updated Payment Core dependencies and new ADR"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '13px',
                          }}
                          data-testid="input-release-changelog"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handlePublishRelease}
                      style={{
                        padding: '8px 18px',
                        backgroundColor: '#16a34a',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      data-testid="publish-release-btn"
                    >
                      Publish Release Now
                    </button>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Release History</div>
                  {publication.versionHistory.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No previous releases recorded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {publication.versionHistory.map((rec, i) => (
                        <div
                          key={`rec-${rec.version}-${i}`}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#38bdf8', marginRight: '8px' }}>
                              {`v${rec.version}`}
                            </span>
                            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{rec.changelog}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {rec.publishedAt.split('T')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Reader Analytics */}
              {activeSettingsTab === 'analytics' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Visitor Analytics</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Anonymous readership statistics for published documentation.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div
                      style={{
                        padding: '20px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                      data-testid="metric-pageviews"
                    >
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>
                        {`${publication.viewCount}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Total Pageviews</div>
                    </div>
                    <div
                      style={{
                        padding: '20px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                      data-testid="metric-visitors"
                    >
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>
                        {`${publication.uniqueVisitors}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Unique External Visitors</div>
                    </div>
                    <div
                      style={{
                        padding: '20px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '6px' }}>
                        {publication.lastViewedAt ? publication.lastViewedAt.split('T')[0] : 'None yet'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Last Reader Access</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Standalone HTML Export */}
              {activeSettingsTab === 'export' && (
                <div style={{ maxWidth: '720px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Standalone Offline HTML Export</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                    Export a 100% self-contained single-file HTML website with embedded styles and client-side search.
                  </p>

                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      padding: '24px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                      Single-Page Offline Documentation Bundle
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                      {`Compiled site bundle containing ${bundle.pages.length} pages, search index, navigation, and semantic markup.`}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyStandaloneHtml}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: copiedHtml ? '#059669' : '#2563eb',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      data-testid="copy-standalone-html-btn"
                    >
                      {copiedHtml ? '✓ Copied Standalone HTML!' : 'Copy Standalone HTML to Clipboard'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* External Reader View Mode (Simulated Anonymous Visitor without Account) */
          /* ==================================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Top Reader Mode Indicator */}
            <div
              style={{
                backgroundColor: '#1e3a8a',
                color: '#dbeafe',
                padding: '6px 24px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              data-testid="reader-mode-banner"
            >
              <span>
                👁️ <strong>External Reader Mode</strong> — Simulated anonymous visitor viewing public documentation (No account required).
              </span>
              <button
                type="button"
                onClick={() => setMode('settings')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Return to Editor
              </button>
            </div>

            {/* Check if password protected and locked */}
            {publication.visibility === 'password_protected' && !readerUnlocked ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#090d16',
                  padding: '24px',
                }}
                data-testid="reader-locked-screen"
              >
                <div
                  style={{
                    maxWidth: '440px',
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                    Password Protected Documentation
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
                    This architecture documentation is protected by a passkey. External readers do NOT need an account to view.
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="password"
                      value={readerPasskeyInput}
                      onChange={(e) => {
                        setReaderPasskeyInput(e.target.value);
                        setReaderPasskeyError('');
                      }}
                      placeholder="Enter passkey to view..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#0f172a',
                        border: readerPasskeyError ? '1px solid #ef4444' : '1px solid #475569',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      data-testid="reader-passkey-input"
                    />
                    {readerPasskeyError && (
                      <div
                        style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', textAlign: 'left' }}
                        data-testid="reader-passkey-error"
                      >
                        {readerPasskeyError}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyPasskey}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#2563eb',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    data-testid="unlock-doc-btn"
                  >
                    Unlock Documentation
                  </button>
                </div>
              </div>
            ) : (
              /* Unlocked Reader Interface */
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Reader Sidebar */}
                <div
                  style={{
                    width: '280px',
                    backgroundColor: '#111827',
                    borderRight: '1px solid #1f2937',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                  }}
                  data-testid="reader-sidebar"
                >
                  {/* Search Input in Sidebar */}
                  <div style={{ padding: '16px 16px 8px' }}>
                    <input
                      type="text"
                      value={readerSearchQuery}
                      onChange={(e) => setReaderSearchQuery(e.target.value)}
                      placeholder="Search public docs..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#f9fafb',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      data-testid="reader-search-input"
                    />
                  </div>

                  {/* Navigation List or Search Results */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                    {readerSearchQuery.trim() ? (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>
                          {`Search Results (${searchResults.length})`}
                        </div>
                        {searchResults.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>No matching documentation found.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {searchResults.map((res) => (
                              <button
                                key={`search-res-${res.pageId}`}
                                type="button"
                                onClick={() => {
                                  setActivePageId(res.pageId);
                                  setReaderSearchQuery('');
                                }}
                                style={{
                                  padding: '8px 10px',
                                  backgroundColor: activePageId === res.pageId ? '#1f2937' : 'transparent',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#f3f4f6',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                }}
                                data-testid={`search-result-${res.pageId}`}
                              >
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{res.title}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{res.snippet}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {bundle.navigation.map((section, sIdx) => (
                          <div key={`nav-sec-${section.category}-${sIdx}`}>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: '#9ca3af',
                                marginBottom: '6px',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {section.title}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {section.items.map((item) => (
                                <button
                                  key={`nav-item-${item.id}`}
                                  type="button"
                                  onClick={() => setActivePageId(item.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: activePageId === item.id ? '#1e3a8a' : 'transparent',
                                    color: activePageId === item.id ? '#93c5fd' : '#d1d5db',
                                    fontSize: '13px',
                                    fontWeight: activePageId === item.id ? 700 : 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  data-testid={`reader-nav-${item.slug}`}
                                >
                                  <span>{item.title}</span>
                                  {item.badge && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: '#374151',
                                        color: '#d1d5db',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reader Main Document Pane */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '36px 48px',
                    backgroundColor: '#090d16',
                  }}
                  data-testid="reader-content-pane"
                >
                  {activePage ? (
                    <article style={{ maxWidth: '820px', margin: '0 auto' }}>
                      {/* Breadcrumbs */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '20px',
                        }}
                        data-testid="reader-breadcrumbs"
                      >
                        {activePage.breadcrumbs.map((crumb, idx) => (
                          <React.Fragment key={`crumb-${crumb.slug}-${idx}`}>
                            {idx > 0 && <span>/</span>}
                            <span>{crumb.title}</span>
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Header */}
                      <header style={{ borderBottom: '1px solid #1f2937', paddingBottom: '16px', marginBottom: '24px' }}>
                        <h1
                          style={{ fontSize: '32px', fontWeight: 800, color: '#f9fafb', marginBottom: '10px' }}
                          data-testid="reader-page-title"
                        >
                          {activePage.title}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                          <span>{`Category: ${activePage.category.toUpperCase()}`}</span>
                          <span>•</span>
                          <span>{`Reading time: ${activePage.readingTimeMinutes} min`}</span>
                          {activePage.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {activePage.tags.map((t, idx) => (
                                  <span
                                    key={`tag-${t}-${idx}`}
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#1f2937',
                                      color: '#9ca3af',
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </header>

                      {/* Rendered HTML Body */}
                      <div
                        style={{
                          fontSize: '15px',
                          lineHeight: 1.7,
                          color: '#d1d5db',
                        }}
                        dangerouslySetInnerHTML={{ __html: activePage.html }}
                        data-testid="reader-html-content"
                      />
                    </article>
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px' }}>
                      Select a page from the sidebar to start reading.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
