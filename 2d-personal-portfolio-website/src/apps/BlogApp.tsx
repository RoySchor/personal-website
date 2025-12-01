import React from "react";

import type { WindowAppProps } from "../system/types";

const BlogApp: React.FC<WindowAppProps> = () => {
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Blog</h1>
      <p style={{ opacity: 0.8 }}>Two sample posts (replace with your links):</p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <a href="https://example.com/blog/first-post" target="_blank" rel="noreferrer">
            How I built my 3D + 2D portfolio
          </a>
        </li>
        <li>
          <a href="https://example.com/blog/second-post" target="_blank" rel="noreferrer">
            Optimizing GLTFs for the web
          </a>
        </li>
      </ul>
    </div>
  );
};

export default BlogApp;
