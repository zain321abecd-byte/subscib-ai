param(
  [string]$ServiceName = "subscribai-api",
  [string]$Repo = "https://github.com/zain321abecd-byte/subscib-ai",
  [string]$Branch = "main",
  [string]$RootDir = "api",
  [string]$Plan = "starter",
  [string]$Region = "singapore"
)

$ErrorActionPreference = "Stop"

$apiKey = $env:RENDER_API_KEY
if (-not $apiKey) {
  throw "RENDER_API_KEY is not set in this PowerShell session."
}

$baseUrl = "https://api.render.com/v1"
$headers = @{
  "Accept" = "application/json"
  "Content-Type" = "application/json"
  "Authorization" = "Bearer $apiKey"
}

function Invoke-RenderJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null
  )

  $uri = "$baseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  }

  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
}

function Get-OwnerIdFromServices {
  param([array]$Services)

  foreach ($item in $Services) {
    if ($item.service.ownerId) {
      return $item.service.ownerId
    }
  }
  return $null
}

Write-Host "Checking Render services..."
$services = Invoke-RenderJson -Method "GET" -Path "/services?limit=100"
$serviceItem = $services | Where-Object { $_.service.name -eq $ServiceName } | Select-Object -First 1
$service = $serviceItem.service

$serviceDetails = @{
  runtime = "node"
  envSpecificDetails = @{
    buildCommand = "npm install && npm run build"
    startCommand = "npm run start:prod"
  }
  healthCheckPath = "/health"
}

if ($service) {
  Write-Host "Found existing Render service: $($service.name) ($($service.id))"
  $patch = @{
    autoDeploy = "yes"
    repo = $Repo
    branch = $Branch
    rootDir = $RootDir
    serviceDetails = $serviceDetails
  }
  $service = Invoke-RenderJson -Method "PATCH" -Path "/services/$($service.id)" -Body $patch
  Write-Host "Updated service Git/build settings and enabled auto deploy."
} else {
  $ownerId = Get-OwnerIdFromServices -Services $services
  if (-not $ownerId) {
    throw "Could not infer Render workspace ownerId. Create one service in Render or provide ownerId by editing this script."
  }

  Write-Host "No existing $ServiceName service found. Creating it..."
  $create = @{
    type = "web_service"
    name = $ServiceName
    ownerId = $ownerId
    repo = $Repo
    branch = $Branch
    rootDir = $RootDir
    autoDeploy = "yes"
    serviceDetails = ($serviceDetails + @{
      plan = $Plan
      region = $Region
    })
    envVars = @(
      @{ key = "NODE_VERSION"; value = "22" },
      @{ key = "NODE_ENV"; value = "production" },
      @{ key = "FRONTEND_ORIGIN"; value = "https://subscribai.com" },
      @{ key = "SITE_URL"; value = "https://subscribai.com" },
      @{ key = "NEXT_PUBLIC_SITE_URL"; value = "https://subscribai.com" },
      @{ key = "PAYFAST_PUBLIC_API_URL"; value = "https://api.subscribai.com" },
      @{ key = "API_URL"; value = "https://api.subscribai.com" }
    )
  }
  $created = Invoke-RenderJson -Method "POST" -Path "/services" -Body $create
  $service = $created.service
  if (-not $service) {
    $service = $created
  }
  Write-Host "Created Render service: $($service.name) ($($service.id))"
}

$publicEnv = @{
  "NODE_VERSION" = "22"
  "NODE_ENV" = "production"
  "FRONTEND_ORIGIN" = "https://subscribai.com"
  "SITE_URL" = "https://subscribai.com"
  "NEXT_PUBLIC_SITE_URL" = "https://subscribai.com"
  "PAYFAST_PUBLIC_API_URL" = "https://api.subscribai.com"
  "API_URL" = "https://api.subscribai.com"
}

foreach ($key in $publicEnv.Keys) {
  $encodedKey = [uri]::EscapeDataString($key)
  Invoke-RenderJson -Method "PUT" -Path "/services/$($service.id)/env-vars/$encodedKey" -Body @{ value = $publicEnv[$key] } | Out-Null
}
Write-Host "Updated non-secret environment variables."

$deploy = Invoke-RenderJson -Method "POST" -Path "/services/$($service.id)/deploys" -Body @{ clearCache = "do_not_clear" }
Write-Host "Triggered deploy."

[pscustomobject]@{
  serviceId = $service.id
  name = $service.name
  dashboardUrl = $service.dashboardUrl
  autoDeploy = $service.autoDeploy
  branch = $service.branch
  rootDir = $service.rootDir
  deployId = $deploy.id
} | ConvertTo-Json -Depth 10
