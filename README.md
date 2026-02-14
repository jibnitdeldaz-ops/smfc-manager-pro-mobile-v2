# SMFC Manager

A modern Next.js 14 application for real-time football squad management.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js App Router pages and layouts
  - `page.tsx` - Landing page with hero section
  - `dashboard/` - Dashboard routes
    - `layout.tsx` - Dashboard layout with sidebar
    - `page.tsx` - Main dashboard page
    - `tactics/page.tsx` - Tactical board with football pitch
- `components/ui/` - Shadcn UI components
- `lib/` - Utility functions

## Features

- 🏠 Beautiful landing page with hero section
- 📊 Dashboard with statistics cards
- ⚽ Interactive tactical board with football pitch visualization
- 👥 Player list sidebar with mock data
- 🎨 Dark theme (slate-900) throughout

## Next Steps

- Add database integration
- Implement real-time updates
- Add player management features
- Enhance tactical board with drag-and-drop
