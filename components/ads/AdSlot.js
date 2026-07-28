"use client";

// Renders one highperformanceformat.com ad unit.
// We isolate it inside an <iframe srcDoc> instead of injecting the raw
// <script> tag into the page. Two reasons:
//   1. These networks' scripts use document.write, which Next.js's
//      client-side navigation / React rendering doesn't play well with
//      if it's dropped directly into JSX.
//   2. Isolating it in its own iframe means the ad script can't touch
//      your app's DOM, cookies, or React state — if the ad network ever
//      serves something sketchy, it's sandboxed away from your users'
//      accounts/session.
export default function AdSlot({ adKey, width, height }) {
  const srcDoc = `
    <html>
      <head>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <script>
          atOptions = {
            'key': '${adKey}',
            'format': 'iframe',
            'height': ${height},
            'width': ${width},
            'params': {}
          };
        </script>
        <script src="https://www.highperformanceformat.com/${adKey}/invoke.js"><\/script>
      </body>
    </html>
  `;

  return (
    <div
      className="flex justify-center items-center mx-auto"
      style={{ width, height, maxWidth: "100%" }}
    >
      <iframe
        title="advertisement"
        srcDoc={srcDoc}
        width={width}
        height={height}
        style={{ border: "none", maxWidth: "100%" }}
        scrolling="no"
        loading="lazy"
      />
    </div>
  );
}
