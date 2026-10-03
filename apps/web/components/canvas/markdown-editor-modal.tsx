'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  type ArchitectureModel,
  type View,
  type Flow,
  type ArchitectureDecisionRecord,
  type Comment,
  type CommentAuthor,
  parseMarkdownDocument,
  renderMarkdownToHtml,
  createDiagramEmbedDirective,
  createObjectEmbedDirective,
  insertTableMarkdown,
  insertCodeBlockMarkdown,
  insertImageMarkdown,
  addDocumentComment,
  resolveDocumentComment,
} from '@diagramhq/domain';

export interface MarkdownEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  initialContent?: string;
  initialTitle?: string;
  views?: View[];
  flows?: Flow[];
  adrs?: ArchitectureDecisionRecord[];
  onSave?: (doc: { title: string; content: string }) => void;
  onSelectView?: (viewId: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

type EditorViewMode = 'split' | 'edit' | 'preview';

const DEFAULT_SAMPLE_DOC = `# Architecture Specification

## Overview
This living document describes the architecture and runtime integrations of the system.
See @[Storefront Web App] for client presentation and @[API Gateway] for edge routing.

## Topologies & Views
Below is the core container diagram projection:

\`\`\`diagram
id: default-container-view
title: System Container Diagram
caption: Live projection of container communication
\`\`\`

## Microservice Components
| Service Name | Language | Runtime | Protocol |
| :--- | :--- | :--- | :--- |
| Storefront Web | TypeScript | Node.js | HTTPS |
| Order Service | Go | Container | gRPC |

\`\`\`typescript
// Client integration contract
export interface CheckoutPayload {
  cartId: string;
  userId: string;
}
\`\`\`

## Operational Runbook
- Inbound requests terminate at edge gateway with TLS 1.3.
- Database read replicas support customer query volume.
`;

export function MarkdownEditorModal({
  isOpen,
  onClose,
  model,
  initialContent,
  initialTitle,
  views = [],
  flows = [],
  adrs = [],
  onSave,
  onSelectView,
  onSelectNode,
}: MarkdownEditorModalProps) {
  const [title, setTitle] = useState<string>(initialTitle || 'Architecture Specification');
  const [content, setContent] = useState<string>(initialContent || DEFAULT_SAMPLE_DOC);
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');
  const [selectedViewId, setSelectedViewId] = useState<string>(views[0]?.id || '');
  const [selectedObjectId, setSelectedObjectId] = useState<string>(model.objects[0]?.id || '');
  const [showEmbedMenu, setShowEmbedMenu] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Parse document structure and validation issues
  const parsedDoc = useMemo(() => {
    return parseMarkdownDocument(content, model, { views, flows, adrs });
  }, [content, model, views, flows, adrs]);

  // Render HTML preview
  const renderedHtml = useMemo(() => {
    return renderMarkdownToHtml(content, model, { views, flows, adrs });
  }, [content, model, views, flows, adrs]);

  if (!isOpen) return null;

  const insertTextAtCursor = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => `${prev}\n${prefix}${defaultText}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selected = currentText.substring(start, end) || defaultText;

    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    setContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleEmbedDiagram = () => {
    if (!selectedViewId) return;
    const view = views.find((v) => v.id === selectedViewId);
    const directive = createDiagramEmbedDirective({
      viewId: selectedViewId,
      title: view ? view.name : 'Architecture Diagram',
      caption: 'Live canvas diagram projection',
    });
    insertTextAtCursor(`\n\n${directive}\n\n`);
    setShowEmbedMenu(false);
  };

  const handleEmbedObject = () => {
    if (!selectedObjectId) return;
    const obj = model.objects.find((o) => o.id === selectedObjectId);
    const directive = createObjectEmbedDirective({
      objectId: selectedObjectId,
      title: obj ? obj.name : 'Architecture Entity',
    });
    insertTextAtCursor(`\n\n${directive}\n\n`);
    setShowEmbedMenu(false);
  };

  const handleInsertTable = () => {
    const table = insertTableMarkdown(
      ['Service', 'Technology', 'Owner'],
      [
        ['API Gateway', 'Envoy / Kong', 'Platform Eng'],
        ['Order Service', 'Go 1.23', 'Orders Team'],
      ],
    );
    insertTextAtCursor(`\n\n${table}\n\n`);
  };

  const handleInsertCode = () => {
    const snippet = insertCodeBlockMarkdown('typescript', '// Type definitions\nexport interface ServiceConfig {\n  port: number;\n}');
    insertTextAtCursor(`\n\n${snippet}\n\n`);
  };

  const handleInsertImage = () => {
    const img = insertImageMarkdown('Network Architecture', 'https://example.com/network-diagram.png', 'VPC topology');
    insertTextAtCursor(`\n\n${img}\n\n`);
  };

  const handleMentionObject = (objName: string) => {
    insertTextAtCursor(`@[${objName}] `);
  };

  const handleCopyMarkdown = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ title, content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const author: CommentAuthor = {
      id: 'current-user',
      name: 'Architect Author',
      email: 'architect@diagramhq.internal',
    };
    const updated = addDocumentComment(comments, {
      docId: 'current-doc',
      workspaceId: 'main-ws',
      content: newCommentText.trim(),
      author,
    });
    setComments(updated);
    setNewCommentText('');
  };

  const handleResolveComment = (commentId: string) => {
    const author: CommentAuthor = {
      id: 'current-user',
      name: 'Architect Author',
    };
    const updated = resolveDocumentComment(comments, commentId, author);
    setComments(updated);
  };

  return (
    <div
      data-testid="markdown-editor-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <input
              data-testid="doc-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#f8fafc',
                fontSize: '15px',
                fontWeight: 700,
                width: '320px',
                outline: 'none',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                background: '#090d16',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #334155',
              }}
            >
              {`${parsedDoc.wordCount} words • ~${parsedDoc.readingTimeMinutes} min read`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: '#0f172a',
                borderRadius: '6px',
                border: '1px solid #334155',
                overflow: 'hidden',
              }}
            >
              {(['split', 'edit', 'preview'] as const).map((mode) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    data-testid={`mode-toggle-${mode}`}
                    onClick={() => setViewMode(mode)}
                    style={{
                      background: active ? '#2563eb' : 'transparent',
                      color: active ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <button
              data-testid="comments-toggle-btn"
              onClick={() => setShowComments(!showComments)}
              style={{
                background: showComments ? '#3b82f6' : '#334155',
                color: '#ffffff',
                border: '1px solid #475569',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💬 Comments</span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                }}
              >
                {`${comments.length}`}
              </span>
            </button>

            <button
              data-testid="copy-markdown-btn"
              onClick={handleCopyMarkdown}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>

            {onSave && (
              <button
                data-testid="save-doc-btn"
                onClick={handleSave}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saved ? '✓ Saved' : 'Save'}
              </button>
            )}

            <button
              data-testid="close-editor-btn"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div
          data-testid="editor-toolbar"
          style={{
            padding: '8px 16px',
            backgroundColor: '#090d16',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            flexShrink: 0,
            fontSize: '12px',
          }}
        >
          {/* Typography buttons */}
          <button
            onClick={() => insertTextAtCursor('## ', '', 'Heading')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}
          >
            H2
          </button>
          <button
            onClick={() => insertTextAtCursor('### ', '', 'Subheading')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 600 }}
          >
            H3
          </button>
          <button
            onClick={() => insertTextAtCursor('**', '**', 'bold text')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}
          >
            B
          </button>
          <button
            onClick={() => insertTextAtCursor('*', '*', 'italic text')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontStyle: 'italic' }}
          >
            I
          </button>
          <button
            onClick={() => insertTextAtCursor('> ', '', 'Quote note')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
          >
            &quot;
          </button>
          <button
            onClick={() => insertTextAtCursor('- ', '', 'List item')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
          >
            • List
          </button>

          <span style={{ color: '#334155' }}>|</span>

          {/* Table, Code, Image buttons */}
          <button
            data-testid="insert-table-btn"
            onClick={handleInsertTable}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
          >
            📊 Table
          </button>
          <button
            data-testid="insert-code-btn"
            onClick={handleInsertCode}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
          >
            💻 Code
          </button>
          <button
            data-testid="insert-image-btn"
            onClick={handleInsertImage}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
          >
            🖼️ Image
          </button>

          <span style={{ color: '#334155' }}>|</span>

          {/* Architecture Embed Hub */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              data-testid="embed-menu-btn"
              onClick={() => setShowEmbedMenu(!showEmbedMenu)}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>+ Embed Architecture ▾</span>
            </button>

            {showEmbedMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  padding: '12px',
                  width: '320px',
                  zIndex: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Embed Diagram Section */}
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
                    Embed Diagram / View:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      data-testid="embed-view-select"
                      value={selectedViewId}
                      onChange={(e) => setSelectedViewId(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    >
                      {views.length === 0 ? (
                        <option value="default-container-view">Default Container View</option>
                      ) : (
                        views.map((v) => (
                          <option key={v.id} value={v.id}>
                            {`${v.name} (${v.kind})`}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      data-testid="confirm-embed-diagram-btn"
                      onClick={handleEmbedDiagram}
                      style={{
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Embed
                    </button>
                  </div>
                </div>

                {/* Embed Object Section */}
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
                    Embed Architecture Object:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      data-testid="embed-object-select"
                      value={selectedObjectId}
                      onChange={(e) => setSelectedObjectId(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    >
                      {model.objects.map((o) => (
                        <option key={o.id} value={o.id}>
                          {`${o.name} (${o.kind})`}
                        </option>
                      ))}
                    </select>
                    <button
                      data-testid="confirm-embed-object-btn"
                      onClick={handleEmbedObject}
                      style={{
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Embed
                    </button>
                  </div>
                </div>

                {/* Quick Mentions */}
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
                    Insert Object Mention:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                    {model.objects.slice(0, 6).map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          handleMentionObject(o.name);
                          setShowEmbedMenu(false);
                        }}
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          color: '#38bdf8',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        {`@${o.name}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation issues warning bar if any */}
        {parsedDoc.validationIssues.length > 0 && (
          <div
            data-testid="validation-warning-bar"
            style={{
              padding: '6px 16px',
              backgroundColor: '#451a03',
              borderBottom: '1px solid #78350f',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: '#fde68a',
              flexShrink: 0,
            }}
          >
            <span>⚠️</span>
            <span>
              {`${parsedDoc.validationIssues.length} reference warning(s): `}
              {parsedDoc.validationIssues[0]?.message}
            </span>
          </div>
        )}

        {/* Main Workspace (Editor / Preview / Comments) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Editor Pane */}
          {(viewMode === 'split' || viewMode === 'edit') && (
            <div
              data-testid="editor-pane"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRight: viewMode === 'split' ? '1px solid #334155' : 'none',
                backgroundColor: '#0a0f1d',
              }}
            >
              <textarea
                ref={textareaRef}
                data-testid="markdown-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write architecture documentation in Markdown..."
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '16px 20px',
                  backgroundColor: 'transparent',
                  color: '#f8fafc',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Rendered Preview Pane */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div
              data-testid="preview-pane"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 32px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
              }}
            >
              <div
                data-testid="rendered-markdown-content"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                style={{
                  lineHeight: '1.7',
                  fontSize: '14px',
                }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const viewBtn = target.closest('button.doc-embed-open-btn');
                  if (viewBtn && onSelectView) {
                    const viewId = viewBtn.getAttribute('data-target-view');
                    if (viewId) {
                      onSelectView(viewId);
                    }
                  }
                  const objCard = target.closest('.doc-embed-object');
                  if (objCard && onSelectNode) {
                    const objId = objCard.getAttribute('data-object-id');
                    if (objId) {
                      onSelectNode(objId);
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Threaded Comments Sidebar */}
          {showComments && (
            <div
              data-testid="comments-sidebar"
              style={{
                width: '320px',
                flexShrink: 0,
                borderLeft: '1px solid #334155',
                backgroundColor: '#131d31',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1e293b',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Document Feedback ({comments.length})</span>
                <button
                  onClick={() => setShowComments(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Comments list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comments.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>
                    No comments yet. Start a discussion or request review below.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '10px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>{c.author.name}</span>
                        {c.resolved && (
                          <span style={{ fontSize: '10px', color: '#6ee7b7', background: '#064e3b', padding: '1px 6px', borderRadius: '4px' }}>
                            Resolved
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 8px 0', color: '#cbd5e1', lineHeight: '1.4' }}>{c.content}</p>
                      {!c.resolved && (
                        <button
                          onClick={() => handleResolveComment(c.id)}
                          style={{
                            background: '#334155',
                            border: '1px solid #475569',
                            color: '#94a3b8',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Resolve
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input */}
              <div style={{ padding: '12px', borderTop: '1px solid #1e293b' }}>
                <textarea
                  data-testid="new-comment-input"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a review comment..."
                  style={{
                    width: '100%',
                    height: '60px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    resize: 'none',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  data-testid="post-comment-btn"
                  onClick={handleAddComment}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Post Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
