// The tool calls of a turn as they run: a cyan light while the site's tool works, a check once its
// result is back, and the arguments the visitor's AI chose, so the visitor sees what was searched. The
// tools the site keeps out of `visibleTools` run without a line.

import type { ToolActivity as Activity } from '../../useAiChat.ts';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { CheckIcon } from './icons.tsx';

type ToolStatus = 'running' | 'done' | 'failed';

// The conversation loop and McpToolSource both hand a failed tool's result back with this prefix.
const TOOL_ERROR = 'Tool error:';
const SUMMARY_LENGTH = 60;

function statusOf({ result }: Activity): ToolStatus {
  if (result === null) {
    return 'running';
  }
  return result.startsWith(TOOL_ERROR) ? 'failed' : 'done';
}

function argumentSummary(args: Record<string, unknown>): string {
  const summary = Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name} ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ');
  return summary.length > SUMMARY_LENGTH ? `${summary.slice(0, SUMMARY_LENGTH - 1)}…` : summary;
}

function ToolRow({ activity, label }: { activity: Activity; label?: string }) {
  const { moduleMessages } = useAiConnect();
  const status = statusOf(activity);
  const summary = argumentSummary(activity.call.arguments);
  return (
    <li className="aic-tool" data-status={status}>
      <span className="aic-tool-light" aria-hidden="true">{status === 'done' ? <CheckIcon /> : null}</span>
      {label ? <span className="aic-tool-label">{label}</span> : (
        <code className="aic-tool-name">{activity.call.name}</code>
      )}
      {summary ? <span className="aic-tool-args">{summary}</span> : null}
      {status === 'failed' ? <span className="aic-tool-failed">{moduleMessages.toolFailed}</span> : (
        <span className="aic-visually-hidden">
          {status === 'running' ? moduleMessages.toolRunning : moduleMessages.toolDone}
        </span>
      )}
    </li>
  );
}

export function ToolActivityList({ tools, labels }: { tools: Activity[]; labels?: Record<string, string> }) {
  const shown = tools.filter((activity) => activity.visible !== false);
  if (shown.length === 0) {
    return null;
  }
  return (
    <ul className="aic-tools">
      {shown.map((activity, index) => (
        <ToolRow key={`${index}:${activity.call.id}`} activity={activity} label={labels?.[activity.call.name]} />
      ))}
    </ul>
  );
}
