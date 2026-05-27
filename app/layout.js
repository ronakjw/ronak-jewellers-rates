export const metadata = {
  title: "Ronak Jewellers",
  description: "Live MCX Silver Rates"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0d0d0d"
        }}
      >
        {children}
      </body>
    </html>
  );
}
