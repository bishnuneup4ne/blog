export interface BlogImageSettings {
  darkThemeBackground: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  hoverScale: number;
  imageBackground: string;
  coverAspectRatio: string;
  coverWidth: "wide" | "full" | "standard";
  inlineImageMaxHeight: string;
  inlineImageMaxWidth: string;
}

/**
 * Static defaults for blog image styling. The admin-editable Image Styling
 * panel was removed for the OSS release because most fields silently
 * overwrote (or were overwritten by) MDX inline styles. Tune these values
 * here if you want a different look.
 */
export const DEFAULT_IMAGE_SETTINGS: BlogImageSettings = {
  darkThemeBackground: "white",
  borderRadius: "8px",
  padding: "0px",
  boxShadow: "none",
  hoverScale: 1.01,
  imageBackground: "white",
  coverAspectRatio: "16/9",
  coverWidth: "wide",
  inlineImageMaxHeight: "480px",
  inlineImageMaxWidth: "100%",
};
