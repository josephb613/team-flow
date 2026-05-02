'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorOptions = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6',
];

const iconOptions = ['🌐', '📱', '⚡', '📢', '📊', '🔒', '🎨', '🚀', '📋', '🏠'];

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('📋');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating project:', { name, description, color, icon });
    setName('');
    setDescription('');
    setColor('#10b981');
    setIcon('📋');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="My Awesome Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="project-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all border-2',
                    icon === i
                      ? 'border-[oklch(0.55_0.15_160)] bg-[oklch(0.55_0.15_160/0.1)] scale-110'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all border-2',
                    color === c
                      ? 'border-foreground scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: color + '20', color }}
              >
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium">{name || 'Project Name'}</p>
                <p className="text-xs text-muted-foreground">{description || 'Project description'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!name.trim()}
            >
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
