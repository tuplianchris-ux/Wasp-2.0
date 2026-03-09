import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { motion, AnimatePresence } from "framer-motion";
import apiService from "../services/apiService";
import {
  normalizeNote,
  resolveNoteLinks,
  buildGraphFromNotes,
} from "../utils/notesGraphData";

const GRAPH_BG = "#0f0f1a";
const NODE_FILE_COLOR = "#7C6FF7";
const NODE_HEADING_COLOR = "#B8A9F5";
const NODE_BODY_COLOR = "#c4c4c4";
const EDGE_COLOR = "rgba(124, 111, 247, 0.6)";
const EDGE_CROSS_COLOR = "#14b8a6";
const NODE_RADIUS = { file: 12, heading: 7, body: 4 };

export default function NotesGraph() {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depth, setDepth] = useState(2);
  const [expandedFiles, setExpandedFiles] = useState(() => new Set());
  const [expandedHeadings, setExpandedHeadings] = useState(() => new Set());
  const [showOrphans, setShowOrphans] = useState(true);
  const [showBodyNodes, setShowBodyNodes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [graphDimensions, setGraphDimensions] = useState({ w: 800, h: 600 });

  // Fetch and normalize notes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiService.notesStudio
      .getStudioNotes()
      .then((raw) => {
        if (cancelled) return;
        const normalized = (raw || []).map((n) =>
          normalizeNote({
            note_id: n.note_id,
            id: n.note_id,
            title: n.title,
            content: typeof n.content === "string" ? n.content : "",
            updated_at: n.updated_at,
            tags: n.tags || [],
          })
        );
        setNotes(resolveNoteLinks(normalized));
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect || {};
      if (width && height) setGraphDimensions({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (selectedTag) {
      list = list.filter((n) => (n.tags || []).includes(selectedTag));
    }
    return list;
  }, [notes, selectedTag]);

  const expansion = useMemo(
    () => ({
      expandedFiles,
      expandedHeadings,
    }),
    [expandedFiles, expandedHeadings]
  );

  const { nodes, links } = useMemo(
    () =>
      buildGraphFromNotes(filteredNotes, expansion, {
        maxDepth: depth,
        showOrphans,
        showBodyNodes,
      }),
    [filteredNotes, expansion, depth, showOrphans, showBodyNodes]
  );

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({
        ...l,
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
      })),
    }),
    [nodes, links]
  );

  const nodeById = useMemo(() => {
    const map = new Map();
    graphData.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graphData.nodes]);

  const getConnectedIds = useCallback(
    (nodeId) => {
      const connected = new Set([nodeId]);
      graphData.links.forEach((l) => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (s === nodeId || t === nodeId) {
          connected.add(s);
          connected.add(t);
        }
      });
      return connected;
    },
    [graphData.links]
  );

  const focusedSet = useMemo(() => {
    if (!focusedNodeId) return null;
    return getConnectedIds(focusedNodeId);
  }, [focusedNodeId, getConnectedIds]);

  const searchLower = searchQuery.trim().toLowerCase();
  const matchesSearch = useCallback(
    (node) => {
      if (!searchLower) return true;
      const title = (node.title || "").toLowerCase();
      const text = (node.text || "").toLowerCase();
      const content = (node.content || "").toLowerCase();
      return (
        title.includes(searchLower) ||
        text.includes(searchLower) ||
        content.includes(searchLower)
      );
    },
    [searchLower]
  );

  const handleNodeClick = useCallback(
    (node) => {
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    []
  );

  const handleNodeDoubleClick = useCallback((node) => {
    if (node.type === "file") {
      setExpandedFiles((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } else if (node.type === "heading") {
      setExpandedHeadings((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }, []);

  const collapseNode = useCallback((node) => {
    if (node.type === "file") {
      setExpandedFiles((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    } else if (node.type === "heading") {
      setExpandedHeadings((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  }, []);

  const handleNodeRightClick = useCallback((node, event) => {
    event.preventDefault();
    collapseNode(node);
  }, [collapseNode]);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node || null);
  }, []);

  const handleContainerMouseMove = useCallback((e) => {
    if (containerRef.current && containerRef.current.contains(e.target)) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  // Configure d3 forces after graph is ready (reconfigure existing forces)
  useEffect(() => {
    const graph = fgRef.current;
    if (!graph || !graphData.nodes.length) return;
    const linkForce = graph.d3Force("link");
    if (linkForce && typeof linkForce.distance === "function") {
      linkForce.distance((link) => {
        const type = (link && link.type) || "";
        if (type === "file-file") return 200;
        if (type === "file-heading") return 80;
        if (type === "heading-body" || type === "file-body") return 40;
        return 120;
      });
    }
    const chargeForce = graph.d3Force("charge");
    if (chargeForce && typeof chargeForce.strength === "function") {
      chargeForce.strength((node) => {
        if (node && node.type === "file") return -200;
        if (node && node.type === "heading") return -80;
        return -20;
      });
    }
    graph.d3ReheatSimulation();
  }, [graphData.nodes.length, graphData.links]);

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const radius =
        (node.type === "file"
          ? NODE_RADIUS.file
          : node.type === "heading"
          ? NODE_RADIUS.heading
          : NODE_RADIUS.body) / globalScale;
      const isDim =
        (focusedSet && !focusedSet.has(node.id)) ||
        (searchLower && !matchesSearch(node));
      const opacity = isDim ? 0.25 : 1;
      const color =
        node.type === "file"
          ? NODE_FILE_COLOR
          : node.type === "heading"
          ? NODE_HEADING_COLOR
          : NODE_BODY_COLOR;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    [focusedSet, searchLower, matchesSearch]
  );

  const linkCanvasObject = useCallback(
    (link, ctx, globalScale) => {
      const s = typeof link.source === "object" ? link.source : nodeById.get(link.source);
      const t = typeof link.target === "object" ? link.target : nodeById.get(link.target);
      if (!s || !t) return;
      const isCross = (link.type || "").includes("file-file");
      const isDim =
        focusedSet &&
        !(focusedSet.has(s.id) && focusedSet.has(t.id));
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = isCross ? EDGE_CROSS_COLOR : EDGE_COLOR;
      ctx.globalAlpha = isDim ? 0.2 : 0.7;
      ctx.lineWidth = 1.5 / globalScale;
      if (!isCross) {
        ctx.shadowColor = "rgba(124, 111, 247, 0.5)";
        ctx.shadowBlur = 4 / globalScale;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },
    [nodeById, focusedSet]
  );

  const renderTooltip = () => {
    if (!hoveredNode) return null;
    const node = hoveredNode;
    let content = null;
    if (node.type === "file") {
      content = (
        <>
          <div className="font-medium text-foreground">{node.title}</div>
          {(node.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(node.tags || []).map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {node.lastEdited && (
            <div className="text-xs text-muted-foreground mt-1">
              Edited {node.lastEdited}
            </div>
          )}
        </>
      );
    } else if (node.type === "heading") {
      content = (
        <>
          <div className="font-medium text-foreground">{node.text}</div>
          {node.title && (
            <div className="text-xs text-muted-foreground mt-1">
              in {node.title}
            </div>
          )}
        </>
      );
    } else {
      const snippet = (node.snippet || node.text || "").slice(0, 200);
      content = (
        <div className="text-sm text-muted-foreground max-w-xs whitespace-pre-wrap break-words">
          {snippet}
        </div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute z-10 pointer-events-none rounded-lg border border-border bg-card p-3 shadow-lg max-w-sm"
        style={{
          left: tooltipPos.x + 12,
          top: tooltipPos.y + 12,
        }}
      >
        {content}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center flex-1 min-h-[60vh] rounded-xl"
        style={{ background: GRAPH_BG }}
      >
        <p className="text-muted-foreground">Loading notes…</p>
      </div>
    );
  }

  if (!notes.length) {
    return (
      <div
        className="flex items-center justify-center flex-1 min-h-[60vh] rounded-xl"
        style={{ background: GRAPH_BG }}
      >
        <p className="text-muted-foreground">
          No notes yet. Add notes in Notes Studio to see them in the graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)] -m-4 md:-m-8">
      <div
        ref={containerRef}
        className="relative flex-1 w-full rounded-xl overflow-hidden"
        style={{ background: GRAPH_BG, minHeight: 400 }}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={graphDimensions.w}
          height={graphDimensions.h}
          backgroundColor={GRAPH_BG}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeHover={handleNodeHover}
        />
        <AnimatePresence>{hoveredNode && renderTooltip()}</AnimatePresence>

        {/* Controls panel */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 w-56 rounded-lg border border-border bg-card/95 backdrop-blur p-3 shadow-lg">
          <div className="text-sm font-medium text-foreground">Graph</div>
          <label className="text-xs text-muted-foreground">
            Depth
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value={1}>1 – Files only</option>
              <option value={2}>2 – Files + headings</option>
              <option value={3}>3 – Full</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Tag
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
            />
            Show orphans
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showBodyNodes}
              onChange={(e) => setShowBodyNodes(e.target.checked)}
            />
            Show body nodes
          </label>
        </div>
      </div>
    </div>
  );
}
