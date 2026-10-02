'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- Types ---
type NodeType = 'person' | 'app' | 'store' | 'external';

interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  color: string;
  icon: string;
  badge: string;
  description: string;
  tech?: string[];
  selected?: boolean;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: string;
}

interface Position {
  x: number;
  y: number;
}

// --- Initial Data ---
const LEVEL_2_NODES: NodeData[] = [
  { id: 'user', type: 'person', label: 'End User / Client', color: '#ba1a1a', icon: 'person', badge: 'Person', description: 'Customer authenticating via desktop web browser or iOS/Android native app.' },
  { id: 'webapp', type: 'app', label: 'Customer Web App', color: '#4648d4', icon: 'desktop_windows', badge: 'App Service', tech: ['React 18', 'TypeScript', 'Tailwind'], description: 'Next.js 14 SPA bundle hosted on Vercel Edge Global CDN.' },
  { id: 'gateway', type: 'app', label: 'Edge API Gateway', color: '#006194', icon: 'dns', badge: 'App Service', tech: ['Fastify', 'GraphQL', 'Envoy Proxy', 'Docker'], description: 'Reverse proxy layer managing TLS termination, token authentication, rate-limiting, and GraphQL federation.' },
  { id: 'auth', type: 'app', label: 'Auth Service', color: '#4648d4', icon: 'security', badge: 'App Service', tech: ['Go 1.22', 'gRPC'], description: 'Go microservice handling OAuth2 PKCE, token refresh, and RBAC permissions.' },
  { id: 'db', type: 'store', label: 'Primary Database', color: '#006947', icon: 'database', badge: 'Data Store', tech: ['PostgreSQL 16', 'PgBouncer'], description: 'Multi-AZ PostgreSQL 16 instance storing encrypted customer accounts and ledger data.' },
  { id: 'cache', type: 'store', label: 'Cache Cluster', color: '#006947', icon: 'bolt', badge: 'Data Store', tech: ['Redis 7.2'], description: 'Redis 7 cluster providing sub-millisecond session validation.' },
  { id: 'billing', type: 'external', label: 'Stripe Billing', color: '#707881', icon: 'credit_card', badge: 'External Boundary', tech: ['Stripe API', 'Webhooks'], description: 'Third-party recurring subscription manager.' }
];

const LEVEL_2_POSITIONS: Record<string, Position> = {
  user: { x: 380, y: 45 },
  webapp: { x: 370, y: 205 },
  gateway: { x: 345, y: 375 },
  auth: { x: 50, y: 580 },
  db: { x: 360, y: 580 },
  cache: { x: 630, y: 580 },
  billing: { x: 870, y: 580 }
};

const LEVEL_2_EDGES: EdgeData[] = [
  { id: 'e1', source: 'user', target: 'webapp', label: 'HTTPS : 443', protocol: 'HTTPS : 443' },
  { id: 'e2', source: 'webapp', target: 'gateway', label: 'HTTPS / REST', protocol: 'HTTPS / REST' },
  { id: 'e3', source: 'gateway', target: 'auth', label: 'gRPC / TLS', protocol: 'gRPC / TLS' },
  { id: 'e4', source: 'gateway', target: 'db', label: 'TCP : 5432', protocol: 'TCP : 5432' },
  { id: 'e5', source: 'gateway', target: 'cache', label: 'TCP : 6379', protocol: 'TCP : 6379' },
  { id: 'e6', source: 'gateway', target: 'billing', label: 'mTLS REST', protocol: 'mTLS REST' },
];

const LEVEL_1_NODES: NodeData[] = [
  { id: 'edge', type: 'app', label: 'Edge Gateway', color: '#006194', icon: 'dns', badge: 'App Service', description: 'Entry point' },
  { id: 'payment', type: 'app', label: 'Payment Gateway', color: '#006194', icon: 'payments', badge: 'App Service', description: 'Handles payments' },
  { id: 'auth', type: 'app', label: 'Auth Service', color: '#4648d4', icon: 'security', badge: 'App Service', description: 'Handles auth' },
  { id: 'postgres', type: 'store', label: 'Postgres DB', color: '#006947', icon: 'database', badge: 'Data Store', description: 'Database' }
];

const LEVEL_1_POSITIONS: Record<string, Position> = {
  edge: { x: 56, y: 160 },
  payment: { x: 360, y: 112 },
  auth: { x: 730, y: 144 },
  postgres: { x: 730, y: 410 }
};

const LEVEL_1_EDGES: EdgeData[] = [
  { id: 'l1-e1', source: 'edge', target: 'payment' },
  { id: 'l1-e2', source: 'edge', target: 'auth' },
  { id: 'l1-e3', source: 'payment', target: 'postgres' },
  { id: 'l1-e4', source: 'auth', target: 'postgres' },
];

// --- Constants ---
const NODE_WIDTH = 250;
const NODE_HEIGHT = 120; // Approx default

export default function CanvasPage() {
  const [c4Level, setC4Level] = useState<number>(2);
  const [nodes, setNodes] = useState<NodeData[]>(LEVEL_2_NODES);
  const [nodePositions, setNodePositions] = useState<Record<string, Position>>(LEVEL_2_POSITIONS);
  const [edges, setEdges] = useState<EdgeData[]>(LEVEL_2_EDGES);

  // Viewport State
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [scale, setScale] = useState(1.0);
  
  // Interaction State
  const [mode, setMode] = useState<'select' | 'connector' | 'hand'>('select');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [simulationActive, setSimulationActive] = useState(true);

  // Selection
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['gateway']);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // Undo/Redo
  const [history, setHistory] = useState<{ nodes: NodeData[]; positions: Record<string, Position>; edges: EdgeData[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Init history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ nodes: LEVEL_2_NODES, positions: LEVEL_2_POSITIONS, edges: LEVEL_2_EDGES }]);
      setHistoryIndex(0);
    }
  }, []);

  const pushHistory = useCallback((newNodes: NodeData[], newPositions: Record<string, Position>, newEdges: EdgeData[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, positions: newPositions, edges: newEdges });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 50));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setNodes(history[idx]!.nodes);
      setNodePositions(history[idx]!.positions);
      setEdges(history[idx]!.edges);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setNodes(history[idx]!.nodes);
      setNodePositions(history[idx]!.positions);
      setEdges(history[idx]!.edges);
    }
  };

  const switchLevel = (level: number) => {
    setC4Level(level);
    if (level === 2) {
      setNodes(LEVEL_2_NODES);
      setNodePositions(LEVEL_2_POSITIONS);
      setEdges(LEVEL_2_EDGES);
      setSelectedNodeIds(['gateway']);
      pushHistory(LEVEL_2_NODES, LEVEL_2_POSITIONS, LEVEL_2_EDGES);
    } else {
      setNodes(LEVEL_1_NODES);
      setNodePositions(LEVEL_1_POSITIONS);
      setEdges(LEVEL_1_EDGES);
      setSelectedNodeIds([]);
      pushHistory(LEVEL_1_NODES, LEVEL_1_POSITIONS, LEVEL_1_EDGES);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'v': case 'V': setMode('select'); break;
        case 'h': case 'H': setMode('hand'); break;
        case 'c': case 'C': setMode('connector'); break;
        case 'f': case 'F': setPanX(0); setPanY(0); setScale(1); break;
        case 'Escape': setSelectedNodeIds([]); setConnectingFrom(null); break;
        case 'Delete': case 'Backspace': handleDeleteSelected(); break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) redo();
            else undo();
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeIds, mode, history, historyIndex, nodes, nodePositions, edges]);

  const handleDeleteSelected = () => {
    if (selectedNodeIds.length === 0) return;
    const newNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));
    const newPositions = { ...nodePositions };
    selectedNodeIds.forEach(id => delete newPositions[id]);
    const newEdges = edges.filter(e => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target));
    setNodes(newNodes);
    setNodePositions(newPositions);
    setEdges(newEdges);
    setSelectedNodeIds([]);
    pushHistory(newNodes, newPositions, newEdges);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY;
    let newScale = scale * (1 + delta * zoomSensitivity);
    newScale = Math.max(0.25, Math.min(newScale, 3.0));

    const scaleRatio = newScale / scale;
    const newPanX = cursorX - (cursorX - panX) * scaleRatio;
    const newPanY = cursorY - (cursorY - panY) * scaleRatio;

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const getCanvasCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / scale,
      y: (e.clientY - rect.top - panY) / scale
    };
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.diagram-node')) return;

    if (mode === 'hand' || mode === 'select') {
      if (mode === 'hand' || e.button === 1 || e.altKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        return;
      }
    }

    if (mode === 'select') {
      const coords = getCanvasCoords(e);
      setSelectionBox({ startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
      return;
    }
    if (draggingNodeId) {
      const coords = getCanvasCoords(e);
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
      }));
      return;
    }
    if (selectionBox) {
      const coords = getCanvasCoords(e);
      setSelectionBox(prev => prev ? { ...prev, endX: coords.x, endY: coords.y } : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingNodeId) {
      setDraggingNodeId(null);
      pushHistory(nodes, nodePositions, edges);
    }
    if (selectionBox) {
      // Find intersecting nodes
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);

      const selected = nodes.filter(n => {
        const pos = nodePositions[n.id];
        if (!pos) return false;
        return pos.x + NODE_WIDTH > minX && pos.x < maxX && pos.y + NODE_HEIGHT > minY && pos.y < maxY;
      }).map(n => n.id);

      if (!e.shiftKey) {
        setSelectedNodeIds(selected);
      } else {
        setSelectedNodeIds(prev => Array.from(new Set([...prev, ...selected])));
      }
      setSelectionBox(null);
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (mode === 'connector') {
      if (connectingFrom) {
        if (connectingFrom !== id) {
          const newEdge = { id: `e-${Date.now()}`, source: connectingFrom, target: id, label: 'HTTPS', protocol: 'HTTPS' };
          const newEdges = [...edges, newEdge];
          setEdges(newEdges);
          pushHistory(nodes, nodePositions, newEdges);
        }
        setConnectingFrom(null);
      } else {
        setConnectingFrom(id);
      }
      return;
    }
    if (mode === 'select') {
      if (!selectedNodeIds.includes(id)) {
        if (e.shiftKey) {
          setSelectedNodeIds(prev => [...prev, id]);
        } else {
          setSelectedNodeIds([id]);
        }
      } else if (e.shiftKey) {
        setSelectedNodeIds(prev => prev.filter(n => n !== id));
      }

      const coords = getCanvasCoords(e);
      const pos = nodePositions[id] || { x: 0, y: 0 };
      setDragOffset({ x: coords.x - pos.x, y: coords.y - pos.y });
      setDraggingNodeId(id);
    }
  };

  const insertNode = (type: NodeType, label: string, color: string, icon: string, badge: string) => {
    const id = `node-${Date.now()}`;
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 500;
    const cy = rect ? rect.height / 2 : 300;
    
    const x = (cx - panX) / scale - NODE_WIDTH / 2;
    const y = (cy - panY) / scale - NODE_HEIGHT / 2;

    const newNode: NodeData = {
      id, type, label, color, icon, badge, description: 'New component'
    };
    const newNodes = [...nodes, newNode];
    const newPositions = { ...nodePositions, [id]: { x, y } };
    
    setNodes(newNodes);
    setNodePositions(newPositions);
    setSelectedNodeIds([id]);
    pushHistory(newNodes, newPositions, edges);
  };

  const renderPaths = () => {
    return edges.map(edge => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];
      if (!sourcePos || !targetPos) return null;

      const scx = sourcePos.x + NODE_WIDTH / 2;
      const scy = sourcePos.y + NODE_HEIGHT / 2;
      const tcx = targetPos.x + NODE_WIDTH / 2;
      const tcy = targetPos.y + NODE_HEIGHT / 2;

      let d = '';
      if (c4Level === 2) {
        if (edge.source === 'user' && edge.target === 'webapp') {
          d = `M ${scx} ${sourcePos.y + NODE_HEIGHT} L ${tcx} ${targetPos.y}`;
        } else if (edge.source === 'webapp' && edge.target === 'gateway') {
          d = `M ${scx} ${sourcePos.y + NODE_HEIGHT} L ${tcx} ${targetPos.y}`;
        } else if (edge.source === 'gateway' && edge.target === 'auth') {
          d = `M ${sourcePos.x} ${scy} L ${tcx} ${scy} L ${tcx} ${targetPos.y}`;
        } else if (edge.source === 'gateway' && edge.target === 'db') {
          d = `M ${scx} ${sourcePos.y + NODE_HEIGHT} L ${tcx} ${targetPos.y}`;
        } else if (edge.source === 'gateway' && edge.target === 'cache') {
          d = `M ${sourcePos.x + NODE_WIDTH} ${scy} L ${tcx} ${scy} L ${tcx} ${targetPos.y}`;
        } else if (edge.source === 'gateway' && edge.target === 'billing') {
          d = `M ${sourcePos.x + NODE_WIDTH} ${scy} L ${tcx} ${scy} L ${tcx} ${targetPos.y}`;
        } else {
          d = `M ${scx} ${scy} L ${tcx} ${tcy}`;
        }
      } else {
        d = `M ${scx} ${scy} L ${tcx} ${tcy}`;
      }

      // Midpoint
      let midX = (scx + tcx) / 2;
      let midY = (scy + tcy) / 2;
      if (c4Level === 2) {
         // rough approximations based on L-shapes
         if (edge.source === 'gateway' && edge.target === 'auth') {
           midX = tcx; midY = (scy + targetPos.y) / 2;
         }
         if (edge.source === 'gateway' && edge.target === 'cache') {
           midX = tcx; midY = (scy + targetPos.y) / 2;
         }
         if (edge.source === 'gateway' && edge.target === 'billing') {
           midX = tcx; midY = (scy + targetPos.y) / 2;
         }
      }

      const pathId = `path-${edge.id}`;

      return (
        <g key={edge.id}>
          <path id={pathId} d={d} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray={mode === 'connector' && connectingFrom === edge.source ? '5,5' : '0'} />
          
          {simulationActive && c4Level === 2 && ['e1', 'e2', 'e4'].includes(edge.id) && (
            <circle r="4" fill="#3b82f6">
              <animateMotion dur="2s" repeatCount="indefinite">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          )}

          {edge.protocol && c4Level === 2 && (
            <foreignObject x={midX - 50} y={midY - 12} width={100} height={24} style={{ overflow: 'visible' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{ 
                  backgroundColor: edge.label === 'HTTPS / REST' ? '#006194' : '#e2e8f0', 
                  color: edge.label === 'HTTPS / REST' ? '#ffffff' : '#475569',
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '10px', 
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  {edge.protocol}
                </span>
              </div>
            </foreignObject>
          )}
        </g>
      );
    });
  };

  const selectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
      
      {/* Header Toolbar */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-semibold text-sm">IcePanel Architecture Studio</span>
            <span className="text-xs text-slate-500">Workspace / Level {c4Level}</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2" />
          
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setMode('select')}
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${mode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Select (V)"
            >
              <span className="material-symbols-outlined text-sm">near_me</span>
            </button>
            <button 
              onClick={() => setMode('hand')}
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${mode === 'hand' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Hand (H)"
            >
              <span className="material-symbols-outlined text-sm">pan_tool</span>
            </button>
            <button 
              onClick={() => setMode('connector')}
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${mode === 'connector' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Connector (C)"
            >
              <span className="material-symbols-outlined text-sm">timeline</span>
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2" />
          
          <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">undo</span>
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">redo</span>
          </button>
          
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md">
              <span className="material-symbols-outlined text-sm">add</span> Insert
            </button>
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-md hidden group-hover:block">
              <button onClick={() => insertNode('app', 'App Service', '#4648d4', 'desktop_windows', 'App Service')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">App Service</button>
              <button onClick={() => insertNode('store', 'Data Store', '#006947', 'database', 'Data Store')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Data Store</button>
              <button onClick={() => insertNode('person', 'Actor / User', '#ba1a1a', 'person', 'Person')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Actor / User</button>
              <button onClick={() => insertNode('external', 'External System', '#707881', 'credit_card', 'External')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">External System</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={simulationActive} onChange={e => setSimulationActive(e.target.checked)} />
            Simulate Traffic
          </label>
          <div className="flex items-center gap-2 bg-slate-100 rounded px-2 py-1">
            <button onClick={() => switchLevel(1)} className={`text-xs px-2 py-1 rounded ${c4Level === 1 ? 'bg-white shadow-sm font-bold' : ''}`}>L1 Context</button>
            <button onClick={() => switchLevel(2)} className={`text-xs px-2 py-1 rounded ${c4Level === 2 ? 'bg-white shadow-sm font-bold' : ''}`}>L2 Container</button>
          </div>
          <div className="text-sm font-mono text-slate-500 w-12 text-right">
            {Math.round(scale * 100)}%
          </div>
          <button onClick={() => { setPanX(0); setPanY(0); setScale(1); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Fit (F)">
            <span className="material-symbols-outlined text-sm">fit_screen</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-slate-50 select-none outline-none"
          style={{ cursor: mode === 'hand' || isPanning ? 'grabbing' : mode === 'connector' ? 'crosshair' : 'default' }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDownCanvas}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          tabIndex={0}
        >
          {/* Transform Wrapper */}
          <div 
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              transformOrigin: '0 0',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          >
            {/* Edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '4000px', height: '4000px', pointerEvents: 'none', overflow: 'visible' }}>
              {renderPaths()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const pos = nodePositions[node.id] || { x: 0, y: 0 };
              const isSelected = selectedNodeIds.includes(node.id);
              const isConnectingTarget = mode === 'connector' && connectingFrom && connectingFrom !== node.id;
              
              return (
                <div
                  key={node.id}
                  className="diagram-node absolute bg-white rounded-lg border-2 shadow-sm transition-shadow"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: NODE_WIDTH,
                    minHeight: NODE_HEIGHT,
                    borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                    boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : '',
                    cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                    zIndex: isSelected ? 10 : 1
                  }}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                >
                  {isConnectingTarget && (
                    <div className="absolute -inset-2 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none" />
                  )}
                  
                  <div className="h-2 w-full rounded-t-sm" style={{ backgroundColor: node.color }} />
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <span className="material-symbols-outlined text-lg" style={{ color: node.color }}>{node.icon}</span>
                        {node.label}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {node.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 mb-2">{node.description}</p>
                    
                    {node.tech && (
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {node.tech.map(t => (
                          <span key={t} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Selection Box */}
            {selectionBox && (
              <div 
                style={{
                  position: 'absolute',
                  border: '1px solid #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.startX - selectionBox.endX),
                  height: Math.abs(selectionBox.startY - selectionBox.endY),
                  pointerEvents: 'none',
                  zIndex: 100
                }}
              />
            )}
          </div>

          {/* Floating Canvas Inspector (Top Right) */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-64 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-3 z-20 pointer-events-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selected Element</div>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ color: selectedNode.color }}>{selectedNode.icon}</span>
                {selectedNode.label}
              </div>
              <div className="text-xs text-slate-500 mt-1">{selectedNode.badge}</div>
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        {selectedNodeIds.length === 1 && selectedNode && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 z-10 shadow-xl overflow-y-auto">
            <div className="h-14 border-b border-slate-200 flex items-center px-4 shrink-0 bg-slate-50">
              <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: selectedNode.color }}>{selectedNode.icon}</span>
                Properties
              </span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Name</label>
                <input 
                  type="text" 
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  value={selectedNode.label}
                  onChange={(e) => {
                    setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n));
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea 
                  rows={3} 
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  value={selectedNode.description}
                  onChange={(e) => {
                    setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, description: e.target.value } : n));
                  }}
                />
              </div>

              {selectedNode.tech && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Technology Stack</label>
                    <button
                      className="text-blue-600 text-xs hover:underline"
                      onClick={() => {
                        const tag = window.prompt('Add technology tag:');
                        if (tag?.trim()) {
                          setNodes(nodes.map(n =>
                            n.id === selectedNode.id
                              ? { ...n, tech: [...(n.tech ?? []), tag.trim()] }
                              : n
                          ));
                        }
                      }}
                    >
                      + Add Tech
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.tech.map(t => (
                      <div key={t} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs border border-slate-200">
                        {t}
                        <button
                          className="hover:text-red-500 text-[10px] leading-none ml-0.5"
                          onClick={() => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode.id
                                ? { ...n, tech: (n.tech ?? []).filter(x => x !== t) }
                                : n
                            ));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {selectedNode.id === 'gateway' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-800 mb-1">Security Tier</div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Tier 1 - Mission Critical</div>
                    <div className="flex items-center gap-2 text-xs text-blue-900">
                      <span className="material-symbols-outlined text-sm">shield</span>
                      Zero-Trust mTLS with AWS ACM Cert
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-600">Connected Ports (4 relations)</label>
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs bg-slate-50">
                      <div className="p-2 flex items-center gap-2 text-slate-700">
                        <span className="text-slate-400">↓</span> Customer Web App | HTTPS 443
                      </div>
                      <div className="p-2 flex items-center gap-2 text-slate-700">
                        <span className="text-slate-400">↑</span> Auth Service | gRPC / TLS
                      </div>
                      <div className="p-2 flex items-center gap-2 text-slate-700">
                        <span className="text-slate-400">↑</span> Primary Database | TCP 5432
                      </div>
                      <div className="p-2 flex items-center gap-2 text-slate-700">
                        <span className="text-slate-400">↑</span> Stripe Billing | REST
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2 shrink-0">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors">
                Drill Down to Level 3 (Components)
              </button>
              <div className="flex gap-2">
                <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-1.5 rounded text-sm transition-colors">
                  OpenAPI Spec
                </button>
                <button 
                  onClick={handleDeleteSelected}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-1.5 rounded text-sm transition-colors border border-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="h-8 border-t border-slate-200 bg-slate-50 flex items-center justify-between px-4 text-xs text-slate-500 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <span>{nodes.length} Elements, {edges.length} Relations</span>
          {selectedNodeIds.length > 0 && <span>• {selectedNodeIds.length} Selected</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <span>Pan: {Math.round(panX)}, {Math.round(panY)}</span>
        </div>
      </footer>
    </div>
  );
}
