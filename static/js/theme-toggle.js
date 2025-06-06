const toggleButton = document.getElementById("theme-toggle");
const themeIcon = document
  .getElementById("theme-toggle-label")
  .querySelector("i");
const themeSound = document.getElementById("theme-sound");

// Function to update the theme icon based on the current theme
const updateThemeIcon = (isDarkMode) => {
  themeIcon.style.setProperty(
    "--icon-toggle",
    isDarkMode ? "var(--icon-dark)" : "var(--icon-light)",
  );
};

// Function to update the theme based on the current mode
const updateTheme = (isDarkMode) => {
  const theme = isDarkMode ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(isDarkMode);
};

// Function to toggle the theme
const toggleTheme = () => {
  const isDarkMode = toggleButton.checked;
  updateTheme(isDarkMode);
  themeSound.currentTime = 0;
  themeSound.play();
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
};

// Event listener for theme toggle
toggleButton.addEventListener("change", toggleTheme);

// Function to initialize the theme based on the stored preference
const initializeTheme = () => {
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDarkMode = storedTheme === "dark" || (!storedTheme && prefersDark);
  toggleButton.checked = isDarkMode;
  updateTheme(isDarkMode);
};

// Initialize the theme
initializeTheme();

// Listen for changes in system preference
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", initializeTheme);
