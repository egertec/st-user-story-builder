import { useState } from "react";
import type { UserStory } from "@/data/sampleData";
import { SYSTEM_OPTIONS, STATUS_OPTIONS } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Minus } from "lucide-react";

interface EditModalProps {
  story: UserStory;
  onSave: (story: UserStory) => void;
  onClose: () => void;
}

export function EditModal({ story, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<UserStory>({
    ...story,
    acceptanceCriteria: [...story.acceptanceCriteria],
  });

  const update = <K extends keyof UserStory>(field: K, value: UserStory[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const updateStoryPart = (
    field: "actor" | "action" | "benefit",
    value: string
  ) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      updated.fullStory = `As a${updated.actor.startsWith("A") || updated.actor.startsWith("E") || updated.actor.startsWith("I") || updated.actor.startsWith("O") || updated.actor.startsWith("U") ? "n" : ""} ${updated.actor}, I want to ${updated.action}, so that ${updated.benefit}.`;
      return updated;
    });
  };

  const updateAC = (i: number, value: string) => {
    const newAC = [...form.acceptanceCriteria];
    newAC[i] = value;
    update("acceptanceCriteria", newAC);
  };

  const addAC = () =>
    update("acceptanceCriteria", [...form.acceptanceCriteria, ""]);

  const removeAC = (i: number) =>
    update(
      "acceptanceCriteria",
      form.acceptanceCriteria.filter((_, idx) => idx !== i)
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-mono">{form.id}</p>
            <h2 className="font-bold text-slate-900 text-base">
              Edit User Story
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Story Title
            </Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Short, action-oriented title"
              className="text-sm"
            />
          </div>

          {/* Process Step */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Process Step
            </Label>
            <Input
              value={form.processStepName}
              onChange={(e) => update("processStepName", e.target.value)}
              placeholder="e.g. 1.1 - Lead Capture & Entry"
              className="text-sm"
            />
          </div>

          {/* User Story Builder */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
              User Story
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-700 font-medium">
                As a...
              </Label>
              <Input
                value={form.actor}
                onChange={(e) => updateStoryPart("actor", e.target.value)}
                placeholder="Inside Sales Representative"
                className="text-sm bg-white border-blue-200 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-700 font-medium">
                I want to...
              </Label>
              <Textarea
                value={form.action}
                onChange={(e) => updateStoryPart("action", e.target.value)}
                rows={2}
                placeholder="accomplish a specific goal or task"
                className="text-sm bg-white border-blue-200 focus-visible:ring-blue-400 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-700 font-medium">
                So that...
              </Label>
              <Textarea
                value={form.benefit}
                onChange={(e) => updateStoryPart("benefit", e.target.value)}
                rows={2}
                placeholder="I achieve this business outcome"
                className="text-sm bg-white border-blue-200 focus-visible:ring-blue-400 resize-none"
              />
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg border border-blue-200 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Preview
              </p>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                {form.fullStory}
              </p>
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Acceptance Criteria
              </Label>
              <button
                onClick={addAC}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={13} />
                Add Criterion
              </button>
            </div>
            <div className="space-y-2">
              {form.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[11px] font-semibold mt-2">
                    {i + 1}
                  </span>
                  <Input
                    value={ac}
                    onChange={(e) => updateAC(i, e.target.value)}
                    placeholder="Specific, testable acceptance criterion"
                    className="text-sm flex-1"
                  />
                  <button
                    onClick={() => removeAC(i)}
                    className="text-slate-300 hover:text-red-400 transition-colors mt-2"
                  >
                    <Minus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Systems */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Primary System
              </Label>
              <Select
                value={form.primarySystem}
                onValueChange={(v) => update("primarySystem", v)}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Secondary System
              </Label>
              <Input
                value={form.secondarySystem}
                onChange={(e) => update("secondarySystem", e.target.value)}
                placeholder="e.g. Marketing Cloud, or N/A"
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Priority / Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  update("priority", v as UserStory["priority"])
                }
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["High", "Medium", "Low"] as const).map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  update("status", v as UserStory["status"])
                }
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => onSave(form)}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
