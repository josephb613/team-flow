'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Calendar } from 'lucide-react';
import { mockProjects, mockUsers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'text-rose-600 bg-rose-500/10' },
  { value: 'high', label: 'High', color: 'text-amber-600 bg-amber-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-cyan-600 bg-cyan-500/10' },
  { value: 'low', label: 'Low', color: 'text-emerald-600 bg-emerald-500/10' },
];

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call the API
    console.log('Creating task:', {
      title,
      description,
      priority,
      projectId,
      assigneeId,
      dueDate,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId('');
    setAssigneeId('');
    setDueDate('');
    setTags('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="task-desc"
              placeholder="Add more details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Priority & Project row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.color.split(' ')[1])} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="task-tags" className="text-sm font-medium">
              Tags
            </Label>
            <Input
              id="task-tags"
              placeholder="frontend, design, urgent (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!title.trim()}
            >
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
