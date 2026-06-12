# CertChain — Build docs to PDF via Pandoc
# Run from the docs/ directory
# Requires: Pandoc (https://pandoc.org/installing.html)
#           For PDF: MiKTeX (https://miktex.org) or wkhtmltopdf

param(
    [switch]$All,
    [switch]$AdminGuide,
    [switch]$VerifierGuide,
    [switch]$Check
)

$ErrorActionPreference = "Stop"

function Test-Pandoc {
    try { pandoc --version | Out-Null; return $true }
    catch { return $false }
}

function Test-XeLaTeX {
    try { xelatex --version | Out-Null; return $true }
    catch { return $false }
}

if ($Check) {
    Write-Host "Checking dependencies..."
    Write-Host "  Pandoc:   $(if (Test-Pandoc) { 'OK' } else { 'MISSING — install from pandoc.org' })"
    Write-Host "  XeLaTeX:  $(if (Test-XeLaTeX) { 'OK' } else { 'MISSING — install MiKTeX from miktex.org' })"
    exit 0
}

if (-not (Test-Pandoc)) {
    Write-Error "Pandoc not found. Install from https://pandoc.org/installing.html"
}

$hasLatex = Test-XeLaTeX

# Common Pandoc args
$commonArgs = @(
    "--toc",
    "-V", "geometry:margin=2.5cm",
    "-V", "fontsize=11pt",
    "-V", "linestretch=1.4",
    "-V", "colorlinks=true",
    "-V", "linkcolor=blue"
)

if ($hasLatex) {
    $commonArgs += @("-V", "mainfont=Times New Roman")
    $engine = "--pdf-engine=xelatex"
} else {
    Write-Warning "XeLaTeX not found. Falling back to pdflatex (Vietnamese may not render correctly)."
    Write-Warning "Install MiKTeX for full Vietnamese support: https://miktex.org"
    $engine = "--pdf-engine=pdflatex"
}

function Build-PDF {
    param($InputFile, $OutputFile, $Title)
    Write-Host "Building $OutputFile..." -NoNewline
    $args = @($InputFile, "-o", $OutputFile, $engine) + $commonArgs + @("-V", "title=$Title")
    & pandoc @args
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK ($([int](Get-Item $OutputFile).Length / 1024) KB)"
    } else {
        Write-Host " FAILED"
    }
}

if ($All -or $AdminGuide) {
    Build-PDF "admin-guide-vi.md" "CertChain-Admin-Guide-VI.pdf" "CertChain — Hướng dẫn Quản trị viên"
}

if ($All -or $VerifierGuide) {
    Build-PDF "verifier-guide-vi.md" "CertChain-Verifier-Guide-VI.pdf" "CertChain — Hướng dẫn Xác minh Bằng cấp"
}

if (-not $All -and -not $AdminGuide -and -not $VerifierGuide) {
    Write-Host "Usage:"
    Write-Host "  .\build-pdf.ps1 -Check                  # Check dependencies"
    Write-Host "  .\build-pdf.ps1 -All                    # Build all PDFs"
    Write-Host "  .\build-pdf.ps1 -AdminGuide             # Build Admin Guide only"
    Write-Host "  .\build-pdf.ps1 -VerifierGuide          # Build Verifier Guide only"
    Write-Host ""
    Write-Host "Output files saved in docs/"
}
