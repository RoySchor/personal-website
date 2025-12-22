# Personal Portfolio Website

> In today’s digital world, how you present yourself matters. Our online identities are constantly tracked, filtered, and distorted. I wanted a space where I could intentionally curate how I’m seen—something that felt personal, memorable, and unmistakably me.

Most personal websites follow the same pattern: a title at the top, a navbar, and a vertical scroll through content. For a software engineer, that kind of site becomes indistinguishable from millions of similar designs. When someone Googles my name, I didn’t want them to land on *another* portfolio. I wanted the experience to feel different—something that immediately sparks curiosity and leaves a lasting impression.

That goal is what led to the creation of royschor.com.

## Overview

This project is a monorepo containing two standalone applications that work together to create an immersive, interactive portfolio experience:

1.  **3D Environment**: A Three.js application rendering a custom-built 3D room.
2.  **2D OS Interface**: A React application that simulates a macOS-style desktop environment.

## The 3D Experience (Blender & Three.js)
At the core of the site is a fully custom 3D scene created from scratch in Blender. This is not a purchased or downloaded asset — every element was intentionally modeled to reflect a personal, lived-in workspace.

From the desk and bean bag to the window shades and pull-cords, each object was manually built to create a sense of atmosphere and realism.

https://github.com/user-attachments/assets/5fb39319-d6fa-4231-9e13-1098808690c5

### Optimization Strategy
Because this environment runs directly in the browser, performance was a primary concern. A significant amount of effort went into optimizing the scene for real-time rendering:

*   **Geometry Optimization**: Removed all unseen geometry (back-faces, internal faces, redundant vertices) to reduce polygon count and GPU workload.
*   **Compression**: Ran a local **KTX2 compression pipeline** to compress textures and geometry, significantly reducing the final GLB file size and improving load times.

## Technical Architecture

### CSS3DRenderer Integration
The laptop screen inside the 3D scene is not a static texture — it is a fully interactive web application.

This is achieved using **Three.js’s** `CSS3DRenderer`, which projects a live 2D React application into the 3D world via an `iframe`.

*   **Monorepo Structure**: Both the 3D host and the 2D guest application live in the same repository. This simplifies development and avoids CORS issues that would otherwise arise when embedding an iframe across domains.
*   **Interaction**: Users can interact directly with the 2D interface — clicking icons, opening windows, and navigating the OS — all through the perspective and distortion of the 3D laptop screen.

## Local Development

Locally, the 3D and 2D apps can be run individually. However, to run the complete project locally, both applications must be started simultaneously.

1.  Open **two terminal tabs**.
2.  **Terminal 1 - 2D OS Interface**:
    ```bash
    cd 2d-personal-portfolio-website
    npm run dev
    ```
3.  **Terminal 2 - 3D Environment**:
    ```bash
    cd 3d-personal-portfolio-website
    npm run dev
    ```

### Mobile Testing
To test responsiveness and interactions on mobile devices:
1.  Start the dev server with host access enabled:
    ```bash
    npm run dev -- --host
    ```
2.  Find your machine’s local IP address:
    ```
     ipconfig getifaddr en0
    ```
3.  Connect your mobile device to the same network and navigate to the provided IP address in your browser.
