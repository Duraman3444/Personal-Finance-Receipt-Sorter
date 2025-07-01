# UI Wireframes & Design Concepts

## Design System

### Color Palette
- **Primary**: `#667eea` (Purple-blue gradient start)
- **Secondary**: `#764ba2` (Purple gradient end)
- **Success**: `#51cf66` (Green for positive states)
- **Warning**: `#ffd43b` (Yellow for attention)
- **Error**: `#ff6b6b` (Red for errors)
- **Text**: `#ffffff` (White on gradient backgrounds)
- **Text Secondary**: `rgba(255, 255, 255, 0.8)` (Semi-transparent white)

### Typography
- **Font Family**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Headings**: `600` weight, larger sizes
- **Body**: `400` weight, readable sizes
- **UI Elements**: `500` weight for buttons and controls

### Layout Principles
- **Glass Morphism**: Frosted glass effect with backdrop blur
- **Card-Based**: Information grouped in translucent cards
- **Sidebar Navigation**: Persistent left navigation
- **Responsive**: Adapts to different window sizes

## Main Application Window

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🧾 Personal Finance Receipt Sorter                      [- □ ×]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │   NAVIGATION    │ │              MAIN CONTENT                   │ │
│ │                 │ │                                             │ │
│ │ 📊 Dashboard    │ │  ┌─────────────────────────────────────────┐ │ │
│ │ 🧾 Receipts     │ │  │         WELCOME CARD                    │ │ │
│ │ 🏷️ Categories   │ │  │                                         │ │ │
│ │ 📈 Analytics    │ │  │  Welcome to Receipt Sorter!             │ │ │
│ │ ⚙️ Settings     │ │  │                                         │ │ │
│ │                 │ │  │  Drop your receipt images or PDFs...    │ │ │
│ │                 │ │  │                                         │ │ │
│ │                 │ │  │  [📁 Open Inbox Folder]                │ │ │
│ │                 │ │  └─────────────────────────────────────────┘ │ │
│ │                 │ │                                             │ │
│ │                 │ │  ┌─────────────────────────────────────────┐ │ │
│ │                 │ │  │         SYSTEM STATUS                   │ │ │
│ │                 │ │  │                                         │ │ │
│ │                 │ │  │  🟢 Firebase: Connected                 │ │ │
│ │                 │ │  │  🔴 N8N: Not Running                    │ │ │
│ │                 │ │  │  🟢 OpenAI: Ready                       │ │ │
│ │                 │ │  └─────────────────────────────────────────┘ │ │
│ └─────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ v1.0.0 | FlowGenius Desktop Application Project                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Dashboard View (Default)

### Purpose
- Welcome new users with clear instructions
- Show system status at a glance
- Provide quick access to primary actions

### Key Elements
1. **Welcome Card**: Onboarding and primary CTA
2. **System Status**: Real-time health indicators
3. **Quick Stats**: Recent processing summary
4. **Recent Activity**: Last few processed receipts

### Interactions
- **Open Inbox Button**: Opens file explorer to inbox folder
- **Status Indicators**: Click for detailed diagnostics
- **Quick Actions**: Keyboard shortcuts for power users

## Receipts List View

```
┌─────────────────────────────────────────────────────────────────────┐
│                          RECEIPTS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  🔍 Search receipts...                    [📅 Filter] [↓ Sort] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🏪 Walmart Supercenter                           📅 06/30/2024  │ │
│ │ 💰 $10.21 • 🏷️ Groceries                       ⏰ 3:30 PM     │ │
│ │ 💳 Visa ending in 1234                                         │ │
│ │                                              [👁️ View] [✏️ Edit] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🍕 Mario's Pizza                                📅 06/29/2024  │ │
│ │ 💰 $24.99 • 🏷️ Dining                          ⏰ 7:45 PM     │ │
│ │ 💳 Cash                                                         │ │
│ │                                              [👁️ View] [✏️ Edit] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⛽ Shell Gas Station                            📅 06/28/2024  │ │
│ │ 💰 $45.67 • 🏷️ Gas                             ⏰ 8:15 AM     │ │
│ │ 💳 Debit Card                                                   │ │
│ │                                              [👁️ View] [✏️ Edit] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Features
- **Search & Filter**: Find specific receipts quickly
- **Sort Options**: Date, amount, vendor, category
- **Card Layout**: Easy scanning of receipt information
- **Quick Actions**: View details or edit without navigation
- **Visual Hierarchy**: Icons and typography guide attention

## Receipt Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RECEIPT DETAILS                    [×]         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │   RECEIPT       │ │              DETAILS                        │ │
│ │   PREVIEW       │ │                                             │ │
│ │                 │ │  🏪 Vendor: Walmart Supercenter            │ │
│ │  [Receipt       │ │  📅 Date: June 30, 2024                    │ │
│ │   Image/PDF     │ │  💰 Total: $10.21                          │ │
│ │   Thumbnail]    │ │  💸 Tax: $0.76                             │ │
│ │                 │ │  💳 Payment: Visa ending in 1234           │ │
│ │                 │ │  🏷️ Category: Groceries                    │ │
│ │                 │ │                                             │ │
│ │                 │ │  📋 ITEMS:                                  │ │
│ │                 │ │  • Great Value Milk 1GAL - $3.98           │ │
│ │                 │ │  • Bananas 2.5 LB - $1.70                  │ │
│ │                 │ │  • Bread White Loaf - $1.28                │ │
│ │                 │ │  • Eggs Large Dozen - $2.49                │ │
│ │                 │ │                                             │ │
│ │                 │ │  ⏰ Processed: 06/30/2024 at 9:45 PM       │ │
│ │                 │ │  🤖 Confidence: 98%                        │ │
│ └─────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                     │
│                    [✏️ Edit] [🗑️ Delete] [📄 Export]                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components
- **Receipt Preview**: Original image/PDF thumbnail
- **Structured Data**: Parsed information in readable format
- **Item Breakdown**: Individual purchase items when available
- **Metadata**: Processing information and confidence scores
- **Actions**: Edit, delete, export options

## Categories Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CATEGORIES                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  [+ Add New Category]                                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🛒 Groceries                                    💰 $234.56      │ │
│ │ 📊 42 receipts this month                       📈 +12% vs last │ │
│ │                                          [✏️ Edit] [📊 Details] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🍽️ Dining                                       💰 $189.43      │ │
│ │ 📊 18 receipts this month                       📉 -5% vs last  │ │
│ │                                          [✏️ Edit] [📊 Details] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⛽ Gas                                          💰 $156.78      │ │
│ │ 📊 8 receipts this month                        📈 +8% vs last  │ │
│ │                                          [✏️ Edit] [📊 Details] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Functionality
- **Category Creation**: Add custom spending categories
- **Spending Summary**: Total amount per category
- **Trend Analysis**: Month-over-month comparison
- **Category Management**: Edit names, merge categories
- **Usage Statistics**: Receipt count and frequency

## Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANALYTICS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                    MONTHLY OVERVIEW                             │ │
│ │                                                                 │ │
│ │  💰 Total Spending: $1,234.56        📊 Receipts: 68           │ │
│ │  📈 +15% vs last month              🏪 Vendors: 23             │ │
│ │                                                                 │ │
│ │  🔥 Top Category: Groceries ($456.78)                          │ │
│ │  🏪 Top Vendor: Walmart ($234.56)                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │  SPENDING BY    │ │           SPENDING TRENDS                   │ │
│ │   CATEGORY      │ │                                             │ │
│ │                 │ │    [Line Chart showing spending over time] │ │
│ │  [Pie Chart     │ │                                             │ │
│ │   showing       │ │    📅 Last 6 months                        │ │
│ │   category      │ │    📊 Weekly/Monthly/Yearly view           │ │
│ │   breakdown]    │ │                                             │ │
│ │                 │ │                                             │ │
│ └─────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Visualizations
- **Monthly Summary**: Key metrics and comparisons
- **Category Breakdown**: Pie chart of spending distribution
- **Trend Analysis**: Line charts showing spending over time
- **Top Performers**: Highest spending categories and vendors
- **Time Controls**: Different time period views

## Settings Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SETTINGS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                    GENERAL SETTINGS                             │ │
│ │                                                                 │ │
│ │  📁 Inbox Folder: C:\Users\...\inbox    [📁 Change]            │ │
│ │  🔄 Auto-process receipts: [✓] Enabled                         │ │
│ │  🔔 Show notifications: [✓] Enabled                            │ │
│ │  🌙 Dark mode: [ ] Disabled                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                      API SETTINGS                               │ │
│ │                                                                 │ │
│ │  🤖 OpenAI API Key: sk-...••••••••••    [🔑 Update]            │ │
│ │  🔥 Firebase Project: personalfinance...                       │ │
│ │  📊 Usage this month: 1,234 requests                           │ │
│ │  💰 Estimated cost: $2.34                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                    PRIVACY & DATA                               │ │
│ │                                                                 │ │
│ │  🔒 Data stays local: [✓] Enabled                              │ │
│ │  📤 Export all data: [📤 Export CSV]                           │ │
│ │  🗑️ Delete all data: [🗑️ Delete] (Permanent)                  │ │
│ │  📋 View privacy policy                                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuration Options
- **File Management**: Inbox folder location and processing options
- **API Configuration**: OpenAI key management and usage tracking
- **Privacy Controls**: Data export and deletion options
- **Notifications**: System alerts and processing updates
- **Appearance**: Theme and display preferences

## Mobile-Responsive Considerations

### Adaptive Layout
- **Collapsible Sidebar**: Overlay on smaller screens
- **Stack Cards**: Vertical layout for narrow windows
- **Touch Targets**: Larger buttons for touch interaction
- **Simplified Navigation**: Reduced menu items on mobile

### Progressive Disclosure
- **Essential First**: Show most important information prominently
- **Expandable Details**: Click to reveal additional information
- **Context Actions**: Swipe gestures for common actions
- **Readable Text**: Appropriate font sizes for all devices

## Accessibility Features

### Visual Accessibility
- **High Contrast**: Clear distinction between elements
- **Color Independence**: Information not conveyed by color alone
- **Scalable Text**: Respects system font size preferences
- **Focus Indicators**: Clear keyboard navigation highlights

### Interaction Accessibility
- **Keyboard Navigation**: Full app usable without mouse
- **Screen Reader Support**: Proper ARIA labels and roles
- **Alternative Text**: Descriptive text for images and icons
- **Error Handling**: Clear, actionable error messages

## Design Rationale

### Glass Morphism Choice
- **Modern Aesthetic**: Contemporary design language
- **Depth Perception**: Layered interface feels more natural
- **Brand Differentiation**: Stands out from traditional finance apps
- **Focus Enhancement**: Blur effect reduces visual noise

### Icon Strategy
- **Universal Recognition**: Familiar symbols across cultures
- **Emotional Connection**: Friendly, approachable interface
- **Functional Clarity**: Icons support text, don't replace it
- **Consistent Style**: Unified visual language throughout

### Color Psychology
- **Trust & Security**: Blue tones convey reliability
- **Energy & Optimism**: Purple adds creativity and innovation
- **Status Communication**: Green/red for clear success/error states
- **Accessibility**: High contrast ensures readability 