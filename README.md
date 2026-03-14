<div align="center">
  <h1>Repo Wave 🌊</h1>
  <p>
    <strong>Easily discover top open-source repositories, track contributions, and find beginner-friendly issues.</strong>
  </p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Astro](https://img.shields.io/badge/Astro-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-000000?logo=better-auth&logoColor=white)](https://better-auth.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-6DA55F?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

<br />

## 📖 About The Project

Repo Wave is an open-source platform designed to help developers easily discover top open-source repositories and beginner-friendly issues. By curating a feed of accessible tasks across various languages, we lower the barrier to entry for contributing to open-source software. 

Beyond discovery, Repo Wave now offers a personalized experience with user profiles, allowing you to showcase your contributions and save your favorite projects.

## ✨ Features

### 🏆 PR Contribution Scoring (New!)
- **Submit Contributions:** Submit your merged GitHub Pull Request URLs directly on the platform.
- **Auto-Validation:** Verifies PR ownership securely via GitHub Authentication.
- **Smart Scoring Formula:** Earn up to 10 points per PR based on multiple factors:
  - **Impact:** Multipliers for contributing to highly-starred repositories.
  - **Quality:** Rewarded for active discussions and code reviews.
  - **Difficulty:** Scaled based on lines of code added/deleted.
  - **Time Bonus:** Bonus points for recent contributions.
- **Profile Visualization:** Scored PRs feed into a dynamic, GitHub-style contribution graph on your public profile.

### 🔍 Discovery & Contribution
- **Discover Repositories:** Browse a curated list of top open-source repositories sorted by stars and languages.
- **Find Beginner Issues:** Easily find issues labeled as `good first issue`, `beginner-friendly`, or `help wanted`.
- **Advanced Filtering:** Filter repositories and issues by programming language, popularity, and recency.

### 👤 User Profiles & Customization
- **Public Profiles:** Share your profile with a unique, GitHub-style URL (e.g., `/your-username`).
- **Profile Management:** 
  - **Edit Profile:** Update your name, username, and bio via a seamless popup modal.
  - **Unique Usernames:** Automatic GitHub-style username generation and validation to ensure uniqueness.
- **Bookmarks:** Save interesting repositories to your personal bookmark list for later.
- **Contribution Tracking:** Visual contribution graph to track your activity.

### 🔐 Authentication & Security
- **Secure Authentication:** Powered by **Better Auth** for robust security.
- **Social Login:** Sign up/Login easily with **Google** or **GitHub**.
- **Email/Password:** Traditional email and password authentication support.

## 🛠️ Built With

* **Frontend:** [Astro](https://astro.build/), [Tailwind CSS](https://tailwindcss.com/)
* **Backend/Auth:** [Better Auth](https://better-auth.com/), [Node.js](https://nodejs.org/)
* **Database:** [Supabase (PostgreSQL)](https://supabase.com/)
* **Data Scraper:** [Rust](https://www.rust-lang.org/) (for fetching repository data)

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18+)
- npm or pnpm or yarn
- PostgreSQL database (or Supabase project)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jayasurya261/repo-wave.git
   cd repo-wave
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` and fill in your credentials.
   ```bash
   cp .env.example .env
   ```
   
   Required variables in `.env`:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (e.g., http://localhost:4321)
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`

4. Run Database Migrations:
   Ensure your database has the required tables for Better Auth and user profiles.
   *(Check `better-auth_migrations` and `scripts` folder for details)*

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit `http://localhost:4321`.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
