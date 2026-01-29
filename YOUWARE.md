# ChessFlow - Modern Chess Platform

A modern, dark-themed chess application built with React, Tailwind CSS, and Framer Motion.

## Project Overview

This project implements a premium "Watch" experience for chess enthusiasts, featuring:
- **Live Game Dashboard**: Real-time tracking of top-rated games.
- **Featured Match Spotlight**: High-visibility section for the most important ongoing game.
- **Streamer Integration**: Live status for popular chess streamers.
- **Community Hub**: Social feed for chess discussions.
- **User Settings**: Profile management and preferences.
- **Theme System**: Fully integrated Dark/Light mode with persistence.

## Key Features

### Watch Page
- **Featured Game**: Large, detailed card showing live game status, players, ratings, and score.
- **Live Games Grid**: Grid layout of active games with player info, ratings, and viewer counts.
- **Streamer List**: Horizontal list of live streamers with viewer counts.
- **Filtering**: Tabbed interface for Top Rated, Friends, Tournaments, etc.

### Community Page
- **Social Feed**: Posts from players and organizations.
- **Interactions**: Like, Comment, and Share functionality (UI only).
- **Trending Topics**: Sidebar showing popular discussions.
- **Create Post**: Input area for new content.

### Settings Page
- **Profile Management**: Edit username, email, and bio.
- **Preferences**: Toggle Dark/Light mode and Notifications.
- **Responsive Design**: Adapts to mobile and desktop layouts.

### Design System
- **Colors**: 
  - Dark Mode: `bg-gray-950`, `bg-gray-900`, `text-white`
  - Light Mode: `bg-gray-100` (Main), `bg-gray-50` (Sidebar), `bg-white` (Cards), `text-gray-900`
  - Accents: Teal (`text-teal-500`, `bg-teal-600`)
- **Typography**: Clean sans-serif fonts with monospaced numbers for ratings/timers.
- **Components**: Reusable Sidebar navigation, Game Cards, and Player Avatars.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand (Theme persistence)
- **Styling**: Tailwind CSS (Dark mode 'class' strategy)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Build**: Vite

## Development

### Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

### Project Structure
- `src/components/Sidebar.tsx`: Main navigation sidebar with Theme Toggle.
- `src/pages/Watch.tsx`: The main Watch dashboard page.
- `src/pages/Community.tsx`: Social feed page.
- `src/pages/Settings.tsx`: User settings page.
- `src/store/themeStore.ts`: Zustand store for theme state.
- `src/App.tsx`: Application routing and theme controller.
