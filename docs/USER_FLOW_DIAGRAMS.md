# User Flow Diagrams

## Overview

This document contains detailed user flow diagrams that illustrate how users interact with the Personal Finance Receipt Sorter application. These flows cover all major user journeys from initial setup to advanced features.

## Primary User Flows

### 1. First-Time User Setup Flow

```mermaid
flowchart TD
    A[Launch Application] --> B{First Time?}
    B -->|Yes| C[Welcome Screen]
    B -->|No| Z[Dashboard]
    
    C --> D[Setup Wizard Step 1:<br/>API Key Configuration]
    D --> E{OpenAI Key Valid?}
    E -->|No| F[Show Error Message]
    F --> D
    E -->|Yes| G[Setup Wizard Step 2:<br/>Inbox Folder Selection]
    
    G --> H[Browse for Folder]
    H --> I{Folder Selected?}
    I -->|No| J[Use Default Folder]
    I -->|Yes| K[Validate Folder Permissions]
    J --> L[Setup Wizard Step 3:<br/>Privacy Preferences]
    K --> L
    
    L --> M[Data Retention Settings]
    M --> N[Analytics Opt-in/out]
    N --> O[Setup Complete]
    O --> P[Create Default Categories]
    P --> Q[Show Quick Tutorial]
    Q --> Z[Dashboard]
    
    style C fill:#e1f5fe
    style O fill:#c8e6c9
    style Z fill:#fff3e0
```

### 2. Receipt Processing Flow

```mermaid
flowchart TD
    A[User Drops Receipt File] --> B[File Validation]
    B --> C{Valid File Type?}
    C -->|No| D[Show Error:<br/>Unsupported File Type]
    C -->|Yes| E[Show Processing Indicator]
    
    E --> F[OCR Text Extraction]
    F --> G{OCR Successful?}
    G -->|No| H[Show Error:<br/>OCR Failed]
    G -->|Yes| I[Text Sanitization]
    
    I --> J[Send to OpenAI API]
    J --> K{API Response OK?}
    K -->|No| L[Show Error:<br/>AI Processing Failed]
    K -->|Yes| M[Parse Response]
    
    M --> N[Data Validation]
    N --> O{Data Valid?}
    O -->|No| P[Show Manual Edit Form]
    O -->|Yes| Q[Save to Database]
    
    P --> R[User Edits Data]
    R --> S[Validate Edited Data]
    S --> Q
    
    Q --> T{Save Successful?}
    T -->|No| U[Show Error:<br/>Save Failed]
    T -->|Yes| V[Update UI]
    V --> W[Show Success Notification]
    W --> X[Add to Receipt List]
    
    style E fill:#fff3e0
    style V fill:#c8e6c9
    style D fill:#ffebee
    style H fill:#ffebee
    style L fill:#ffebee
    style U fill:#ffebee
```

### 3. Receipt Management Flow

```mermaid
flowchart TD
    A[Navigate to Receipts Page] --> B[Load Receipt List]
    B --> C[Display Receipts]
    
    C --> D{User Action}
    D -->|Search| E[Enter Search Query]
    D -->|Filter| F[Select Filter Options]
    D -->|Sort| G[Select Sort Criteria]
    D -->|View Details| H[Click Receipt Item]
    D -->|Edit| I[Click Edit Button]
    D -->|Delete| J[Click Delete Button]
    
    E --> K[Apply Search Filter]
    K --> L[Update Display]
    
    F --> M[Apply Category/Date Filter]
    M --> L
    
    G --> N[Apply Sort Order]
    N --> L
    
    H --> O[Show Receipt Details Modal]
    O --> P{User Action in Modal}
    P -->|Close| C
    P -->|Edit| Q[Switch to Edit Mode]
    P -->|Delete| R[Confirm Delete]
    
    I --> S[Show Edit Form]
    S --> T[User Modifies Data]
    T --> U[Validate Changes]
    U --> V{Valid?}
    V -->|No| W[Show Validation Errors]
    W --> T
    V -->|Yes| X[Save Changes]
    X --> Y[Update Display]
    Y --> C
    
    J --> Z[Show Delete Confirmation]
    Z --> AA{Confirm Delete?}
    AA -->|No| C
    AA -->|Yes| BB[Delete Receipt]
    BB --> CC[Remove from Display]
    CC --> C
    
    Q --> S
    R --> Z
    
    style C fill:#e3f2fd
    style L fill:#f3e5f5
    style Y fill:#c8e6c9
    style CC fill:#ffcdd2
```

### 4. Category Management Flow

```mermaid
flowchart TD
    A[Navigate to Categories Page] --> B[Load Categories]
    B --> C[Display Category List]
    
    C --> D{User Action}
    D -->|Add New| E[Click Add Category]
    D -->|Edit Existing| F[Click Edit Icon]
    D -->|Delete| G[Click Delete Icon]
    D -->|View Analytics| H[Click Category Item]
    
    E --> I[Show New Category Form]
    I --> J[Enter Category Details]
    J --> K[Select Color & Icon]
    K --> L[Submit Form]
    L --> M{Validation Passed?}
    M -->|No| N[Show Validation Errors]
    N --> J
    M -->|Yes| O[Save New Category]
    O --> P[Update Category List]
    P --> C
    
    F --> Q[Show Edit Category Form]
    Q --> R[Modify Category Details]
    R --> S[Submit Changes]
    S --> T{Validation Passed?}
    T -->|No| U[Show Validation Errors]
    U --> R
    T -->|Yes| V[Update Category]
    V --> W[Refresh Category List]
    W --> C
    
    G --> X[Show Delete Confirmation]
    X --> Y{Has Associated Receipts?}
    Y -->|Yes| Z[Show Warning:<br/>Reassign or Delete Receipts]
    Y -->|No| AA[Confirm Delete]
    Z --> BB[Choose Action]
    BB -->|Reassign| CC[Select New Category]
    BB -->|Delete All| DD[Confirm Delete All]
    CC --> EE[Update All Receipts]
    DD --> FF[Delete All Receipts]
    AA --> GG[Delete Category]
    EE --> GG
    FF --> GG
    GG --> HH[Update Category List]
    HH --> C
    
    H --> II[Show Category Analytics]
    II --> JJ[Display Spending Data]
    JJ --> KK{User Action}
    KK -->|Back| C
    KK -->|Export| LL[Export Category Data]
    LL --> C
    
    style C fill:#e8f5e8
    style P fill:#c8e6c9
    style W fill:#c8e6c9
    style HH fill:#ffcdd2
```

### 5. Analytics and Reporting Flow

```mermaid
flowchart TD
    A[Navigate to Analytics Page] --> B[Load Dashboard Data]
    B --> C[Display Overview Cards]
    C --> D[Show Charts & Graphs]
    
    D --> E{User Interaction}
    E -->|Change Time Period| F[Select Date Range]
    E -->|Filter by Category| G[Select Categories]
    E -->|Change Chart Type| H[Select Chart Type]
    E -->|Export Data| I[Click Export Button]
    E -->|Drill Down| J[Click Chart Element]
    
    F --> K[Update Date Filter]
    K --> L[Refresh Analytics Data]
    L --> M[Update All Charts]
    M --> D
    
    G --> N[Apply Category Filter]
    N --> L
    
    H --> O[Change Visualization]
    O --> P[Re-render Chart]
    P --> D
    
    I --> Q[Show Export Options]
    Q --> R{Export Format}
    R -->|CSV| S[Generate CSV File]
    R -->|PDF| T[Generate PDF Report]
    R -->|JSON| U[Generate JSON Export]
    
    S --> V[Download CSV]
    T --> W[Download PDF]
    U --> X[Download JSON]
    V --> D
    W --> D
    X --> D
    
    J --> Y[Show Detailed Breakdown]
    Y --> Z[Display Transaction List]
    Z --> AA{User Action}
    AA -->|Back to Analytics| D
    AA -->|View Receipt| BB[Open Receipt Details]
    BB --> CC[Show Receipt Modal]
    CC --> Z
    
    style D fill:#e1f5fe
    style M fill:#f3e5f5
    style V fill:#c8e6c9
    style W fill:#c8e6c9
    style X fill:#c8e6c9
```

### 6. Settings and Preferences Flow

```mermaid
flowchart TD
    A[Navigate to Settings Page] --> B[Load Current Settings]
    B --> C[Display Settings Tabs]
    
    C --> D{Selected Tab}
    D -->|General| E[Show General Settings]
    D -->|Privacy| F[Show Privacy Settings]
    D -->|API Keys| G[Show API Configuration]
    D -->|Backup| H[Show Backup Options]
    D -->|About| I[Show About Information]
    
    E --> J[Theme Selection]
    E --> K[Language Selection]
    E --> L[Notification Settings]
    J --> M[Apply Theme Change]
    K --> N[Apply Language Change]
    L --> O[Save Notification Preferences]
    M --> P[Update UI Theme]
    N --> Q[Update UI Language]
    O --> R[Save Settings]
    P --> R
    Q --> R
    
    F --> S[Data Retention Settings]
    F --> T[Analytics Opt-in/out]
    F --> U[Data Export Options]
    S --> V[Set Retention Period]
    T --> W[Toggle Analytics]
    U --> X[Configure Export Format]
    V --> R
    W --> R
    X --> R
    
    G --> Y[OpenAI API Key]
    G --> Z[Firebase Configuration]
    Y --> AA[Update API Key]
    Z --> BB[Update Firebase Config]
    AA --> CC[Validate API Key]
    BB --> DD[Validate Firebase Config]
    CC --> EE{Key Valid?}
    DD --> FF{Config Valid?}
    EE -->|Yes| R
    EE -->|No| GG[Show Error Message]
    FF -->|Yes| R
    FF -->|No| HH[Show Error Message]
    GG --> Y
    HH --> Z
    
    H --> II[Backup Data]
    H --> JJ[Restore Data]
    H --> KK[Auto-backup Settings]
    II --> LL[Select Backup Location]
    JJ --> MM[Select Backup File]
    KK --> NN[Configure Auto-backup]
    LL --> OO[Create Backup]
    MM --> PP[Restore from Backup]
    NN --> R
    OO --> QQ[Show Backup Success]
    PP --> RR[Show Restore Success]
    QQ --> H
    RR --> H
    
    I --> SS[Version Information]
    I --> TT[License Information]
    I --> UU[Update Check]
    UU --> VV[Check for Updates]
    VV --> WW{Update Available?}
    WW -->|Yes| XX[Show Update Dialog]
    WW -->|No| YY[Show Up-to-date Message]
    XX --> ZZ[Download Update]
    ZZ --> AAA[Install Update]
    
    R --> BBB[Show Success Message]
    BBB --> C
    
    style C fill:#fff3e0
    style R fill:#c8e6c9
    style BBB fill:#c8e6c9
    style GG fill:#ffebee
    style HH fill:#ffebee
```

## Secondary User Flows

### 7. Error Handling Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type}
    B -->|Network Error| C[Show Network Error Message]
    B -->|Validation Error| D[Show Validation Error]
    B -->|Processing Error| E[Show Processing Error]
    B -->|System Error| F[Show System Error]
    
    C --> G[Suggest Retry Action]
    D --> H[Highlight Invalid Fields]
    E --> I[Suggest Alternative Action]
    F --> J[Suggest Restart Application]
    
    G --> K{User Action}
    H --> L{User Action}
    I --> M{User Action}
    J --> N{User Action}
    
    K -->|Retry| O[Retry Operation]
    K -->|Cancel| P[Return to Previous State]
    L -->|Fix Data| Q[Correct Input]
    L -->|Cancel| P
    M -->|Try Alternative| R[Execute Alternative]
    M -->|Cancel| P
    N -->|Restart| S[Restart Application]
    N -->|Continue| T[Continue with Error]
    
    O --> U{Retry Successful?}
    U -->|Yes| V[Continue Normal Flow]
    U -->|No| W[Show Persistent Error]
    W --> X[Log Error for Support]
    
    Q --> Y[Validate Corrected Input]
    Y --> Z{Validation Passed?}
    Z -->|Yes| V
    Z -->|No| H
    
    R --> AA{Alternative Successful?}
    AA -->|Yes| V
    AA -->|No| I
    
    style C fill:#ffebee
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#ffebee
    style V fill:#c8e6c9
    style X fill:#ffcdd2
```

### 8. Keyboard Navigation Flow

```mermaid
flowchart TD
    A[User Presses Tab] --> B[Move to Next Focusable Element]
    B --> C{Element Type}
    C -->|Button| D[Highlight Button]
    C -->|Input Field| E[Focus Input Field]
    C -->|List Item| F[Highlight List Item]
    C -->|Menu Item| G[Highlight Menu Item]
    
    D --> H{User Presses}
    E --> I{User Presses}
    F --> J{User Presses}
    G --> K{User Presses}
    
    H -->|Enter/Space| L[Activate Button]
    H -->|Tab| M[Move to Next Element]
    H -->|Shift+Tab| N[Move to Previous Element]
    
    I -->|Enter| O[Submit Form/Confirm Input]
    I -->|Tab| M
    I -->|Shift+Tab| N
    I -->|Escape| P[Cancel Input]
    
    J -->|Enter| Q[Select List Item]
    J -->|Arrow Keys| R[Navigate List]
    J -->|Tab| M
    J -->|Shift+Tab| N
    
    K -->|Enter| S[Activate Menu Item]
    K -->|Arrow Keys| T[Navigate Menu]
    K -->|Tab| M
    K -->|Shift+Tab| N
    K -->|Escape| U[Close Menu]
    
    L --> V[Execute Button Action]
    M --> B
    N --> W[Move to Previous Focusable Element]
    O --> X[Process Form Submission]
    P --> Y[Reset Input State]
    Q --> Z[Handle Item Selection]
    R --> AA[Update List Selection]
    S --> BB[Execute Menu Action]
    T --> CC[Update Menu Selection]
    U --> DD[Return Focus to Trigger]
    
    W --> EE{Element Type}
    EE -->|Button| D
    EE -->|Input Field| E
    EE -->|List Item| F
    EE -->|Menu Item| G
    
    style B fill:#e3f2fd
    style V fill:#c8e6c9
    style X fill:#c8e6c9
    style Z fill:#c8e6c9
    style BB fill:#c8e6c9
```

## Mobile-Responsive Flow Considerations

### 9. Touch Interface Adaptations

```mermaid
flowchart TD
    A[User Interaction] --> B{Device Type}
    B -->|Desktop| C[Mouse/Keyboard Interaction]
    B -->|Touch Device| D[Touch Interaction]
    
    C --> E[Standard Desktop Flow]
    
    D --> F{Touch Gesture}
    F -->|Tap| G[Single Touch Action]
    F -->|Long Press| H[Context Menu Action]
    F -->|Swipe| I[Navigation Action]
    F -->|Pinch/Zoom| J[Scale Action]
    
    G --> K[Execute Primary Action]
    H --> L[Show Context Menu Options]
    I --> M{Swipe Direction}
    J --> N[Adjust View Scale]
    
    M -->|Left/Right| O[Navigate Between Pages]
    M -->|Up/Down| P[Scroll List Content]
    
    L --> Q[Display Touch-Friendly Menu]
    Q --> R[User Selects Menu Option]
    R --> S[Execute Selected Action]
    
    K --> T[Provide Touch Feedback]
    O --> T
    P --> T
    S --> T
    N --> T
    
    T --> U[Update UI State]
    
    style D fill:#e8f5e8
    style T fill:#c8e6c9
    style U fill:#fff3e0
```

These user flow diagrams provide comprehensive documentation of all user interactions within the Personal Finance Receipt Sorter application, ensuring clear understanding of user journeys and helping guide development and testing efforts. 