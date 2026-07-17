# RebaFilme 🎬

RebaFilme is a premium, modern streaming web application designed to bring localized cinema and translated entertainment (Agasobanuye, series, movies) to a global audience. The app is crafted with a dark cinematic theme, dynamic layouts, rich visual animations, and robust multi-language support.

---

## ✨ Features

### 🌐 1. Full Internationalization (5 Languages)
RebaFilme supports five regional and global languages to ensure a fully accessible interface:
*   **Kinyarwanda (rw)**
*   **French (fr)**
*   **English (en)**
*   **Swahili (sw)**
*   **Luganda (lg)**
*   *Implementation:* Managed globally using a custom React `LanguageContext` and a persistent language-selector modal.

### 🎭 2. Animated & Interactive Brand Visuals
*   **Desktop Sidebar Marquee:** The RebaFilme logo tiles seamlessly on the left desktop sidebar and scrolls in a slow, infinite vertical marquee animation (top-to-bottom) as a subtle branding watermark.
*   **Interactive Sidebar Logo:** Hovering over the main sidebar logo scales it up dynamically (to 4x size) with a smooth, premium spring-like transition (`cubic-bezier`).
*   **Cinematic Background Marquee:** The background of Login, Account, and Search pages features a tiled logo grid moving in an infinite horizontal scroll (left-to-right).

### 💾 3. Persistent "Saved to List" Bookmarking
*   Users can bookmark their favorite movies directly from the **Movie Detail** page.
*   *Persistence:* The bookmarking engine is backed by `localStorage`, preserving the saved list across page reloads and browser sessions.
*   A dedicated **Saved Page** (`/saved`) renders all bookmarked content dynamically.

### 🖥️ 4. Premium Cinematic Experience
*   **Artplayer Integration:** Smooth, modern HTML5 video playback for cinema streaming.
*   **Refined Footer:** Features a responsive layout, a top brand badge, and interactive links to your social channels (**TikTok**, **Instagram**, **YouTube**, **Facebook**, and **Telegram**).

---

## 🛠️ Tech Stack

*   **Framework:** React 18 (Vite-powered)
*   **Routing:** React Router DOM v6
*   **Styling:** Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid, Transitions, Keyframe animations)
*   **Icons:** Lucide React
*   **Video Player:** Artplayer.js

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1.  Clone the repository:
    ```bash
    https://github.com/nsengiyumvafaustin941-lab/Rebafilmes.git
    cd RebaFilmes
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Build for production:
    ```bash
    npm run build
    ```
