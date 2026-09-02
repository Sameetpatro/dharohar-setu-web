import React from "react";

export default function NodeFallbackPage() {
  const PLAY_STORE_URL =
    process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
    process.env.REACT_APP_PLAY_STORE_URL ||
    "https://play.google.com/store/apps/details?id=com.example.humsafar";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>🏛️</span>
        </div>
        <h1 style={styles.title}>Dharohar Setu</h1>
        <p style={styles.subtitle}>धरोहरसेतु — AI Heritage Companion</p>
        <div style={styles.divider} />
        <h2 style={styles.heading}>Explore this spot in Dharohar Setu</h2>
        <p style={styles.description}>
          This spot is part of the interactive Dharohar Setu heritage guide.
          To view spot insights, listen to AI audio guides, and track your tour,
          please install the Dharohar Setu Android application.
        </p>
        <a href={PLAY_STORE_URL} style={styles.button} target="_blank" rel="noopener noreferrer">
          <span>📥</span> Download Dharohar Setu
        </a>
        <p style={styles.footerNote}>
          Already installed? Make sure "Open Supported Links" is enabled in your Android App Settings.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", padding: "24px", color: "#F8FAFC" },
  card: { maxWidth: "440px", width: "100%", backgroundColor: "rgba(30, 41, 59, 0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "24px", padding: "36px 28px", textAlign: "center", boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)" },
  iconContainer: { width: "72px", height: "72px", margin: "0 auto 16px", backgroundColor: "rgba(234, 88, 12, 0.15)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(234, 88, 12, 0.3)" },
  icon: { fontSize: "36px" },
  title: { margin: "0 0 4px", fontSize: "26px", fontWeight: "700", color: "#FFFFFF" },
  subtitle: { margin: "0 0 20px", fontSize: "13px", color: "#94A3B8", fontWeight: "500" },
  divider: { height: "1px", backgroundColor: "rgba(255, 255, 255, 0.08)", margin: "0 0 20px" },
  heading: { margin: "0 0 12px", fontSize: "18px", fontWeight: "600", color: "#F1F5F9" },
  description: { margin: "0 0 28px", fontSize: "14px", lineHeight: "1.6", color: "#94A3B8" },
  button: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", boxSizing: "border-box", backgroundColor: "#EA580C", color: "#FFFFFF", textDecoration: "none", padding: "14px 20px", borderRadius: "14px", fontWeight: "600", fontSize: "15px", boxShadow: "0 10px 25px -5px rgba(234, 88, 12, 0.4)", cursor: "pointer" },
  footerNote: { marginTop: "20px", marginBottom: "0", fontSize: "12px", color: "#64748B", lineHeight: "1.4" }
};
