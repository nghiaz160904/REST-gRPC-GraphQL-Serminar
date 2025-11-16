#!/usr/bin/env bash
# Pump REST, GraphQL, gRPC for a given ARTICLE_ID.
# Usage: bash scrripts/pump_getArticle_all.sh <ARTICLE_ID> [--interval=1] [--count=0]
# interval in seconds; count=0 means infinite.

set -euo pipefail

ARTICLE_ID="${1:-}"
shift || true

INTERVAL="1"
COUNT="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval=*) INTERVAL="${1#*=}";;
    --count=*) COUNT="${1#*=}";;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
  shift
done

if [[ -z "$ARTICLE_ID" ]]; then
  echo "Need ARTICLE_ID"
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo "curl required"; exit 1; }
command -v grpcurl >/dev/null 2>&1 || { echo "grpcurl required"; exit 1; }

REST_URL="http://localhost:4000/articles/${ARTICLE_ID}"
GRAPHQL_URL="http://localhost:4000/graphql"
GRPC_TARGET="127.0.0.1:50051"
GRPC_METHOD="example.Main/GetArticle"
GRPC_IMPORT_PATH="src/grpc/proto"
GRPC_PROTO="schema.proto"

# GraphQL query. Change Int! to ID! and quote variable if schema uses ID.
gql='query($id:String!){ article(id:$id){ id title description } }'

echo "Pumping all 3 services with ARTICLE_ID=$ARTICLE_ID  INTERVAL=${INTERVAL}s  COUNT=$COUNT (0=∞)"
echo "Ctrl+C to stop"
echo "--------------------------------------------------"

time_ns() { date +%s%N; }

i=0
while :; do
  ((++i))
  echo "# Iteration $i"

  # REST
  rest_meta=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" "$REST_URL" || true)
  rest_code=${rest_meta%% *}
  rest_time=${rest_meta#* }
  [[ -z "${rest_code}" || "${rest_code}" == "${rest_time}" ]] && { rest_code=""; rest_time=""; }
  echo "REST    status:${rest_code:-?} time:${rest_time:-?}s"

  # GraphQL
  gql_tmp=$(mktemp)
  gql_meta=$(curl -s -o "$gql_tmp" -w "%{http_code} %{time_total}" \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"$gql\",\"variables\":{\"id\":\"$ARTICLE_ID\"}}" \
    "$GRAPHQL_URL" || true)
  gql_http_code=${gql_meta%% *}
  gql_time=${gql_meta#* }
  if grep -q '"errors"' "$gql_tmp"; then
    gql_status="ERROR"
  else
    gql_status="OK"
  fi
  if [[ -z "$gql_http_code" || "$gql_http_code" == "$gql_time" ]]; then
    gql_http_code="?"
    gql_time="?"
  fi
  if [[ "$gql_http_code" != "200" ]]; then
    echo "GraphQL status:${gql_status} http:${gql_http_code} time:${gql_time}s body:$(tr -d '\n' < "$gql_tmp")"
  else
    echo "GraphQL status:${gql_status} http:${gql_http_code} time:${gql_time}s"
  fi
  rm -f "$gql_tmp"

  # gRPC
  start_ns=$(time_ns)
  grpc_err=$(mktemp)
  if grpcurl -plaintext \
      -import-path "$GRPC_IMPORT_PATH" -proto "$GRPC_PROTO" \
      -d "{\"id\":\"$ARTICLE_ID\"}" \
      "$GRPC_TARGET" "$GRPC_METHOD" >/dev/null 2>"$grpc_err"; then
    grpc_status="OK"
    grpc_code=0
    grpc_msg=""
  else
    grpc_status="ERROR"
    grpc_code=$(grep -m1 '^  Code:' "$grpc_err" | awk '{print $2}')
    grpc_msg=$(grep -m1 '^  Message:' "$grpc_err" | cut -d':' -f2- | sed 's/^ //' )
    [[ -z "$grpc_code" ]] && grpc_code="UNKNOWN"
  fi
  end_ns=$(time_ns)
  delta_ns=$(( end_ns - start_ns ))
  grpc_sec=$(awk -v ns="$delta_ns" 'BEGIN{printf "%.3f", ns/1000000000}')
  if [[ "$grpc_status" == "OK" ]]; then
    echo "gRPC    status:${grpc_status} time:${grpc_sec}s"
  else
    echo "gRPC    status:${grpc_status} time:${grpc_sec}s msg:${grpc_msg}"
  fi
  rm -f "$grpc_err"

  echo "--------------------------------------------------"

  if [[ "$COUNT" != "0" && "$i" -ge "$COUNT" ]]; then
    echo "Done after $COUNT iterations."
    break
  fi
  sleep "$INTERVAL"
done