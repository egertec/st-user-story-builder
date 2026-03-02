import type { UserStory } from "@/data/sampleData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  "In Review": "bg-blue-50 text-blue-700 border-blue-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  "Needs Revision": "bg-orange-50 text-orange-700 border-orange-200",
};

interface StoryCardProps {
  story: UserStory;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (story: UserStory) => void;
  onDelete: (id: string) => void;
}

export function StoryCard({
  story,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: StoryCardProps) {
  return (
    <div
      className={cn(
        "bg-white border rounded-lg transition-shadow",
        isExpanded
          ? "border-slate-300 shadow-md"
          : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
      )}
    >
      {/* Header row */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Left meta */}
        <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {story.id}
          </span>
        </div>

        {/* Title + step */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-slate-400 truncate">
              {story.processStepName}
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-sm leading-snug">
            {story.title}
          </p>
          {!isExpanded && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
              {story.fullStory}
            </p>
          )}
        </div>

        {/* Badges + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              PRIORITY_STYLES[story.priority]
            )}
          >
            {story.priority}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              STATUS_STYLES[story.status]
            )}
          >
            {story.status}
          </Badge>
          <div className="text-slate-400 ml-1">
            {isExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-4">
          {/* User story text */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              User Story
            </p>
            <blockquote className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg px-4 py-3 text-sm text-slate-800 italic leading-relaxed">
              {story.fullStory}
            </blockquote>
          </div>

          {/* Two-col: AC + Systems */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Acceptance Criteria */}
            <div className="lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Acceptance Criteria
              </p>
              <ul className="space-y-2">
                {story.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={15}
                      className="text-slate-400 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      {ac}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Systems + meta */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Primary System
                </p>
                <span className="inline-block text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
                  {story.primarySystem}
                </span>
              </div>
              {story.secondarySystem && story.secondarySystem !== "N/A" && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Secondary System
                  </p>
                  <span className="inline-block text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md px-2.5 py-1">
                    {story.secondarySystem}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Actor
                </p>
                <p className="text-sm text-slate-700">{story.actor}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(story);
              }}
            >
              <Pencil size={13} />
              Edit Story
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(story.id);
              }}
            >
              <Trash2 size={13} />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
