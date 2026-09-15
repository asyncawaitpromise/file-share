#!/usr/bin/env bash
# One-time setup of the production app on CapRover.
# Safe to re-run — create calls use `|| true` so they no-op if the resource exists.
#
# Usage:
#   ./scripts/scaffold.sh              # full setup
#   ./scripts/scaffold.sh --dry-run    # print API calls without executing
#
# Requires: caprover CLI (already logged in), jq, values set in .env.local
#   Required in .env.local: CAPROVER_URL, CAPROVER_APP
#   Optional in .env.local: CAPROVER_APP_DOMAIN, GITHUB_OWNER, GHCR_TOKEN, and app env vars

set -euo pipefail

ENV_FILE=".env.local"
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --env=*) ENV_FILE="${arg#--env=}" ;;
  esac
done

# --- Parse env file ---
declare -A ENV
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    val="${val#\"}" ; val="${val%\"}"
    val="${val#\'}" ; val="${val%\'}"
    ENV["$key"]="$val"
  fi
done < "$ENV_FILE"

get() { echo "${ENV[$1]:-}"; }

CAPROVER_URL="$(get CAPROVER_URL)"
APP_NAME="$(get CAPROVER_APP)"
APP_DOMAIN="$(get CAPROVER_APP_DOMAIN)"
GITHUB_OWNER="$(get GITHUB_OWNER)"
GHCR_TOKEN="$(get GHCR_TOKEN)"

for var in CAPROVER_URL CAPROVER_APP; do
  if [[ -z "${ENV[$var]:-}" ]]; then
    echo "Error: $var not set in $ENV_FILE" >&2; exit 1
  fi
done

CUSTOM_DOMAIN="${APP_NAME}.${APP_DOMAIN}"

# ============================================================
# Verify caprover CLI is logged in to the target server
# ============================================================
echo "==> Verifying caprover CLI login for $CAPROVER_URL..."

CAPROVER_NAME=$(timeout 15s caprover ls < /dev/null 2>/dev/null \
  | awk -v url="${CAPROVER_URL%/}" '$0 ~ url { print $2 }')

if [[ -z "$CAPROVER_NAME" ]]; then
  echo "Error: no caprover CLI session found for $CAPROVER_URL" >&2
  echo "       Run: caprover login" >&2
  exit 1
fi
echo "    using machine '$CAPROVER_NAME'"

cap_api() {
  local method="$1" path="$2" body="${3:-}"
  local cli_path="${path#/api/v2}"
  if $DRY_RUN; then
    echo "  [dry-run] $method $CAPROVER_URL/api/v2$cli_path"
    [[ -n "$body" ]] && echo "            $body"
    return
  fi

  # < /dev/null + timeout: if the CLI's stored session token has expired,
  # `caprover api` silently falls back to an interactive password prompt
  # instead of erroring out. With no TTY attached that prompt just hangs
  # forever. Closing stdin makes it fail fast instead; the timeout is a
  # backstop against any other kind of hang (unresponsive server, etc).
  if ! timeout 30s caprover api \
    --caproverName "$CAPROVER_NAME" \
    --method "$method" \
    --path "$cli_path" \
    ${body:+--data "$body"} \
    --output false < /dev/null; then
    local status=$?
    if [[ $status -eq 124 ]]; then
      echo "Error: caprover api call timed out after 30s ($method $cli_path)" >&2
    else
      echo "Error: caprover api call failed ($method $cli_path)" >&2
    fi
    echo "       Your CapRover CLI session may have expired — try: caprover login" >&2
    return $status
  fi
}

# ============================================================
# 1. Create the app (no-ops if already exists)
# ============================================================
echo ""
echo "==> Creating app '$APP_NAME'..."
if cap_api POST /api/v2/user/apps/appDefinitions/register \
  "{\"appName\": \"$APP_NAME\", \"hasPersistentData\": true}" &>/dev/null; then
  echo "    created"
else
  echo "    already exists, continuing"
fi

# ============================================================
# 2. Configure app: env vars, persistent volumes, port
# ============================================================
echo "==> Configuring app..."

ENV_JSON='[{"key":"NODE_ENV","value":"production"}]'
for key in PORT ADMIN_PASSWORD MAX_UPLOAD_MB DOWNLOAD_GRACE_MINUTES CORS_ORIGINS; do
  val="$(get $key)"
  [[ -z "$val" ]] && continue
  ENV_JSON=$(jq -n \
    --argjson arr "$ENV_JSON" \
    --arg k "$key" \
    --arg v "$val" \
    '$arr + [{"key": $k, "value": $v}]')
done

CONTAINER_PORT="$(get PORT)"
CONTAINER_PORT="${CONTAINER_PORT:-8080}"

DEFAULT_APP_CONFIG=$(jq -n \
  --arg app "$APP_NAME" \
  --argjson env "$ENV_JSON" \
  --argjson port "$CONTAINER_PORT" \
  '{
    "appName": $app,
    "instanceCount": 1,
    "envVars": $env,
    "containerHttpPort": $port,
    "volumes": [
      {"containerPath": "/app/data", "volumeName": ($app + "-data")}
    ],
    "ports": [],
    "notExposeAsWebApp": false
  }')

if $DRY_RUN; then
  # No live state to merge against in dry-run — show the config that would
  # apply to a fresh app; a real re-run instead patches the existing definition.
  APP_CONFIG="$DEFAULT_APP_CONFIG"
else
  TMPFILE=$(mktemp)
  caprover api \
    --caproverName "$CAPROVER_NAME" \
    --method GET \
    --path /user/apps/appDefinitions \
    --data '{}' \
    --output "$TMPFILE"
  EXISTING=$(jq --arg app "$APP_NAME" \
    '.appDefinitions[] | select(.appName == $app)' \
    "$TMPFILE")
  rm -f "$TMPFILE"

  if [[ -z "$EXISTING" ]]; then
    APP_CONFIG="$DEFAULT_APP_CONFIG"
  else
    # CapRover's appDefinitions/update fully replaces the app definition rather
    # than merging fields, so start from the existing definition and only patch
    # the fields this script manages — upsert envVars by key (preserving keys
    # set elsewhere, e.g. by sync-secrets.sh) and only fill in default volumes
    # if none are already configured (never clobber a custom mount).
    APP_CONFIG=$(echo "$EXISTING" | jq \
      --argjson newEnv "$ENV_JSON" \
      --argjson port "$CONTAINER_PORT" \
      '
      ($newEnv | map(.key)) as $newKeys
      | .envVars = ((.envVars // []) | map(select((.key as $k | $newKeys | index($k)) | not))) + $newEnv
      | .containerHttpPort = $port
      | if ((.volumes // []) | length) == 0 then
          .volumes = [{"containerPath": "/app/data", "volumeName": (.appName + "-data")}]
        else . end
      ')
  fi
fi

cap_api POST /api/v2/user/apps/appDefinitions/update "$APP_CONFIG"

# ============================================================
# 3. Private GHCR registry (so CapRover can pull the image)
# ============================================================
if [[ -n "$GITHUB_OWNER" && -n "$GHCR_TOKEN" ]]; then
  echo ""
  echo "==> Configuring GHCR as a private registry..."

  REGISTRY_BODY=$(jq -n \
    --arg user "$GITHUB_OWNER" \
    --arg pass "$GHCR_TOKEN" \
    --arg prefix "$GITHUB_OWNER" \
    '{
      "registryUser": $user,
      "registryPassword": $pass,
      "registryDomain": "ghcr.io",
      "registryImagePrefix": $prefix
    }')

  cap_api POST /api/v2/user/registries/insert/ "$REGISTRY_BODY" || \
    echo "  Warning: registry insert failed — check credentials in CapRover dashboard (Cluster > Image Registries)"
else
  echo ""
  echo "  Skipping private registry setup (GITHUB_OWNER or GHCR_TOKEN not set in $ENV_FILE)"
fi

# ============================================================
# 4. Enable HTTPS on default CapRover subdomain
# ============================================================
echo ""
echo "==> Enabling HTTPS on default subdomain for '$APP_NAME'..."
cap_api POST /api/v2/user/apps/appDefinitions/enablebasedomainssl \
  "{\"appName\": \"$APP_NAME\"}" || \
  echo "  Warning: SSL on default subdomain failed — DNS may not be propagated yet"

# ============================================================
# 5. Custom domain
# ============================================================
if [[ -n "$APP_DOMAIN" ]]; then
  echo ""
  echo "==> Adding custom domain: $CUSTOM_DOMAIN..."
  cap_api POST /api/v2/user/apps/appDefinitions/customdomain \
    "{\"appName\": \"$APP_NAME\", \"customDomain\": \"$CUSTOM_DOMAIN\"}" || \
    echo "  Warning: custom domain call failed (domain may already be set)"

  echo "==> Enabling HTTPS on $CUSTOM_DOMAIN..."
  echo "    (requires DNS A record for $CUSTOM_DOMAIN pointing to this CapRover server)"
  cap_api POST /api/v2/user/apps/appDefinitions/enablecustomdomainssl \
    "{\"appName\": \"$APP_NAME\", \"customDomain\": \"$CUSTOM_DOMAIN\"}" || \
    echo "  Warning: SSL failed — ensure DNS is propagated and try again, or enable via dashboard"
else
  echo ""
  echo "  Skipping custom domain (CAPROVER_APP_DOMAIN not set)"
fi

# ============================================================
# 6. Scheduled disk cleanup (keep 1 image per app, run nightly)
# ============================================================
echo ""
echo "==> Configuring nightly disk cleanup..."
CLEANUP_BODY=$(jq -nc '{"mostRecentLimit":1,"cronSchedule":"0 3 * * *","timezone":"UTC"}')
cap_api POST /api/v2/user/system/diskcleanup/ "$CLEANUP_BODY" || \
  echo "  Warning: disk cleanup config failed — set manually in CapRover dashboard (Settings > Disk Cleanup)"

# ============================================================
echo ""
echo "Scaffolding complete."
echo ""
echo "Next steps:"
echo "  1. Verify the app in CapRover dashboard: $CAPROVER_URL"
[[ -n "$APP_DOMAIN" ]] && echo "  2. Check DNS: $CUSTOM_DOMAIN -> your CapRover IP"
echo "  3. Run CI to push the first image:"
echo "     gh workflow run deploy.yml"
