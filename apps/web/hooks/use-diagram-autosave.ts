'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'saved-local' | 'error';

export interface SavedDiagramData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  c4Level?: 1 | 2 | 3;
  activeView?: string;
  activePersona?: string;
  updatedAt?: string;
  savedBy?: string;
  architectureId?: string | null;
  viewId?: string | null;
}

export interface UseDiagramAutosaveOptions {
  currentNodes: CanvasNode[];
  currentEdges: CanvasEdge[];
  c4Level?: 1 | 2 | 3;
  activeView?: string;
  activePersona?: string;
  onRestore: (data: SavedDiagramData) => void;
  debounceMs?: number;
}

export interface UseDiagramAutosaveResult {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isLoggedIn: boolean;
  sessionUser: { id?: string; email?: string | null; name?: string | null; role?: string } | null;
  architectureId: string | null;
  viewId: string | null;
  isInitialized: boolean;
  saveNow: () => Promise<void>;
  resetSavedDiagram: () => Promise<void>;
}

function computeGraphHash(nodes: CanvasNode[], edges: CanvasEdge[], c4Level?: number): string {
  const nodeSummary = nodes
    .map((n) => `${n.id}:${Math.round(n.position.x)},${Math.round(n.position.y)}:${n.data?.label || ''}`)
    .sort()
    .join('|');
  const edgeSummary = edges
    .map((e) => `${e.id}:${e.source}->${e.target}:${e.label || ''}`)
    .sort()
    .join('|');
  return `${nodes.length}_${edges.length}_${c4Level || 1}_${nodeSummary}__${edgeSummary}`;
}

const GUEST_STORAGE_KEY = 'diagramhq_studio_guest_diagram';
const LATEST_STORAGE_KEY = 'diagramhq_studio_latest_diagram';

export function useDiagramAutosave({
  currentNodes,
  currentEdges,
  c4Level,
  activeView,
  activePersona,
  onRestore,
  debounceMs = 750,
}: UseDiagramAutosaveOptions): UseDiagramAutosaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  } | null>(null);
  const [architectureId, setArchitectureId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const architectureIdRef = useRef<string | null>(null);
  const viewIdRef = useRef<string | null>(null);
  const lastSavedHashRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userKeyRef = useRef<string>('guest');

  // 1. Initial Load: Check session & restore auto-saved diagram
  useEffect(() => {
    let isCancelled = false;

    async function initAutosave() {
      try {
        const res = await fetch('/api/diagrams/autosave', { cache: 'no-store' });
        const data = await res.json().catch(() => ({ authenticated: false, diagram: null }));

        if (isCancelled) return;

        if (data.architectureId) {
          setArchitectureId(data.architectureId);
          architectureIdRef.current = data.architectureId;
        }
        if (data.viewId) {
          setViewId(data.viewId);
          viewIdRef.current = data.viewId;
        }

        if (data.authenticated && data.user) {
          setIsLoggedIn(true);
          setSessionUser(data.user);
          userKeyRef.current = data.user.id || data.user.email || 'user';

          const userStorageKey = `diagramhq_studio_${userKeyRef.current}`;

          // If cloud has a saved diagram with nodes, restore it
          if (data.diagram && Array.isArray(data.diagram.nodes) && data.diagram.nodes.length > 0) {
            onRestore(data.diagram);
            lastSavedHashRef.current = computeGraphHash(data.diagram.nodes, data.diagram.edges || [], data.diagram.c4Level);
            setSaveStatus('saved');
            setLastSavedAt(new Date(data.diagram.updatedAt || Date.now()));
            setIsInitialized(true);
            return;
          }

          // Otherwise check if this user has a local storage backup
          if (typeof window !== 'undefined') {
            const localSaved = localStorage.getItem(userStorageKey) || localStorage.getItem(LATEST_STORAGE_KEY);
            if (localSaved) {
              try {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
                  onRestore(parsed);
                  lastSavedHashRef.current = computeGraphHash(parsed.nodes, parsed.edges || [], parsed.c4Level);
                  setSaveStatus('saved-local');
                  setLastSavedAt(new Date(parsed.updatedAt || Date.now()));

                  // Sync local diagram up to the cloud
                  void fetch('/api/diagrams/autosave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed),
                  })
                    .then((postRes) => {
                      if (postRes.ok) setSaveStatus('saved');
                    })
                    .catch(() => {});

                  setIsInitialized(true);
                  return;
                }
              } catch {
                // Ignore parse errors on corrupt storage
              }
            }
          }
        } else {
          // Guest mode
          setIsLoggedIn(false);
          setSessionUser(null);
          userKeyRef.current = 'guest';

          if (typeof window !== 'undefined') {
            const guestSaved = localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem(LATEST_STORAGE_KEY);
            if (guestSaved) {
              try {
                const parsed = JSON.parse(guestSaved);
                if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
                  onRestore(parsed);
                  lastSavedHashRef.current = computeGraphHash(parsed.nodes, parsed.edges || [], parsed.c4Level);
                  setSaveStatus('saved-local');
                  setLastSavedAt(new Date(parsed.updatedAt || Date.now()));
                  setIsInitialized(true);
                  return;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        console.warn('Auto-save initialization encountered an issue:', err);
      } finally {
        if (!isCancelled) {
          lastSavedHashRef.current = computeGraphHash(currentNodes, currentEdges, c4Level);
          setIsInitialized(true);
          setSaveStatus((prev) => (prev === 'idle' ? 'saved' : prev));
        }
      }
    }

    void initAutosave();

    return () => {
      isCancelled = true;
    };
  }, []); // Run once on mount

  // 2. Perform Save
  const executeSave = useCallback(
    async (nodes: CanvasNode[], edges: CanvasEdge[], level?: 1 | 2 | 3, view?: string, persona?: string) => {
      const currentHash = computeGraphHash(nodes, edges, level);
      const payload: SavedDiagramData = {
        nodes,
        edges,
        c4Level: level,
        activeView: view,
        activePersona: persona,
        architectureId: architectureIdRef.current,
        viewId: viewIdRef.current,
        updatedAt: new Date().toISOString(),
      };

      // 1. Instant local storage persistence (synchronous & resilient)
      if (typeof window !== 'undefined') {
        try {
          const userStorageKey = `diagramhq_studio_${userKeyRef.current}`;
          const serialized = JSON.stringify(payload);
          localStorage.setItem(userStorageKey, serialized);
          localStorage.setItem(LATEST_STORAGE_KEY, serialized);
          if (userKeyRef.current === 'guest') {
            localStorage.setItem(GUEST_STORAGE_KEY, serialized);
          }
        } catch (e) {
          console.warn('Could not write diagram to localStorage:', e);
        }
      }

      // 2. Cloud persistence if authenticated
      if (isLoggedIn) {
        setSaveStatus('saving');
        try {
          const res = await fetch('/api/diagrams/autosave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            lastSavedHashRef.current = currentHash;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
          } else {
            // Saved locally but cloud returned non-200
            lastSavedHashRef.current = currentHash;
            setSaveStatus('saved-local');
            setLastSavedAt(new Date());
          }
        } catch {
          // Offline or network error
          lastSavedHashRef.current = currentHash;
          setSaveStatus('saved-local');
          setLastSavedAt(new Date());
        }
      } else {
        // Guest mode - successfully saved locally
        lastSavedHashRef.current = currentHash;
        setSaveStatus('saved-local');
        setLastSavedAt(new Date());
      }
    },
    [isLoggedIn],
  );

  // 3. Debounced Auto-save triggered by graph changes
  useEffect(() => {
    if (!isInitialized) return;

    const currentHash = computeGraphHash(currentNodes, currentEdges, c4Level);
    if (currentHash === lastSavedHashRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void executeSave(currentNodes, currentEdges, c4Level, activeView, activePersona);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentNodes, currentEdges, c4Level, activeView, activePersona, isInitialized, debounceMs, executeSave]);

  // 4. Synchronous save on tab close / reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        const payload: SavedDiagramData = {
          nodes: currentNodes,
          edges: currentEdges,
          c4Level,
          activeView,
          activePersona,
          updatedAt: new Date().toISOString(),
        };
        const userStorageKey = `diagramhq_studio_${userKeyRef.current}`;
        localStorage.setItem(userStorageKey, JSON.stringify(payload));
        localStorage.setItem(LATEST_STORAGE_KEY, JSON.stringify(payload));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentNodes, currentEdges, c4Level, activeView, activePersona]);

  // 5. Manual immediate save
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await executeSave(currentNodes, currentEdges, c4Level, activeView, activePersona);
  }, [currentNodes, currentEdges, c4Level, activeView, activePersona, executeSave]);

  // 6. Reset saved diagram
  const resetSavedDiagram = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const userStorageKey = `diagramhq_studio_${userKeyRef.current}`;
      localStorage.removeItem(userStorageKey);
      localStorage.removeItem(LATEST_STORAGE_KEY);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }

    if (isLoggedIn) {
      try {
        await fetch('/api/diagrams/autosave', { method: 'DELETE' });
      } catch {
        // Ignore
      }
    }

    lastSavedHashRef.current = '';
    setSaveStatus('idle');
    setLastSavedAt(null);
  }, [isLoggedIn]);

  return {
    saveStatus,
    lastSavedAt,
    isLoggedIn,
    sessionUser,
    architectureId,
    viewId,
    isInitialized,
    saveNow,
    resetSavedDiagram,
  };
}
