# Coop Mobile App

A modern, cross-platform mobile application for tracking egg production in chicken coops using AI and camera technology.

## Features

- 🐣 Real-time egg detection with AI
- 📱 Cross-platform (iOS, Android, Web)
- 👥 Multi-user coop sharing
- 📊 Egg production analytics
- 📷 Camera integration for automated tracking
- 🔔 Push notifications

## Tech Stack

- **Framework**: Expo (React Native)
- **Navigation**: Expo Router
- **Styling**: NativeWind (TailwindCSS)
- **Backend**: Supabase (REST API)
- **State Management**: React Context + Hooks
- **Type Checking**: TypeScript

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android)
- Supabase project with the database schema set up

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coop_app_frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the development server**
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   
   # For web
   npm run web
   ```

## Project Structure

```
coop_app_frontend/
├── app/                    # App routes and screens
├── components/             # Reusable UI components
├── lib/                    # Utility functions and services
├── styles/                 # Global styles and themes
├── assets/                 # Images, fonts, etc.
├── .env                   # Environment variables
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── tailwind.config.js     # TailwindCSS configuration
└── package.json
```

## Scripts

- `npm start`: Start the development server
- `npm run ios`: Run on iOS simulator
- `npm run android`: Run on Android emulator
- `npm run web`: Run on web browser
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
