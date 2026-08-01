"use client";

// Adsterra "iframe" format banners (300x250, 320x50, 728x90, etc).
// Each unit is rendered inside its own sandboxed iframe (via srcDoc) so that
// several banners on the same page don't stomp on each other's global
// `atOptions` variable, which is what Adsterra's invoke.js reads from.
export default function AdBanner({ adKey, width, height, className = "" }) {
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>
      </head>
      <body>
        <script>
          atOptions = {
            'key' : '${adKey}',
            'format' : 'iframe',
            'height' : ${height},
            'width' : ${width},
            'params' : {}
          };
        </script>
        <script src="https://www.highperformanceformat.com/${adKey}/invoke.js"></script>
      </body>
    </html>
  `;

  return (
    <iframe
      title={`ad-${adKey}`}
      srcDoc={srcDoc}
      width={width}
      height={height}
      scrolling="no"
      style={{ border: "none", overflow: "hidden", display: "block" }}
      className={className}
    />
  );
}
