'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const AGENT_LABELS = {
  resume_parser: 'Resume Parser',
  embedding_agent: 'Embedding Agent',
  matching_agent: 'Matching Agent',
  shortlisting_agent: 'Shortlisting Agent',
  human_approval: 'Human Approval',
  interview_agent: 'Interview Agent',
  email_agent: 'Email Agent',
};

// Two-row layout: main pipeline on top, approval branch below.
const POSITIONS = {
  resume_parser: { x: 0, y: 80 },
  embedding_agent: { x: 210, y: 80 },
  matching_agent: { x: 420, y: 80 },
  shortlisting_agent: { x: 630, y: 80 },
  human_approval: { x: 840, y: 180 },
  interview_agent: { x: 1050, y: 180 },
  email_agent: { x: 1260, y: 80 },
};

const EDGES = [
  { id: 'e1', source: 'resume_parser', target: 'embedding_agent' },
  { id: 'e2', source: 'embedding_agent', target: 'matching_agent' },
  { id: 'e3', source: 'matching_agent', target: 'shortlisting_agent' },
  { id: 'e4', source: 'shortlisting_agent', target: 'human_approval', label: 'shortlist / hold' },
  { id: 'e5', source: 'shortlisting_agent', target: 'email_agent', label: 'rejected' },
  { id: 'e6', source: 'human_approval', target: 'interview_agent', label: 'approved' },
  { id: 'e7', source: 'human_approval', target: 'email_agent', label: 'rejected' },
  { id: 'e8', source: 'interview_agent', target: 'email_agent' },
];

/**
 * Renders the LangGraph hiring workflow. Node colors come from the
 * node-states spec (served by the workflow detail endpoint), never
 * hardcoded here.
 */
export default function WorkflowCanvas({ nodeStates = [], colors = {}, activeState }) {
  const stateByAgent = useMemo(
    () => Object.fromEntries(nodeStates.map((n) => [n.agent, n])),
    [nodeStates]
  );

  const nodes = useMemo(
    () =>
      Object.keys(POSITIONS).map((agent) => {
        const info = stateByAgent[agent] || { state: 'pending', attempts: 0 };
        const palette = colors[info.state] || colors.pending || {};
        const isActive = activeState === agent;
        return {
          id: agent,
          position: POSITIONS[agent],
          data: {
            label: (
              <div className="text-center leading-tight">
                <div className="font-semibold text-[12px]">{AGENT_LABELS[agent]}</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {(palette.label || info.state).toString()}
                  {info.attempts > 1 ? ` · retry ${info.attempts - 1}` : ''}
                  {info.duration_ms != null ? ` · ${info.duration_ms}ms` : ''}
                </div>
              </div>
            ),
          },
          style: {
            background: palette.background || '#f4f4f5',
            color: palette.color || '#52525b',
            border: `2px ${isActive ? 'dashed' : 'solid'} ${palette.border || '#d4d4d8'}`,
            borderRadius: 10,
            padding: '8px 10px',
            width: 170,
            fontSize: 12,
            boxShadow: isActive ? `0 0 0 4px ${palette.background || '#f4f4f5'}` : 'none',
          },
          sourcePosition: 'right',
          targetPosition: 'left',
        };
      }),
    [stateByAgent, colors, activeState]
  );

  const edges = useMemo(
    () =>
      EDGES.map((edge) => {
        const sourceDone = stateByAgent[edge.source]?.state === 'success';
        const targetTouched =
          stateByAgent[edge.target] && stateByAgent[edge.target].state !== 'pending';
        const traversed = sourceDone && targetTouched;
        return {
          ...edge,
          animated: stateByAgent[edge.source]?.state === 'running' || traversed,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: { stroke: traversed ? '#22c55e' : '#d4d4d8', strokeWidth: traversed ? 2 : 1.5 },
          labelStyle: { fontSize: 10, fill: '#71717a' },
        };
      }),
    [stateByAgent]
  );

  return (
    <div className="h-[340px] w-full rounded-xl border border-zinc-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} color="#f1f1f4" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
