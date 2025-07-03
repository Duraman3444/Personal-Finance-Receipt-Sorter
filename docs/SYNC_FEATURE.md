# Real-Time Sync Feature

## Overview

The Personal Finance Receipt Sorter now includes real-time synchronization across all tabs and windows. This ensures that receipt and category data stays consistent throughout the application, eliminating the issue where different tabs showed different counts.

## How It Works

### Firestore Listeners
- Uses Firestore's `onSnapshot` API for real-time database monitoring
- Automatically updates all UI components when data changes
- Maintains local cache for instant access and reduced API calls

### Event-Driven Updates
- Custom events (`receipts-updated`, `categories-updated`) notify all components
- Each tab listens for these events and updates its display accordingly
- No manual refresh required

## Features

### ✅ Real-Time Data Sync
- **Receipts**: Instantly see new receipts across all tabs
- **Categories**: Category changes reflect immediately everywhere
- **Analytics**: Charts and statistics update in real-time
- **Cross-Tab Sync**: Changes in one tab appear in all other tabs

### ✅ Performance Optimized
- **Cached Data**: Local caching reduces Firebase API calls
- **Smart Updates**: Only re-renders when data actually changes
- **Background Sync**: Listeners run in the background without blocking UI

### ✅ Connection Management
- **Auto-Reconnect**: Handles network disconnections gracefully
- **Status Indicators**: Visual feedback for sync status
- **Error Handling**: Graceful fallbacks when sync fails

## Technical Implementation

### Firebase Client (`renderer/firebase-client.js`)
```javascript
// Start real-time sync
await window.firebaseClient.startReceiptsSync();
await window.firebaseClient.startCategoriesSync();

// Get cached data (instant access)
const receipts = window.firebaseClient.getCachedReceipts();
const categories = window.firebaseClient.getCachedCategories();

// Stop sync when closing
window.firebaseClient.stopAllSync();
```

### Event Listeners (`renderer/renderer.js`)
```javascript
// Listen for real-time updates
window.addEventListener('receipts-updated', (event) => {
    const receipts = event.detail.receipts;
    updateReceiptsDisplay(receipts);
});

window.addEventListener('categories-updated', (event) => {
    const categories = event.detail.categories;
    updateCategoriesDisplay(categories);
});
```

## User Experience Improvements

### Before Sync Feature
- ❌ Different tabs showed different receipt counts
- ❌ Manual refresh required to see new data
- ❌ Inconsistent category totals across views
- ❌ Analytics could be outdated

### After Sync Feature
- ✅ All tabs show identical, up-to-date data
- ✅ New receipts appear instantly everywhere
- ✅ Category changes sync across all views
- ✅ Analytics update in real-time
- ✅ Visual sync status indicators

## Status Indicators

The app now shows sync status in the bottom status bar:

- **🟢 Connected (Real-time sync: X receipts, Y categories)** - Sync active
- **🟡 Connected** - Connected but sync not active
- **🔴 Sync disabled** - Connection issues or sync stopped

## Testing the Feature

### Manual Testing
1. Open multiple tabs to different pages (Receipts, Categories, Analytics)
2. Add a new receipt through N8N workflow
3. Watch all tabs update simultaneously
4. Modify a category in one tab
5. See changes reflected in other tabs instantly

### Console Testing
Run the test script in browser console:
```javascript
// Load the test script
fetch('./scripts/test-sync.js').then(r => r.text()).then(eval);

// Or manually test
testSyncUpdate();
```

## Configuration

### Environment Variables
No additional environment variables required. Uses existing Firebase configuration.

### Firestore Rules
Ensure your Firestore rules allow read access to `receipts` and `categories` collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /receipts/{document} {
      allow read, write: if true; // Adjust based on your security needs
    }
    match /categories/{document} {
      allow read, write: if true; // Adjust based on your security needs
    }
  }
}
```

## Troubleshooting

### Sync Not Working
1. Check Firebase connection in status bar
2. Verify Firestore rules allow read access
3. Check browser console for errors
4. Try refreshing the page

### Performance Issues
1. Monitor cached data size in status
2. Restart sync if memory usage high
3. Check network connection quality

### Data Inconsistencies
1. Clear browser cache and reload
2. Stop and restart sync manually
3. Check Firebase console for data integrity

## Future Enhancements

### Planned Features
- **Offline Support**: Cache data for offline access
- **Conflict Resolution**: Handle simultaneous edits
- **Selective Sync**: Choose which data to sync
- **Push Notifications**: Desktop alerts for new receipts

### API Extensions
- Real-time budget alerts
- Live collaboration features
- Multi-user workspace sync
- Advanced analytics streaming

## Impact on Existing Features

### Backward Compatibility
- ✅ All existing functions work unchanged
- ✅ Legacy `getReceipts()` and `getCategories()` methods maintained
- ✅ No breaking changes to existing code

### Performance Impact
- ✅ Faster UI updates (cached data)
- ✅ Reduced API calls (smart caching)
- ✅ Better user experience (real-time updates)
- ⚠️ Slightly higher memory usage (cached data)

## Code Changes Summary

### New Files
- `scripts/test-sync.js` - Testing utilities
- `docs/SYNC_FEATURE.md` - This documentation

### Modified Files
- `renderer/firebase-client.js` - Added real-time listeners
- `renderer/renderer.js` - Added event handling and UI updates

### Key Functions Added
- `startReceiptsSync()` - Start real-time receipt sync
- `startCategoriesSync()` - Start real-time category sync
- `stopAllSync()` - Clean shutdown of all listeners
- `getCachedReceipts()` - Get cached receipt data
- `getCachedCategories()` - Get cached category data
- `updateSyncStatusIndicator()` - Update UI status display

This feature significantly improves the user experience by ensuring data consistency across all parts of the application while maintaining excellent performance through smart caching and efficient real-time updates. 