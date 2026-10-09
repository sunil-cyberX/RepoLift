const form = document.getElementById("repo-form"); const input = document.getElementById("repo-url"); const analyzeButton = document.getElementById("analyze-btn");

const errorBox = document.getElementById("error-box"); const loadingBox = document.getElementById("loading-box"); const loadingText = document.getElementById("loading-text"); const results = document.getElementById("results"); const emptyState = document.getElementById("empty-state");

const fileIcons = { directory: "📁", file: "📄", markdown: "📘", config: "⚙️", code: "💻", lock: "🔒" };

const importantFiles = [ "README.md", "package.json", "requirements.txt", "pyproject.toml", "Pipfile", "Dockerfile", "docker-compose.yml", "compose.yaml", ".env.example", ".env.sample", ".env.template", "Makefile", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "Gemfile", "LICENSE", ".gitignore" ];

function formatNumber(value) { return new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value ?? 0); }

function formatDate(value) { if (!value) return "Unknown";

const date = new Date(value);

if (Number.isNaN(date.getTime())) { return "Unknown"; }

return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date); }

function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }

function clearError() { errorBox.textContent = ""; errorBox.hidden = true; }

function setLoading(isLoading, message = "Analyzing repository...") { loadingBox.hidden = !isLoading; loadingText.textContent = message; analyzeButton.disabled = isLoading; analyzeButton.textContent = isLoading ? "Analyzing..." : "Analyze repo →"; input.disabled = isLoading; }

function safeText(value, fallback = "Not provided") { if (typeof value !== "string" || !value.trim()) { return fallback; }

return value.trim(); }

function createElement(tag, className, text) { const element = document.createElement(tag);

if (className) { element.className = className; }

if (text !== undefined && text !== null) { element.textContent = String(text); }

return element; }

function createExternalLink(url, label) { const link = document.createElement("a");

link.href = url; link.textContent = label; link.target = "_blank"; link.rel = "noopener noreferrer";

return link; }

function parseGitHubUrl(rawUrl) { let parsed;

try { parsed = new URL(rawUrl.trim()); } catch { throw new Error("Please enter a valid GitHub repository URL."); }

if ( parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com" ) { throw new Error( "Please use a URL from https://github.com/owner/repository." ); }

const parts = parsed.pathname .split("/") .filter(Boolean);

if (parts.length < 2) { throw new Error( "Repository URL should include both the owner and repository name." ); }

const owner = parts[0]; const repo = parts[1].replace(/.git$/i, "");

if ( !/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo) ) { throw new Error("The repository URL contains an invalid owner or name."); }

return { owner, repo }; }

async function githubFetch(path) { const response = await fetch(https://api.github.com${path}, { headers: { Accept: "application/vnd.github+json" } });

if (response.status === 404) { throw new Error( "Repository not found. Check the URL or make sure the repository is public." ); }

if (response.status === 403 || response.status === 429) { throw new Error( "GitHub API rate limit reached. Please wait a little and try again." ); }

if (!response.ok) { throw new Error( GitHub returned an error (${response.status}). Please try again later. ); }

return response.json(); }

function renderRepository(repo) { document.getElementById("repo-avatar").textContent = repo.name.charAt(0).toUpperCase();

document.getElementById("repo-owner").textContent = repo.owner.login;

document.getElementById("repo-name").textContent = repo.name;

document.getElementById("repo-description").textContent = safeText(repo.description, "This repository has no description.");

document.getElementById("repo-language").textContent = repo.language || "Unknown";

document.getElementById("repo-stars").textContent = formatNumber(repo.stargazers_count);

document.getElementById("repo-forks").textContent = formatNumber(repo.forks_count);

document.getElementById("repo-issues").textContent = formatNumber(repo.open_issues_count);

document.getElementById("repo-updated").textContent = formatDate(repo.updated_at);

document.getElementById("repo-link").href = repo.html_url; }

function classifyFile(item) { if (item.type === "dir") { return { icon: fileIcons.directory, label: "Directory" }; }

const name = item.name.toLowerCase();

if (name.endsWith(".md")) { return { icon: fileIcons.markdown, label: "Documentation" }; }

if (name.includes("lock")) { return { icon: fileIcons.lock, label: "Lock file" }; }

if ( name.endsWith(".json") || name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".toml") || name.endsWith(".ini") || name === "dockerfile" || name === "makefile" ) { return { icon: fileIcons.config, label: "Configuration" }; }

if ( /.(js|jsx|ts|tsx|py|go|rs|java|rb|php|cpp|c|cs|swift)$/.test(name) ) { return { icon: fileIcons.code, label: "Source code" }; }

return { icon: fileIcons.file, label: "File" }; }

function renderFiles(items, owner, repo) { const container = document.getElementById("file-list"); container.replaceChildren();

const sorted = [...items].sort((a, b) => { const aImportant = importantFiles.includes(a.name) ? 0 : 1; const bImportant = importantFiles.includes(b.name) ? 0 : 1;

if (aImportant !== bImportant) { return aImportant - bImportant; } if (a.type !== b.type) { return a.type === "dir" ? -1 : 1; } return a.name.localeCompare(b.name); 

});

const shown = sorted.slice(0, 18);

if (shown.length === 0) { container.append( createElement("p", "muted", "No top-level files were found.") ); return; }

shown.forEach((item) => { const classification = classifyFile(item); const row = createElement("div", "file-item"); const icon = createElement( "span", "file-item-icon", classification.icon );

const content = createElement("div", "file-item-content"); const name = createElement("span", "file-item-name", item.name); const type = createElement( "span", "file-item-type", classification.label ); content.append(name, type); if (item.html_url) { row.append(icon, content); const link = createExternalLink( item.html_url, "↗" ); link.setAttribute("aria-label", `Open ${item.name} on GitHub`); link.className = "text-link"; row.append(link); } else { row.append(icon, content); } container.append(row); 

});

if (sorted.length > shown.length) { container.append( createElement( "p", "muted small", Showing ${shown.length} of ${sorted.length} top-level entries. ) ); } }

function renderLanguages(languages) { const container = document.getElementById("language-list"); const note = document.getElementById("language-note");

container.replaceChildren();

const entries = Object.entries(languages || {}) .filter(([, bytes]) => Number(bytes) > 0) .sort((a, b) => b[1] - a[1]);

const totalBytes = entries.reduce( (sum, [, bytes]) => sum + bytes, 0 );

if (!entries.length || totalBytes === 0) { container.append( createElement( "p", "muted", "GitHub has no language breakdown available for this repository." ) );

note.textContent = ""; return; 

}

entries.slice(0, 8).forEach(([name, bytes]) => { const percent = (bytes / totalBytes) * 100;

const row = createElement("div", "language-row"); const languageName = createElement( "span", "language-name", name ); const percentage = createElement( "span", "language-percent", `${percent.toFixed(1)}%` ); const track = createElement("div", "language-track"); const fill = createElement("div", "language-fill"); fill.style.width = `${percent}%`; track.append(fill); row.append(languageName, percentage, track); container.append(row); 

});

note.textContent = "Percentages are estimated from GitHub's language byte counts, not lines of code."; }

function addSetupItem(container, title, description, command = "") { const item = createElement("div", "setup-item"); const heading = createElement("strong", "", title); const text = createElement("p", "", description);

item.append(heading, text);

if (command) { const commandElement = createElement("code", "command", command); item.append(commandElement); }

container.append(item); }

function renderSetupHints(items) { const container = document.getElementById("setup-list"); container.replaceChildren();

const names = new Set( items.map((item) => item.name.toLowerCase()) );

let hints = 0;

if (names.has("package.json")) { addSetupItem( container, "JavaScript / Node.js project detected", "Inspect package.json and its scripts before choosing a command.", "npm install" );

addSetupItem( container, "Check available scripts", "The project's own scripts may define development, build, or test tasks.", "npm run" ); hints += 2; 

}

if ( names.has("requirements.txt") || names.has("pyproject.toml") || names.has("pipfile") ) { addSetupItem( container, "Python project files detected", "Check the Python version and dependency instructions in the README.", "python -m venv .venv" );

if (names.has("requirements.txt")) { addSetupItem( container, "Requirements file found", "After reviewing the dependency file, install dependencies in your virtual environment.", "python -m pip install -r requirements.txt" ); } hints += 1; 

}

if (names.has("dockerfile")) { addSetupItem( container, "Dockerfile found", "The project may support container-based setup. Read the Dockerfile first.", "docker build -t my-project ." );

hints += 1; 

}

if ( names.has("docker-compose.yml") || names.has("compose.yaml") ) { addSetupItem( container, "Docker Compose configuration found", "Inspect the services and configuration before starting containers.", "docker compose config" );

hints += 1; 

}

if (names.has("cargo.toml")) { addSetupItem( container, "Rust project detected", "Review Cargo.toml and the README for the expected toolchain.", "cargo check" );

hints += 1; 

}

if (names.has("go.mod")) { addSetupItem( container, "Go project detected", "Review go.mod and the documented Go version.", "go build ./..." );

hints += 1; 

}

if (names.has("pom.xml") || names.has("build.gradle")) { addSetupItem( container, "Java build configuration found", "Check the required Java version and project-specific build instructions.", names.has("pom.xml") ? "mvn verify" : "gradle build" );

hints += 1; 

}

if ( names.has(".env.example") || names.has(".env.sample") || names.has(".env.template") ) { addSetupItem( container, "Environment template found", "Review the variables required by the project. Never publish real secrets.", "Review the example file before creating your local environment file." );

hints += 1; 

}

if (names.has("readme.md")) { addSetupItem( container, "Read the project documentation", "The README may specify exact setup steps, prerequisites, and configuration.", "Open the README preview below." );

hints += 1; 

}

if (names.has("license")) { addSetupItem( container, "License file found", "Review the license to understand how the project may be reused." );

hints += 1; 

}

if (hints === 0) { addSetupItem( container, "No familiar setup files detected", "Browse the repository and README manually. This tool may not recognize the project's technology." ); }

addSetupItem( container, "Safety reminder", "These are general suggestions, not verified instructions. Inspect unfamiliar code and commands before running them." ); }

function renderReadme(readme, readmeUrl) { const preview = document.getElementById("readme-preview"); const link = document.getElementById("readme-link");

preview.textContent = readme ? readme.slice(0, 12000) : "No README was found at the repository's default branch root.";

if (readmeUrl) { link.href = readmeUrl; link.hidden = false; } else { link.hidden = true; link.removeAttribute("href"); } }

async function analyzeRepository(owner, repoName) { const basePath = /repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)};

loadingText.textContent = "Fetching repository details...";

const repo = await githubFetch(basePath);

loadingText.textContent = "Inspecting repository files...";

const contentsPromise = githubFetch(${basePath}/contents/) .catch(() => []);

const languagesPromise = githubFetch(${basePath}/languages) .catch(() => ({}));

const readmePromise = githubFetch(${basePath}/readme) .catch(() => null);

const [contents, languages, readmeData] = await Promise.all([ contentsPromise, languagesPromise, readmePromise ]);

renderRepository(repo);

renderFiles( Array.isArray(contents) ? contents : [], owner, repoName );

renderLanguages(languages);

renderSetupHints( Array.isArray(contents) ? contents : [] );

let readmeText = ""; let readmeUrl = "";

if (readmeData && readmeData.download_url) { readmeUrl = readmeData.html_url || "";

try { loadingText.textContent = "Loading README preview..."; const response = await fetch(readmeData.download_url); if (response.ok) { readmeText = await response.text(); } } catch { // The README link can still be used if preview loading fails. } 

}

renderReadme(readmeText, readmeUrl);

results.hidden = false; emptyState.hidden = true;

results.scrollIntoView({ behavior: "smooth", block: "start" }); }

form.addEventListener("submit", async (event) => { event.preventDefault();

clearError(); results.hidden = true;

let repository;

try { repository = parseGitHubUrl(input.value); } catch (error) { showError(error.message); return; }

setLoading(true);

try { await analyzeRepository( repository.owner, repository.repo ); } catch (error) { showError( error instanceof Error ? error.message : "Something went wrong. Please try again." ); } finally { setLoading(false); } });

input.addEventListener("input", clearError);

