# CNX Lease Generator

A web app that reads the CNX Efforts Tracker spreadsheet and generates oil & gas lease documents for one or all lessors.

## How It Works

1. Upload the CNX Efforts Tracker `.xlsx` file
2. The app reads every sheet and lists all lessors
3. Select one lessor or all at once
4. Upload your lease template(s) `.docx`
5. Click Generate — downloads a ZIP of merged Word documents

## Supported Merge Fields

| Tag | Source |
|---|---|
| `«Lessor_Name»` | Row 2, Col B |
| `«Lessor_Address»` | Row 3, Col B |
| `«Phone»` | Row 4, Col B |
| `«QLS_Number»` | Row 8, Col B |
| `«County»` | Row 8, Col E |
| `«District»` | Row 9, Col E |
| `«Gross_Acres»` | Row 9, Col B |
| `«Tax_Parcel»` | Row 10, Col E |
| `«Related_Units»` | Row 10, Col B |
| `«Net_Acres»` | Manual entry |
| `«Bonus_Amount»` | Manual entry |
| `«Bonus_Spelled_Out»` | Manual entry |
| `«Deed_Reference»` | Manual entry |

## Tech Stack

- Next.js 14
- xlsx — Excel parsing
- pizzip — DOCX manipulation
- jszip — ZIP packaging

## Deployment

Deployed on Vercel. Push to `main` to auto-deploy.

**Password:** BOP2026
