'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { mockUsers, mockChannels } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  FileText,
  Megaphone,
  ScrollText,
  X,
  CalendarIcon,
  Check,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr as dateFr, enUS as dateEn } from 'date-fns/locale';

type ContentType = 'newsletter' | 'article' | 'announcement' | 'communique';

interface ContentTypeInfo {
  type: ContentType;
  icon: React.ElementType;
  labelKey: keyof typeof import('@/lib/i18n/translations').translations.fr.createContent;
  descKey: keyof typeof import('@/lib/i18n/translations').translations.fr.createContent;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const contentTypes: ContentTypeInfo[] = [
  {
    type: 'newsletter',
    icon: Mail,
    labelKey: 'newsletter',
    descKey: 'typeNewsletter',
    color: 'text-[oklch(0.55_0.18_250)]',
    bgColor: 'bg-[oklch(0.55_0.18_250/0.08)]',
    borderColor: 'border-[oklch(0.55_0.18_250/0.3)]',
    ringColor: 'ring-[oklch(0.55_0.18_250)]',
    gradientFrom: 'from-[oklch(0.55_0.18_250/0.15)]',
    gradientTo: 'to-[oklch(0.55_0.18_250/0.02)]',
  },
  {
    type: 'article',
    icon: FileText,
    labelKey: 'article',
    descKey: 'typeArticle',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/8 dark:bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    ringColor: 'ring-amber-500',
    gradientFrom: 'from-amber-500/15',
    gradientTo: 'to-amber-500/2',
  },
  {
    type: 'announcement',
    icon: Megaphone,
    labelKey: 'announcement',
    descKey: 'typeAnnouncement',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/8 dark:bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    ringColor: 'ring-rose-500',
    gradientFrom: 'from-rose-500/15',
    gradientTo: 'to-rose-500/2',
  },
  {
    type: 'communique',
    icon: ScrollText,
    labelKey: 'communique',
    descKey: 'typeCommunique',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/8 dark:bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    ringColor: 'ring-violet-500',
    gradientFrom: 'from-violet-500/15',
    gradientTo: 'to-violet-500/2',
  },
];

export function CreateContentDialog() {
  const { createContentDialogOpen, setCreateContentDialogOpen, createContentType, setCreateContentType, locale } = useAppStore();
  const { t } = useTranslation();

  const [selectedType, setSelectedType] = useState<ContentType>(
    (createContentType as ContentType) || 'article'
  );
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const currentTypeInfo = contentTypes.find((ct) => ct.type === selectedType) || contentTypes[0];
  const CurrentIcon = currentTypeInfo.icon;

  const resetForm = useCallback(() => {
    setTitle('');
    setSummary('');
    setAuthorId('');
    setTags([]);
    setTagInput('');
    setScheduledDate(undefined);
    setSelectedChannels([]);
    setIsCreating(false);
    setCalendarOpen(false);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setCreateContentDialogOpen(open);
    if (!open) {
      resetForm();
    }
  }, [setCreateContentDialogOpen, resetForm]);

  const handleTypeSelect = useCallback((type: ContentType) => {
    setSelectedType(type);
    setCreateContentType(type);
  }, [setCreateContentType]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [handleAddTag, tagInput, tags]
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleToggleChannel = useCallback((channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  const handleCreate = useCallback(() => {
    if (!title.trim()) return;

    setIsCreating(true);
    // Simulate creation delay
    setTimeout(() => {
      setIsCreating(false);
      toast.success(t.createContent.success);
      setCreateContentDialogOpen(false);
      resetForm();
    }, 800);
  }, [title, t, setCreateContentDialogOpen, resetForm]);

  const dateLocale = locale === 'fr' ? dateFr : dateEn;

  return (
    <Dialog open={createContentDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Gradient Header */}
        <motion.div
          key={selectedType}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative px-6 pt-6 pb-4 border-b"
        >
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-[0.06] dark:opacity-[0.08]',
              currentTypeInfo.gradientFrom,
              currentTypeInfo.gradientTo
            )}
          />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center border',
                  currentTypeInfo.bgColor,
                  currentTypeInfo.borderColor
                )}
              >
                <CurrentIcon className={cn('h-5 w-5', currentTypeInfo.color)} />
              </motion.div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {t.createContent.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t.createContent.selectType}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </motion.div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Content Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {contentTypes.map((ct) => {
              const Icon = ct.icon;
              const isSelected = selectedType === ct.type;
              return (
                <motion.button
                  key={ct.type}
                  type="button"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleTypeSelect(ct.type)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                    isSelected
                      ? cn(ct.borderColor, ct.bgColor, 'shadow-sm')
                      : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-border'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="type-indicator"
                      className={cn(
                        'absolute -top-px -right-px h-5 w-5 rounded-bl-xl rounded-tr-xl flex items-center justify-center',
                        ct.type === 'newsletter'
                          ? 'bg-[oklch(0.55_0.18_250)]'
                          : ct.type === 'article'
                            ? 'bg-amber-500'
                            : ct.type === 'announcement'
                              ? 'bg-rose-500'
                              : 'bg-violet-500'
                      )}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                      isSelected ? cn(ct.bgColor, ct.borderColor, 'border') : 'bg-muted/60'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isSelected ? ct.color : 'text-muted-foreground')} />
                  </div>
                  <div className="text-center">
                    <p className={cn('text-xs font-semibold', isSelected ? ct.color : 'text-foreground')}>
                      {t.createContent[ct.labelKey]}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                      {t.createContent[ct.descKey]}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="content-title" className="text-sm font-medium">
              {t.createContent.titleLabel}
            </Label>
            <Input
              id="content-title"
              placeholder={t.createContent.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 bg-muted/30 border-border/50 focus:border-[oklch(0.55_0.18_250)] focus:ring-[oklch(0.55_0.18_250)]/20"
            />
          </div>

          {/* Summary Textarea */}
          <div className="space-y-2">
            <Label htmlFor="content-summary" className="text-sm font-medium">
              {t.createContent.summaryLabel}
            </Label>
            <Textarea
              id="content-summary"
              placeholder={t.createContent.summaryPlaceholder}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-[oklch(0.55_0.18_250)] focus:ring-[oklch(0.55_0.18_250)]/20"
            />
          </div>

          {/* Author Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createContent.authorLabel}
            </Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger className="w-full h-10 bg-muted/30 border-border/50">
                <SelectValue placeholder={t.createContent.unassigned} />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.55_0.15_160)] flex items-center justify-center text-[8px] text-white font-bold">
                        {user.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createContent.tagsLabel}
            </Label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border/50 bg-muted/30 min-h-[42px] focus-within:border-[oklch(0.55_0.18_250)] focus-within:ring-2 focus-within:ring-[oklch(0.55_0.18_250)]/20">
              <AnimatePresence mode="popLayout">
                {tags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1 px-2 py-0.5 text-xs bg-[oklch(0.55_0.18_250/0.1)] text-[oklch(0.55_0.18_250)] border-[oklch(0.55_0.18_250/0.2)] hover:bg-[oklch(0.55_0.18_250/0.2)]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 hover:text-rose-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? t.createContent.tagsPlaceholder : ''}
                className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
              />
              {tagInput.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  type="button"
                  onClick={handleAddTag}
                  className="h-5 w-5 rounded-full bg-[oklch(0.55_0.18_250/0.15)] flex items-center justify-center hover:bg-[oklch(0.55_0.18_250/0.25)] transition-colors"
                >
                  <Plus className="h-3 w-3 text-[oklch(0.55_0.18_250)]" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Scheduled Date & Channels Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t.createContent.scheduleLabel}
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-10 justify-start text-left font-normal bg-muted/30 border-border/50 hover:bg-muted/50',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, 'dd MMM yyyy', { locale: dateLocale })
                      : t.createContent.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      setScheduledDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Author Select (on mobile, shown here) */}
            <div className="space-y-2 sm:hidden">
              <Label className="text-sm font-medium">
                {t.createContent.authorLabel}
              </Label>
              <Select value={authorId} onValueChange={setAuthorId}>
                <SelectTrigger className="w-full h-10 bg-muted/30 border-border/50">
                  <SelectValue placeholder={t.createContent.unassigned} />
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
          </div>

          {/* Target Channels Multi-select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createContent.channelsLabel}
            </Label>
            <div className="flex flex-wrap gap-2">
              {mockChannels.map((channel) => {
                const isSelected = selectedChannels.includes(channel.id);
                return (
                  <motion.button
                    key={channel.id}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleToggleChannel(channel.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200',
                      isSelected
                        ? 'bg-[oklch(0.55_0.18_250/0.1)] border-[oklch(0.55_0.18_250/0.3)] text-[oklch(0.55_0.18_250)]'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <span className="text-sm">{channel.icon}</span>
                    <span>{channel.name}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <Check className="h-3 w-3" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="min-w-[80px]"
            disabled={isCreating}
          >
            {t.createContent.cancel}
          </Button>
          <motion.div whileHover={{ scale: title.trim() ? 1.02 : 1 }} whileTap={{ scale: title.trim() ? 0.98 : 1 }}>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || isCreating}
              className={cn(
                'min-w-[120px] text-white',
                !title.trim()
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.50_0.18_250)] shadow-sm'
              )}
            >
              {isCreating ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t.createContent.creating}
                </motion.div>
              ) : (
                t.createContent.create
              )}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
