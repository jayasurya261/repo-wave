# Repo Wave

Repo Wave is an open-source platform designed to help developers easily discover top open-source repositories and beginner-friendly issues. By curating a feed of accessible tasks across various languages, we lower the barrier to entry for contributing to open-source software.

## Features

- **Discover Repositories:** Browse a curated list of top open-source repositories sorted by stars and languages.
- **Find Beginner Issues:** Easily find issues labeled as `good first issue`, `beginner-friendly`, or `help wanted`.
- **Filter by Language:** Filter the repositories and issues by your preferred programming language.
- **Fast & Responsive:** Built with Astro, React, and Tailwind CSS for a fast, modern experience.

## Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database / Backend:** [Supabase](https://supabase.com/)
- **Deployment:** Vercel (or your preferred platform)

## Getting Started

To run this project locally, follow these steps:

### Prerequisites

- Node.js (v18+)
- npm or pnpm or yarn

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

3. Setup environment variables by copying `.env.example` to `.env` and filling in your Supabase connection strings:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:4321`.

## Contributing

Contributions are always welcome! Whether it's adding a new feature, fixing a bug, or improving documentation.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
