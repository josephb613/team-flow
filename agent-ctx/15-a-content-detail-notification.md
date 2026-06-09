# Task 15-a: Content Detail Drawer & Notification Enhancement Agent

## Summary
Added Content Detail Drawer, enhanced Notification Panel, and added notification badge to sidebar.

## Files Created
- `src/components/content-detail-drawer.tsx` - New Content Detail Drawer component using shadcn/ui Sheet

## Files Modified
- `src/components/main-app.tsx` - Added ContentDetailDrawer import and rendering
- `src/components/views/newsletters-view.tsx` - Made newsletter items clickable with onClick handler
- `src/components/app-sidebar.tsx` - Added notification badge (Bell icon + count) next to search bar, plus collapsed state badge
- `src/components/notification-panel.tsx` - Rewrote with spec-compliant type icons, locale-aware relative time, improved empty state
- `src/lib/i18n/translations.ts` - Added contentDetail i18n keys to both FR and EN sections

## Key Implementation Details

### Content Detail Drawer
- Uses shadcn/ui Sheet component (slides from right)
- Controlled by `contentDetailOpen` and `selectedContent` from Zustand store
- Shows type badge, title, status badge, metadata (author, dates, scheduled), tags, preview, word count
- Workflow actions at bottom: draft→submit review, review→approve/reject, approved→schedule, published→archive
- Edit and delete buttons always visible
- Gradient top border matching content type color

### Sidebar Notification Badge
- Bell icon button next to search bar with unread count badge
- Pulse animation when unread > 0
- Separate collapsed sidebar Bell button with same functionality
- Opens notification panel on click

### Notification Panel Enhancements
- Spec-compliant icons: Shield, CheckCircle, Send, AlertTriangle, UserPlus, AtSign, Settings
- Locale-aware relative time (FR: "il y a 15m", EN: "15m ago")
- Enhanced empty state with BellOff icon
- All accent colors changed to teal [oklch(0.55_0.18_250)] for consistency
- Panel width increased to 420px

## Lint Status
- 0 errors, 0 warnings
