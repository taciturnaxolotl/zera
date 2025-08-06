#!/usr/bin/env bash
set -euo pipefail

API_URL="https://cdn.hackclub.com/api/v3/new"
TOKEN="${HACKCLUB_CDN_TOKEN:-}"
if [[ -z "${TOKEN}" ]]; then
  TOKEN="${1:-}"
fi
if [[ -z "${TOKEN}" ]]; then
  echo "Usage: HACKCLUB_CDN_TOKEN=... $0 [token] [--dry-run] [paths...]" >&2
  exit 1
fi

DRY_RUN=false
SKIP_CHECK=false
CACHED_URLS=()
ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=true ;;
    --skip-check) SKIP_CHECK=true ;;
    *) ARGS+=("$a") ;;
  esac
done
# remove token if passed as first arg
if [[ ${#ARGS[@]} -gt 0 && "${ARGS[0]}" != "--dry-run" ]]; then
  ARGS=("${ARGS[@]:1}")
fi

PATHS=("content")
if [[ ${#ARGS[@]} -gt 0 ]]; then PATHS=("${ARGS[@]}"); fi

TMP_DIR=".crush/rehost-cdn"
MAP_FILE="$TMP_DIR/map.tsv"
mkdir -p "$TMP_DIR"
touch "$MAP_FILE"

collect_urls() {
  # Markdown images: ![alt](URL)
  rg -n --no-heading -e '!\[[^\]]*\]\((https?://[^)\s]+)\)' -g '!**/*.map' -g '!**/*.lock' "${PATHS[@]}" 2>/dev/null |
  awk -F: '{file=$1; sub(/^[^:]*:/, "", $0); match($0, /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/, m); if(m[1]!="") print file"\t"m[1]}' |
  # Zola shortcode variants:
  #  - {% img(id="URL", ...) %}
  #  - {{ img(id="URL", ...) }}
  cat <( rg -n --no-heading -e '\{[%{]\s*img[^}%]*[}%]\}' "${PATHS[@]}" 2>/dev/null | \
    awk -F: '{file=$1; sub(/^[^:]*:/, "", $0); if (match($0, /(id|src)[[:space:]]*=[[:space:]]*"(https?:\/\/[^"[:space:]]+)"/, m)) print file"\t"m[2]}' ) |
  awk -F'\t' '{print $1"\t"$2}' |
  grep -E '\.(png|jpe?g|gif|webp|svg|bmp|tiff?|avif)(\?.*)?$' -i |
  grep -vE 'hc-cdn\.|cdn\.hackclub\.com'
}

batch_upload() {
  payload=$(jq -sR 'split("\n")|map(select(length>0))' <(printf "%s\n" "$@"))
  for attempt in 1 2 3; do
    resp=$(curl -sS -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      --data-raw "$payload" 2>&1) || true
    body=$(printf "%s" "$resp" | sed '$d')
    code=$(printf "%s" "$resp" | tail -n1)
    if [[ "$code" == "200" ]]; then
      printf "%s" "$body" | jq -r '.files[] | .sourceUrl? as $s | .deployedUrl + "\t" + ( $s // "" )'
      return 0
    fi
    echo "Upload attempt $attempt failed with $code" >&2
    echo "Response body:" >&2
    printf "%s\n" "$body" >&2
    echo "Payload:" >&2
    printf "%s\n" "$payload" >&2
    sleep $((attempt*2))
  done
  echo "Upload failed after retries" >&2
  return 1
}

mapfile -t LINES < <(collect_urls | sort -u)

URLS_TO_SEND=()
FILES=()
total=${#LINES[@]}
idx=0
for line in "${LINES[@]}"; do
  idx=$((idx+1))
  file="${line%%$'\t'*}"
  url="${line#*$'\t'}"
  if grep -Fq "${url}" "$MAP_FILE" 2>/dev/null; then
    echo "[$idx/$total] cached: $url -> will rewrite only"
    CACHED_URLS+=("$url")
    continue
  fi
  if $DRY_RUN; then
    echo "[$idx/$total] queued: $url"
    URLS_TO_SEND+=("$url")
    FILES+=("$file")
  else
    if $SKIP_CHECK; then
      echo "[$idx/$total] no-check: $url"
      URLS_TO_SEND+=("$url")
      FILES+=("$file")
    else
      echo -n "[$idx/$total] checking: $url ... "
      code=$(curl -sS -o /dev/null -w '%{http_code}' -L "$url" || echo 000)
      if [[ "$code" =~ ^2|3 ]]; then
        echo "ok ($code)"
        URLS_TO_SEND+=("$url")
        FILES+=("$file")
      else
        echo "fail ($code)"; echo "Skipping: $url" >&2
      fi
    fi
  fi
done

if [[ ${#URLS_TO_SEND[@]} -eq 0 ]]; then
  echo "No new image URLs to process"; exit 0
fi

BATCH=50
start=0
# Rewrites for cached URLs from map without uploading
if [ "${#CACHED_URLS[@]}" -gt 0 ] 2>/dev/null; then
  echo "Rewriting cached URLs from map without upload..."
  for src in "${CACHED_URLS[@]}"; do
    dst=$(awk -F'\t' -v s="$src" '$1==s{print $2}' "$MAP_FILE" | head -n1)
    [[ -z "$dst" ]] && continue
    rg -l --fixed-strings -- "$src" "${PATHS[@]}" 2>/dev/null | while read -r f; do
      mkdir -p "$TMP_DIR/backup"
      if [[ ! -e "$TMP_DIR/backup/$f" ]]; then
        mkdir -p "$TMP_DIR/backup/$(dirname "$f")"
        cp "$f" "$TMP_DIR/backup/$f"
      fi
      sed -i "s#$(printf '%s' "$src" | sed -e 's/[.[\*^$]/\\&/g' -e 's#/#\\/#g')#$(printf '%s' "$dst" | sed -e 's/[&]/\\&/g' -e 's#/#\\/#g')#g" "$f"
      echo "Rewrote (cached): $f"
    done
  done
fi

while [[ $start -lt ${#URLS_TO_SEND[@]} ]]; do
  end=$(( start + BATCH ))
  if [[ $end -gt ${#URLS_TO_SEND[@]} ]]; then end=${#URLS_TO_SEND[@]}; fi
  chunk=("${URLS_TO_SEND[@]:start:end-start}")
  if $DRY_RUN; then
    for u in "${chunk[@]}"; do echo "DRY: would upload $u"; done
  else
    echo "Uploading ${#chunk[@]} URLs..."
    resp=$(batch_upload "${chunk[@]}") || { echo "Upload failed" >&2; exit 1; }
    echo "Upload response:"; printf "%s\n" "$resp"
    mapfile -t deployed_arr < <(printf "%s\n" "$resp" | awk '{print $0}')
    for i in "${!chunk[@]}"; do
      src="${chunk[$i]}"
      dst="${deployed_arr[$i]:-}"
      if [[ -n "$dst" ]]; then
        printf "%s\t%s\n" "$src" "$dst" | tee -a "$MAP_FILE"
      fi
    done
  fi
  start=$end
done

if $DRY_RUN; then echo "DRY: skipping replacements"; exit 0; fi

# Replace in-place using map
if [[ -s "$MAP_FILE" ]]; then
  cp "$MAP_FILE" "$TMP_DIR/map-$(date +%s).tsv"
  while IFS=$'\t' read -r src dst; do
    [[ -z "$src" || -z "$dst" ]] && continue
    rg -l --fixed-strings -- "$src" "${PATHS[@]}" 2>/dev/null | while read -r f; do
      mkdir -p "$TMP_DIR/backup"
      if [[ ! -e "$TMP_DIR/backup/$f" ]]; then
        mkdir -p "$TMP_DIR/backup/$(dirname "$f")"
        cp "$f" "$TMP_DIR/backup/$f"
      fi
      sed -i "s#$(printf '%s' "$src" | sed -e 's/[.[\*^$]/\\&/g' -e 's#/#\\/#g')#$(printf '%s' "$dst" | sed -e 's/[&]/\\&/g' -e 's#/#\\/#g')#g" "$f"
      echo "Rewrote: $f"
    done
  done < "$MAP_FILE"
  echo "Backups in $TMP_DIR/backup"
fi

echo "Done"
