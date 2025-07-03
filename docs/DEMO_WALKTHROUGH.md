# Demo / Walkthrough Guide

This guide outlines a concise path to demonstrate all major features of **Personal Finance Receipt Sorter** in under 5 minutes. It is intended for presentations, stakeholder demos, or grading per the evaluation rubric.

## Environment Setup (Pre-Demo)
1. Ensure you have pulled the latest `main` branch.  
2. Run `npm install && npm run electron:serve` to start the app.  
3. Verify Firebase credentials are configured.  
4. Place sample receipts in `Inbox/` for quick access.

## Demo Flow
| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Launch the application | Home dashboard loads with zero errors |
| 2 | Click **Add Receipt** and select `demo-gas-station-receipt.txt` | Parsed receipt appears with extracted fields |
| 3 | Show automatic category assignment | Category field auto-populates based on NLP |
| 4 | Edit a line item value, hit **Save** | Database updates and confirmation toast appears |
| 5 | Press **Suggest Budget** | AI returns recommended budget adjustments |
| 6 | Open **Reports** tab | Pie chart displays expense breakdown |

## Key Talking Points
- Seamless OCR → NLP pipeline  
- Real-time error handling & feedback  
- Sync feature using n8n + Firebase  
- Accessibility considerations (keyboard nav, high-contrast)

## Backup Plan
If AI services are down, use `scripts/add-sample-receipts.ts` to preload data and skip OCR steps.

---
*Last updated: <!-- YYYY-MM-DD -->* 