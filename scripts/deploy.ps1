# Deploy Natal Atlas to Cloudflare Pages (astrochart.jonbailey.xyz)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Public = Join-Path $Root "public"
$Project = "astrochart-jonbailey"

if (-not (Test-Path (Join-Path $Public "index.html"))) { throw "missing public/index.html" }
if (-not (Test-Path (Join-Path $Public "og.jpg"))) { throw "missing public/og.jpg" }

Write-Host "[DEPLOY] Natal Atlas Pages project=$Project"
Push-Location $Root
try {
  npx --yes wrangler@4 pages deploy $Public --project-name=$Project --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Site:    https://astrochart.jonbailey.xyz/"
Write-Host "Preview: https://$Project.pages.dev/"
Write-Host "Attach domain if needed:"
Write-Host "  npx wrangler pages domain add astrochart.jonbailey.xyz --project-name=$Project"
